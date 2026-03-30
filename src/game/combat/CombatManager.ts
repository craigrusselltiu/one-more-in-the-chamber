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
  isBoss?: boolean;
}

export interface CombatResult {
  victory: boolean;
  playerHealth: number;
  playerGold: number;
  goldEarned: number;
  abilityCharge: number;
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
  private phase: CombatPhase = 'turn-start';
  private turnNumber = 0;
  private swapsPerTurn: number;
  private swapsRemaining = 0;
  private targetedEnemyIndex = 0;
  private isDeadeyeActive = false;
  private deadeyeShotsRemaining = 0;
  private deadeyeMaxShots: number;
  private isBoss: boolean;
  /** Next match multiplier from consumables (Moonshine 2x, Strong Coffee 1.5x). */
  private nextMatchMultiplier = 1.0;
  /** Track if any enemy died during the current swap resolution. */
  private enemyDiedThisSwap = false;
  /** Track swaps used this turn for Sharpshooter's Eye reset. */
  private swapsUsedThisTurn = 0;

  constructor(board: Board, config: CombatConfig) {
    this.board = board;
    this.resolver = new ResourceResolver();
    this.isBoss = config.isBoss ?? false;

    // Initialize trait and artifact systems
    this.traits = new TraitSystem(config.traitCounts);
    this.artifacts = new ArtifactSystem(config.artifacts);

    // Base swaps + trait bonus
    const baseSwaps = config.swapsPerTurn ?? 2;
    this.swapsPerTurn = baseSwaps + this.traits.getExtraSwapsPerTurn();

    // Deadeye shots: 3 base, 6 with Fully Loaded
    this.deadeyeMaxShots = this.artifacts.getDeadeyeShots();

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

  private listenForPlayerActions(): void {
    EventBus.on(GameEvent.TARGET_ENEMY, (...args: unknown[]) => {
      const index = args[0] as number;
      this.setTargetedEnemy(index);
    });

    EventBus.on(GameEvent.USE_CONSUMABLE, (...args: unknown[]) => {
      const consumableId = args[0] as string;
      this.useConsumable(consumableId);
    });

    EventBus.on(GameEvent.ACTIVATE_ABILITY, () => {
      this.activateDeadeye();
    });

    EventBus.on(GameEvent.END_TURN_EARLY, () => {
      this.endTurnEarly();
    });
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

  // ---------------------------------------------------------------------------
  // Turn Flow
  // ---------------------------------------------------------------------------

  /**
   * Start a new player turn. Called at combat start and after each enemy turn.
   */
  startTurn(): void {
    if (this.isCombatOver()) return;

    this.turnNumber++;
    this.swapsRemaining = this.swapsPerTurn;
    this.nextMatchMultiplier = 1.0;
    this.swapsUsedThisTurn = 0;

    // Per-turn: +1 ability charge
    this.player.abilityCharge++;

    // Trait turn-start effects (Sheriff block, etc.)
    this.traits.onTurnStart(this.player);

    // Artifact turn-start effects (Stolen Badge block, etc.)
    this.artifacts.onTurnStart(this.player);

    // Announce enemy intents for this turn
    for (const enemy of this.aliveEnemies()) {
      enemy.rollNextIntent();
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
    if (this.phase !== 'swap-phase' || this.swapsRemaining <= 0) return;
    if (this.board.getIsResolving()) return;

    this.swapsRemaining--;
    this.swapsUsedThisTurn++;
    this.setPhase('resolving');
    EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);

    const from = { row: fromRow, col: fromCol };
    const to = { row: toRow, col: toCol };

    const result: SwapResult = await this.board.trySwap(from, to);

    if (!result.valid) {
      // Invalid swap -- refund
      this.swapsRemaining++;
      this.swapsUsedThisTurn--;
      EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
      this.setPhase('swap-phase');
      return;
    }

    // Track trait/artifact swap hooks
    this.traits.onSwapPerformed();
    this.enemyDiedThisSwap = false;

    // Process all matches from this swap (including cascades)
    this.processMatches(result.matches);

    // Artifact swap hook (check for Quickdraw kill refund)
    const swapResult = this.artifacts.onSwapPerformed(this.enemyDiedThisSwap);
    if (swapResult.refundSwaps) {
      this.swapsRemaining = this.swapsPerTurn;
      EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
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
  setTargetedEnemy(index: number): void {
    const alive = this.aliveEnemies();
    if (index >= 0 && index < alive.length) {
      this.targetedEnemyIndex = index;
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
   */
  deadeyeShoot(row: number, col: number): void {
    if (!this.isDeadeyeActive || this.deadeyeShotsRemaining <= 0) return;

    const tile = this.board.getTileAt({ row, col });
    if (!tile) return;

    const type = tile.type;
    const upgradeLevel = this.player.getUpgradeLevel(type);

    // Handle showdown tile: clears all tiles of a random type
    if (tile.isShowdown) {
      const types = this.board.getActiveTileTypes();
      const randomType = types[Math.floor(Math.random() * types.length)];
      const output = this.resolver.resolveSingle(randomType, upgradeLevel);
      this.applyResourceOutput(output);
    } else {
      // Normal tile: destroy and generate resource
      const output = this.resolver.resolveSingle(type, upgradeLevel);
      this.applyResourceOutput(output);
    }

    // Destroy the tile on the board (gravity + cascade handled after all shots)
    const grid = this.board.getGrid();
    grid[row][col]?.destroy();
    grid[row][col] = null;

    this.deadeyeShotsRemaining--;

    if (this.deadeyeShotsRemaining <= 0) {
      this.endDeadeye();
    }

    this.emitFullState();
  }

  private async endDeadeye(): Promise<void> {
    this.isDeadeyeActive = false;
    this.deadeyeShotsRemaining = 0;

    // Resolve gravity + cascades after all shots
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
        this.board.clearHazardsByType('poison');
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
        this.board.clearHazardsByType('lock');
        break;
      case 'tumbleweed':
        this.board.reshuffle();
        break;
      case 'signal_flare':
        this.board.clearHazardsByType('sand');
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
      if (target) target.takeDamage(15);
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
      const upgradeLevel = this.player.getUpgradeLevel(match.tileType);
      let output = this.resolver.resolve(match, upgradeLevel);
      const targetEnemy = this.getTargetedAliveEnemy();

      // Trait modifications (Outlaw bonus damage, Sheriff iron block, Prospector gold, etc.)
      output = this.traits.modifyMatchOutput(match, output, this.player, targetEnemy);

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

      // Apply multiplier to damage/block/gold/healing (not to status effects)
      const scaled: ResourceOutput = {
        ...output,
        damage: Math.round(output.damage * multiplier),
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

      this.applyResourceOutput(scaled);

      // Check if an enemy died from this match
      for (const enemy of this.enemies) {
        if (enemy.state.isDead) {
          this.enemyDiedThisSwap = true;
        }
      }

      EventBus.emit(GameEvent.MATCH_RESOLVED, match, scaled);
    }
  }

  private applyResourceOutput(output: ResourceOutput): void {
    // Damage
    if (output.damage > 0) {
      if (output.isAoE) {
        for (const enemy of this.aliveEnemies()) {
          enemy.takeDamage(output.damage);
        }
      } else {
        const target = this.getTargetedAliveEnemy();
        if (target) target.takeDamage(output.damage);
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
    const bonusDamage = this.traits.onTurnEnd(this.player, targetEnemy);
    if (bonusDamage > 0) {
      this.emitEnemyHpChanges();
      EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
    }

    // Artifact turn-end effects (Sharpshooter's Eye reset)
    this.artifacts.onTurnEnd();

    // Player block expires at turn end
    this.player.resetTurnEffects();

    if (this.isCombatOver()) {
      this.endCombat();
      return;
    }

    this.setPhase('enemy-turn');
    EventBus.emit(GameEvent.TURN_END, this.buildState());

    this.executeEnemyTurn();

    if (this.isCombatOver()) {
      this.endCombat();
      return;
    }

    // Start next player turn
    this.startTurn();
  }

  private executeEnemyTurn(): void {
    // 1. Venom ticks on all enemies
    for (const enemy of this.aliveEnemies()) {
      const venomDamage = enemy.tickVenom();
      if (venomDamage > 0) {
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
      }
    }

    // Check for deaths from venom
    if (this.isCombatOver()) return;

    // 2. Each alive enemy acts (left to right)
    for (const enemy of this.aliveEnemies()) {
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
              enemy.takeDamage(thornsDamage);
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
          // Board manipulation is a stub for now -- will be wired to hazard system
          break;
        case 'ability':
          // Generic ability -- no additional effect beyond what executeIntent does
          break;
      }

      if (this.player.isDead()) return;
    }
  }

  /**
   * Try to summon a new enemy. Max 3 on field.
   */
  private trySummonEnemy(summoner: Enemy): void {
    if (this.aliveEnemies().length >= 3) return;

    // Summon a weaker version of the summoner's type
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
    this.artifacts.onEnemySummoned(minion);

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

  private setPhase(phase: CombatPhase): void {
    this.phase = phase;
    this.emitFullState();
  }

  private buildState(): CombatState {
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
      targetedEnemyIndex: this.targetedEnemyIndex,
      phase: this.phase,
      abilityCharge: this.player.abilityCharge,
      abilityThreshold: this.player.abilityThreshold,
      isDeadeyeActive: this.isDeadeyeActive,
      deadeyeShotsRemaining: this.deadeyeShotsRemaining,
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
