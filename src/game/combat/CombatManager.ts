import type { Board, SwapResult } from '../board/Board';
import type { CombatState, CombatPhase, MatchResult, EnemyDefinition } from '../../types/combat';
import type { TileType, ArtifactInstance, TraitId } from '../../types/game';
import { EventBus, GameEvent } from '../EventBus';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { ResourceResolver } from './ResourceResolver';
import { TraitSystem } from './TraitSystem';
import { ArtifactSystem } from './ArtifactSystem';
import type { ResourceOutput } from './ResourceResolver';
import { BoardHazardManager } from '../board/BoardHazardManager';
import { chooseEnemyIntent, chooseMineCartTimedIntent, executeBoardManipulation } from './EnemyAI';
import { BossController } from './BossController';
import {
  rollEliteModifier,
  applyEliteModifier,
  shouldSuppressCascadeDamage,
} from './EliteModifiers';
import type { EliteModifierId, EliteModifier } from './EliteModifiers';

export interface CombatConfig {
  enemies: EnemyDefinition[];
  playerHealth: number;
  playerMaxHealth: number;
  playerGold: number;
  activeTileTypes: TileType[];
  tileUpgrades: Partial<Record<TileType, number>>;
  abilityCharge: number;
  artifacts: ArtifactInstance[];
  traitCounts: Partial<Record<TraitId, number>>;
  swapsPerTurn?: number;
  deadeyeShots?: number;
  /** Set to true for elite encounters to apply a random board modifier. */
  isElite?: boolean;
  /** Set to true for boss encounters to activate phase-based AI. */
  isBoss?: boolean;
  /** Turn limit for timed encounters (e.g. Mine Cart). 0 or undefined = no limit. */
  turnLimit?: number;
  /** Damage dealt to the player if a timed encounter expires. */
  timedFailureDamage?: number;
}

export interface CombatResult {
  victory: boolean;
  playerHealth: number;
  playerGold: number;
  goldEarned: number;
  abilityCharge: number;
  damageDealt: number;
}

/**
 * CombatManager: orchestrates the full turn-based combat loop.
 *
 * Turn sequence (from SPEC):
 *   1. Turn start -- per-turn effects (ability charge, Sheriff block, etc.)
 *   2. Consumable window -- player may use consumables before swaps
 *   3. Swap phase -- up to N swaps, each fully resolves before the next
 *   4. Turn end -- player block expires, enemy turn begins
 *
 * Enemy turn:
 *   1. Venom ticks on all enemies
 *   2. Each enemy acts left-to-right (intent was announced at player turn start)
 *   3. Enemies re-roll intent for next turn
 *
 * Emits granular events so the React HUD stays in sync.
 */
export class CombatManager {
  private board: Board;
  private player: Player;
  private enemies: Enemy[] = [];
  private resolver: ResourceResolver;
  private traits: TraitSystem;
  private artifacts: ArtifactSystem;
  private hazardManager: BoardHazardManager;
  private bossController: BossController | null = null;
  private eliteModifier: EliteModifier | null = null;
  private phase: CombatPhase = 'turn-start';
  private turnNumber = 0;
  private swapsPerTurn: number;
  private swapsRemaining = 0;
  private targetedEnemyIndex = 0;
  private isDeadeyeActive = false;
  private deadeyeShotsRemaining = 0;
  private deadeyeMaxShots: number;
  private isBoss: boolean;
  /** Turn limit for timed encounters. 0 = unlimited. */
  private turnLimit: number;
  /** Damage dealt to the player when a timed encounter expires. */
  private timedFailureDamage: number;
  /** Next match multiplier from consumables (Moonshine 2x, Strong Coffee 1.5x). */
  private nextMatchMultiplier = 1.0;
  /** Track if any enemy died during the current swap resolution. */
  private enemyDiedThisSwap = false;
  /** Track swaps used this turn for Sharpshooter's Eye reset. */
  private swapsUsedThisTurn = 0;
  /** Whether the current swap being resolved was non-adjacent (lasso). */
  private currentSwapIsLasso = false;
  /** Whether a ricochet triggered a random tile removal that needs gravity+cascade resolution. */
  private ricochetTriggeredThisResolution = false;
  /** Total damage dealt to enemies this fight (for scoring). */
  private damageDealtThisFight = 0;

  constructor(board: Board, config: CombatConfig) {
    this.board = board;
    this.resolver = new ResourceResolver();
    this.hazardManager = new BoardHazardManager(board);
    this.isBoss = config.isBoss ?? false;
    this.turnLimit = config.turnLimit ?? 0;
    this.timedFailureDamage = config.timedFailureDamage ?? 0;

    // Initialize trait and artifact systems
    this.traits = new TraitSystem(config.traitCounts);
    this.artifacts = new ArtifactSystem(config.artifacts);

    // Base swaps + trait bonus
    const baseSwaps = config.swapsPerTurn ?? 3;
    this.swapsPerTurn = baseSwaps + this.traits.getExtraSwapsPerTurn();

    // Deadeye shots: 3 base, 6 with Fully Loaded, or explicit override
    this.deadeyeMaxShots = config.deadeyeShots ?? this.artifacts.getDeadeyeShots();

    // Initialize player from run state
    this.player = new Player(
      config.playerHealth,
      config.playerMaxHealth,
      config.abilityCharge,
      config.activeTileTypes,
      config.tileUpgrades,
      config.playerGold,
    );

    // Initialize enemies
    for (const def of config.enemies) {
      this.enemies.push(new Enemy(def));
    }

    // Boss controller for phase-based bosses
    if (config.isBoss && config.enemies.length > 0) {
      this.bossController = new BossController(config.enemies[0].type);
    }

    // Elite modifier: random board modifier at fight start
    if (config.isElite) {
      this.eliteModifier = rollEliteModifier();
      applyEliteModifier(this.eliteModifier, this.hazardManager);
    }

    // Timed encounter: pre-place hazard tiles (e.g. Mine Cart)
    if (this.turnLimit > 0) {
      this.hazardManager.placeRandomSand(3);
      this.hazardManager.placeRandomBombs(1);
    }

    // Set board tile types
    this.board.setActiveTileTypes(config.activeTileTypes);

    // Apply fight-start effects
    this.traits.onFightStart(this.player);
    this.artifacts.onFightStart(this.player);

    // Wire up React -> Phaser actions via EventBus
    this.listenForPlayerActions();

    this.emitFullState();
  }

  // ---------------------------------------------------------------------------
  // Public accessors for subsystems
  // ---------------------------------------------------------------------------

  getTraitSystem(): TraitSystem {
    return this.traits;
  }

  getArtifactSystem(): ArtifactSystem {
    return this.artifacts;
  }

  // ---------------------------------------------------------------------------
  // EventBus Listeners (React -> Phaser)
  // ---------------------------------------------------------------------------

  /** Bound listeners for proper cleanup. */
  private boundListeners: Array<{ event: string; fn: (...args: unknown[]) => void }> = [];

  private listenForPlayerActions(): void {
    const on = (event: string, fn: (...args: unknown[]) => void) => {
      EventBus.on(event, fn);
      this.boundListeners.push({ event, fn });
    };

    on(GameEvent.TARGET_ENEMY, (...args: unknown[]) => {
      const index = args[0] as number;
      this.setTargetedEnemy(index);
    });

    on(GameEvent.USE_CONSUMABLE, (...args: unknown[]) => {
      const consumableId = args[0] as string;
      this.useConsumable(consumableId);
    });

    on(GameEvent.ACTIVATE_ABILITY, () => {
      this.activateDeadeye();
    });

    on(GameEvent.END_TURN_EARLY, () => {
      this.endTurnEarly();
    });

    on(GameEvent.SWAP_REQUESTED, (...args: unknown[]) => {
      const [fromRow, fromCol, toRow, toCol] = args as number[];
      this.performSwap(fromRow, fromCol, toRow, toCol);
    });
  }

  /** Remove all EventBus listeners. Call on scene shutdown. */
  destroy(): void {
    for (const { event, fn } of this.boundListeners) {
      EventBus.off(event, fn);
    }
    this.boundListeners = [];
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  getState(): CombatState {
    return this.buildState();
  }

  getPlayer(): Player {
    return this.player;
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  getPhase(): CombatPhase {
    return this.phase;
  }

  getTargetedEnemy(): Enemy | null {
    const alive = this.aliveEnemies();
    return alive[this.targetedEnemyIndex] ?? alive[0] ?? null;
  }

  getHazardManager(): BoardHazardManager {
    return this.hazardManager;
  }

  getEliteModifier(): EliteModifier | null {
    return this.eliteModifier;
  }

  getBossPhase(): number | null {
    return this.bossController?.getPhase() ?? null;
  }

  // ---------------------------------------------------------------------------
  // Turn Flow
  // ---------------------------------------------------------------------------

  /**
   * Start a new player turn. Called at combat start and after each enemy turn.
   */
  startTurn(): void {
    if (this.isCombatOver()) return;

    this.turnNumber++;

    // Timed encounter: if turn limit exceeded, apply failure damage and end
    if (this.turnLimit > 0 && this.turnNumber > this.turnLimit) {
      this.resolveTimedEncounterFailure();
      return;
    }

    this.swapsRemaining = this.swapsPerTurn;
    this.nextMatchMultiplier = 1.0;
    this.swapsUsedThisTurn = 0;

    // Tick suppress (warrant) durations -- expires at start of player turn
    const expired = this.hazardManager.tickSuppressions();
    if (expired.length > 0) {
      console.log(`Warrants expired: ${expired.join(', ')}`);
    }

    // Per-turn: +1 ability charge
    this.player.abilityCharge++;

    // Trait turn-start effects (Sheriff block, etc.)
    this.traits.onTurnStart(this.player);

    // Artifact turn-start effects (Stolen Badge block, etc.)
    this.artifacts.onTurnStart(this.player);

    // Announce enemy intents for this turn (using type-specific AI)
    for (const enemy of this.aliveEnemies()) {
      if (this.bossController && this.isBossEnemy(enemy)) {
        enemy.state.intent = this.bossController.chooseBossIntent(
          enemy,
          this.aliveEnemies().length,
          this.hazardManager,
        );
      } else if (this.isTimedEnemy(enemy)) {
        // Timed enemies show countdown instead of a real attack intent
        const turnsLeft = this.turnLimit - this.turnNumber;
        enemy.state.intent = chooseMineCartTimedIntent(turnsLeft, this.timedFailureDamage);
      } else {
        enemy.state.intent = chooseEnemyIntent(enemy, this.aliveEnemies().length);
      }
    }

    this.setPhase('consumable-window');
    EventBus.emit(GameEvent.TURN_START, this.buildState());
    EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
    EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);
  }

  /**
   * Transition from consumable window to swap phase.
   * Called when the player is done using consumables (or immediately if none).
   */
  enterSwapPhase(): void {
    if (this.phase !== 'consumable-window') return;
    this.setPhase('swap-phase');
  }

  /**
   * Perform a swap. Validates the move, resolves matches + cascades,
   * applies all resources, then checks if swaps are exhausted.
   */
  async performSwap(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number,
  ): Promise<void> {
    // Auto-enter swap phase from consumable window when player starts swapping
    if (this.phase === 'consumable-window') {
      this.enterSwapPhase();
    }
    if (this.phase !== 'swap-phase' || this.swapsRemaining <= 0) return;
    if (this.board.getIsResolving()) return;

    this.swapsRemaining--;
    this.swapsUsedThisTurn++;
    this.setPhase('resolving');
    EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);

    console.log('swapped');

    const from = { row: fromRow, col: fromCol };
    const to = { row: toRow, col: toCol };

    // Track whether this swap is non-adjacent (lasso) for Mustang(4) bonus
    this.currentSwapIsLasso = !this.board.isAdjacent(from, to);

    // Track trait/artifact swap hooks
    this.traits.onSwapPerformed();
    this.enemyDiedThisSwap = false;
    this.ricochetTriggeredThisResolution = false;

    // Process each cascade step's matches immediately (damage, block, etc.)
    const onCascadeStep = (stepMatches: MatchResult[]) => {
      for (const match of stepMatches) {
        this.hazardManager.resolveAdjacentHazards(match.tiles);
      }
      this.processMatches(stepMatches);
      // Emit full state so React HUD updates (HP bars, etc.) mid-cascade
      this.emitFullState();
      this.emitEnemyHpChanges();
      EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
      EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
    };

    const result: SwapResult = await this.board.trySwap(from, to, onCascadeStep);

    if (!result.valid) {
      // Invalid swap -- refund
      this.swapsRemaining++;
      this.swapsUsedThisTurn--;
      EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
      this.setPhase('swap-phase');
      return;
    }

    // Ricochet: apply gravity + fill the gap(s) left by triggered tiles,
    // then resolve any new cascades. Loop in case a cascade produces more ricochets.
    while (this.ricochetTriggeredThisResolution) {
      this.ricochetTriggeredThisResolution = false;
      this.board.applyGravityAndFill();
      const ricochetCascades = await this.board.resolveMatches();
      if (ricochetCascades.length > 0) {
        this.processMatches(ricochetCascades);
      }
    }

    // Artifact swap hook (check for Quickdraw kill refund)
    const swapResult = this.artifacts.onSwapPerformed(this.enemyDiedThisSwap);
    if (swapResult.refundSwaps) {
      this.swapsRemaining = this.swapsPerTurn;
      EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
    }

    // Auto-retarget if targeted enemy died during cascade
    const alive = this.aliveEnemies();
    if (alive.length > 0 && this.targetedEnemyIndex >= alive.length) {
      this.targetedEnemyIndex = 0;
    }

    if (this.isCombatOver()) {
      this.endCombat();
      return;
    }

    if (this.swapsRemaining <= 0) {
      this.endTurn();
    } else {
      this.setPhase('swap-phase');
    }
  }

  /**
   * End the player's turn early (before using all swaps).
   */
  endTurnEarly(): void {
    if (this.phase !== 'swap-phase' && this.phase !== 'consumable-window') return;
    this.endTurn();
  }

  /**
   * Switch which enemy is targeted. Free action, available at any time.
   */
  setTargetedEnemy(fullListIndex: number): void {
    // Convert full-list index (from UI) to alive-list index (internal)
    const enemy = this.enemies[fullListIndex];
    if (!enemy || enemy.state.isDead) return;
    const alive = this.aliveEnemies();
    const aliveIndex = alive.indexOf(enemy);
    if (aliveIndex >= 0) {
      this.targetedEnemyIndex = aliveIndex;
      this.emitFullState();
    }
  }

  // ---------------------------------------------------------------------------
  // Deadeye Ability
  // ---------------------------------------------------------------------------

  /**
   * Activate Deadeye if charged. Enters targeting mode.
   */
  activateDeadeye(): boolean {
    if (this.phase !== 'swap-phase' && this.phase !== 'consumable-window') return false;
    if (!this.player.activateDeadeye()) return false;

    this.isDeadeyeActive = true;
    this.deadeyeShotsRemaining = this.deadeyeMaxShots;
    this.emitFullState();
    EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);
    return true;
  }

  /**
   * Fire a Deadeye shot at a specific tile position.
   * Destroys the tile and generates its resource.
   * Deadeye + Showdown: shooting a showdown tile clears all tiles of a random type.
   */
  deadeyeShoot(row: number, col: number): void {
    if (!this.isDeadeyeActive || this.deadeyeShotsRemaining <= 0) return;

    const tile = this.board.getTileAt({ row, col });
    if (!tile) return;

    const type = tile.type;

    // Handle showdown tile: clears all tiles of a random type on the board
    if (tile.isShowdown) {
      // Destroy the showdown tile first
      const grid = this.board.getGrid();
      grid[row][col]?.destroy();
      grid[row][col] = null;

      // Pick a random tile type and clear all of them
      const types = this.board.getActiveTileTypes();
      const randomType = types[Math.floor(Math.random() * types.length)];
      const upgradeLevel = this.player.getUpgradeLevel(randomType);

      const count = this.board.clearAllOfType(randomType);
      // Generate resources for each cleared tile (1.0x per tile)
      if (count > 0) {
        const output = this.resolver.resolveCount(randomType, count, upgradeLevel);
        this.applyResourceOutput(output);
      }
    } else {
      // Normal tile: destroy and generate resource
      const upgradeLevel = this.player.getUpgradeLevel(type);
      const output = this.resolver.resolveSingle(type, upgradeLevel);
      this.applyResourceOutput(output);

      // Destroy the tile on the board
      const grid = this.board.getGrid();
      grid[row][col]?.destroy();
      grid[row][col] = null;
    }

    this.deadeyeShotsRemaining--;

    if (this.deadeyeShotsRemaining <= 0) {
      this.endDeadeye();
    }

    this.emitFullState();
  }

  private async endDeadeye(): Promise<void> {
    this.isDeadeyeActive = false;
    this.deadeyeShotsRemaining = 0;

    // Apply gravity + fill after all shots, then resolve cascades
    this.board.applyGravityAndFill();
    const cascadeMatches = await this.board.resolveMatches();
    this.processMatches(cascadeMatches);

    if (this.isCombatOver()) {
      this.endCombat();
    }

    this.emitFullState();
  }

  // ---------------------------------------------------------------------------
  // Consumable Usage
  // ---------------------------------------------------------------------------

  /**
   * Use a consumable by ID. Only valid during the consumable window.
   * Returns true if consumed.
   */
  useConsumable(consumableId: string): boolean {
    if (this.phase !== 'consumable-window') return false;

    switch (consumableId) {
      case 'tonic':
        this.player.heal(20);
        break;
      case 'bandage':
        this.player.heal(10);
        this.hazardManager.clearAllOfType('poison');
        break;
      case 'barbed_wire':
        this.player.thorns = 1;
        break;
      case 'moonshine':
        this.nextMatchMultiplier = 2.0;
        this.player.takeDamage(5);
        break;
      case 'strong_coffee':
        this.nextMatchMultiplier = 1.5;
        break;
      case 'pocket_watch':
        this.swapsRemaining++;
        EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
        break;
      case 'wanted_flyer': {
        const target = this.getTargetedAliveEnemy();
        if (target) target.addVulnerable(2);
        break;
      }
      case 'smoke_bomb': {
        const target = this.getTargetedAliveEnemy();
        if (target) target.skipNextAction = true;
        break;
      }
      case 'skeleton_key':
        this.hazardManager.clearAllOfType('lock');
        this.hazardManager.clearAllOfType('hardened_lock');
        break;
      case 'tumbleweed':
        this.board.reshuffle();
        break;
      case 'signal_flare':
        this.hazardManager.clearAllOfType('sand');
        break;
      case 'stick_of_tnt':
        this.resolveStickOfTNT();
        break;
      case 'snake_oil':
        this.resolveSnakeOil();
        break;
      default:
        return false;
    }

    EventBus.emit(GameEvent.CONSUMABLE_USED, consumableId);
    EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
    this.emitFullState();
    return true;
  }

  private resolveSnakeOil(): void {
    const roll = Math.random();
    if (roll < 0.25) {
      this.player.heal(15);
    } else if (roll < 0.5) {
      const target = this.getTargetedAliveEnemy();
      if (target) this.damageDealtThisFight += target.takeDamage(15);
    } else if (roll < 0.75) {
      this.player.addGold(10);
    } else {
      // Poison: small self-damage
      this.player.takeDamage(8);
    }
  }

  private resolveStickOfTNT(): void {
    // Clear entire row (middle row for max impact)
    const boardSize = this.board.getBoardSize();
    const targetRow = Math.floor(boardSize / 2);
    const grid = this.board.getGrid();

    for (let col = 0; col < boardSize; col++) {
      const tile = grid[targetRow][col];
      if (tile) {
        const upgradeLevel = this.player.getUpgradeLevel(tile.type);
        const output = this.resolver.resolveSingle(tile.type, upgradeLevel);
        this.applyResourceOutput(output);
        tile.destroy();
        grid[targetRow][col] = null;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Match Processing & Resource Application
  // ---------------------------------------------------------------------------

  private processMatches(matches: MatchResult[]): void {
    for (const match of matches) {
      // Warrant (suppress): suppressed tile types produce zero output entirely.
      // Skip all trait/artifact/crit/multiplier processing so nothing leaks through.
      if (this.hazardManager.isSuppressed(match.tileType)) {
        const zero: ResourceOutput = {
          damage: 0, block: 0, gold: 0, healing: 0,
          abilityCharges: 0, dodgePercent: 0, venomStacks: 0,
          critPercent: 0, aceMultiplier: 0, isAoE: false,
        };
        console.log(`${match.length}-match ${match.tileType} - SUPPRESSED (warrant)`);
        EventBus.emit(GameEvent.MATCH_RESOLVED, match, zero);
        continue;
      }

      const upgradeLevel = this.player.getUpgradeLevel(match.tileType);
      let output = this.resolver.resolve(match, upgradeLevel);

      // Fool's gold: reduce gold proportionally to how many tiles were fake
      if (match.foolsGoldCount && match.foolsGoldCount > 0) {
        const realTiles = match.tiles.length - match.foolsGoldCount;
        output.gold = realTiles > 0
          ? Math.round(output.gold * (realTiles / match.tiles.length))
          : 0;
      }

      const targetEnemy = this.getTargetedAliveEnemy();

      // Trait modifications (Outlaw bonus damage, Sheriff iron block, Prospector gold, etc.)
      output = this.traits.modifyMatchOutput(match, output, this.player, targetEnemy, this.currentSwapIsLasso);

      // Artifact modifications (Gold Tooth, Bandit's Bandana, Rusty Deputy Badge, etc.)
      output = this.artifacts.modifyMatchOutput(
        match, output, this.player, targetEnemy, this.aliveEnemies(),
      );

      // Crit check (with trait/artifact modifications)
      const effectiveCritChance = this.player.critChance + this.artifacts.getSwapCritBonus()
        + (this.isBoss ? this.artifacts.getBossCritBonus() : 0);
      const isCrit = Math.random() * 100 < effectiveCritChance;
      let multiplier = 1.0;

      if (isCrit) {
        const critConfig = this.traits.getCritConfig();
        multiplier = critConfig.multiplier;

        // Gunslinger(2) bonus flat damage
        if (critConfig.bonusFlatDamage > 0) {
          output.damage += critConfig.bonusFlatDamage;
        }

        // Reset or halve crit chance based on Gunslinger(4)
        if (critConfig.halveOnTrigger) {
          this.player.critChance = Math.floor(this.player.critChance / 2);
        } else {
          this.player.critChance = 0;
        }

        // Artifact crit effects (Dead Man's Hand, Rigged Deck)
        this.artifacts.onCritTriggered(this.player, targetEnemy);
      }

      // Ace multiplier: consumed on next non-Ace match
      if (match.tileType !== 'ace' && this.player.aceMultiplier > 1.0) {
        multiplier *= this.player.aceMultiplier;
        this.player.aceMultiplier = 1.0;
      }

      // Consumable match multiplier (Moonshine/Coffee) -- applies to first match only
      if (this.nextMatchMultiplier > 1.0) {
        multiplier *= this.nextMatchMultiplier;
        this.nextMatchMultiplier = 1.0;
      }

      // Cracked Ground: suppress cascade damage for first 2 turns
      const eliteId = this.eliteModifier?.id as EliteModifierId | null;
      const suppressDamage = shouldSuppressCascadeDamage(eliteId, this.turnNumber);

      // Apply multiplier to damage/block/gold/healing (not to status effects)
      const scaled: ResourceOutput = {
        ...output,
        damage: suppressDamage ? 0 : Math.round(output.damage * multiplier),
        block: Math.round(output.block * multiplier),
        gold: Math.round(output.gold * multiplier),
        healing: Math.round(output.healing * multiplier),
        // These are NOT scaled by match bonus or multipliers:
        abilityCharges: output.abilityCharges,
        dodgePercent: output.dodgePercent,
        venomStacks: output.venomStacks,
        critPercent: output.critPercent,
        aceMultiplier: output.aceMultiplier,
        isAoE: output.isAoE,
      };

      // Log match details
      const prefix = match.isShowdown ? 'showdown' : `${match.length}-match`;
      const parts: string[] = [`${prefix} ${match.tileType}`];
      if (scaled.damage > 0) parts.push(`${scaled.damage} damage`);
      if (scaled.block > 0) parts.push(`${scaled.block} block`);
      if (scaled.gold > 0) parts.push(`${scaled.gold} gold`);
      if (scaled.healing > 0) parts.push(`${scaled.healing} healing`);
      if (scaled.venomStacks > 0) parts.push(`${scaled.venomStacks} venom`);
      if (scaled.dodgePercent > 0) parts.push(`${scaled.dodgePercent}% dodge`);
      if (scaled.abilityCharges > 0) parts.push(`${scaled.abilityCharges} charges`);
      if (isCrit) parts.push('CRIT');
      console.log(parts.join(' - '));

      this.applyResourceOutput(scaled);

      // Flash a line from match to targeted enemy on damage
      if (scaled.damage > 0 && !scaled.isAoE) {
        const mid = match.tiles[Math.floor(match.tiles.length / 2)];
        const alive = this.aliveEnemies();
        const target = alive[this.targetedEnemyIndex];
        const fullIdx = target ? this.enemies.indexOf(target) : 0;
        EventBus.emit(GameEvent.FLASH_LINE_TO_ENEMY, mid, match.tileType, fullIdx, this.enemies.length);
      }

      // Ricochet: after the match resolves, trigger one random remaining tile
      if (match.tileType === 'ricochet') {
        this.triggerRandomTileForRicochet(match);
      }

      // Check if an enemy died from this match
      for (const enemy of this.enemies) {
        if (enemy.state.isDead) {
          this.enemyDiedThisSwap = true;
        }
      }

      EventBus.emit(GameEvent.MATCH_RESOLVED, match, scaled);
    }
  }

  /**
   * Select a random tile on the board, fire its effect, and remove it.
   * Marks ricochetTriggeredThisResolution so the caller can apply
   * gravity + fill + cascade resolution after processMatches completes.
   */
  private triggerRandomTileForRicochet(sourceMatch: MatchResult): void {
    const result = this.board.pickAndRemoveRandomTile();
    if (result === null) return;

    const upgradeLevel = this.player.getUpgradeLevel(result.type);
    const isSuppressed = this.hazardManager.isSuppressed(result.type);
    const output = isSuppressed
      ? { damage: 0, block: 0, gold: 0, healing: 0, abilityCharges: 0, dodgePercent: 0, venomStacks: 0, critPercent: 0, aceMultiplier: 0, isAoE: false }
      : this.resolver.resolveSingle(result.type, upgradeLevel);
    console.log(`ricochet destroyed ${result.type} tile${isSuppressed ? ' (suppressed)' : ''}`);
    this.applyResourceOutput(output);
    this.ricochetTriggeredThisResolution = true;

    // Flash a line from source match center to the destroyed tile
    const mid = sourceMatch.tiles[Math.floor(sourceMatch.tiles.length / 2)];
    EventBus.emit(GameEvent.FLASH_LINE, mid, result.position, sourceMatch.tileType);
  }

  private applyResourceOutput(output: ResourceOutput): void {
    // Damage
    if (output.damage > 0) {
      if (output.isAoE) {
        for (const enemy of this.aliveEnemies()) {
          this.damageDealtThisFight += enemy.takeDamage(output.damage);
        }
      } else {
        const target = this.getTargetedAliveEnemy();
        if (target) this.damageDealtThisFight += target.takeDamage(output.damage);
      }
      this.emitEnemyHpChanges();
    }

    // Block
    if (output.block > 0) {
      this.player.addBlock(output.block);
    }

    // Gold
    if (output.gold > 0) {
      this.player.addGold(output.gold);
      EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
    }

    // Healing
    if (output.healing > 0) {
      this.player.heal(output.healing);
      EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
    }

    // Ability charges
    if (output.abilityCharges > 0) {
      this.player.abilityCharge += output.abilityCharges;
      EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);
    }

    // Dodge
    if (output.dodgePercent > 0) {
      this.player.dodgeChance = Math.min(50, this.player.dodgeChance + output.dodgePercent);
    }

    // Venom (applied to targeted enemy)
    if (output.venomStacks > 0) {
      const target = this.getTargetedAliveEnemy();
      if (target) target.addVenom(output.venomStacks);
    }

    // Crit chance
    if (output.critPercent > 0) {
      this.player.critChance += output.critPercent;
    }

    // Ace multiplier (stacks within a fight)
    if (output.aceMultiplier > 0) {
      this.player.aceMultiplier += output.aceMultiplier;
    }

    EventBus.emit(GameEvent.STATUS_EFFECT_CHANGE);
  }

  // ---------------------------------------------------------------------------
  // Turn End & Enemy Turn
  // ---------------------------------------------------------------------------

  private endTurn(): void {
    // Trait turn-end effects (Prospector gold damage)
    const targetEnemy = this.getTargetedAliveEnemy();
    const hpBefore = targetEnemy ? targetEnemy.state.health : 0;
    const bonusDamage = this.traits.onTurnEnd(this.player, targetEnemy);
    if (bonusDamage > 0) {
      const hpAfter = targetEnemy ? targetEnemy.state.health : 0;
      this.damageDealtThisFight += Math.max(0, hpBefore - hpAfter);
      this.emitEnemyHpChanges();
      EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
    }

    // Artifact turn-end effects (Sharpshooter's Eye reset)
    this.artifacts.onTurnEnd();

    if (this.isCombatOver()) {
      this.endCombat();
      return;
    }

    this.setPhase('enemy-turn');
    EventBus.emit(GameEvent.TURN_END, this.buildState());

    this.executeEnemyTurn();

    // Player block expires after the enemy turn so it absorbs incoming attacks
    this.player.resetTurnEffects();
    this.emitFullState();

    if (this.isCombatOver()) {
      this.endCombat();
      return;
    }

    // Start next player turn
    this.startTurn();
  }

  private executeEnemyTurn(): void {
    // 1. Venom ticks on all enemies (upgrade adds +1 bonus damage per tick per level)
    const venomUpgrade = this.player.getUpgradeLevel('venom');
    for (const enemy of this.aliveEnemies()) {
      const venomDamage = enemy.tickVenom(venomUpgrade);
      if (venomDamage > 0) {
        this.damageDealtThisFight += venomDamage;
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
      }
    }

    // Check for deaths from venom
    if (this.isCombatOver()) return;

    // 2. Tick bomb countdowns -- detonations damage the player
    const bombResult = this.hazardManager.tickBombs();
    if (bombResult.totalDamage > 0) {
      this.player.takeDamage(bombResult.totalDamage);
      EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
      if (this.player.isDead()) return;
    }

    // 3. Boss per-turn effects (passive locks, bombs, etc.)
    if (this.bossController) {
      const boss = this.getBossEnemy();
      if (boss) {
        this.bossController.checkPhaseTransition(boss, this.hazardManager, this.board);
        this.bossController.executePerTurnEffects(this.hazardManager, boss);
      }
    }

    // 4. Each alive enemy acts (left to right)
    for (const enemy of this.aliveEnemies()) {
      // Re-check: enemy may have died from venom, thorns, or mid-turn effects
      if (enemy.state.isDead) continue;
      // Timed enemies (Mine Cart) don't attack -- damage only on time expiry
      if (this.isTimedEnemy(enemy)) continue;
      const action = enemy.executeIntent();

      switch (action.type) {
        case 'attack': {
          if (action.value > 0) {
            const { thornsDamage } = this.player.takeDamage(action.value);
            EventBus.emit(
              GameEvent.PLAYER_HP_CHANGE,
              this.player.health,
              this.player.maxHealth,
            );

            // Thorns reflects damage back to the attacking enemy
            if (thornsDamage > 0) {
              this.damageDealtThisFight += enemy.takeDamage(thornsDamage);
              EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
            }

            // Sheriff(5): block reflects 100% of absorbed damage back to attacker
            // This is already handled by thorns mechanism in Player.takeDamage
            // when Sheriff(5) is active. We handle it via enhanced block logic.
          }
          break;
        }
        case 'block':
          // Block was already applied in executeIntent
          break;
        case 'summon':
          this.trySummonEnemy(enemy);
          break;
        case 'board-manipulation':
          if (enemy.state.intent.description.startsWith('SUPPRESS')) {
            // Suppress (warrant): handled here because it needs player's active tile types
            const count = enemy.state.intent.value ?? 1;
            const suppressed = this.hazardManager.suppressRandomTypes(
              count,
              this.player.activeTileTypes,
            );
            if (suppressed.length > 0) {
              console.log(`${enemy.getDefinition().name} suppresses: ${suppressed.join(', ')}`);
            }
          } else {
            executeBoardManipulation(enemy, enemy.state.intent, this.hazardManager);
          }
          break;
        case 'ability':
          break;
      }

      if (this.player.isDead()) return;
    }
  }

  /**
   * Try to summon a new enemy. Max 3 on field.
   * Boss summons use BossController.createBossMinion for SPEC-accurate minions.
   */
  private trySummonEnemy(summoner: Enemy): void {
    if (this.aliveEnemies().length >= 3) return;

    // Boss summons a specific minion type
    if (this.bossController && this.isBossEnemy(summoner)) {
      const minionDef = BossController.createBossMinion(summoner.getDefinition().type);
      if (minionDef) {
        this.enemies.push(new Enemy(minionDef));
        this.emitFullState();
        return;
      }
    }

    // Regular summon: weaker version of the summoner's type
    const def = summoner.getDefinition();
    const minionDef: EnemyDefinition = {
      type: def.type,
      name: def.name,
      health: Math.round(def.health * 0.5),
      minDamage: def.minDamage,
      maxDamage: Math.round(def.maxDamage * 0.7),
      abilities: [],
    };
    const minion = new Enemy(minionDef);

    // Coyote Pelt: summoned enemies take 5 damage immediately
    const hpBeforeSummon = minion.state.health;
    this.artifacts.onEnemySummoned(minion);
    this.damageDealtThisFight += Math.max(0, hpBeforeSummon - minion.state.health);

    this.enemies.push(minion);
    this.emitFullState();
  }

  // ---------------------------------------------------------------------------
  // Combat End
  // ---------------------------------------------------------------------------

  private isCombatOver(): boolean {
    if (this.player.isDead()) return true;
    if (this.aliveEnemies().length === 0) return true;
    return false;
  }

  private endCombat(): void {
    const victory = !this.player.isDead();

    this.setPhase('combat-end');

    // Reset per-fight effects
    this.player.resetFightEffects();

    const result: CombatResult = {
      victory,
      playerHealth: this.player.health,
      playerGold: this.player.gold,
      goldEarned: this.player.goldThisFight,
      abilityCharge: this.player.abilityCharge,
      damageDealt: this.damageDealtThisFight,
    };

    EventBus.emit(GameEvent.COMBAT_END, result);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private aliveEnemies(): Enemy[] {
    return this.enemies.filter((e) => !e.state.isDead);
  }

  private getTargetedAliveEnemy(): Enemy | null {
    const alive = this.aliveEnemies();
    return alive[this.targetedEnemyIndex] ?? alive[0] ?? null;
  }

  /** Check if an enemy is a timed encounter entity (e.g. Mine Cart). */
  private isTimedEnemy(enemy: Enemy): boolean {
    return this.turnLimit > 0 && enemy.getDefinition().type === 'mine_cart';
  }

  /**
   * Resolve a timed encounter that has expired (player ran out of turns).
   * Applies failure damage, marks the timed enemy as "escaped", and ends combat.
   */
  private resolveTimedEncounterFailure(): void {
    // Apply crash damage
    if (this.timedFailureDamage > 0) {
      this.player.takeDamage(this.timedFailureDamage);
      EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
    }

    // Mark all timed enemies as dead (the cart escapes / encounter ends)
    for (const enemy of this.aliveEnemies()) {
      if (this.isTimedEnemy(enemy)) {
        enemy.state.isDead = true;
      }
    }

    this.endCombat();
  }

  private isBossEnemy(enemy: Enemy): boolean {
    // The first enemy in the list is the boss when bossController is active
    return this.enemies.indexOf(enemy) === 0;
  }

  private getBossEnemy(): Enemy | null {
    if (!this.bossController) return null;
    const boss = this.enemies[0];
    return boss && !boss.state.isDead ? boss : null;
  }

  private setPhase(phase: CombatPhase): void {
    this.phase = phase;
    this.emitFullState();
  }

  private buildState(): CombatState {
    // Convert alive-list index to full-list index for the UI
    const alive = this.aliveEnemies();
    const targetedEnemy = alive[this.targetedEnemyIndex] ?? alive[0];
    const fullListIndex = targetedEnemy
      ? this.enemies.indexOf(targetedEnemy)
      : 0;

    return {
      turnNumber: this.turnNumber,
      swapsRemaining: this.swapsRemaining,
      swapsPerTurn: this.swapsPerTurn,
      playerBlock: this.player.block,
      dodgeChance: this.player.dodgeChance,
      aceMultiplier: this.player.aceMultiplier,
      critChance: this.player.critChance,
      thorns: this.player.thorns,
      enemies: this.enemies.map((e) => ({ ...e.state })),
      targetedEnemyIndex: fullListIndex,
      phase: this.phase,
      abilityCharge: this.player.abilityCharge,
      abilityThreshold: this.player.abilityThreshold,
      isDeadeyeActive: this.isDeadeyeActive,
      deadeyeShotsRemaining: this.deadeyeShotsRemaining,
      turnLimit: this.turnLimit,
      suppressedTileTypes: this.hazardManager.getSuppressedTypes(),
    };
  }

  private emitFullState(): void {
    EventBus.emit(GameEvent.COMBAT_STATE_UPDATE, this.buildState());
  }

  private emitEnemyHpChanges(): void {
    for (const enemy of this.enemies) {
      EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
    }
  }
}
