import type { Board, SwapResult } from '../board/Board';
import type { CombatState, CombatPhase, MatchResult, EnemyDefinition } from '../../types/combat';
import type { TileType, ArtifactInstance, TraitId, CharacterId } from '../../types/game';
import type { CombatSnapshot, SerializedEnemy } from '../../types/combatSnapshot';
import { SNAPSHOT_VERSION } from '../../types/combatSnapshot';
import { EventBus, GameEvent } from '../EventBus';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { ResourceResolver } from './ResourceResolver';
import { TraitSystem } from './TraitSystem';
import { ArtifactSystem } from './ArtifactSystem';
import type { ResourceOutput } from './ResourceResolver';
import { BoardHazardManager } from '../board/BoardHazardManager';
import { TILE_COLORS, TILE_DEFINITIONS } from '../../data/tiles';
import { chooseEnemyIntent, chooseMineCartTimedIntent, executeBoardManipulation } from './EnemyAI';
import { BossController } from './BossController';
import {
  rollEliteModifier,
  applyEliteModifier,
  ELITE_MODIFIERS,
} from './EliteModifiers';
import type { EliteModifierId, EliteModifier } from './EliteModifiers';
import { playSwapFail, playMatch, playDeadeyeShot, playHit, playBlock, playAbilityReady } from '../../services/sfx';
import { useRunStore } from '../../store/runStore';
import { CONSUMABLES } from '../../data/consumables';
import { getSpeedMultiplier } from '../../store/settingsStore';

export interface CombatConfig {
  character: CharacterId;
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
  /** Gold multiplier from ascension (1.0 = normal, <1.0 = reduced). */
  goldMultiplier?: number;
}

export interface CombatResult {
  victory: boolean;
  playerHealth: number;
  playerGold: number;
  goldEarned: number;
  abilityCharge: number;
  damageDealt: number;
  longestCascade: number;
  playerDamageTaken: boolean;
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
  private character: CharacterId;
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
  /** Lasso consumable: next swap can be non-adjacent. */
  private lassoNextSwap = false;
  /** Whether a ricochet triggered a random tile removal that needs gravity+cascade resolution. */
  private ricochetTriggeredThisResolution = false;
  /** Total damage dealt to enemies this fight (for scoring). */
  private damageDealtThisFight = 0;
  /** Longest cascade chain (number of steps) across all swaps this fight. */
  private longestCascadeThisFight = 0;
  /** Whether the player took any HP damage this fight (for flawless tracking). */
  private playerTookDamageThisFight = false;
  /** Gold multiplier from ascension level (1.0 = normal, <1.0 = reduced). */
  private goldMultiplier: number;

  constructor(board: Board, config: CombatConfig) {
    this.board = board;
    this.character = config.character;
    this.resolver = new ResourceResolver();
    this.hazardManager = new BoardHazardManager(board);
    this.isBoss = config.isBoss ?? false;
    this.turnLimit = config.turnLimit ?? 0;
    this.timedFailureDamage = config.timedFailureDamage ?? 0;
    this.goldMultiplier = config.goldMultiplier ?? 1.0;

    // Initialize trait and artifact systems
    this.traits = new TraitSystem(config.traitCounts);
    this.artifacts = new ArtifactSystem(config.artifacts);

    // Base swaps + trait bonus
    const baseSwaps = config.swapsPerTurn ?? 3;
    this.swapsPerTurn = baseSwaps + this.traits.getExtraSwapsPerTurn() + this.artifacts.getExtraSwapsPerTurn();

    // Deadeye shots: 3 base, 6 with Fully Loaded, or explicit override
    this.deadeyeMaxShots = config.deadeyeShots ?? this.artifacts.getDeadeyeShots();

    // Character-specific ability threshold
    const abilityThreshold = config.character === 'reno' ? 5 : 6;

    // Initialize player from run state
    this.player = new Player(
      config.playerHealth,
      config.playerMaxHealth,
      config.abilityCharge,
      abilityThreshold,
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
      if (this.eliteModifier.id === 'cracked_ground') {
        for (const enemy of this.enemies) {
          enemy.state.crackedGround = 2;
        }
      }
    }

    // Timed encounter: pre-place hazard tiles (e.g. Mine Cart)
    if (this.turnLimit > 0) {
      this.hazardManager.placeRandomSand(3);
      this.hazardManager.placeRandomBombs(1);
    }

    // Set board tile types and Sapper explosive radius
    this.board.setActiveTileTypes(config.activeTileTypes);
    if (this.traits.hasExpandedExplosiveRadius()) {
      this.board.setExplosiveRadius(2);
    }
    // Tinker's Wrench: 3-matches also spawn explosive tiles
    if (this.artifacts.shouldThreeMatchSpawnExplosive()) {
      this.board.setThreeMatchExplosive(true);
    }
    // Fool's Magnifying Glass: immune to fool's gold
    if (this.artifacts.isImmuneToFoolsGold()) {
      this.hazardManager.foolsGoldImmune = true;
    }
    // Snakeskin Boots: first poison per turn is auto-cleansed
    if (this.artifacts.has('snakeskin_boots')) {
      this.hazardManager.snakeskinActive = true;
    }

    // Apply fight-start effects
    this.traits.onFightStart(this.player, this.isBoss, this.enemies);
    this.artifacts.onFightStart(this.player, this.enemies);

    // Black Powder Cache: make 3 tiles explosive at combat start
    if (this.artifacts.has('black_powder_cache')) {
      const grid = this.board.getGrid();
      const candidates: { row: number; col: number }[] = [];
      for (let r = 0; r < this.board.getBoardSize(); r++) {
        for (let c = 0; c < this.board.getBoardSize(); c++) {
          const tile = grid[r]?.[c];
          if (tile && !tile.hazard && !tile.isExplosive && !tile.isShowdown && !tile.isShadow) {
            candidates.push({ row: r, col: c });
          }
        }
      }
      for (let i = 0; i < 3 && candidates.length > 0; i++) {
        const idx = Math.floor(Math.random() * candidates.length);
        const pos = candidates.splice(idx, 1)[0];
        const tile = grid[pos.row]?.[pos.col];
        if (tile) tile.setExplosive(true);
      }
    }

    // Set trait-driven player flags
    this.player.damageReduction = this.traits.getDamageReduction();
    this.player.deadManWalkingAvailable = this.traits.isActive('dead_man_walking', 7);

    // Saloon Keeper(5): grant a random consumable at combat start
    if (this.traits.isActive('saloon_keeper', 5)) {
      this.grantRandomConsumable();
    }

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
      if (this.character === 'reno') {
        this.activateShuffle();
      } else {
        this.activateDeadeye();
      }
    });

    on(GameEvent.CANCEL_ABILITY, () => {
      this.cancelAbility();
    });

    on(GameEvent.END_TURN_EARLY, () => {
      this.endTurnEarly();
    });

    on(GameEvent.SWAP_REQUESTED, (...args: unknown[]) => {
      const [fromRow, fromCol, toRow, toCol] = args as number[];
      this.performSwap(fromRow, fromCol, toRow, toCol);
    });

    on(GameEvent.DEADEYE_SHOOT, (...args: unknown[]) => {
      const [row, col, pointerX, pointerY] = args as number[];
      this.deadeyeShoot(row, col, pointerX, pointerY);
    });

    on(GameEvent.DEADEYE_SHOOT_ENEMY, (...args: unknown[]) => {
      const [enemyIndex] = args as number[];
      this.deadeyeShootEnemy(enemyIndex);
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
  // Snapshot (mid-combat save/restore)
  // ---------------------------------------------------------------------------

  /**
   * Create a full snapshot of the combat state for mid-combat saves.
   * Call only when the board is stable (not mid-cascade or resolving).
   */
  createSnapshot(runId: string): CombatSnapshot {
    const serializedEnemies: SerializedEnemy[] = this.enemies.map((e) => ({
      state: { ...e.state, intent: { ...e.state.intent } },
      definition: { ...e.getDefinition() },
      skipNextAction: e.skipNextAction,
    }));

    return {
      version: SNAPSHOT_VERSION,
      runId,
      timestamp: Date.now(),
      character: this.character,
      board: this.board.serialize(),
      turnNumber: this.turnNumber,
      swapsRemaining: this.swapsRemaining,
      swapsPerTurn: this.swapsPerTurn,
      targetedEnemyIndex: this.targetedEnemyIndex,
      phase: this.phase,
      isDeadeyeActive: this.isDeadeyeActive,
      deadeyeShotsRemaining: this.deadeyeShotsRemaining,
      deadeyeMaxShots: this.deadeyeMaxShots,
      isBoss: this.isBoss,
      turnLimit: this.turnLimit,
      timedFailureDamage: this.timedFailureDamage,
      nextMatchMultiplier: this.nextMatchMultiplier,
      damageDealtThisFight: this.damageDealtThisFight,
      swapsUsedThisTurn: this.swapsUsedThisTurn,
      player: {
        health: this.player.health,
        maxHealth: this.player.maxHealth,
        block: this.player.block,
        aceStacks: this.player.aceStacks,
        aceMultiplier: this.player.aceMultiplier,
        luckyStacks: this.player.luckyStacks,
        barricadeStacks: this.player.barricadeStacks,
        ragefulStacks: this.player.ragefulStacks,
        sturdyStacks: this.player.sturdyStacks,
        graceStacks: this.player.graceStacks,
        poisonedStacks: this.player.poisonedStacks,
        readyStacks: this.player.readyStacks,
        chainStacks: this.player.chainStacks,
        critChance: 0, // deprecated, kept for snapshot compat
        thorns: this.player.thorns,
        shedSkinAvailable: this.player.shedSkinAvailable,
        deadManWalkingAvailable: this.player.deadManWalkingAvailable,
        damageReduction: this.player.damageReduction,
        gold: this.player.gold,
        goldThisFight: this.player.goldThisFight,
        abilityCharge: this.player.abilityCharge,
        activeTileTypes: [...this.player.activeTileTypes],
        tileUpgrades: { ...this.player.tileUpgrades },
      },
      enemies: serializedEnemies,
      bossController: this.bossController?.serialize() ?? null,
      eliteModifierId: (this.eliteModifier?.id as EliteModifierId) ?? null,
      suppressedTypes: this.hazardManager.serializeSuppressedTypes(),
      longestCascadeThisFight: this.longestCascadeThisFight,
      playerTookDamageThisFight: this.playerTookDamageThisFight,
      matchCountThisFight: this.traits.getMatchCountThisFight(),
      damageDealtThisTurn: this.traits.getDamageDealtThisTurn(),
      undertakerDoubleDamageReady: this.traits.getUndertakerBonusDamageReady(),
      firstMatchThisFight: false,
      lassoUsedThisFight: false,
      artifacts: this.artifacts.getArtifacts(),
      traitCounts: this.traits.getCounts(),
    };
  }

  /**
   * Restore combat state from a snapshot.
   * Rebuilds the board, player, enemies, and all subsystems.
   * Skips fight-start effects since they were already applied in the original fight.
   */
  restoreFromSnapshot(snapshot: CombatSnapshot): void {
    // Restore board
    this.board.restoreFromSnapshot(snapshot.board);

    // Restore player
    const sp = snapshot.player;
    const threshold = (snapshot.character ?? this.character) === 'reno' ? 5 : 6;
    this.player = new Player(
      sp.health,
      sp.maxHealth,
      sp.abilityCharge,
      threshold,
      sp.activeTileTypes,
      sp.tileUpgrades,
      sp.gold,
    );
    this.player.block = sp.block;
    this.player.aceStacks = sp.aceStacks ?? 0;
    this.player.aceMultiplier = sp.aceMultiplier;
    this.player.luckyStacks = sp.luckyStacks ?? 0;
    this.player.barricadeStacks = sp.barricadeStacks ?? 0;
    this.player.ragefulStacks = sp.ragefulStacks ?? 0;
    this.player.sturdyStacks = sp.sturdyStacks ?? 0;
    this.player.graceStacks = sp.graceStacks ?? 0;
    this.player.poisonedStacks = sp.poisonedStacks ?? 0;
    this.player.readyStacks = sp.readyStacks ?? 0;
    this.player.chainStacks = sp.chainStacks ?? 0;
    // critChance deprecated — Lucky stacks are the crit chance now
    this.player.thorns = sp.thorns;
    this.player.shedSkinAvailable = sp.shedSkinAvailable ?? false;
    this.player.deadManWalkingAvailable = sp.deadManWalkingAvailable ?? false;
    this.player.damageReduction = sp.damageReduction ?? 0;
    this.player.goldThisFight = sp.goldThisFight;

    // Restore enemies
    this.enemies = snapshot.enemies.map((se) => {
      const enemy = new Enemy(se.definition);
      enemy.state = { ...se.state, intent: { ...se.state.intent } };
      enemy.skipNextAction = se.skipNextAction;
      enemy.summoned = se.state.summoned ?? false;
      return enemy;
    });

    // Restore combat manager internal state
    this.turnNumber = snapshot.turnNumber;
    this.swapsRemaining = snapshot.swapsRemaining;
    this.swapsPerTurn = snapshot.swapsPerTurn;
    this.targetedEnemyIndex = snapshot.targetedEnemyIndex;
    this.phase = snapshot.phase;
    this.isDeadeyeActive = snapshot.isDeadeyeActive;
    this.deadeyeShotsRemaining = snapshot.deadeyeShotsRemaining;
    this.deadeyeMaxShots = snapshot.deadeyeMaxShots;
    this.isBoss = snapshot.isBoss;
    this.turnLimit = snapshot.turnLimit;
    this.timedFailureDamage = snapshot.timedFailureDamage;
    this.nextMatchMultiplier = snapshot.nextMatchMultiplier;
    this.damageDealtThisFight = snapshot.damageDealtThisFight;
    this.swapsUsedThisTurn = snapshot.swapsUsedThisTurn;
    this.longestCascadeThisFight = snapshot.longestCascadeThisFight ?? 0;
    this.playerTookDamageThisFight = snapshot.playerTookDamageThisFight ?? false;

    // Restore boss controller
    if (snapshot.bossController && this.bossController) {
      this.bossController.restoreState(snapshot.bossController);
    }

    // Restore elite modifier
    if (snapshot.eliteModifierId) {
      this.eliteModifier = ELITE_MODIFIERS.find(
        (m) => m.id === snapshot.eliteModifierId,
      ) ?? null;
    }

    // Restore suppressed types
    this.hazardManager.restoreSuppressedTypes(snapshot.suppressedTypes);

    // Restore subsystem state to prevent save/reload exploits
    this.traits.restoreState(
      snapshot.matchCountThisFight ?? 0,
      snapshot.swapsUsedThisTurn,
      false,
      snapshot.damageDealtThisTurn ?? false,
      snapshot.undertakerDoubleDamageReady ?? false,
    );
    this.artifacts.restoreState(false, snapshot.turnNumber ?? 0);

    // Cancel deadeye on restore -- cursor/board state won't carry over
    if (this.isDeadeyeActive) {
      this.isDeadeyeActive = false;
      this.deadeyeShotsRemaining = 0;
      this.board.setDeadeyeMode(false);
      document.body.classList.remove('cursor-crosshair');
    }

    // If the snapshot was taken mid-resolution (e.g. app backgrounded during
    // cascade), transition to the next interactive phase so input works.
    if (this.phase === 'resolving') {
      this.phase = this.swapsRemaining > 0 ? 'swap-phase' : 'consumable-window';
    }

    // Emit full state so React HUD syncs
    this.emitFullState();
    EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
    EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
    EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
    EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);
  }

  // ---------------------------------------------------------------------------
  // Turn Flow
  // ---------------------------------------------------------------------------

  /**
   * Start a new player turn. Called at combat start and after each enemy turn.
   */
  async startTurn(): Promise<void> {
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
    this.resolver.resetTurn();

    this.hazardManager.resetTurnArtifactState();

    // Venomous tick: player takes damage equal to stacks, stacks decrease by 1
    // Bone Charm: venom damage halved
    if (this.player.poisonedStacks > 0) {
      const rawDmg = this.player.poisonedStacks;
      const poisonDmg = Math.max(1, Math.round(rawDmg * this.artifacts.getPoisonDamageMultiplier()));
      this.player.health = Math.max(0, this.player.health - poisonDmg);
      this.player.poisonedStacks--;
      this.floatOnPlayer(`-${poisonDmg}`, '#40ff40');
      EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
      if (this.player.health <= 0) this.playerTookDamageThisFight = true;
    }

    // Per-turn: +1 ability charge (capped at threshold)
    if (this.player.abilityCharge < this.player.abilityThreshold) {
      this.player.abilityCharge++;
      if (this.player.abilityCharge >= this.player.abilityThreshold) playAbilityReady();
    }

    // Trait turn-start effects (Sheriff block, etc.)
    this.traits.onTurnStart(this.player);

    // Desperado(5): gain 4 Ace at start of every turn
    const desperadoAce = this.traits.getDesperadoAceGrant();
    if (desperadoAce > 0) {
      this.player.aceStacks += desperadoAce;
      this.floatOnPlayer(`+${desperadoAce} ACE`, '#E0C880', 9);
    }

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

    // Ensure the board has valid moves; reshuffle if not
    if (!this.board.hasValidMoves()) {
      await this.board.reshuffleAnimated();
    }

    this.setPhase('consumable-window');
    EventBus.emit(GameEvent.TURN_START, this.buildState());
    EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
    EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);

    // Save at turn start: captures state after enemy turn resolved, preventing
    // save/reload exploits that would let players re-roll enemy actions.
    EventBus.emit(GameEvent.COMBAT_SAVE_REQUESTED);
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


    const from = { row: fromRow, col: fromCol };
    const to = { row: toRow, col: toCol };

    // Track whether this swap is non-adjacent (lasso)
    this.currentSwapIsLasso = !this.board.isAdjacent(from, to);

    // Non-adjacent swaps require lasso consumable
    if (this.currentSwapIsLasso && !this.lassoNextSwap) {
      // Refund the swap -- not allowed without lasso
      this.swapsRemaining++;
      this.swapsUsedThisTurn--;
      this.setPhase('swap-phase');
      EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
      playSwapFail();
      return;
    }
    if (this.currentSwapIsLasso) {
      this.lassoNextSwap = false;
    }

    // Track trait/artifact swap hooks
    this.traits.onSwapPerformed();
    this.enemyDiedThisSwap = false;
    this.ricochetTriggeredThisResolution = false;

    // Process each cascade step's matches immediately (damage, block, etc.)
    let cascadeSteps = 0;
    const onCascadeStep = this.makeCascadeStepHandler(() => ++cascadeSteps);

    const result: SwapResult = await this.board.trySwap(from, to, onCascadeStep);

    // Update longest cascade tracking
    if (cascadeSteps > this.longestCascadeThisFight) {
      this.longestCascadeThisFight = cascadeSteps;
    }

    if (!result.valid) {
      // Invalid swap -- refund
      playSwapFail();
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
        await this.processMatches(ricochetCascades);
      }
    }

    // Artifact swap hook (check for Quickdraw kill refund)
    const swapResult = this.artifacts.onSwapPerformed(this.enemyDiedThisSwap);
    if (swapResult.refundSwaps) {
      this.swapsRemaining = this.swapsPerTurn;
      EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
    }

    // Tick bomb countdowns per swap (not per turn) — skip if combat already won
    if (!this.isCombatOver()) {
      const bombResult = this.hazardManager.tickBombs();
      if (bombResult.totalDamage > 0) {
        const bombDmg = this.player.takeDamage(bombResult.totalDamage);
        if (bombDmg.hpLost > 0) { playHit(); this.playerTookDamageThisFight = true; }
        if (bombDmg.blocked > 0) { playBlock(); }
        EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
        EventBus.emit(GameEvent.SCREEN_SHAKE, bombResult.detonations.length > 1 ? 'heavy' : 'medium');
      }
    }

    // Auto-retarget if targeted enemy died during cascade
    const alive = this.aliveEnemies();
    if (alive.length > 0 && this.targetedEnemyIndex >= alive.length) {
      this.targetedEnemyIndex = 0;
    }

    // Reset combo after cascade resolves
    EventBus.emit(GameEvent.COMBO_UPDATE, 0);

    if (this.isCombatOver()) {
      this.endCombat();
      return;
    }

    if (this.swapsRemaining <= 0) {
      // Dust Devil Boots: after using all swaps, shuffle bottom 2 rows + resolve cascades
      if (this.artifacts.has('dust_devil_boots')) {
        this.board.setIsResolving(true);
        await this.board.shuffleRowsAnimated([6, 7]);
        this.ricochetTriggeredThisResolution = false;
        let cascadeSteps = 0;
        const onCascadeStep = this.makeCascadeStepHandler(() => ++cascadeSteps);
        await this.board.resolveMatchesFull(onCascadeStep);
        while (this.ricochetTriggeredThisResolution) {
          this.ricochetTriggeredThisResolution = false;
          await this.board.applyGravityAnimated();
          await this.board.fillEmptyTilesAnimated();
          await this.board.resolveMatchesFull(onCascadeStep);
        }
        this.board.setIsResolving(false);
        EventBus.emit(GameEvent.COMBO_UPDATE, 0);
        if (this.isCombatOver()) { this.endCombat(); return; }
      }
      this.endTurn();
    } else {
      this.setPhase('swap-phase');
      // Save after phase transition: board is stable, phase is interactive
      EventBus.emit(GameEvent.COMBAT_SAVE_REQUESTED);
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
    const enemy = this.enemies[index];
    if (!enemy || enemy.state.isDead) return;
    // Convert full-list index to alive-list index for internal targeting
    const alive = this.aliveEnemies();
    const aliveIdx = alive.indexOf(enemy);
    if (aliveIdx >= 0) {
      this.targetedEnemyIndex = aliveIdx;
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
    this.board.setDeadeyeMode(true);
    document.body.classList.add('cursor-crosshair');
    this.emitFullState();
    EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);
    return true;
  }

  /**
   * Fire a Deadeye shot at a specific tile position.
   * Destroys the tile and generates its resource.
   * Each shot waits for cascading to finish before allowing the next.
   * Special tiles trigger automatically: explosive chain-detonates,
   * showdown clears a random type.
   */
  async deadeyeShoot(row: number, col: number, pointerX?: number, pointerY?: number): Promise<void> {
    if (!this.isDeadeyeActive || this.deadeyeShotsRemaining <= 0) return;
    if (this.board.getIsResolving()) return;

    const tile = this.board.getTileAt({ row, col });
    if (!tile) return;

    const type = tile.type;

    // Deadeye shot VFX + SFX — use pointer position for bullet hole
    playDeadeyeShot();
    const center = tile.getWorldCenter();
    const vfxX = pointerX ?? center.x;
    const vfxY = pointerY ?? center.y;
    const colorHex = TILE_COLORS[type] ?? '#ffffff';
    EventBus.emit(GameEvent.DEADEYE_SHOT_VFX, vfxX, vfxY, colorHex);

    this.board.setIsResolving(true);

    // Centralized destruction handles explosive chains and showdown triggers
    const destroyed = await this.board.destroyTilesWithEffects([{ row, col }]);
    for (const info of destroyed) {
      const upgradeLevel = this.player.getUpgradeLevel(info.type);
      const output = this.resolver.resolveSingle(info.type, upgradeLevel);
      this.applyResourceOutput(output);
    }

    this.deadeyeShotsRemaining--;
    if (this.deadeyeShotsRemaining <= 0) {
      this.board.setDeadeyeMode(false);
      document.body.classList.remove('cursor-crosshair');
    }
    this.emitFullState();
    this.emitEnemyHpChanges();
    EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
    EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);

    // Use the same cascade resolution path as normal swaps so hazards,
    // ricochets, special tile triggers, and all other logic is consistent.
    this.ricochetTriggeredThisResolution = false;
    let cascadeSteps = 0;
    const onCascadeStep = this.makeCascadeStepHandler(() => ++cascadeSteps);

    // Gravity + fill + full cascade resolution (matches, hazards, specials)
    await this.board.applyGravityAnimated();
    await this.board.fillEmptyTilesAnimated();
    await this.board.resolveMatchesFull(onCascadeStep);

    // Handle ricochet gaps
    while (this.ricochetTriggeredThisResolution) {
      this.ricochetTriggeredThisResolution = false;
      await this.board.applyGravityAnimated();
      await this.board.fillEmptyTilesAnimated();
      await this.board.resolveMatchesFull(onCascadeStep);
    }

    this.board.setIsResolving(false);

    // Reset combo after cascade resolves
    EventBus.emit(GameEvent.COMBO_UPDATE, 0);

    if (this.deadeyeShotsRemaining <= 0) {
      this.endDeadeye();
    }

    if (this.isCombatOver()) {
      this.endCombat();
    }

    this.emitFullState();
  }

  /**
   * Rust's Cylinder: last Deadeye shot targets an enemy directly,
   * dealing 1 damage per Bounty stack on that enemy.
   */
  async deadeyeShootEnemy(enemyIndex: number): Promise<void> {
    if (!this.isDeadeyeActive || this.deadeyeShotsRemaining !== 1) return;
    if (!this.artifacts.has('rusts_cylinder')) return;

    const enemy = this.enemies[enemyIndex];
    if (!enemy || enemy.state.isDead) return;

    playDeadeyeShot();

    const bountyDamage = enemy.state.bountyStacks * 1;
    if (bountyDamage > 0) {
      this.dealDamageToEnemy(enemy, bountyDamage, true);
      this.emitEnemyHpChanges();
    }

    this.deadeyeShotsRemaining = 0;
    this.board.setDeadeyeMode(false);
    document.body.classList.remove('cursor-crosshair');
    this.emitFullState();

    this.endDeadeye();

    if (this.isCombatOver()) {
      this.endCombat();
    }

    this.emitFullState();
  }

  private endDeadeye(): void {
    this.isDeadeyeActive = false;
    this.deadeyeShotsRemaining = 0;
    this.player.abilityCharge = 0;
    this.board.setDeadeyeMode(false);
    document.body.classList.remove('cursor-crosshair');
    EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);
    this.emitFullState();
  }

  /** Cancel the active ability. Retain charges if unused, reset to 0 if partly used. */
  private cancelAbility(): void {
    if (this.isDeadeyeActive) {
      const usedShots = this.deadeyeMaxShots - this.deadeyeShotsRemaining;
      this.isDeadeyeActive = false;
      this.deadeyeShotsRemaining = 0;
      this.board.setDeadeyeMode(false);
      document.body.classList.remove('cursor-crosshair');
      if (usedShots > 0) {
        this.player.abilityCharge = 0;
      } else {
        // No shots fired: restore charges consumed on activation
        this.player.abilityCharge = this.player.abilityThreshold;
      }
      EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);
      this.emitFullState();
    }
  }

  // ---------------------------------------------------------------------------
  // False Shuffle Ability (Reno)
  // ---------------------------------------------------------------------------

  /**
   * Activate False Shuffle: immediately reshuffle all unlocked tiles.
   */
  private async activateShuffle(): Promise<void> {
    if (this.phase !== 'swap-phase' && this.phase !== 'consumable-window') return;
    if (!this.player.isDeadeyeReady()) return;
    this.player.activateDeadeye(); // consume charges

    this.emitFullState();
    EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);

    // Animated reshuffle then let matches cascade
    this.board.setIsResolving(true);
    await this.board.reshuffleAnimatedWithCascades();

    this.ricochetTriggeredThisResolution = false;
    let cascadeSteps = 0;
    const onCascadeStep = this.makeCascadeStepHandler(() => ++cascadeSteps);

    await this.board.resolveMatchesFull(onCascadeStep);

    while (this.ricochetTriggeredThisResolution) {
      this.ricochetTriggeredThisResolution = false;
      await this.board.applyGravityAnimated();
      await this.board.fillEmptyTilesAnimated();
      await this.board.resolveMatchesFull(onCascadeStep);
    }

    this.board.setIsResolving(false);
    EventBus.emit(GameEvent.COMBO_UPDATE, 0);

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
  async useConsumable(consumableId: string): Promise<boolean> {
    if (this.phase !== 'consumable-window' && this.phase !== 'swap-phase') return false;

    // Last Call Bell: consumables trigger twice
    const triggerCount = this.artifacts.has('last_call_bell') ? 2 : 1;

    for (let trigger = 0; trigger < triggerCount; trigger++) {
      switch (consumableId) {
        case 'tonic':
          this.player.heal(20);
          break;
        case 'bandage':
          this.player.heal(10);
          this.hazardManager.clearAllOfType('poison');
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
        case 'skeleton_key':
          this.hazardManager.clearAllOfType('lock');
          break;
        case 'tumbleweed': {
          this.board.setIsResolving(true);
          await this.board.reshuffleAnimatedWithCascades();
          this.ricochetTriggeredThisResolution = false;
          let cascadeSteps = 0;
          const onCascadeStep = this.makeCascadeStepHandler(() => ++cascadeSteps);
          await this.board.resolveMatchesFull(onCascadeStep);
          while (this.ricochetTriggeredThisResolution) {
            this.ricochetTriggeredThisResolution = false;
            await this.board.applyGravityAnimated();
            await this.board.fillEmptyTilesAnimated();
            await this.board.resolveMatchesFull(onCascadeStep);
          }
          this.board.setIsResolving(false);
          EventBus.emit(GameEvent.COMBO_UPDATE, 0);
          break;
        }
        case 'signal_flare':
          this.hazardManager.clearAllOfType('sand');
          break;
        case 'stick_of_tnt':
          await this.resolveStickOfTNT();
          break;
        case 'snake_oil':
          this.resolveSnakeOil();
          break;
        case 'lasso':
          this.lassoNextSwap = true;
          break;
        default:
          return false;
      }

      // Saloon Keeper(2): consumables heal 5 HP on use
      if (this.traits.isActive('saloon_keeper', 2)) {
        this.player.heal(5);
        this.floatOnPlayer('+5', '#40D840');
      }

      // Artifact consumable hooks (Barkeep's Shotgun, Top-Shelf Reserve)
      const consumableArt = this.artifacts.onConsumableUsed();
      if (consumableArt.bonusDamage > 0) {
        const alive = this.aliveEnemies();
        if (alive.length > 0) {
          const target = alive[Math.floor(Math.random() * alive.length)];
          const { hpLost } = target.takeDamage(consumableArt.bonusDamage);
          this.damageDealtThisFight += hpLost;
          this.floatOnEnemy(target, `-${hpLost}`, '#D04040');
          EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...target.state });
        }
      }
      if (consumableArt.bonusBlock > 0) {
        this.player.addBlock(consumableArt.bonusBlock);
        this.floatOnPlayer(`+${consumableArt.bonusBlock}`, '#6888A0');
      }
    }

    EventBus.emit(GameEvent.CONSUMABLE_USED, consumableId);
    EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
    this.emitEnemyHpChanges();
    this.emitFullState();

    if (this.isCombatOver()) {
      this.endCombat();
    }

    return true;
  }

  private resolveSnakeOil(): void {
    const roll = Math.random();
    if (roll < 0.25) {
      this.player.heal(15);
    } else if (roll < 0.5) {
      const target = this.getTargetedAliveEnemy();
      if (target) this.damageDealtThisFight += target.takeDamage(15).hpLost;
    } else if (roll < 0.75) {
      this.player.addGold(Math.max(1, Math.round(10 * this.goldMultiplier)));
    } else {
      // Poison: small self-damage
      if (this.player.takeDamage(8).hpLost > 0) this.playerTookDamageThisFight = true;
    }
  }

  private async resolveStickOfTNT(): Promise<void> {
    // Clear entire row (middle row for max impact).
    // Special tiles trigger automatically via destroyTilesWithEffects.
    const boardSize = this.board.getBoardSize();
    const targetRow = Math.floor(boardSize / 2);

    // Collect positions for the entire middle row
    const positions: import('../../types/combat').GridPosition[] = [];
    for (let col = 0; col < boardSize; col++) {
      if (this.board.getTileAt({ row: targetRow, col })) {
        positions.push({ row: targetRow, col });
      }
    }

    // Centralized destruction handles explosive chains and showdown triggers
    const destroyed = await this.board.destroyTilesWithEffects(positions);
    for (const info of destroyed) {
      const upgradeLevel = this.player.getUpgradeLevel(info.type);
      const output = this.resolver.resolveSingle(info.type, upgradeLevel);
      this.applyResourceOutput(output);
    }

    EventBus.emit(GameEvent.SCREEN_SHAKE, 'heavy');

    // Cascade: gravity + fill + resolve matches
    await this.board.applyGravityAnimated();
    await this.board.fillEmptyTilesAnimated();
    const cascadeMatches = await this.board.resolveMatches();
    if (cascadeMatches.length > 0) {
      await this.processMatches(cascadeMatches);
    }

    this.emitFullState();
    this.emitEnemyHpChanges();
    EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
    EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
  }

  // ---------------------------------------------------------------------------
  // Match Processing & Resource Application
  // ---------------------------------------------------------------------------

  private async processMatches(matches: MatchResult[], comboMultiplier = 1.0): Promise<void> {
    // Sort by resolveOrder so interactions are consistent (e.g. block before boulder).
    const sorted = matches.length > 1
      ? [...matches].sort((a, b) => {
        const aOrder = TILE_DEFINITIONS[a.tileType]?.resolveOrder ?? 3;
        const bOrder = TILE_DEFINITIONS[b.tileType]?.resolveOrder ?? 3;
        return aOrder - bOrder;
      })
      : matches;

    for (const match of sorted) {
      // Suppress hazard: if any tile in the match was suppressed, produce zero output.
      if (match.suppressCount && match.suppressCount > 0) {
        const zero = this.resolver.emptyOutput();
        EventBus.emit(GameEvent.MATCH_RESOLVED, match, zero);
        continue;
      }

      let upgradeLevel = this.player.getUpgradeLevel(match.tileType);
      // Loaded Dice: cascade matches trigger 1 level higher
      if (comboMultiplier > 1.0) upgradeLevel += this.artifacts.getCascadeUpgradeBonus();
      let output = this.resolver.resolve(match, upgradeLevel);

      // Chain buff: add chainStacks bonus damage per Chain tile
      if (match.tileType === 'chain' && this.player.chainStacks > 0) {
        output.damage += this.player.chainStacks * match.length;
      }

      // Poison tiles: apply venomous stacks to player
      if (match.poisonCount && match.poisonCount > 0) {
        this.player.poisonedStacks += match.poisonCount;
        this.floatOnPlayer(`+${match.poisonCount} POISON`, '#40ff40', 9);
      }

      // Shadow tiles: each fires a shadow bolt dealing 4 damage to a random enemy
      if (match.shadowCount && match.shadowCount > 0) {
        for (let s = 0; s < match.shadowCount; s++) {
          const alive = this.aliveEnemies();
          if (alive.length === 0) break;
          const target = alive[Math.floor(Math.random() * alive.length)];
          const { hpLost } = target.takeDamage(4);
          this.damageDealtThisFight += hpLost;
          this.floatOnEnemy(target, `-${hpLost}`, '#6b2fa0');
          EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...target.state });
        }
      }

      // Blasting Pan: defusing bombs grants 8 gold each
      if (match.bombCount && match.bombCount > 0) {
        for (let b = 0; b < match.bombCount; b++) {
          this.artifacts.onBombDefused(this.player);
        }
      }

      // Fool's gold: reduce gold proportionally to how many tiles were fake
      if (match.foolsGoldCount && match.foolsGoldCount > 0) {
        const realTiles = match.tiles.length - match.foolsGoldCount;
        output.gold = realTiles > 0
          ? Math.round(output.gold * (realTiles / match.tiles.length))
          : 0;
      }

      const targetEnemy = this.getTargetedAliveEnemy();

      // Trait modifications (Outlaw bonus damage, Sheriff iron block, Prospector gold, etc.)
      output = this.traits.modifyMatchOutput(match, output, this.player, targetEnemy);

      // Artifact modifications (Gold Tooth, Bandit's Bandana, Rusty Deputy Badge, etc.)
      output = this.artifacts.modifyMatchOutput(
        match, output, this.player, targetEnemy, this.aliveEnemies(),
      );

      // Crit check: Lucky stacks = crit chance (1% per stack)
      const effectiveCritChance = this.player.luckyStacks + this.artifacts.getSwapCritBonus()
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

        // Artifact crit effects (Dead Man's Hand, Rigged Deck)
        this.artifacts.onCritTriggered(this.player, targetEnemy);
      }

      // Ace stacks: consumed on next non-Ace non-cascade match
      if (match.tileType !== 'ace' && comboMultiplier === 1.0 && this.player.aceStacks > 0) {
        multiplier *= this.player.consumeAce();
      }

      // Ready: next non-cascade attack deals 50% more damage
      if (comboMultiplier === 1.0 && output.damage > 0 && this.player.readyStacks > 0) {
        multiplier *= this.player.consumeReady();
      }

      // Consumable match multiplier (Moonshine/Coffee) -- applies to first match only
      if (this.nextMatchMultiplier > 1.0) {
        multiplier *= this.nextMatchMultiplier;
        this.nextMatchMultiplier = 1.0;
      }

      // Cracked Ground: suppress cascade damage while any enemy has the buff
      const suppressDamage = comboMultiplier > 1.0
        && this.aliveEnemies().some(e => e.state.crackedGround > 0);

      // Apply multiplier + combo bonus to damage/block/gold/healing (not to status effects)
      const totalMultiplier = multiplier * comboMultiplier;
      const scaled: ResourceOutput = {
        ...output,
        damage: suppressDamage ? 0 : Math.floor(output.damage * totalMultiplier),
        block: Math.floor(output.block * totalMultiplier),
        gold: Math.floor(output.gold * totalMultiplier),
        healing: Math.floor(output.healing * totalMultiplier),
        // Status stacks, flags, etc. are NOT scaled:
      };

      // Boulder: add player's current block as bonus damage
      if (match.tileType === 'boulder') {
        scaled.damage += this.player.block;
      }

      this.applyResourceOutput(scaled, isCrit);

      // Screen shake on crit for extra punch
      if (isCrit && scaled.damage > 0) {
        EventBus.emit(GameEvent.SCREEN_SHAKE, 'medium');
      }

      // Flash a line from match to targeted enemy on damage
      if (scaled.damage > 0 && !scaled.isAoE) {
        const mid = match.tiles[Math.floor(match.tiles.length / 2)];
        const alive = this.aliveEnemies();
        const target = alive[this.targetedEnemyIndex];
        const fullIdx = target ? this.enemies.indexOf(target) : 0;
        EventBus.emit(GameEvent.FLASH_LINE_TO_ENEMY, mid, match.tileType, fullIdx, this.enemies.length);
      }

      // Sniper(5): 6+ match kills non-boss targeted enemy
      if (this.traits.shouldSniperExecute(match.length)) {
        const target = this.getTargetedAliveEnemy();
        if (target && !this.isBossEnemy(target)) {
          target.state.health = 0;
          target.state.isDead = true;
          this.floatOnEnemy(target, 'EXECUTED', '#ff4444');
          EventBus.emit(GameEvent.SCREEN_SHAKE, 'heavy');
          this.emitEnemyHpChanges();
        }
      }

      // Ricochet: destroy 1 per 3-match + 1 per extra tile, upgrade adds flat bonus
      // Only triggers from direct matches, not from chain destruction (explosive/showdown)
      if (match.tileType === 'ricochet' && !match.isChainDestruction) {
        const ricoLevel = this.player.getUpgradeLevel('ricochet');
        const baseDestroy = 1 + Math.max(0, match.tiles.length - 3);
        const destroyCount = baseDestroy + ricoLevel;
        playMatch(1);
        await Promise.all(
          Array.from({ length: destroyCount }, () => this.triggerRandomTileForRicochet(match)),
        );
      }

      // Saloon: generate resources of adjacent tiles on the board
      if (match.tileType === 'saloon') {
        this.resolveSaloonAdjacent(match);
      }

      // Check if an enemy died from this match + trait kill hooks
      for (const enemy of this.enemies) {
        if (enemy.state.isDead && !enemy.state._deathProcessed) {
          this.enemyDiedThisSwap = true;
          enemy.state._deathProcessed = true;
          const ragefulGain = this.traits.onEnemyKilled();
          if (ragefulGain > 0) {
            this.player.ragefulStacks += ragefulGain;
            this.floatOnPlayer(`+${ragefulGain} RAGEFUL`, '#D04040', 9);
          }
          // Undertaker(6): on enemy death, gain 1 Ready
          this.traits.onEnemyKilledUndertaker();
          // Reaper's Scythe: apply Shadow to 5 tiles
          if (this.artifacts.has('reapers_scythe')) {
            this.board.applyShadowToRandomTiles(5);
          }
          // Corpse Explosion: summoned enemy dies -> deal maxHP to ALL enemies
          if (this.artifacts.hasCorpseExplosion() && enemy.summoned) {
            const explosionDmg = enemy.getDefinition().health;
            for (const alive of this.aliveEnemies()) {
              const { hpLost } = alive.takeDamage(explosionDmg);
              this.damageDealtThisFight += hpLost;
              this.floatOnEnemy(alive, `-${hpLost}`, '#D06060');
            }
            this.emitEnemyHpChanges();
            EventBus.emit(GameEvent.SCREEN_SHAKE, 'medium');
          }
          // Kill Confirmed: kill with .50 Cal or 5+ match -> gain 1 swap
          const killArt = this.artifacts.onEnemyKilled(match);
          if (killArt.killGrantsSwap) {
            this.swapsRemaining++;
            EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
          }
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
  private async triggerRandomTileForRicochet(sourceMatch: MatchResult): Promise<void> {
    const result = await this.board.pickAndRemoveRandomTile(50);
    if (result === null) return;

    // Apply resource output for each destroyed tile (includes explosive/showdown chain)
    for (const info of result.destroyed) {
      const upgradeLevel = this.player.getUpgradeLevel(info.type);
      const isSuppressed = this.hazardManager.isSuppressed(info.type);
      const output = isSuppressed
        ? this.resolver.emptyOutput()
        : this.resolver.resolveSingle(info.type, upgradeLevel);
      this.applyResourceOutput(output);
    }
    this.ricochetTriggeredThisResolution = true;

    // Flash a line from source match center to the picked tile
    const mid = sourceMatch.tiles[Math.floor(sourceMatch.tiles.length / 2)];
    EventBus.emit(GameEvent.FLASH_LINE, mid, result.position, sourceMatch.tileType);
  }

  /**
   * Saloon: for each matched saloon tile position, generate the resource
   * of each adjacent tile still on the board.
   */
  private resolveSaloonAdjacent(match: MatchResult): void {
    const grid = this.board.getGrid();
    const size = this.board.getBoardSize();
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const seen = new Set<string>();

    for (const pos of match.tiles) {
      for (const [dr, dc] of directions) {
        const r = pos.row + dr;
        const c = pos.col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const key = `${r},${c}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const tile = grid[r]?.[c];
        if (!tile || tile.type === 'saloon' || tile.type === 'showdown' || tile.type === 'tumbleweed' || tile.type === 'fools_gold') continue;

        // Saloon generates base (Lv0) resources of adjacent tiles
        const output = this.resolver.resolveSingle(tile.type, 0);
        this.applyResourceOutput(output);
      }
    }
  }

  /** Emit a floating number on an enemy. */
  private floatOnEnemy(enemy: Enemy, text: string, color: string, fontSize?: number): void {
    EventBus.emit(GameEvent.FLOATING_NUMBER, 'enemy', this.enemies.indexOf(enemy), text, color, fontSize);
  }

  /** Apply venom to an enemy, adding Rattlesnake Fang Necklace bonus. */
  private applyPoison(enemy: Enemy, stacks: number): void {
    const total = stacks + this.artifacts.getExtraPoisonStacks();
    enemy.addPoison(total);
  }

  /** Emit a floating number on the player. */
  private floatOnPlayer(text: string, color: string, fontSize?: number): void {
    EventBus.emit(GameEvent.FLOATING_NUMBER, 'player', 0, text, color, fontSize);
  }

  /** Get the highest-HP alive enemy. */
  private getHighestHpEnemy(): Enemy | null {
    const alive = this.aliveEnemies();
    return alive.reduce((best, e) =>
      e.state.health > (best?.state.health ?? 0) ? e : best, alive[0]) ?? null;
  }

  /** Deal damage to an enemy, handling pierce, and show floating number. */
  private dealDamageToEnemy(enemy: Enemy, damage: number, pierce: boolean, isCrit = false): void {
    // Undertaker(3): +50% damage to summoned enemies
    const undertakerBonus = this.traits.getUndertakerBonusDamage(enemy.summoned);
    if (undertakerBonus > 0) {
      damage = Math.round(damage * (1 + undertakerBonus));
    }

    const critSize = isCrit ? 18 : undefined;
    if (pierce) {
      const hpBefore = enemy.state.health;
      enemy.state.health = Math.max(0, enemy.state.health - damage);
      if (enemy.state.health <= 0) enemy.state.isDead = true;
      const actual = hpBefore - enemy.state.health;
      this.damageDealtThisFight += actual;
      if (actual > 0) playHit();
      this.floatOnEnemy(enemy, isCrit ? `-${actual}!` : `-${actual}`, '#ff4444', critSize);
    } else {
      const { hpLost, blocked } = enemy.takeDamage(damage);
      this.damageDealtThisFight += hpLost;
      if (blocked > 0) { playBlock(); this.floatOnEnemy(enemy, `-${blocked}`, '#6888A0'); }
      if (hpLost > 0) {
        playHit();
        const label = isCrit ? `-${damage}!` : `-${hpLost}`;
        this.floatOnEnemy(enemy, label, '#ff4444', critSize);
      }
    }
    // Bounty kill check after damage
    this.handleBountyKill(enemy);
  }

  /** Check and handle bounty kill: execute. Bounty Hunter(1): +10 gold if non-summoned. */
  private handleBountyKill(enemy: Enemy): boolean {
    if (enemy.checkBountyKill()) {
      this.floatOnEnemy(enemy, 'COLLECTED', '#FFD700');
      // Bounty kills on non-summoned enemies grant 10 gold
      if (!enemy.summoned) {
        this.player.addGold(10);

        EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
      }
      return true;
    }
    return false;
  }

  private applyResourceOutput(output: ResourceOutput, isCrit = false): void {
    // Rageful: bonus damage per stack
    const damage = output.damage > 0 ? output.damage + this.player.ragefulStacks : 0;
    // Sturdy: bonus block per stack
    const block = output.block > 0 ? output.block + this.player.sturdyStacks : 0;

    // Damage
    if (damage > 0) {
      if (output.buckshotHits > 0) {
        // Each hit targets a random alive enemy independently
        const alive = this.aliveEnemies();
        if (alive.length > 0) {
          for (let i = 0; i < output.buckshotHits; i++) {
            const current = this.aliveEnemies();
            if (current.length === 0) break;
            const target = current[Math.floor(Math.random() * current.length)];
            this.dealDamageToEnemy(target, damage, false, isCrit);
          }
        }
      } else if (output.isAoE) {
        for (const enemy of this.aliveEnemies()) {
          this.dealDamageToEnemy(enemy, damage, false, isCrit);
        }
      } else if (output.targetsHighestHp) {
        const target = this.getHighestHpEnemy();
        if (target) this.dealDamageToEnemy(target, damage, output.piercesBlock, isCrit);
      } else if (output.piercesBlock) {
        const target = this.getTargetedAliveEnemy();
        if (target) this.dealDamageToEnemy(target, damage, true, isCrit);
      } else {
        const target = this.getTargetedAliveEnemy();
        if (target) this.dealDamageToEnemy(target, damage, false, isCrit);
      }
      this.emitEnemyHpChanges();
      this.traits.onDamageDealt();
    }

    // Block
    if (block > 0) {
      this.player.addBlock(block);
      this.floatOnPlayer(`+${block}`, '#6888A0');
    }

    // Barricade stacks
    if (output.barricadeStacks > 0) {
      this.player.barricadeStacks += output.barricadeStacks;
    }

    // Gold (reduced by ascension modifier)
    if (output.gold > 0) {
      const scaledGold = Math.max(1, Math.round(output.gold * this.goldMultiplier));
      this.player.addGold(scaledGold);

      EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);

      // Prospector(4): gaining gold deals 1 damage to a random enemy
      if (this.traits.goldDealsDamage()) {
        const alive = this.aliveEnemies();
        if (alive.length > 0) {
          const target = alive[Math.floor(Math.random() * alive.length)];
          this.dealDamageToEnemy(target, 1, false);
          this.emitEnemyHpChanges();
        }
      }
    }

    // Healing
    if (output.healing > 0) {
      const healed = this.player.heal(output.healing);
      this.floatOnPlayer(`+${healed}`, '#40D840');
      EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
      // Offering Plate: healing grants gold equal to HP healed
      this.artifacts.onPlayerHealed(healed, this.player);
    }

    // Ability charges (capped at threshold)
    if (output.abilityCharges > 0) {
      const wasFull = this.player.abilityCharge >= this.player.abilityThreshold;
      this.player.abilityCharge = Math.min(
        this.player.abilityThreshold,
        this.player.abilityCharge + output.abilityCharges,
      );
      if (!wasFull && this.player.abilityCharge >= this.player.abilityThreshold) playAbilityReady();
      EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);
    }

    // Venom
    if (output.poisonStacks > 0) {
      // Rattlesnake(4): venom applies to ALL enemies
      if (this.traits.poisonAppliesToAll()) {
        for (const enemy of this.aliveEnemies()) {
          this.applyPoison(enemy, output.poisonStacks);
          this.floatOnEnemy(enemy, `+${output.poisonStacks} POISON`, '#40ff40', 9);
        }
      } else {
        const target = output.targetsHighestHp
          ? this.getHighestHpEnemy()
          : this.getTargetedAliveEnemy();
        if (target) {
          this.applyPoison(target, output.poisonStacks);
          this.floatOnEnemy(target, `+${output.poisonStacks} POISON`, '#40ff40', 9);
        }
      }
    }

    // Vulnerable
    if (output.vulnerableStacks > 0) {
      const target = output.targetsHighestHp
        ? this.getHighestHpEnemy()
        : this.getTargetedAliveEnemy();
      if (target) {
        target.addVulnerable(output.vulnerableStacks);
        this.floatOnEnemy(target, `+${output.vulnerableStacks} VULNERABLE`, '#C070D0', 9);
      }
    }

    // Bounty stacks
    if (output.bountyStacks > 0) {
      const target = this.getTargetedAliveEnemy();
      if (target) {
        target.addBounty(output.bountyStacks);
        this.floatOnEnemy(target, `+${output.bountyStacks} BOUNTY`, '#C04040', 9);
        if (this.handleBountyKill(target)) {
          this.emitEnemyHpChanges();
        }
      }
    }

    // Ace stacks
    if (output.aceStacks > 0) {
      this.player.addAceStacks(output.aceStacks);
      this.floatOnPlayer(`+${output.aceStacks} ACE`, '#E0C880', 9);
    }

    // Lucky stacks (crit chance)
    if (output.luckyStacks > 0) {
      this.player.addLuckyStacks(output.luckyStacks);
      this.floatOnPlayer(`+${output.luckyStacks} LUCKY`, '#C8A040', 9);
    }

    // Rageful stacks
    if (output.ragefulStacks > 0) {
      this.player.ragefulStacks += output.ragefulStacks;
      this.floatOnPlayer(`+${output.ragefulStacks} RAGEFUL`, '#D04040', 9);
    }

    // Sturdy stacks
    if (output.sturdyStacks > 0) {
      this.player.sturdyStacks += output.sturdyStacks;
      this.floatOnPlayer(`+${output.sturdyStacks} STURDY`, '#6888A0', 9);
    }

    // Chain stacks
    if (output.chainStacks > 0) {
      this.player.chainStacks += output.chainStacks;
      this.floatOnPlayer(`+${output.chainStacks} CHAIN`, '#A08040', 9);
    }

    // Bonus swaps (Cavalry 4+)
    if (output.bonusSwaps > 0) {
      this.swapsRemaining += output.bonusSwaps;
      this.floatOnPlayer(`+${output.bonusSwaps} SWAP`, '#70B0D0', 9);
      EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
    }

    // Chip miss/hit feedback
    if (output.chipHit === true) {
      this.floatOnPlayer('HIT', '#B060D0');
      // Rigged Deck: 50% chance chip hit also hits another enemy
      if (this.artifacts.has('rigged_deck') && Math.random() < 0.5) {
        const alive = this.aliveEnemies();
        const targeted = this.getTargetedAliveEnemy();
        const others = alive.filter(e => e !== targeted);
        if (others.length > 0) {
          const bonus = others[Math.floor(Math.random() * others.length)];
          const dmg = output.damage > 0 ? output.damage : 0;
          if (dmg > 0) {
            this.dealDamageToEnemy(bonus, dmg, false, isCrit);
            this.emitEnemyHpChanges();
          }
        }
      }
    } else if (output.chipHit === false) {
      const target = this.getTargetedAliveEnemy();
      if (target) {
        this.floatOnEnemy(target, 'MISS', '#666');
      } else {
        this.floatOnPlayer('MISS', '#666');
      }
      // Rigged Deck: chip misses generate 2 gold
      if (this.artifacts.has('rigged_deck')) {
        const missGold = Math.max(1, Math.round(2 * this.goldMultiplier));
        this.player.addGold(missGold);

        EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
      }
    }

    // Reno's Coin: self-damage on chip miss
    if (output.doubleDownPenalty && output.doubleDownPenalty > 0) {
      this.player.health = Math.max(0, this.player.health - output.doubleDownPenalty);
      this.floatOnPlayer(`-${output.doubleDownPenalty}`, '#ff4444');
      EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
      if (this.player.health <= 0) this.playerTookDamageThisFight = true;
    }

    EventBus.emit(GameEvent.STATUS_EFFECT_CHANGE);
  }

  // ---------------------------------------------------------------------------
  // Turn End & Enemy Turn
  // ---------------------------------------------------------------------------

  private async endTurn(): Promise<void> {
    // Tick cracked ground stacks
    for (const enemy of this.aliveEnemies()) {
      if (enemy.state.crackedGround > 0) enemy.state.crackedGround--;
    }

    // Tracker(1): reveal all buried tiles at end of turn
    if (this.traits.shouldRevealBuried()) {
      const cleared = this.hazardManager.clearAllOfType('sand');
      if (cleared.length > 0) {
        // Tracker(3): gain 1 Rageful per revealed buried tile
        if (this.traits.buriedRevealGrantsRageful()) {
          this.player.ragefulStacks += cleared.length;
          this.floatOnPlayer(`+${cleared.length} RAGEFUL`, '#D04040', 9);
        }
        // Artifact buried-reveal hooks (Trapper's Snare, Gravedigger's Shovel)
        const buriedArt = this.artifacts.onBuriedRevealed();
        for (let i = 0; i < cleared.length; i++) {
          const alive = this.aliveEnemies();
          if (alive.length === 0) break;
          const rndEnemy = alive[Math.floor(Math.random() * alive.length)];
          if (buriedArt.vulnerableCount > 0) {
            rndEnemy.addVulnerable(buriedArt.vulnerableCount);
            this.floatOnEnemy(rndEnemy, `+${buriedArt.vulnerableCount} VULNERABLE`, '#C070D0', 9);
          }
          if (buriedArt.damagePerReveal > 0) {
            const { hpLost } = rndEnemy.takeDamage(buriedArt.damagePerReveal);
            this.damageDealtThisFight += hpLost;
            this.floatOnEnemy(rndEnemy, `-${hpLost}`, '#808080');
          }
        }
        this.emitEnemyHpChanges();
      }
    }

    // Preacher(2): heal 5 if no damage dealt this turn
    const preacherHealing = this.traits.getPreacherHealing();
    if (preacherHealing > 0) {
      this.player.heal(preacherHealing);
      this.floatOnPlayer(`+${preacherHealing}`, '#40D840');
      EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
    }

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

    // Artifact turn-end effects (Iron Will, Sheriff's Domino)
    this.artifacts.onTurnEnd(this.swapsRemaining, this.player);

    // Trailblazer's Compass: unused swaps deal 3 damage each to targeted enemy
    if (this.artifacts.has('trailblazers_compass') && this.swapsRemaining > 0) {
      const compassTarget = this.getTargetedAliveEnemy();
      if (compassTarget) {
        const totalDmg = this.swapsRemaining * 3;
        const { hpLost } = compassTarget.takeDamage(totalDmg);
        this.damageDealtThisFight += hpLost;
        this.floatOnEnemy(compassTarget, `-${hpLost}`, '#70B0D0');
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...compassTarget.state });
      }
    }

    if (this.isCombatOver()) {
      this.endCombat();
      return;
    }

    this.setPhase('enemy-turn');
    EventBus.emit(GameEvent.TURN_END, this.buildState());

    const speed = getSpeedMultiplier();
    EventBus.emit(GameEvent.TURN_BANNER, 'ENEMY TURN');
    await new Promise(r => setTimeout(r, Math.round(1000 / speed)));

    await this.executeEnemyTurn();

    await new Promise(r => setTimeout(r, Math.round(1000 / speed)));

    // Player block expires after the enemy turn so it absorbs incoming attacks
    this.player.resetTurnEffects();
    this.emitFullState();

    if (this.isCombatOver()) {
      this.endCombat();
      return;
    }

    EventBus.emit(GameEvent.TURN_BANNER, 'YOUR TURN');
    await new Promise(r => setTimeout(r, Math.round(1000 / speed)));

    // Start next player turn
    await this.startTurn();
  }

  private async executeEnemyTurn(): Promise<void> {
    // 1. Venom ticks on all enemies (upgrade adds +1 bonus damage per tick per level)
    const wasteUpgrade = this.player.getUpgradeLevel('waste');
    for (const enemy of this.aliveEnemies()) {
      const poisonDamage = enemy.tickPoison(wasteUpgrade);
      if (poisonDamage > 0) {
        this.damageDealtThisFight += poisonDamage;
        this.floatOnEnemy(enemy, `-${poisonDamage}`, '#40ff40');
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
        this.handleBountyKill(enemy);
      }
      // Vulnerable decreases by 1 at end of turn
      if (enemy.state.vulnerable > 0) {
        enemy.state.vulnerable--;
      }
      // Terrified decreases by 1 at end of turn
      if (enemy.state.terrifiedStacks > 0) {
        enemy.state.terrifiedStacks--;
      }
    }

    // Sync HUD after venom ticks so enemy HP bars update immediately
    this.emitFullState();

    // Check for deaths from venom
    if (this.isCombatOver()) return;

    // 2. (Bombs now tick per swap, not per turn)

    // 3. Boss per-turn effects (passive locks, bombs, etc.)
    if (this.bossController) {
      const boss = this.getBossEnemy();
      if (boss) {
        const phaseChanged = this.bossController.checkPhaseTransition(boss, this.hazardManager, this.board);
        if (phaseChanged) {
          EventBus.emit(GameEvent.SCREEN_SHAKE, 'heavy');
        }
        this.bossController.executePerTurnEffects(
          this.hazardManager,
          boss,
          this.player.activeTileTypes,
          this.board,
        );
      }
    }

    // 4. Each alive enemy acts one by one (top to bottom visual order)
    // Visual slots: slot 0 (top) = enemy[1], slot 1 (center) = enemy[0], slot 2 (bottom) = enemy[2]
    const visualOrder = [1, 0, 2];
    const alive = this.aliveEnemies();
    const sorted = visualOrder
      .map(i => this.enemies[i])
      .filter((e): e is Enemy => e != null && !e.state.isDead);
    // Include any enemies beyond index 2 that aren't in the visual order
    for (const e of alive) {
      if (!sorted.includes(e)) sorted.push(e);
    }
    for (const enemy of sorted) {
      // Re-check: enemy may have died from venom, thorns, or mid-turn effects
      if (enemy.state.isDead) continue;
      // Timed enemies (Mine Cart) don't attack -- damage only on time expiry
      if (this.isTimedEnemy(enemy)) continue;

      await new Promise(r => setTimeout(r, Math.round(600 / getSpeedMultiplier())));
      EventBus.emit(GameEvent.ENEMY_ACTION, enemy.state.id);
      const action = enemy.executeIntent();

      switch (action.type) {
        case 'attack': {
          if (action.value > 0) {
            // Terrified: deal 50% less damage
            let adjustedDamage = enemy.state.terrifiedStacks > 0
              ? Math.round(action.value * 0.5)
              : action.value;
            // Preacher's Bible: take 1 less damage from enemy attacks
            if (this.artifacts.has('preachers_bible')) {
              adjustedDamage = Math.max(0, adjustedDamage - 1);
            }
            // Preacher(4): 20% less damage from enemies with lower HP than player
            const preacherReduction = this.traits.getPreacherDamageReduction(enemy.state.health, this.player.health);
            if (preacherReduction > 0) adjustedDamage = Math.round(adjustedDamage * (1 - preacherReduction));
            const { hpLost, blocked, thornsDamage } = this.player.takeDamage(adjustedDamage);
            if (hpLost > 0) { playHit(); this.playerTookDamageThisFight = true; }
            if (blocked > 0) { playBlock(); this.floatOnPlayer(`-${blocked}`, '#6888A0'); }
            if (hpLost > 0) this.floatOnPlayer(`-${hpLost}`, '#ff4444');

            // Artifact damage-taken hooks (Cactus Spine Vest, Death's Pocket Watch, Sheriff's Domino)
            const artDmg = this.artifacts.onPlayerDamaged(hpLost, this.player);
            if (artDmg.poisonToAttacker > 0) {
              this.applyPoison(enemy, artDmg.poisonToAttacker);
              this.floatOnEnemy(enemy, `+${artDmg.poisonToAttacker} POISON`, '#40ff40', 9);
              EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
            }
            EventBus.emit(
              GameEvent.PLAYER_HP_CHANGE,
              this.player.health,
              this.player.maxHealth,
            );
            // Screen shake scales with damage
            if (action.value >= 25) {
              EventBus.emit(GameEvent.SCREEN_SHAKE, 'heavy');
            } else if (action.value >= 15) {
              EventBus.emit(GameEvent.SCREEN_SHAKE, 'medium');
            } else {
              EventBus.emit(GameEvent.SCREEN_SHAKE, 'light');
            }

            // Thorns reflects damage back to the attacking enemy
            if (thornsDamage > 0) {
              this.damageDealtThisFight += enemy.takeDamage(thornsDamage).hpLost;
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
          // Silver Bullet: boss gains block -> gain 1 Ready
          if (this.isBossEnemy(enemy)) {
            this.artifacts.onBossGainedBlock(this.player);
          }
          break;
        case 'summon':
          this.trySummonEnemy(enemy);
          break;
        case 'board-manipulation':
          if (enemy.state.intent.description.startsWith('SUPPRESS')) {
            // Suppress: place suppress hazard on 3 random tiles
            this.hazardManager.placeRandomSuppress(3);
          } else {
            executeBoardManipulation(enemy, enemy.state.intent, this.hazardManager, this.traits.getBombCountdownBonus());
          }
          break;
        case 'ability':
          break;
      }

      // Sync full state after each enemy action so HUD reflects block/status changes
      this.emitFullState();

      if (this.player.isDead()) return;
    }
  }

  /**
   * Try to summon a new enemy. Max 3 on field.
   * Boss summons use BossController.createBossMinion for SPEC-accurate minions.
   */
  /** Add an enemy to the array, replacing a dead slot if possible, otherwise push. */
  private addEnemyToSlot(enemy: Enemy): void {
    // Preserve current target across the slot change
    const prevTarget = this.getTargetedAliveEnemy();

    const deadIdx = this.enemies.findIndex(e => e.state.isDead);
    if (deadIdx >= 0) {
      this.enemies[deadIdx] = enemy;
    } else {
      this.enemies.push(enemy);
    }

    // Restore target index so summoning doesn't shift the player's target
    if (prevTarget) {
      const alive = this.aliveEnemies();
      const restored = alive.indexOf(prevTarget);
      if (restored >= 0) this.targetedEnemyIndex = restored;
    }
  }

  private trySummonEnemy(summoner: Enemy): void {
    if (this.aliveEnemies().length >= 3) return;

    // Boss summons a specific minion type
    if (this.bossController && this.isBossEnemy(summoner)) {
      const minionDef = BossController.createBossMinion(summoner.getDefinition().type);
      if (minionDef) {
        const bossMinion = new Enemy(minionDef);
        bossMinion.summoned = true;
        bossMinion.state.summoned = true;
        this.addEnemyToSlot(bossMinion);
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
    minion.summoned = true;
    minion.state.summoned = true;

    // Coyote Pelt: summoned enemies take 5 damage immediately
    const hpBeforeSummon = minion.state.health;
    this.artifacts.onEnemySummoned(minion, this.player);
    this.damageDealtThisFight += Math.max(0, hpBeforeSummon - minion.state.health);

    this.addEnemyToSlot(minion);
    this.emitFullState();
  }

  // ---------------------------------------------------------------------------
  // Combat End
  // ---------------------------------------------------------------------------

  private isCombatOver(): boolean {
    if (this.player.isDead()) return true;
    const alive = this.aliveEnemies();
    if (alive.length === 0) return true;
    // If only summoned enemies remain, the fight is won
    if (alive.every((e) => e.summoned)) {
      // Kill remaining summoned enemies
      for (const e of alive) e.state.isDead = true;
      return true;
    }
    return false;
  }

  private endCombat(): void {
    const victory = !this.player.isDead();

    // Cancel deadeye if active
    if (this.isDeadeyeActive) {
      this.isDeadeyeActive = false;
      this.deadeyeShotsRemaining = 0;
      this.player.abilityCharge = 0;
      this.board.setDeadeyeMode(false);
      document.body.classList.remove('cursor-crosshair');
    }

    this.setPhase('combat-end');

    // Post-combat artifact effects
    if (victory) {
      // Bamboo Canteen: restore 6 HP after combat
      if (this.artifacts.has('bamboo_canteen')) {
        this.player.heal(6);
        this.floatOnPlayer('+6', '#40D840');
        EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
      }
    }

    // Victory gold reward from enemies (randomized around a base)
    if (victory) {
      let base: number;
      let range: number;
      if (this.isBoss) { base = 45; range = 10; }
      else if (this.eliteModifier) { base = 25; range = 5; }
      else { base = 10; range = 3; }
      let goldReward = base + Math.floor(Math.random() * (range * 2 + 1)) - range;
      goldReward = Math.max(1, Math.round(goldReward * this.goldMultiplier));
      this.player.addGold(goldReward);

      EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
    }

    // Reset per-fight effects
    this.player.resetFightEffects();

    const result: CombatResult = {
      victory,
      playerHealth: this.player.health,
      playerGold: this.player.gold,
      goldEarned: this.player.goldThisFight,
      abilityCharge: this.player.abilityCharge,
      damageDealt: this.damageDealtThisFight,
      longestCascade: this.longestCascadeThisFight,
      playerDamageTaken: this.playerTookDamageThisFight,
    };

    EventBus.emit(GameEvent.COMBAT_END, result);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Create the standard onCascadeStep callback used by both swap and deadeye.
   * Handles SFX, combo multiplier, hazard resolution, resource processing, and HUD sync.
   */
  private makeCascadeStepHandler(getStep: () => number): (stepMatches: MatchResult[]) => Promise<void> {
    return async (stepMatches: MatchResult[]) => {
      const step = getStep();
      playMatch(step);
      const clearPoison = this.traits.clearsAdjacentPoison();
      let poisonCleared = 0;
      let locksFreed = 0;
      for (const match of stepMatches) {
        const locksBefore = this.hazardManager.countHazards('lock');
        const freed = this.hazardManager.resolveAdjacentHazards(match.tiles, clearPoison);
        locksFreed += locksBefore - this.hazardManager.countHazards('lock');
        if (clearPoison) {
          poisonCleared += freed.filter(p => {
            // Count tiles that were poison (now cleared)
            const tile = this.board.getGrid()[p.row]?.[p.col];
            return tile && !tile.hazard; // was just freed
          }).length;
        }
      }
      // Rattlesnake(2): cleared poison applies venom to target
      if (poisonCleared > 0 && this.traits.poisonHazardAppliesPoison()) {
        // Rattlesnake(4): venom applies to ALL enemies
        if (this.traits.poisonAppliesToAll()) {
          for (const enemy of this.aliveEnemies()) {
            this.applyPoison(enemy, poisonCleared);
            this.floatOnEnemy(enemy, `+${poisonCleared} POISON`, '#40ff40', 9);
            EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
          }
        } else {
          const target = this.getTargetedAliveEnemy();
          if (target) {
            this.applyPoison(target, poisonCleared);
            this.floatOnEnemy(target, `+${poisonCleared} POISON`, '#40ff40', 9);
            EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...target.state });
          }
        }
      }
      // Jail Cell Keys: gain 4 block per lock freed
      if (locksFreed > 0) {
        const lockBlock = this.artifacts.onLockFreed() * locksFreed;
        if (lockBlock > 0) {
          this.player.addBlock(lockBlock);
          this.floatOnPlayer(`+${lockBlock}`, '#6888A0');
        }
      }
      const comboMultiplier = step > 1 ? Math.min(3.0, 1 + (step - 1) * 0.1) : 1.0;
      await this.processMatches(stepMatches, comboMultiplier);
      this.emitFullState();
      this.emitEnemyHpChanges();
      EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
      EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
      EventBus.emit(GameEvent.COMBO_UPDATE, step);
    };
  }

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
      if (this.player.takeDamage(this.timedFailureDamage).hpLost > 0) this.playerTookDamageThisFight = true;
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
    return {
      character: this.character,
      turnNumber: this.turnNumber,
      swapsRemaining: this.swapsRemaining,
      swapsPerTurn: this.swapsPerTurn,
      playerBlock: this.player.block,
      aceStacks: this.player.aceStacks,
      aceMultiplier: this.player.aceMultiplier,
      luckyStacks: this.player.luckyStacks,
      barricadeStacks: this.player.barricadeStacks,
      ragefulStacks: this.player.ragefulStacks,
      sturdyStacks: this.player.sturdyStacks,
      graceStacks: this.player.graceStacks,
      poisonedStacks: this.player.poisonedStacks,
      readyStacks: this.player.readyStacks,
      chainStacks: this.player.chainStacks,
      thorns: this.player.thorns,
      enemies: this.enemies.map((e) => ({ ...e.state })),
      targetedEnemyIndex: (() => {
        const alive = this.aliveEnemies();
        const target = alive[this.targetedEnemyIndex];
        return target ? this.enemies.indexOf(target) : 0;
      })(),
      phase: this.phase,
      abilityCharge: this.player.abilityCharge,
      abilityThreshold: this.player.abilityThreshold,
      isDeadeyeActive: this.isDeadeyeActive,
      deadeyeShotsRemaining: this.deadeyeShotsRemaining,
      deadeyeMaxShots: this.deadeyeMaxShots,
      canDeadeyeShootEnemy: this.isDeadeyeActive
        && this.deadeyeShotsRemaining === 1
        && this.artifacts.has('rusts_cylinder'),
      isShuffleHoldMode: false,
      shuffleHoldsRemaining: 0,
      shuffleMaxHolds: 0,
      turnLimit: this.turnLimit,
      suppressedTileTypes: [],
      mirageType: this.board.getMirageType(),
    };
  }

  /** Saloon Keeper(4): grant a random consumable from the basic pool. */
  private grantRandomConsumable(): void {
    const pool = CONSUMABLES.filter((c) =>
      !['stick_of_tnt', 'skeleton_key', 'signal_flare'].includes(c.id),
    );
    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      useRunStore.getState().addConsumable({ id: pick.id });
    }
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
