import type { Board, SwapResult } from '../board/Board';
import type { CombatState, CombatPhase, MatchResult, EnemyDefinition, CombatSwapSource } from '../../types/combat';
import { ALL_ENEMIES } from '../../data/enemies';
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
import { chooseEnemyIntent } from './EnemyAI';
import { BossController } from './BossController';
import { playSwapFail, playMatch, playDeadeyeShot, playHit, playBlock, playAbilityReady, playShuffle, playRevolverSpin } from '../../services/sfx';
import { useRunStore } from '../../store/runStore';
import { useCombatStore } from '../../store/combatStore';
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
  /** Set to true when this encounter contains the Outlaw King (guaranteed legendary drop on victory). */
  isOutlawKing?: boolean;
  /** Gold multiplier from wanted level (1.0 = normal, <1.0 = reduced). */
  goldMultiplier?: number;
}

export interface CombatResult {
  victory: boolean;
  playerHealth: number;
  playerGold: number;
  /** Net gold change during the fight (positive minus penalties). */
  goldEarned: number;
  /** Sum of POSITIVE gold gains during the fight, ignoring penalties.
   *  This is what feeds the run-wide goldObtained tally. */
  goldGainedThisFight: number;
  abilityCharge: number;
  damageDealt: number;
  longestCascade: number;
  playerDamageTaken: boolean;
  /** True on victory if this fight was the Outlaw King encounter. */
  defeatedOutlawKing: boolean;
  /** Name of the enemy / source that dealt the killing blow. Null on victory. */
  deathCause: string | null;
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
  private isElite = false;
  private isOutlawKing = false;
  private phase: CombatPhase = 'turn-start';
  private turnNumber = 0;
  private swapsPerTurn: number;
  private swapsRemaining = 0;
  private baseSwapIconSources: CombatSwapSource[] = ['default', 'default', 'default'];
  private swapIconSources: CombatSwapSource[] = ['default', 'default', 'default'];
  /** One-shot swap adjustment applied to turn 1 only (e.g. Campfire Stranger "Keep walking" +2, Ghost Town Saloon "Drink" -1). */
  private turnOneSwapAdjustment = 0;
  /**
   * Lethargic: while true, matches from the current swap's cascade produce
   * no resources (empty output, no shadow/poison/chain side effects). Set at
   * swap start when `lethargicPending` is armed; cleared when the swap fully
   * resolves.
   */
  private lethargicSuppressResources = false;
  private targetedEnemyIndex = 0;
  private isDeadeyeActive = false;
  private deadeyeShotsRemaining = 0;
  private deadeyeMaxShots: number;
  private deadeyeFinishSpinTrigger = 0;
  /** Ability charges earned while Deadeye is active; rolled into abilityCharge on endDeadeye. */
  private pendingAbilityCharge = 0;
  private isBoss: boolean;
  /** Next match multiplier from consumables (Moonshine 2x, Strong Coffee 1.5x). */
  private nextMatchMultiplier = 1.0;
  /** Track if any enemy died during the current swap resolution. */
  private enemyDiedThisSwap = false;
  /** Track swaps used this turn for Sharpshooter's Eye reset. */
  private swapsUsedThisTurn = 0;
  private ensureSwapPhaseMovesPromise: Promise<void> | null = null;
  /** Whether the current swap being resolved was non-adjacent (lasso). */
  private currentSwapIsLasso = false;
  /** Lasso consumable: number of remaining non-adjacent swaps allowed. */
  private lassoSwapsRemaining = 0;
  /** Whether a ricochet triggered a random tile removal that needs gravity+cascade resolution. */
  private ricochetTriggeredThisResolution = false;
  /** Total damage dealt to enemies this fight (for scoring). */
  private damageDealtThisFight = 0;
  /** Longest cascade chain (number of steps) across all swaps this fight. */
  private longestCascadeThisFight = 0;
  /** Whether the player took any HP damage this fight (for flawless tracking). */
  private playerTookDamageThisFight = false;
  /** Last source that dealt HP damage to the player (enemy name or a generic
   *  tag like "Poison" / "Bomb"). Used to attribute the killing blow when
   *  endCombat fires in defeat. */
  private lastDamageSource: string | null = null;
  /** Gold multiplier from wanted level (1.0 = normal, <1.0 = reduced). */
  private goldMultiplier: number;
  /** Set true when any Jackhammer match resolves during the current player turn.
   *  If still false at the end of the turn, player.jackhammerCombatLevel resets. */
  private jackhammerUsedThisTurn = false;
  private nunchucksLastTarget: number | null = null;

  constructor(board: Board, config: CombatConfig) {
    this.board = board;
    this.character = config.character;
    this.resolver = new ResourceResolver();
    this.hazardManager = new BoardHazardManager(board);
    this.isBoss = config.isBoss ?? false;
    this.goldMultiplier = (config.goldMultiplier ?? 1.0);

    // Initialize trait and artifact systems
    this.traits = new TraitSystem(config.traitCounts);
    this.artifacts = new ArtifactSystem(config.artifacts);

    // Reno's Coin: override chip bucket to 6 hit / 2 miss
    if (this.artifacts.has('renos_coin')) {
      this.resolver.setChipBucket(6, 8);
    }

    // Golden Scarab: +30% gold gain
    this.goldMultiplier *= this.artifacts.getGoldGainMultiplier();

    // Base swaps + trait/artifact bonus. The event-driven "next fight swap
    // bonus" is applied to turn 1 only (see startTurn), matching the copy
    // ("Start the next fight with N extra swaps") rather than giving the
    // bonus every turn of the fight.
    const baseSwaps = config.swapsPerTurn ?? 3;
    const traitSwapBonus = this.traits.getExtraSwapsPerTurn();
    const artifactSwapBonus = this.artifacts.getExtraSwapsPerTurn();
    this.swapsPerTurn = baseSwaps + traitSwapBonus + artifactSwapBonus;
    this.baseSwapIconSources = [
      ...Array.from({ length: baseSwaps }, () => 'default' as const),
      ...Array.from({ length: traitSwapBonus }, () => 'mustang' as const),
      ...Array.from({ length: artifactSwapBonus }, () => 'dans_feather' as const),
    ];
    this.swapIconSources = [...this.baseSwapIconSources];
    this.turnOneSwapAdjustment = useRunStore.getState().run?.pendingNextFightSwapBonus ?? 0;
    if (this.turnOneSwapAdjustment !== 0) {
      useRunStore.getState().setPendingNextFightSwapBonus(undefined);
    }

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
    // Mirage was transformed in CombatScene before CombatManager was created;
    // record the chosen type so getUpgradeLevel can apply Mirage's upgrade.
    this.player.mirageReplacementType = this.board.getMirageType();
    this.player.poisonTileBonus = this.traits.getPoisonTileLevelBonus();

    // Initialize enemies
    for (const def of config.enemies) {
      const enemy = new Enemy(def);
      if ((def as unknown as Record<string, unknown>)._summoned) {
        enemy.summoned = true;
        enemy.state.summoned = true;
      }
      this.enemies.push(enemy);
    }

    // Boss controller for phase-based bosses
    if (config.isBoss && config.enemies.length > 0) {
      this.bossController = new BossController(config.enemies[0].type);
    }

    this.isElite = config.isElite ?? false;
    this.isOutlawKing = config.isOutlawKing ?? false;

    // Set board tile types and Sapper explosive radius
    this.board.setActiveTileTypes(config.activeTileTypes);
    if (this.traits.hasExpandedExplosiveRadius()) {
      this.board.setExplosiveRadius(2);
    }
    // Tinker's Wrench: 3-matches also spawn explosive tiles
    if (this.artifacts.shouldThreeMatchSpawnExplosive()) {
      this.board.setThreeMatchExplosive(true);
    }
    // Snakeskin Boots: first poison per turn is auto-cleansed
    if (this.artifacts.has('snakeskin_boots')) {
      this.hazardManager.snakeskinActive = true;
    }

    // Apply fight-start effects
    this.traits.onFightStart(this.player, this.isBoss, this.enemies);
    this.artifacts.onFightStart(this.player, this.enemies);

    // Execute enemy startOfFight actions BEFORE Sidewinder poison,
    // so Dead Man Walking is active when poison is applied.
    // (e.g. Rattlesnake: Poison 3 Tiles).
    // Tile-hazard placement actions are skipped while the player has Protected
    // (e.g. from High Vis Jacket), matching the in-turn immunity check.
    const startOfFightHazardImmune = this.player.protectedStacks > 0;
    for (const enemy of this.enemies) {
      const sof = enemy.getDefinition().startOfFight;
      if (sof && sof.length > 0) {
        for (const action of sof) {
          // Only execute board-level actions (poison, bury, lock, etc.)
          // Skip attacks/blocks since combat hasn't started yet
          if (action.kind === 'poison_tiles') { if (!startOfFightHazardImmune) this.hazardManager.placeRandomPoison(action.value); }
          else if (action.kind === 'bury') { if (!startOfFightHazardImmune) this.hazardManager.placeRandomSand(action.value); }
          else if (action.kind === 'lock') { if (!startOfFightHazardImmune) this.hazardManager.placeRandomLocks(action.value); }
          else if (action.kind === 'lock_row') { if (!startOfFightHazardImmune) this.hazardManager.lockRow(Math.floor(Math.random() * 8)); }
          else if (action.kind === 'lock_column') { if (!startOfFightHazardImmune) this.hazardManager.lockColumn(Math.floor(Math.random() * 8)); }
          else if (action.kind === 'suppress') { if (!startOfFightHazardImmune && !this.traits.isSuppressImmune()) this.hazardManager.placeRandomSuppress(action.value); }
          else if (action.kind === 'bomb') { if (!startOfFightHazardImmune) this.hazardManager.placeRandomBombs(action.value, 3 + this.traits.getBombCountdownBonus()); }
          else if (action.kind === 'gain_cloak') enemy.state.cloak += action.value;
          else if (action.kind === 'gain_hardened') enemy.state.hardened += action.value;
          else if (action.kind === 'gain_grace') enemy.state.graceStacks += action.value;
          else if (action.kind === 'gain_dead_man_walking') enemy.state.deadManWalking += action.value;
          else if (action.kind === 'gain_invulnerable') enemy.state.invulnerable += action.value;
          else if (action.kind === 'gain_scavenger') enemy.state.scavenger += action.value;
          else if (action.kind === 'apply_terrified') { if (!this.player.tryAbsorbDebuff()) this.player.terrifiedStacks += action.value; }
          else if (action.kind === 'apply_vulnerable') { if (!this.player.tryAbsorbDebuff()) this.player.vulnerableStacks += action.value; }
          else if (action.kind === 'block') enemy.addBlock(action.value);
          else if (action.kind === 'summon' && action.summonType) this.trySummonEnemy(enemy, action.summonType, action.summonFullHp);
        }
      }
    }

    // Sidewinder Belt: apply poison AFTER enemy startOfFight (so DMW blocks it).
    // Routed through applyPoison() so Rattlesnake Fang Necklace bonus applies.
    if (this.artifacts.has('sidewinder_belt')) {
      for (const enemy of this.enemies) {
        if (!enemy.state.isDead) this.applyPoison(enemy, 2);
      }
    }

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

    // Corrupt(2): at fight start, add Shadow to 2 tiles per Corrupt artifact owned.
    if (this.traits.isActive('corrupt', 2)) {
      const corruptCount = this.traits.getLevel('corrupt');
      this.board.applyShadowToRandomTiles(2 * corruptCount);
    }

    // Travelling Preacher "Confess": grant queued Grace stacks on fight start.
    const pendingGrace = useRunStore.getState().run?.pendingNextFightGrace ?? 0;
    if (pendingGrace > 0) {
      this.player.graceStacks += pendingGrace;
      useRunStore.getState().setPendingNextFightGrace(undefined);
    }

    // Tinnitus: hide enemy intents on turn 1. Cleared at the start of turn 2.
    useCombatStore.getState().setIntentsHidden(this.artifacts.has('tinnitus'));
    // Lethargic: show the status only while the first-swap penalty is still pending.
    useCombatStore.getState().setLethargicActive(this.artifacts.lethargicPending);

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
      if (this.isDeadeyeActive) {
        this.cancelAbility();
        return;
      }
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
      swapIconSources: [...this.swapIconSources],
      targetedEnemyIndex: this.targetedEnemyIndex,
      phase: this.phase,
      isDeadeyeActive: this.isDeadeyeActive,
      deadeyeShotsRemaining: this.deadeyeShotsRemaining,
      deadeyeMaxShots: this.deadeyeMaxShots,
      isBoss: this.isBoss,
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
        duelStacks: this.player.duelStacks,
        chainStacks: this.player.chainStacks,
        lootStacks: this.player.lootStacks,
        jackhammerCombatLevel: this.player.jackhammerCombatLevel,
        protectedStacks: this.player.protectedStacks,
        critChance: 0, // deprecated, kept for snapshot compat
        thorns: this.player.thorns,
        shedSkinAvailable: this.player.shedSkinAvailable,
        deadManWalkingAvailable: this.player.deadManWalkingAvailable,
        deadManWalkingStacks: this.player.deadManWalkingStacks,
        damageReduction: this.player.damageReduction,
        gold: this.player.gold,
        goldThisFight: this.player.goldThisFight,
        goldObtainedThisFight: this.player.goldObtainedThisFight,
        abilityCharge: this.player.abilityCharge,
        activeTileTypes: [...this.player.activeTileTypes],
        tileUpgrades: { ...this.player.tileUpgrades },
      },
      enemies: serializedEnemies,
      bossController: this.bossController?.serialize() ?? null,
      eliteModifierId: null,
      suppressedTypes: [],
      longestCascadeThisFight: this.longestCascadeThisFight,
      playerTookDamageThisFight: this.playerTookDamageThisFight,
      matchCountThisFight: this.traits.getMatchCountThisFight(),
      damageDealtThisTurn: this.traits.getDamageDealtThisTurn(),
      undertakerDoubleDamageReady: this.traits.getUndertakerBonusDamageReady(),
      lethargicPending: this.artifacts.lethargicPending,
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
    this.player.deadManWalkingStacks = sp.deadManWalkingStacks ?? 0;
    this.player.readyStacks = sp.readyStacks ?? 0;
    this.player.duelStacks = sp.duelStacks ?? 0;
    this.player.chainStacks = sp.chainStacks ?? 0;
    this.player.lootStacks = sp.lootStacks ?? 0;
    this.player.jackhammerCombatLevel = sp.jackhammerCombatLevel ?? 0;
    this.player.protectedStacks = sp.protectedStacks ?? 0;
    // critChance deprecated — Lucky stacks are the crit chance now
    this.player.thorns = sp.thorns;
    this.player.shedSkinAvailable = sp.shedSkinAvailable ?? false;
    this.player.deadManWalkingAvailable = sp.deadManWalkingAvailable ?? false;
    this.player.damageReduction = sp.damageReduction ?? 0;
    this.player.goldThisFight = sp.goldThisFight;
    this.player.goldObtainedThisFight = sp.goldObtainedThisFight ?? 0;
    // Mirage was already restored on the board; mirror it onto the player so
    // getUpgradeLevel applies the mirage upgrade after a mid-combat reload.
    this.player.mirageReplacementType = this.board.getMirageType();
    this.player.poisonTileBonus = this.traits.getPoisonTileLevelBonus();

    // Restore enemies
    this.enemies = snapshot.enemies.map((se) => {
      const enemy = new Enemy(se.definition);
      enemy.state = {
        ...se.state,
        // Backfill fields that may be missing from older snapshots
        deadManWalking: se.state.deadManWalking ?? 0,
        barricadeStacks: se.state.barricadeStacks ?? 0,
        intent: { ...se.state.intent },
      };
      enemy.skipNextAction = se.skipNextAction;
      enemy.summoned = se.state.summoned ?? false;
      return enemy;
    });

    // Restore combat manager internal state
    this.turnNumber = snapshot.turnNumber;
    this.swapsRemaining = snapshot.swapsRemaining;
    this.swapsPerTurn = snapshot.swapsPerTurn;
    this.swapIconSources = snapshot.swapIconSources
      ? [...snapshot.swapIconSources]
      : [...this.baseSwapIconSources];
    this.targetedEnemyIndex = snapshot.targetedEnemyIndex;
    this.phase = snapshot.phase;
    this.isDeadeyeActive = snapshot.isDeadeyeActive;
    this.deadeyeShotsRemaining = snapshot.deadeyeShotsRemaining;
    this.deadeyeMaxShots = snapshot.deadeyeMaxShots;
    this.isBoss = snapshot.isBoss;
    this.nextMatchMultiplier = snapshot.nextMatchMultiplier;
    this.damageDealtThisFight = snapshot.damageDealtThisFight;
    this.swapsUsedThisTurn = snapshot.swapsUsedThisTurn;
    this.longestCascadeThisFight = snapshot.longestCascadeThisFight ?? 0;
    this.playerTookDamageThisFight = snapshot.playerTookDamageThisFight ?? false;

    // Restore boss controller
    if (snapshot.bossController && this.bossController) {
      this.bossController.restoreState(snapshot.bossController);
    }

    // Restore subsystem state to prevent save/reload exploits
    this.traits.restoreState(
      snapshot.matchCountThisFight ?? 0,
      snapshot.swapsUsedThisTurn,
      false,
      snapshot.damageDealtThisTurn ?? false,
      snapshot.undertakerDoubleDamageReady ?? false,
    );
    // Older snapshots do not record Lethargic state; default to consumed so a
    // one-time combat-start penalty is not incorrectly re-armed on resume.
    this.artifacts.restoreState(false, snapshot.turnNumber ?? 0, snapshot.lethargicPending ?? false);
    useCombatStore.getState().setLethargicActive(this.artifacts.lethargicPending);

    // Cancel deadeye on restore -- cursor/board state won't carry over
    if (this.isDeadeyeActive) {
      this.isDeadeyeActive = false;
      this.deadeyeShotsRemaining = 0;
      this.board.setDeadeyeMode(false);
      document.body.classList.remove('cursor-crosshair');
    }

    // Cancel lasso on restore
    if (this.lassoSwapsRemaining > 0) {
      this.lassoSwapsRemaining = 0;
      this.board.setLassoMode(false);
      document.body.classList.remove('cursor-lasso');
    }

    // If the snapshot was taken mid-resolution (e.g. app backgrounded during
    // cascade), transition to the next interactive phase so input works.
    if (this.phase === 'resolving') {
      this.phase = this.swapsRemaining > 0 ? 'swap-phase' : 'consumable-window';
    }

    this.ensureMilkHasTransformed();

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
    this.ensureMilkHasTransformed();

    // Tinnitus only hides intents on turn 1 -- reveal from turn 2 onward.
    if (this.turnNumber > 1) {
      useCombatStore.getState().setIntentsHidden(false);
    }

    this.resetTurnSwapState();
    this.nextMatchMultiplier = 1.0;
    this.swapsUsedThisTurn = 0;
    this.resolver.resetTurn();
    this.board.resetTurn();

    // Jackhammer: if no Jackhammer match happened last turn, drop the per-combat
    // extra-hit level back to 0. Checked at the start of each new turn so the
    // reset happens once the next player turn actually begins.
    if (this.turnNumber > 1 && !this.jackhammerUsedThisTurn && this.player.jackhammerCombatLevel > 0) {
      this.player.jackhammerCombatLevel = 0;
      EventBus.emit(GameEvent.COMBAT_STATE_UPDATE, this.buildState());
    }
    this.jackhammerUsedThisTurn = false;

    this.hazardManager.resetTurnArtifactState();

    // Antivenom(4): halve player's Poison stacks at the start of every turn.
    if (this.player.poisonedStacks > 0 && this.traits.halvesPoisonOnTurnStart()) {
      this.player.poisonedStacks = Math.floor(this.player.poisonedStacks / 2);
    }

    // Venomous tick: player takes damage equal to stacks, stacks decrease by 1
    // Bone Charm: venom damage halved
    if (this.player.poisonedStacks > 0) {
      const rawDmg = this.player.poisonedStacks;
      const poisonDmg = Math.max(1, Math.round(rawDmg * this.artifacts.getPoisonDamageMultiplier()));
      this.player.health = Math.max(0, this.player.health - poisonDmg);
      this.lastDamageSource = 'Poison';
      this.player.poisonedStacks--;
      // Lethal poison must still trigger Shed Skin / Dead Man Walking, and if the
      // player dies here we must end combat — otherwise they sit at 0 HP until
      // the next move's match resolution catches it.
      this.player.tryLethalSave();
      this.floatOnPlayer(`-${poisonDmg}`, '#40ff40');
      EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
      if (this.player.health <= 0) {
        this.playerTookDamageThisFight = true;
        this.endCombat();
        return;
      }
    }

    // Per-turn: +1 ability charge (capped at threshold). Defer while Deadeye is active.
    if (this.isDeadeyeActive) {
      this.pendingAbilityCharge++;
    } else if (this.player.abilityCharge < this.player.abilityThreshold) {
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

    // Resurrecting Nails: on 3rd turn during boss combat, restore 30% HP
    if (this.artifacts.shouldResurrect(this.isBoss)) {
      const healAmt = Math.round(this.player.maxHealth * 0.3);
      const healed = this.player.heal(healAmt);
      if (healed > 0) {
        this.floatOnPlayer(`+${healed}`, '#40D840');
        EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
      }
    }

    // Strong Liver: lose 1 gold, gain random buff
    if (this.artifacts.shouldStrongLiver() && this.player.gold > 0) {
      this.player.addGold(-1);
      EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
      const buffs = ['rageful', 'sturdy', 'ace', 'lucky', 'ready'] as const;
      const pick = buffs[Math.floor(Math.random() * buffs.length)];
      switch (pick) {
        case 'rageful': this.player.ragefulStacks += 1; break;
        case 'sturdy': this.player.sturdyStacks += 1; break;
        case 'ace': this.player.addAceStacks(1); break;
        case 'lucky': this.player.addLuckyStacks(1); break;
        case 'ready': this.player.addReady(1); break;
      }
    }

    // Announce enemy intents for this turn
    for (const enemy of this.aliveEnemies()) {
      enemy.state.intent = chooseEnemyIntent(enemy, this.aliveEnemies().length);
      this.patchCopperheadIntent(enemy);
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

  private ensureMilkHasTransformed(): void {
    if (this.turnNumber < 4) return;

    const transformedTileTypes = Array.from(
      new Set(this.player.activeTileTypes.map((type) => (type === 'milk' ? 'cheese' : type))),
    );
    const ownedTilesChanged = transformedTileTypes.length !== this.player.activeTileTypes.length
      || transformedTileTypes.some((type, index) => type !== this.player.activeTileTypes[index]);

    let boardTilesChanged = false;
    for (const row of this.board.getGrid()) {
      for (const tile of row) {
        if (tile?.type === 'milk') {
          tile.setType('cheese');
          boardTilesChanged = true;
        }
      }
    }

    if (!ownedTilesChanged && !boardTilesChanged) return;

    this.player.activeTileTypes = transformedTileTypes;
    this.board.setActiveTileTypes(transformedTileTypes);

    const milkUpgrade = this.player.tileUpgrades.milk;
    if (milkUpgrade !== undefined) {
      this.player.tileUpgrades.cheese = Math.max(this.player.tileUpgrades.cheese ?? 0, milkUpgrade);
    }
  }

  private resetTurnSwapState(): void {
    this.swapsRemaining = this.swapsPerTurn;
    this.swapIconSources = [...this.baseSwapIconSources];

    if (this.turnNumber === 1 && this.turnOneSwapAdjustment !== 0) {
      if (this.turnOneSwapAdjustment > 0) {
        this.swapsRemaining += this.turnOneSwapAdjustment;
        this.swapIconSources.push(
          ...Array.from({ length: this.turnOneSwapAdjustment }, () => 'default' as const),
        );
      } else {
        this.swapsRemaining = Math.max(1, this.swapsRemaining + this.turnOneSwapAdjustment);
      }
    }
  }

  private grantBonusSwaps(count: number, source: CombatSwapSource = 'default'): void {
    if (count <= 0) return;

    const nextRemaining = this.swapsRemaining + count;
    const extraIconsNeeded = Math.max(0, nextRemaining - this.swapIconSources.length);
    this.swapsRemaining = nextRemaining;

    if (extraIconsNeeded > 0) {
      this.swapIconSources.push(
        ...Array.from({ length: extraIconsNeeded }, () => source),
      );
      this.emitFullState();
    }

    EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
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
   * Some consumables and mid-turn board mutations can leave the board with
   * zero legal adjacent swaps. If the player enters swap phase in that state,
   * reshuffle until a valid move exists so they don't get stuck.
   */
  private ensureSwapPhaseHasValidMoves(): void {
    if (this.ensureSwapPhaseMovesPromise) return;
    if (this.phase !== 'swap-phase') return;
    if (this.swapsRemaining <= 0) return;
    if (this.board.getIsResolving()) return;
    if (this.isCombatOver()) return;

    // Lasso allows non-adjacent swaps; avoid reshuffling based on adjacent-only
    // move detection while lasso mode is active.
    if (this.lassoSwapsRemaining > 0) return;

    if (this.board.hasValidMoves()) return;

    this.board.setIsResolving(true);
    this.ensureSwapPhaseMovesPromise = (async () => {
      await this.board.reshuffleAnimated();
      this.board.setIsResolving(false);
      this.emitFullState();
      EventBus.emit(GameEvent.COMBAT_SAVE_REQUESTED);
    })().finally(() => {
      this.ensureSwapPhaseMovesPromise = null;
    });
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

    // If the board has no legal swaps, reshuffle first and don't consume a swap.
    if (!this.board.hasValidMoves() && this.lassoSwapsRemaining <= 0) {
      this.ensureSwapPhaseHasValidMoves();
      return;
    }

    this.swapsRemaining--;
    this.swapsUsedThisTurn++;
    this.setPhase('resolving');
    EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);

    // Lethargic: the first VALID swap generates no resources. We tentatively
    // set the suppress flag so match processing ignores resources, but only
    // officially consume `lethargicPending` after the swap passes validity
    // checks -- invalid swaps leave the pending flag intact for the next try.
    const wasLethargicPending = this.artifacts.lethargicPending;
    if (wasLethargicPending) {
      this.lethargicSuppressResources = true;
    }

    const from = { row: fromRow, col: fromCol };
    const to = { row: toRow, col: toCol };

    // Track whether this swap is non-adjacent (lasso)
    this.currentSwapIsLasso = !this.board.isAdjacent(from, to);

    // Non-adjacent swaps require lasso consumable
    if (this.currentSwapIsLasso && this.lassoSwapsRemaining <= 0) {
      // Refund the swap -- not allowed without lasso
      this.swapsRemaining++;
      this.swapsUsedThisTurn--;
      this.setPhase('swap-phase');
      EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
      playSwapFail();
      this.lethargicSuppressResources = false;
      return;
    }

    // Lasso is only consumed after a VALID swap. Keep the mode/cursor active
    // across invalid attempts (e.g. locked tiles, non-matches).
    const usingLasso = this.lassoSwapsRemaining > 0;

    // Track trait/artifact swap hooks
    this.traits.onSwapPerformed();
    this.enemyDiedThisSwap = false;
    this.ricochetTriggeredThisResolution = false;

    // Process each cascade step's matches immediately (damage, block, etc.)
    // Shared step counter across swap cascade, prairie fire, and dust devil boots
    let cascadeSteps = 0;
    const nextStep = () => ++cascadeSteps;
    const onCascadeStep = this.makeCascadeStepHandler(nextStep);

    const result: SwapResult = await this.board.trySwap(from, to, onCascadeStep, usingLasso);

    // Update longest cascade tracking
    if (cascadeSteps > this.longestCascadeThisFight) {
      this.longestCascadeThisFight = cascadeSteps;
    }

    if (!result.valid) {
      // Invalid swap -- refund. Lethargic pending flag is preserved so the
      // next valid swap is the one that gets suppressed.
      playSwapFail();
      this.swapsRemaining++;
      this.swapsUsedThisTurn--;
      EventBus.emit(GameEvent.SWAPS_CHANGE, this.swapsRemaining, this.swapsPerTurn);
      this.setPhase('swap-phase');
      this.lethargicSuppressResources = false;
      return;
    }

    if (usingLasso) {
      this.lassoSwapsRemaining--;
      if (this.lassoSwapsRemaining <= 0) {
        this.board.setLassoMode(false);
        document.body.classList.remove('cursor-lasso');
      }
    }

    // Valid swap -- officially consume Lethargic pending now.
    if (wasLethargicPending) {
      this.artifacts.lethargicPending = false;
      useCombatStore.getState().setLethargicActive(false);
      this.floatOnPlayer('Lethargic', '#8B3A9B');
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

    // Lethargic consumed -- this swap's matches are done, clear the flag.
    this.lethargicSuppressResources = false;

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
      EventBus.emit(GameEvent.COMBO_UPDATE, 0);
      this.endCombat();
      return;
    }

    if (this.swapsRemaining <= 0) {
      // Dust Devil Boots: after using all swaps, shuffle bottom 2 rows + resolve cascades
      if (this.artifacts.has('dust_devil_boots')) {
        this.board.setIsResolving(true);
        await this.board.shuffleRowsAnimated([6, 7]);
        this.ricochetTriggeredThisResolution = false;
        const onBootsStep = this.makeCascadeStepHandler(nextStep, true);
        await this.board.resolveMatchesFull(onBootsStep);
        while (this.ricochetTriggeredThisResolution) {
          this.ricochetTriggeredThisResolution = false;
          await this.board.applyGravityAnimated();
          await this.board.fillEmptyTilesAnimated();
          await this.board.resolveMatchesFull(onBootsStep);
        }
        this.board.setIsResolving(false);
        if (this.isCombatOver()) { EventBus.emit(GameEvent.COMBO_UPDATE, 0); this.endCombat(); return; }
      }
      EventBus.emit(GameEvent.COMBO_UPDATE, 0);
      this.endTurn();
    } else {
      EventBus.emit(GameEvent.COMBO_UPDATE, 0);
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
    if (!this.player.isDeadeyeReady()) return false;

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
    this.resolveDestroyedTiles(destroyed);

    this.deadeyeShotsRemaining--;
    if (this.player.abilityCharge > 0) this.player.abilityCharge--;
    EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);
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
    // Post-Deadeye matches are all cascades — force cloak suppression.
    this.ricochetTriggeredThisResolution = false;
    let cascadeSteps = 0;
    const onCascadeStep = this.makeCascadeStepHandler(() => ++cascadeSteps, true);

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

    // Cross/L/T explosions (and the Deadeye shot itself) can wipe enough of the
    // board that the remaining tiles have zero legal swaps. Reshuffle before
    // returning control to the player so they don't get stuck.
    if (!this.isCombatOver() && !this.board.hasValidMoves()) {
      await this.board.reshuffleAnimated();
    }

    this.board.setIsResolving(false);

    // Reset combo after cascade resolves
    EventBus.emit(GameEvent.COMBO_UPDATE, 0);

    if (this.deadeyeShotsRemaining <= 0) {
      this.endDeadeye(true);
    }

    if (this.isCombatOver()) {
      this.endCombat();
    }

    this.emitFullState();
    if (this.deadeyeShotsRemaining <= 0) {
      this.requestCombatSaveIfStable();
    }
  }

  /**
   * Rust's Cylinder: last Deadeye shot targets an enemy directly,
   * dealing 7 damage plus 1 damage per Bounty stack on that enemy.
   */
  async deadeyeShootEnemy(enemyIndex: number): Promise<void> {
    if (!this.isDeadeyeActive || this.deadeyeShotsRemaining !== 1) return;
    if (!this.artifacts.has('rusts_cylinder')) return;

    const enemy = this.enemies[enemyIndex];
    if (!enemy || enemy.state.isDead) return;

    playDeadeyeShot();

    const damage = 7 + enemy.state.bountyStacks;
    this.dealDamageToEnemy(enemy, damage, true);
    this.emitEnemyHpChanges();

    this.deadeyeShotsRemaining = 0;
    if (this.player.abilityCharge > 0) this.player.abilityCharge--;
    EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);
    this.board.setDeadeyeMode(false);
    document.body.classList.remove('cursor-crosshair');
    this.emitFullState();

    this.endDeadeye(true);

    if (this.isCombatOver()) {
      this.endCombat();
    }

    this.emitFullState();
    this.requestCombatSaveIfStable();
  }

  private endDeadeye(playSpin = false): void {
    if (playSpin) {
      this.triggerAbilityFinishSpin();
    }
    this.isDeadeyeActive = false;
    this.deadeyeShotsRemaining = 0;
    const rollover = Math.min(this.player.abilityThreshold, this.pendingAbilityCharge);
    this.pendingAbilityCharge = 0;
    this.player.abilityCharge = rollover;
    this.board.setDeadeyeMode(false);
    document.body.classList.remove('cursor-crosshair');
    EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);
    this.emitFullState();
  }

  /** Cancel the active ability. Retain charges if unused, clear remaining if partly used. */
  private cancelAbility(): void {
    if (this.isDeadeyeActive) {
      const usedShots = this.deadeyeMaxShots - this.deadeyeShotsRemaining;
      this.isDeadeyeActive = false;
      this.deadeyeShotsRemaining = 0;
      this.board.setDeadeyeMode(false);
      document.body.classList.remove('cursor-crosshair');
      if (usedShots > 0) {
        const rollover = Math.min(this.player.abilityThreshold, this.pendingAbilityCharge);
        this.player.abilityCharge = rollover;
      } else {
        this.player.abilityCharge = Math.min(
          this.player.abilityThreshold,
          this.player.abilityCharge + this.pendingAbilityCharge,
        );
      }
      this.pendingAbilityCharge = 0;
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
    playShuffle();

    this.emitFullState();
    EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);

    // Animated reshuffle then let matches cascade
    this.board.setIsResolving(true);
    await this.board.reshuffleAnimatedWithCascades();

    // Post-Shuffle matches are all cascades — force cloak suppression.
    this.ricochetTriggeredThisResolution = false;
    let cascadeSteps = 0;
    const onCascadeStep = this.makeCascadeStepHandler(() => ++cascadeSteps, true);

    await this.board.resolveMatchesFull(onCascadeStep);

    while (this.ricochetTriggeredThisResolution) {
      this.ricochetTriggeredThisResolution = false;
      await this.board.applyGravityAnimated();
      await this.board.fillEmptyTilesAnimated();
      await this.board.resolveMatchesFull(onCascadeStep);
    }

    this.board.setIsResolving(false);
    EventBus.emit(GameEvent.COMBO_UPDATE, 0);
    this.triggerAbilityFinishSpin();

    if (this.isCombatOver()) {
      this.endCombat();
    }

    this.emitFullState();
    this.ensureSwapPhaseHasValidMoves();
    this.requestCombatSaveIfStable();
  }

  /** Trigger the shared chamber finisher animation/SFX used when an ability fully resolves. */
  private triggerAbilityFinishSpin(): void {
    playRevolverSpin();
    this.deadeyeFinishSpinTrigger++;
  }

  /** Request a combat snapshot once the board is back at a safe interactive point. */
  private requestCombatSaveIfStable(): void {
    if (this.isCombatOver()) return;
    if (this.board.getIsResolving()) return;
    if (this.ensureSwapPhaseMovesPromise) return;
    EventBus.emit(GameEvent.COMBAT_SAVE_REQUESTED);
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
      const healMult = this.artifacts.getConsumableHealMultiplier();
      switch (consumableId) {
        case 'strong_whiskey':
          this.player.heal(Math.round(20 * healMult));
          break;
        case 'bandage':
          this.player.heal(Math.round(10 * healMult));
          this.hazardManager.clearAllOfType('poison');
          break;
        case 'strong_coffee':
          this.nextMatchMultiplier = 2.0;
          break;
        case 'pocket_watch':
          this.grantBonusSwaps(1, 'pocket_watch');
          break;
        case 'wanted_flyer': {
          const target = this.getTargetedAliveEnemy();
          if (target) target.addVulnerable(2);
          break;
        }
        case 'skeleton_key': {
          const cleared = this.hazardManager.clearAllOfType('lock');
          this.grantJailCellKeysBlock(cleared.length);
          break;
        }
        case 'tumbleweed': {
          this.board.setIsResolving(true);
          await this.board.reshuffleAnimatedWithCascades();
          this.ricochetTriggeredThisResolution = false;
          let cascadeSteps = 0;
          // Tumbleweed consumable reshuffles — all resulting matches are cascades.
          const onCascadeStep = this.makeCascadeStepHandler(() => ++cascadeSteps, true);
          await this.board.resolveMatchesFull(onCascadeStep);
          while (this.ricochetTriggeredThisResolution) {
            this.ricochetTriggeredThisResolution = false;
            await this.board.applyGravityAnimated();
            await this.board.fillEmptyTilesAnimated();
            await this.board.resolveMatchesFull(onCascadeStep);
          }
          this.board.setIsResolving(false);
          EventBus.emit(GameEvent.COMBO_UPDATE, 0);
          this.ensureSwapPhaseHasValidMoves();
          break;
        }
        case 'signal_flare':
          this.hazardManager.clearAllOfType('sand');
          break;
        case 'stick_of_tnt':
          await this.resolveStickOfTNT();
          this.ensureSwapPhaseHasValidMoves();
          break;
        case 'snake_oil':
          this.resolveSnakeOil(healMult);
          break;
        case 'lasso':
          this.lassoSwapsRemaining++;
          this.board.setLassoMode(true);
          document.body.classList.add('cursor-lasso');
          break;
        case 'broom': {
          this.hazardManager.clearAllOfType('poison');
          this.hazardManager.clearAllOfType('bomb');
          this.hazardManager.clearAllOfType('sand');
          this.hazardManager.clearAllOfType('fools_gold');
          const cleared = this.hazardManager.clearAllOfType('lock');
          this.hazardManager.clearAllOfType('suppress');
          this.grantJailCellKeysBlock(cleared.length);
          break;
        }
        case 'panacea': {
          this.player.vulnerableStacks = 0;
          this.player.poisonedStacks = 0;
          this.player.terrifiedStacks = 0;
          break;
        }
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
          this.dealAuxiliaryDamageToEnemy(target, consumableArt.bonusDamage, '#D04040');
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

    this.requestCombatSaveIfStable();

    return true;
  }

  private resolveSnakeOil(healMult: number): void {
    const roll = Math.random();
    if (roll < 0.2) {
      this.player.heal(Math.round(23 * healMult));
      return;
    }
    if (roll < 0.4) {
      // Gain 6 max HP (and heal by the same amount, capped at the new max).
      this.player.maxHealth += 6;
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 6);
      return;
    }
    if (roll < 0.6) {
      this.player.addGold(Math.max(1, Math.round(100 * this.goldMultiplier)));
      return;
    }
    if (roll < 0.8) {
      if (this.player.takeDamage(14).hpLost > 0) {
        this.playerTookDamageThisFight = true;
        this.lastDamageSource = 'Snake Oil';
      }
      return;
    }
    // 20%: do nothing.
  }

  private async resolveStickOfTNT(): Promise<void> {
    // Clear the bottom row.
    // Special tiles trigger automatically via destroyTilesWithEffects.
    const boardSize = this.board.getBoardSize();
    const targetRow = boardSize - 1;

    // Collect positions for the entire middle row
    const positions: import('../../types/combat').GridPosition[] = [];
    for (let col = 0; col < boardSize; col++) {
      if (this.board.getTileAt({ row: targetRow, col })) {
        positions.push({ row: targetRow, col });
      }
    }

    // Centralized destruction handles explosive chains and showdown triggers
    const destroyed = await this.board.destroyTilesWithEffects(positions);
    this.resolveDestroyedTiles(destroyed);

    EventBus.emit(GameEvent.SCREEN_SHAKE, 'heavy');

    // Cascade: gravity + fill + resolve matches
    await this.board.applyGravityAnimated();
    await this.board.fillEmptyTilesAnimated();
    const cascadeMatches = await this.board.resolveMatches();
    if (cascadeMatches.length > 0) {
      await this.processMatches(cascadeMatches);
    }

    // TNT can leave the board in a no-valid-moves state; if the player is still
    // in swap phase, reshuffle before returning control.
    this.ensureSwapPhaseHasValidMoves();

    this.emitFullState();
    this.emitEnemyHpChanges();
    EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
    EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
  }

  // ---------------------------------------------------------------------------
  // Match Processing & Resource Application
  // ---------------------------------------------------------------------------

  private async processMatches(
    matches: MatchResult[],
    comboMultiplier = 1.0,
    forceCascadeForCloak = false,
  ): Promise<void> {
    // Sort by resolveOrder so interactions are consistent (e.g. block before boulder).
    const sorted = matches.length > 1
      ? [...matches].sort((a, b) => {
        const aOrder = TILE_DEFINITIONS[a.tileType]?.resolveOrder ?? 3;
        const bOrder = TILE_DEFINITIONS[b.tileType]?.resolveOrder ?? 3;
        return aOrder - bOrder;
      })
      : matches;

    for (const match of sorted) {
      // Lethargic: the first swap of the combat generates no resources.
      // Suppress output for every match in this swap's cascade (including
      // cascades, shadow bolts, poison application, chain buff damage).
      if (this.lethargicSuppressResources) {
        const zero = this.resolver.emptyOutput();
        EventBus.emit(GameEvent.MATCH_RESOLVED, match, zero);
        continue;
      }
      // Suppress hazard: if any tile in the match was suppressed, produce zero output.
      if (match.suppressCount && match.suppressCount > 0) {
        const zero = this.resolver.emptyOutput();
        EventBus.emit(GameEvent.MATCH_RESOLVED, match, zero);
        continue;
      }

      let upgradeLevel = this.player.getUpgradeLevel(match.tileType);
      // Loaded Dice: cascade matches trigger 1 level higher
      if (comboMultiplier > 1.0) upgradeLevel += this.artifacts.getCascadeUpgradeBonus();
      // Chain: each Chain stack acts as an extra upgrade level for this combat,
      // so the flat-per-level bonus (+2 damage to match total) stacks up across
      // matches instead of applying as a per-tile buff.
      if (match.tileType === 'chain') {
        upgradeLevel += this.player.chainStacks;
      }
      let output = this.resolver.resolve(match, upgradeLevel);

      // Poison tiles: apply venomous stacks to player
      if (match.poisonCount && match.poisonCount > 0) {
        this.player.poisonedStacks += match.poisonCount;
        this.floatOnPlayer(`+${match.poisonCount} POISON`, '#40ff40', 9);
      }

      // Shadow tiles: each fires a shadow bolt dealing 10 damage to a random enemy
      if (match.shadowCount && match.shadowCount > 0) {
        for (let s = 0; s < match.shadowCount; s++) {
          const alive = this.aliveEnemies();
          if (alive.length === 0) break;
          const target = alive[Math.floor(Math.random() * alive.length)];
          this.dealAuxiliaryDamageToEnemy(target, 10, '#6b2fa0');
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

      // Ace stacks: consumed on next non-Ace non-cascade match (all resources)
      if (match.tileType !== 'ace' && comboMultiplier === 1.0 && this.player.aceStacks > 0) {
        multiplier *= this.player.consumeAce();
      }

      // Consumable match multiplier (Moonshine/Coffee): all resources, first match only
      if (this.nextMatchMultiplier > 1.0) {
        multiplier *= this.nextMatchMultiplier;
        this.nextMatchMultiplier = 1.0;
      }

      // Ready: next non-cascade attack deals 50% more damage (DAMAGE ONLY).
      let damageOnlyMult = 1.0;
      if (comboMultiplier === 1.0 && output.damage > 0 && this.player.readyStacks > 0) {
        damageOnlyMult *= this.player.consumeReady();
      }

      // Cloak: reduce cascade damage by 50% while any enemy has the buff (DAMAGE ONLY).
      // `forceCascadeForCloak` treats every step as a cascade — used by abilities
      // (Deadeye, Shuffle, Dust Devil Boots, reshuffle) and board mutations
      // (Prairie Fire spread, Tumbleweed Golem transform) where the follow-up
      // matches are never direct player matches.
      const isCascade = forceCascadeForCloak || comboMultiplier > 1.0;
      const cloakActive = isCascade
        && this.aliveEnemies().some(e => e.state.cloak > 0);

      // Player Terrified: deal 25% less damage
      if (this.player.terrifiedStacks > 0 && output.damage > 0) {
        output.damage = Math.round(output.damage * 0.75);
      }

      // Scope Lens: 5+ matches double all resources (damage/block/gold/healing
      // AND count-driven stacks). Fixed-1 stacks (chain, duel, barricade,
      // vulnerable) are skipped -- doubling a flat-1 stack from 1 to 2 would
      // silently change per-match semantics of those tiles.
      if (this.artifacts.shouldDoubleMatchResources(match.length)) {
        output.damage *= 2;
        output.block *= 2;
        output.gold *= 2;
        output.healing *= 2;
        output.aceStacks *= 2;
        output.poisonStacks *= 2;
        output.luckyStacks *= 2;
        output.bountyStacks *= 2;
        output.lootStacks *= 2;
        output.abilityCharges *= 2;
      }

      // Sniper's Eye: 5-match attacks deal damage to ALL enemies
      if (this.artifacts.shouldFiveMatchAoE(match.length) && output.damage > 0) {
        output.isAoE = true;
      }

      // Apply multipliers. `totalMultiplier` scales all resources; Ready and
      // Cloak ride on top of it for damage only. Fixed-1 stacks (chain, duel,
      // barricade, vulnerable) and bonus flags are preserved via the spread.
      const totalMultiplier = multiplier * comboMultiplier;
      const damageMultiplier = totalMultiplier * damageOnlyMult * (cloakActive ? 0.5 : 1);
      const scaled: ResourceOutput = {
        ...output,
        damage: Math.floor(output.damage * damageMultiplier),
        block: Math.floor(output.block * totalMultiplier),
        gold: Math.floor(output.gold * totalMultiplier),
        healing: Math.floor(output.healing * totalMultiplier),
        aceStacks: Math.floor(output.aceStacks * totalMultiplier),
        poisonStacks: Math.floor(output.poisonStacks * totalMultiplier),
        luckyStacks: Math.floor(output.luckyStacks * totalMultiplier),
        bountyStacks: Math.floor(output.bountyStacks * totalMultiplier),
        lootStacks: Math.floor(output.lootStacks * totalMultiplier),
        abilityCharges: Math.floor(output.abilityCharges * totalMultiplier),
      };

      // Boulder: damage = floor(block / 5) * tiles
      if (match.tileType === 'boulder') {
        scaled.damage = Math.floor(this.player.block / 5) * match.tiles.length;
      }

      // Stampede: +1 damage per tile for each currently-alive enemy
      if (match.tileType === 'stampede') {
        const aliveCount = this.aliveEnemies().length;
        scaled.damage += aliveCount * match.tiles.length;
      }

      // Tombstone: double damage when the targeted enemy is below 50% HP
      if (match.tileType === 'tombstone') {
        const target = this.getTargetedAliveEnemy();
        if (target && target.state.health * 2 < target.state.maxHealth) {
          scaled.damage *= 2;
        }
      }

      // Axe: double damage when the targeted enemy has any block
      if (match.tileType === 'axe') {
        const target = this.getTargetedAliveEnemy();
        if (target && target.state.block > 0) {
          scaled.damage *= 2;
        }
      }

      // Cactus: grant +1 Thorns per tile on every match
      if (match.tileType === 'cactus') {
        this.player.thorns += match.tiles.length;
      }

      // Hourglass: +swaps-remaining * tiles bonus damage
      if (match.tileType === 'hourglass') {
        scaled.damage += this.swapsRemaining * match.tiles.length;
      }

      // Chainsaw: damage = floor(missingHP * (0.09 + level * 0.01)) per tile
      if (match.tileType === 'chainsaw') {
        const level = this.player.getUpgradeLevel('chainsaw');
        const missing = Math.max(0, this.player.maxHealth - this.player.health);
        const pct = 0.09 + level * 0.01;
        scaled.damage += Math.floor(missing * pct) * match.tiles.length;
      }

      // Sacrificial Blade: lose 1 HP (cannot drop below 1)
      if (match.tileType === 'sacrificial_blade') {
        if (this.player.health > 1) {
          this.player.health -= 1;
          this.floatOnPlayer('-1', '#C04040');
          EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
        }
      }

      // Nunchucks: hits twice if attacking a different enemy than the previous nunchucks attack
      if (match.tileType === 'nunchucks') {
        const target = this.getTargetedAliveEnemy();
        const targetIdx = target ? this.enemies.indexOf(target) : -1;
        if (targetIdx >= 0 && this.nunchucksLastTarget !== null && this.nunchucksLastTarget !== targetIdx) {
          scaled.duelDoubleHit = true;
        }
        if (targetIdx >= 0) this.nunchucksLastTarget = targetIdx;
      }

      // Jackhammer: each Jackhammer match this turn adds one extra hit to the
      // next one. Level 0 = 1 hit (no extras), level N = N extra hits after the
      // primary. Bump the combat-level after the current match uses it, and
      // record that Jackhammer was touched this turn so the level doesn't reset.
      if (match.tileType === 'jackhammer') {
        scaled.extraHits = this.player.jackhammerCombatLevel;
        this.player.jackhammerCombatLevel += 1;
        this.jackhammerUsedThisTurn = true;
        EventBus.emit(GameEvent.COMBAT_STATE_UPDATE, this.buildState());
      }

      this.applyResourceOutput(scaled, isCrit);

      // Screen shake on crit for extra punch
      if (isCrit && scaled.damage > 0) {
        EventBus.emit(GameEvent.SCREEN_SHAKE, 'medium');
      }

      // Heliograph Shard: once/combat, on 5-match, apply 1 Blinded to random enemy
      if (this.artifacts.tryHeliographShard(match.length)) {
        const alive = this.aliveEnemies();
        if (alive.length > 0) {
          const target = alive[Math.floor(Math.random() * alive.length)];
          target.addBlinded(1);
          if (!target.isImmuneToDebuffs()) {
            this.floatOnEnemy(target, '+1 BLINDED', '#A0A0A0', 9);
            EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...target.state });
          }
        }
      }

      // Snake Eye: cascade matches have 50% chance to apply 1 Poison to all enemies
      if (comboMultiplier > 1.0 && this.artifacts.shouldCascadePoison()) {
        for (const enemy of this.aliveEnemies()) {
          this.applyPoison(enemy, 1);
        }
        this.emitEnemyHpChanges();
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

      // Check HP triggers on all alive enemies
      for (const enemy of this.aliveEnemies()) {
        const triggers = enemy.getDefinition().hpTriggers;
        if (!triggers) continue;
        const hpRatio = enemy.state.health / enemy.state.maxHealth * 100;
        for (const trigger of triggers) {
          if (hpRatio <= trigger.threshold && !enemy.triggeredThresholds.has(trigger.threshold)) {
            if (trigger.once) enemy.triggeredThresholds.add(trigger.threshold);
            for (const action of trigger.actions) {
              this.executeMoveAction(enemy, action);
            }
            if (trigger.forceNextMove) {
              enemy.forcedNextMove = trigger.forceNextMove;
            }
            this.emitFullState();
          }
        }
      }

      this.processEnemyDeaths(match);

      // Copperhead: update intent in real-time as poison tiles change
      for (const enemy of this.aliveEnemies()) {
        this.patchCopperheadIntent(enemy);
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
    this.resolveDestroyedTiles(result.destroyed);
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
    const capSeen = new Set<string>();

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

        const upgradeLevel = this.player.getUpgradeLevel(tile.type);
        const output = this.resolver.resolveSingle(tile.type, upgradeLevel, this.player.block, this.swapsRemaining);
        this.capFlatEffects(output, capSeen);
        this.applyResourceOutput(output, false, true);
      }
    }
  }

  /** Emit a floating number on an enemy. */
  private floatOnEnemy(enemy: Enemy, text: string, color: string, fontSize?: number): void {
    EventBus.emit(GameEvent.FLOATING_NUMBER, 'enemy', this.enemies.indexOf(enemy), text, color, fontSize);
  }

  /** Apply non-match damage and route any resulting executions/deaths through the shared hooks. */
  private dealAuxiliaryDamageToEnemy(enemy: Enemy, damage: number, color: string, fontSize?: number): void {
    const { hpLost } = enemy.takeDamage(damage);
    this.damageDealtThisFight += hpLost;
    if (hpLost > 0) {
      this.floatOnEnemy(enemy, `-${hpLost}`, color, fontSize);
    }
    this.handleBountyKill(enemy);
    this.processEnemyDeaths(null);
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

  /** Grant Jail Cell Keys block per lock cleared by consumables (Skeleton Key, Panacea). */
  private grantJailCellKeysBlock(locksCleared: number): void {
    if (locksCleared <= 0) return;
    const lockBlock = this.artifacts.onLockFreed() * locksCleared;
    if (lockBlock > 0) {
      this.player.addBlock(lockBlock);
      this.floatOnPlayer(`+${lockBlock}`, '#6888A0');
    }
  }

  /** Loot tile 20-stack payout: 10 damage, 8 block, 6 heal, 12 gold. */
  private triggerLootPayout(): void {
    const target = this.getTargetedAliveEnemy();
    if (target) {
      this.dealDamageToEnemy(target, 10, false);
      this.emitEnemyHpChanges();
    }
    this.player.addBlock(8);
    const healed = this.player.heal(6);
    const goldGain = Math.max(1, Math.round(12 * this.goldMultiplier));
    this.player.addGold(goldGain);
    this.floatOnPlayer(`+${goldGain}g +8 BLOCK${healed > 0 ? ` +${healed}` : ''}`, '#C89030', 9);
    EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
    EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
  }

  /** Get the highest-HP alive enemy. */
  private getHighestHpEnemy(): Enemy | null {
    const alive = this.aliveEnemies();
    return alive.reduce((best, e) =>
      e.state.health > (best?.state.health ?? 0) ? e : best, alive[0]) ?? null;
  }

  /** Deal damage to an enemy, handling pierce, and show floating number. */
  private dealDamageToEnemy(enemy: Enemy, damage: number, pierce: boolean, isCrit = false): void {
    // Invulnerable: immune to all damage
    if (enemy.state.invulnerable > 0) {
      this.floatOnEnemy(enemy, 'INVULNERABLE', '#FFD700');
      return;
    }
    // Undertaker(3): +50% damage to summoned enemies
    const undertakerBonus = this.traits.getUndertakerBonusDamage(enemy.summoned);
    if (undertakerBonus > 0) {
      damage = Math.round(damage * (1 + undertakerBonus));
    }

    const critSize = isCrit ? 18 : undefined;
    const { hpLost, blocked } = enemy.takeDamage(damage, pierce);
    this.damageDealtThisFight += hpLost;

    if (damage > 0 && (hpLost > 0 || blocked > 0)) {
      EventBus.emit(GameEvent.PLAYER_DAMAGE_LINE, enemy.state.id);
    }

    if (blocked > 0) { playBlock(); this.floatOnEnemy(enemy, `-${blocked}`, '#6888A0'); }
    if (hpLost > 0) {
      playHit();
      const label = isCrit ? `-${hpLost}!` : `-${hpLost}`;
      this.floatOnEnemy(enemy, label, '#ff4444', critSize);
    }
    // Enemy thorns: reflect damage back to player
    if (enemy.state.thorns > 0 && damage > 0) {
      const thornsDmg = this.player.takeDamage(enemy.state.thorns);
      if (thornsDmg.hpLost > 0 || thornsDmg.blocked > 0) EventBus.emit(GameEvent.PLAYER_HIT);
      if (thornsDmg.hpLost > 0) {
        this.floatOnPlayer(`-${thornsDmg.hpLost}`, '#C04040');
        this.playerTookDamageThisFight = true;
      }
      EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
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

  /**
   * Process newly-dead enemies and fire all death-triggered effects.
   * This must run for both match kills and non-match damage sources.
   */
  private processEnemyDeaths(match: MatchResult | null): void {
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const enemy of this.enemies) {
        if (!enemy.state.isDead || enemy.state._deathProcessed) continue;

        progressed = true;
        this.enemyDiedThisSwap = true;
        EventBus.emit(GameEvent.ENEMY_DIED, {
          enemyId: enemy.state.id,
          enemyIndex: this.enemies.indexOf(enemy),
        });
        enemy.state._deathProcessed = true;

        const ragefulGain = this.traits.onEnemyKilled();
        if (ragefulGain > 0) {
          this.player.ragefulStacks += ragefulGain;
          this.floatOnPlayer(`+${ragefulGain} RAGEFUL`, '#D04040', 9);
        }
        if (this.traits.onEnemyKilledUndertaker()) {
          EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
        }
        if (this.artifacts.has('reapers_scythe')) {
          this.board.applyShadowToRandomTiles(5);
        }

        if (this.artifacts.hasCorpseExplosion() && enemy.summoned) {
          const explosionDmg = enemy.getDefinition().health;
          for (const alive of this.aliveEnemies()) {
            const { hpLost } = alive.takeDamage(explosionDmg);
            this.damageDealtThisFight += hpLost;
            if (hpLost > 0) {
              this.floatOnEnemy(alive, `-${hpLost}`, '#D06060');
            }
            this.handleBountyKill(alive);
          }
          this.emitEnemyHpChanges();
          EventBus.emit(GameEvent.SCREEN_SHAKE, 'medium');
        }

        const killArt = this.artifacts.onEnemyKilled(match, enemy.summoned);
        if (killArt.killGrantsSwap) {
          this.grantBonusSwaps(1);
        }
        if (killArt.spawnExplosive) {
          this.board.spawnExplosiveOnRandomTile();
        }
        if (killArt.healAmount > 0) {
          const healed = this.player.heal(killArt.healAmount);
          if (healed > 0) {
            this.floatOnPlayer(`+${healed}`, '#40D840');
            EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
          }
        }

        for (const ally of this.aliveEnemies()) {
          if (ally.state.scavenger > 0) {
            const scavengerHeal = ally.state.scavenger * 6;
            const healAmt = Math.min(scavengerHeal, ally.state.maxHealth - ally.state.health);
            if (healAmt > 0) {
              ally.state.health += healAmt;
              this.floatOnEnemy(ally, `+${healAmt}`, '#40D840');
            }
          }
        }

        this.emitEnemyHpChanges();
      }
    }
  }

  private applyResourceOutput(output: ResourceOutput, isCrit = false, isSingle = false): void {
    // Rageful/Sturdy bonuses only apply to matches, not single-tile resolves
    const damage = output.damage > 0 ? output.damage + (isSingle ? 0 : this.player.ragefulStacks) : 0;
    const block = output.block > 0 ? output.block + (isSingle ? 0 : this.player.sturdyStacks) : 0;

    // Damage
    if (damage > 0) {
      EventBus.emit(GameEvent.PLAYER_ATTACK);
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
      // Duel: on exactly 4-match, deal the damage a second time
      if (output.duelDoubleHit) {
        const target = this.getTargetedAliveEnemy();
        if (target) this.dealDamageToEnemy(target, damage, false, isCrit);
      }

      // Jackhammer: extra damage applications on the currently-targeted enemy.
      // Target is re-acquired each iteration so kills mid-sequence fall through
      // cleanly instead of damaging a corpse.
      if (output.extraHits && output.extraHits > 0) {
        for (let h = 0; h < output.extraHits; h++) {
          const target = this.getTargetedAliveEnemy();
          if (!target) break;
          this.dealDamageToEnemy(target, damage, false, isCrit);
        }
      }

      this.emitEnemyHpChanges();
      this.traits.onDamageDealt();
    }

    // Block
    if (block > 0) {
      this.player.addBlock(block);
      this.floatOnPlayer(`+${block}`, '#6888A0');
    }

    // Barricade stacks (max 1)
    if (output.barricadeStacks > 0) {
      this.player.barricadeStacks = Math.min(this.player.barricadeStacks + output.barricadeStacks, 1);
    }

    // Gold (reduced by wanted-level modifier)
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
      // Offering Plate: healing grants gold. Absolution Rounds: damage to target.
      const healArt = this.artifacts.onPlayerHealed(healed, this.player);
      if (healArt.absolutionDamage > 0) {
        const target = this.getTargetedAliveEnemy();
        if (target) {
          this.dealDamageToEnemy(target, healArt.absolutionDamage, false);
          this.emitEnemyHpChanges();
        }
      }
    }

    // Ability charges (capped at threshold). Defer into pending bucket while Deadeye is active
    // so the chamber visual doesn't gain bullets mid-ability.
    if (output.abilityCharges > 0) {
      if (this.isDeadeyeActive) {
        this.pendingAbilityCharge += output.abilityCharges;
      } else {
        const wasFull = this.player.abilityCharge >= this.player.abilityThreshold;
        this.player.abilityCharge = Math.min(
          this.player.abilityThreshold,
          this.player.abilityCharge + output.abilityCharges,
        );
        if (!wasFull && this.player.abilityCharge >= this.player.abilityThreshold) playAbilityReady();
        EventBus.emit(GameEvent.ABILITY_CHARGE_CHANGE, this.player.abilityCharge, this.player.abilityThreshold);
      }
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

    // Duel stacks: at 4 stacks, convert to Ready and clear
    if (output.duelStacks > 0) {
      this.player.duelStacks += output.duelStacks;
      this.floatOnPlayer(`+${output.duelStacks} DUEL`, '#D06060', 9);
      if (this.player.duelStacks >= 4) {
        this.player.duelStacks = 0;
        this.player.addReady(1);
        this.floatOnPlayer('+1 READY', '#D4A030', 9);
      }
    }

    // Loot stacks: at 20 stacks, trigger payout and reset
    if (output.lootStacks > 0) {
      this.player.lootStacks += output.lootStacks;
      this.floatOnPlayer(`+${output.lootStacks} LOOT`, '#C89030', 9);
      while (this.player.lootStacks >= 20) {
        this.player.lootStacks -= 20;
        this.triggerLootPayout();
      }
    }

    // Bonus swaps (Cavalry 4+)
    if (output.bonusSwaps > 0) {
      this.grantBonusSwaps(output.bonusSwaps);
      this.floatOnPlayer(`+${output.bonusSwaps} SWAP`, '#70B0D0', 9);
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
      this.player.tryLethalSave();
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
    // Prairie Fire spread: once per turn, each prairie_fire tile has 1-in-4 chance to convert 1 adjacent tile
    if (this.board.spreadPrairieFire()) {
      this.ricochetTriggeredThisResolution = false;
      let fireSteps = 0;
      // Prairie Fire spread matches are never direct — always cascade.
      const onFireStep = this.makeCascadeStepHandler(() => ++fireSteps, true);
      await this.board.resolveMatchesFull(onFireStep);
      while (this.ricochetTriggeredThisResolution) {
        this.ricochetTriggeredThisResolution = false;
        await this.board.applyGravityAnimated();
        await this.board.fillEmptyTilesAnimated();
        await this.board.resolveMatchesFull(onFireStep);
      }
      if (this.isCombatOver()) {
        this.endCombat();
        return;
      }
    }

    // Player Terrified: decrement at end of player's turn
    if (this.player.terrifiedStacks > 0) this.player.terrifiedStacks--;

    // Player Dead Man Walking: decrement at end of player's turn
    if (this.player.deadManWalkingStacks > 0) this.player.deadManWalkingStacks--;

    // Tick cloak stacks
    for (const enemy of this.aliveEnemies()) {
      if (enemy.state.cloak > 0) enemy.state.cloak--;
      if (enemy.state.invulnerable > 0) enemy.state.invulnerable--;
      if (enemy.state.deadManWalking > 0) enemy.state.deadManWalking--;
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
        // Artifact buried-reveal hooks (Trapper's Snare, Gravedigger's Shovel, Golden Shovel)
        const buriedArt = this.artifacts.onBuriedRevealed();
        if (buriedArt.goldPerReveal > 0) {
          const totalGold = cleared.length * buriedArt.goldPerReveal;
          this.player.addGold(Math.max(1, Math.round(totalGold * this.goldMultiplier)));
          EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
        }
        for (let i = 0; i < cleared.length; i++) {
          const alive = this.aliveEnemies();
          if (alive.length === 0) break;
          const rndEnemy = alive[Math.floor(Math.random() * alive.length)];
          if (buriedArt.vulnerableCount > 0) {
            rndEnemy.addVulnerable(buriedArt.vulnerableCount);
            this.floatOnEnemy(rndEnemy, `+${buriedArt.vulnerableCount} VULNERABLE`, '#C070D0', 9);
          }
          if (buriedArt.damagePerReveal > 0) {
            this.dealAuxiliaryDamageToEnemy(rndEnemy, buriedArt.damagePerReveal, '#808080');
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
      this.processEnemyDeaths(null);
      this.emitEnemyHpChanges();
      EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
    }

    // Artifact turn-end effects (Iron Will, Sheriff's Domino)
    this.artifacts.onTurnEnd(this.swapsRemaining, this.player);

    // Holy Water: unused swaps heal 3 HP each
    const holyWaterHeal = this.artifacts.getHolyWaterHealPerSwap();
    if (holyWaterHeal > 0 && this.swapsRemaining > 0) {
      const totalHeal = this.swapsRemaining * holyWaterHeal;
      const healed = this.player.heal(totalHeal);
      if (healed > 0) {
        this.floatOnPlayer(`+${healed}`, '#40D840');
        EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
      }
    }

    // Trailblazer's Compass: unused swaps grant 6 block each at the start of the next turn
    if (this.artifacts.has('trailblazers_compass') && this.swapsRemaining > 0) {
      this.player.pendingBlockNextTurn += this.swapsRemaining * 6;
    }

    // Tick bomb countdowns at end of turn
    if (!this.isCombatOver()) {
      const bombResult = this.hazardManager.tickBombs();
      if (bombResult.totalDamage > 0) {
        const bombDmg = this.player.takeDamage(bombResult.totalDamage);
        if (bombDmg.hpLost > 0 || bombDmg.blocked > 0) EventBus.emit(GameEvent.PLAYER_HIT);
        if (bombDmg.hpLost > 0) { playHit(); this.playerTookDamageThisFight = true; this.lastDamageSource = 'Bomb'; }
        if (bombDmg.blocked > 0) { playBlock(); }
        EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
        EventBus.emit(GameEvent.SCREEN_SHAKE, bombResult.detonations.length > 1 ? 'heavy' : 'medium');
      }
    }

    // Tick Fuse status on enemies. When fuse reaches 0, deal fuseDamage
    // to the player and kill the enemy.
    if (!this.isCombatOver()) {
      let fuseTicked = false;
      for (const enemy of this.aliveEnemies()) {
        if (enemy.state.fuse > 0) {
          enemy.state.fuse--;
          fuseTicked = true;
          if (enemy.state.fuse === 0) {
            const fuseDamage = enemy.getDefinition().fuseDamage ?? 0;
            if (fuseDamage > 0) {
              const fuseResult = this.player.takeDamage(fuseDamage);
              if (fuseResult.hpLost > 0 || fuseResult.blocked > 0) EventBus.emit(GameEvent.PLAYER_HIT);
              if (fuseResult.hpLost > 0) {
                this.playerTookDamageThisFight = true;
                this.lastDamageSource = enemy.getDefinition().name;
              }
              EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
              EventBus.emit(GameEvent.SCREEN_SHAKE, 'heavy');
            }
            enemy.state.health = 0;
            enemy.state.isDead = true;
            this.processEnemyDeaths(null);
            EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
            this.emitFullState();
            if (this.isCombatOver()) {
              this.endCombat();
              return;
            }
          }
        }
      }
      if (fuseTicked) this.emitFullState();
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

    // Artifact post-enemy-turn hooks (Sheriff's Domino) -- must run while the
    // damage-tracking flags still reflect this turn, i.e. before resetTurnEffects.
    this.artifacts.onAfterEnemyTurn();

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
    // Clear enemy block at the start of their turn (Barricade retains it).
    for (const enemy of this.aliveEnemies()) {
      if (enemy.state.barricadeStacks > 0) {
        enemy.state.barricadeStacks--;
      } else {
        enemy.state.block = 0;
      }
    }

    // 1. Venom ticks on all enemies (upgrade adds +1 bonus damage per tick per level)
    const wasteUpgrade = this.player.getUpgradeLevel('waste');
    for (const enemy of this.aliveEnemies()) {
      const poisonDamage = enemy.tickPoison(wasteUpgrade);
      if (poisonDamage > 0) {
        this.damageDealtThisFight += poisonDamage;
        this.floatOnEnemy(enemy, `-${poisonDamage}`, '#40ff40');
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
        this.handleBountyKill(enemy);
        this.processEnemyDeaths(null);
      }
      // Vulnerable decreases by 1 at end of turn (affects damage taken during player turn,
      // so decrement here is effectively end-of-player-turn and is correct)
      if (enemy.state.vulnerable > 0) {
        enemy.state.vulnerable--;
      }
      // Thorns cleared at end of turn
      enemy.state.thorns = 0;
      // NOTE: Blinded and Terrified are decremented AFTER the enemy acts (see below),
      // since they must be active while the enemy attacks on this turn.
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
          if (boss.getDefinition().type === 'copperhead_cassidy') {
            this.floatOnEnemy(boss, 'SHED SKIN', '#40D840', 12);
          }
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

      await new Promise(r => setTimeout(r, Math.round(600 / getSpeedMultiplier())));
      EventBus.emit(GameEvent.ENEMY_ACTION, enemy.state.id);
      enemy.executeIntent();

      // Execute each structured action in the intent
      const intentActions = enemy.state.intent.actions ?? [];
      for (const ma of intentActions) {
        if (enemy.state.isDead) break;
        await this.executeMoveAction(enemy, ma);
      }

      // Blinded / Terrified decrement at end of turn, after the enemy has acted
      if (enemy.state.blindedStacks > 0) enemy.state.blindedStacks--;
      if (enemy.state.terrifiedStacks > 0) enemy.state.terrifiedStacks--;

      // Clear intent after execution so icons disappear immediately
      enemy.state.intent = { type: 'ability', value: 0, description: '' };
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

  /** Execute a single structured move action from an enemy's intent. */
  private async executeMoveAction(enemy: Enemy, ma: import('../../types/combat').MoveAction): Promise<void> {
    switch (ma.kind) {
      case 'attack':
        this.executeEnemyAttack(enemy, ma.value);
        // Rageful decrements once after the attack move (not per hit)
        if (enemy.state.ragefulStacks > 0) enemy.state.ragefulStacks--;
        break;
      case 'multi_attack': {
        // Copperhead: hits = number of poison tiles on board
        let hits = ma.hits ?? 2;
        if (enemy.getDefinition().type === 'copperhead_cassidy') {
          hits = this.hazardManager.countHazards('poison');
          if (hits <= 0) hits = 1;
        }
        for (let i = 0; i < hits; i++) {
          this.executeEnemyAttack(enemy, ma.value);
          this.emitFullState();
          if (i < hits - 1) {
            await new Promise(r => setTimeout(r, Math.round(200 / getSpeedMultiplier())));
          }
        }
        // Rageful decrements once after the full multi-attack (not per hit)
        if (enemy.state.ragefulStacks > 0) enemy.state.ragefulStacks--;
        // Saloon Brawler: move 4 (6x2) clears all own statuses after attacking
        if (enemy.getDefinition().type === 'saloon_brawler' && ma.value === 6 && ma.hits === 2) {
          enemy.clearAllStatuses();
          this.floatOnEnemy(enemy, 'CLEAR STATUSES', '#A0A0A0', 9);
          EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
        }
        break;
      }
      case 'block':
        enemy.addBlock(ma.value);
        if (this.isBossEnemy(enemy)) this.artifacts.onBossGainedBlock(this.player);
        break;
      case 'lock':
        if (this.player.protectedStacks <= 0) this.hazardManager.placeRandomLocks(ma.value);
        break;
      case 'lock_row':
        if (this.player.protectedStacks <= 0) this.hazardManager.lockRow(Math.floor(Math.random() * 8));
        break;
      case 'lock_column':
        if (this.player.protectedStacks <= 0) this.hazardManager.lockColumn(Math.floor(Math.random() * 8));
        break;
      case 'poison_tiles':
        if (this.player.protectedStacks <= 0) this.hazardManager.placeRandomPoison(ma.value);
        break;
      case 'apply_poison':
        if (this.player.protectedStacks <= 0 && !this.player.tryAbsorbDebuff()) {
          this.player.poisonedStacks += ma.value;
          this.floatOnPlayer(`+${ma.value} POISON`, '#40ff40', 9);
        }
        break;
      case 'bomb':
        if (this.player.protectedStacks <= 0) this.hazardManager.placeRandomBombs(ma.value, 3 + this.traits.getBombCountdownBonus());
        break;
      case 'bury':
        if (this.player.protectedStacks <= 0) this.hazardManager.placeRandomSand(ma.value);
        break;
      case 'suppress':
        if (this.player.protectedStacks <= 0 && !this.traits.isSuppressImmune()) this.hazardManager.placeRandomSuppress(ma.value);
        break;
      case 'fools_gold':
        if (this.player.protectedStacks <= 0) this.hazardManager.placeRandomFoolsGold(ma.value);
        break;
      case 'summon':
        this.trySummonEnemy(enemy, ma.summonType, ma.summonFullHp);
        break;
      case 'heal': {
        let healAmount = ma.value;
        // Copperhead: clear all poison tiles and heal 2% max HP per tile cleared.
        // If there are no poison tiles on the board, she gains 2 Vulnerable on herself instead.
        if (enemy.getDefinition().type === 'copperhead_cassidy' && ma.value === 0) {
          const poisonCleared = this.hazardManager.clearAllOfType('poison');
          if (poisonCleared.length === 0) {
            enemy.addVulnerable(2);
            this.floatOnEnemy(enemy, '+2 VULNERABLE', '#C070D0', 9);
            EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
            break;
          }
          healAmount = Math.round(enemy.state.maxHealth * 0.02 * poisonCleared.length);
        }
        if (healAmount > 0) {
          // Hellfire Preacher: heal injured ally if one exists, otherwise heal self
          const healTarget = enemy.getDefinition().type === 'hellfire_preacher'
            ? (this.aliveEnemies().filter(e => e !== enemy && e.state.health < e.state.maxHealth)[0] ?? enemy)
            : enemy;
          healTarget.state.health = Math.min(healTarget.state.maxHealth, healTarget.state.health + healAmount);
          this.floatOnEnemy(healTarget, `+${healAmount}`, '#40D840');
          EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...healTarget.state });
        }
        break;
      }
      case 'gain_rageful':
        // Enemy buffs itself with Rageful (+1 damage per stack)
        enemy.state.ragefulStacks += ma.value;
        this.floatOnEnemy(enemy, `+${ma.value} RAGEFUL`, '#D04040', 9);
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
        break;
      case 'apply_terrified':
        // Apply Terrified to the player (player deals 50% less damage)
        if (!this.player.tryAbsorbDebuff()) {
          this.player.terrifiedStacks += ma.value;
          this.floatOnPlayer(`+${ma.value} TERRIFIED`, '#8B4789', 9);
        }
        break;
      case 'apply_vulnerable':
        // Apply Vulnerable to the player (player takes 50% more damage)
        if (!this.player.tryAbsorbDebuff()) {
          this.player.vulnerableStacks += ma.value;
          this.floatOnPlayer(`+${ma.value} VULNERABLE`, '#C070D0', 9);
        }
        break;
      case 'gain_thorns':
        enemy.state.thorns += ma.value;
        this.floatOnEnemy(enemy, `+${ma.value} THORNS`, '#C04040', 9);
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
        break;
      case 'gain_cloak':
        enemy.state.cloak += ma.value;
        this.floatOnEnemy(enemy, `+${ma.value} CLOAK`, '#808080', 9);
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
        break;
      case 'gain_hardened':
        enemy.state.hardened += ma.value;
        this.floatOnEnemy(enemy, `+${ma.value} HARDENED`, '#8B7355', 9);
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
        break;
      case 'gain_grace':
        enemy.state.graceStacks = (enemy.state.graceStacks ?? 0) + ma.value;
        this.floatOnEnemy(enemy, `+${ma.value} GRACE`, '#A0C8FF', 9);
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
        break;
      case 'gain_dead_man_walking':
        enemy.state.deadManWalking += ma.value;
        this.floatOnEnemy(enemy, `+${ma.value} DEAD MAN WALKING`, '#C8B060', 9);
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
        break;
      case 'gain_barricade':
        enemy.state.barricadeStacks += ma.value;
        this.floatOnEnemy(enemy, `+${ma.value} BARRICADE`, '#8B7355', 9);
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
        break;
      case 'gain_invulnerable':
        enemy.state.invulnerable += ma.value;
        this.floatOnEnemy(enemy, `+${ma.value} INVULNERABLE`, '#FFD700', 9);
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
        break;
      case 'gain_scavenger':
        enemy.state.scavenger += ma.value;
        this.floatOnEnemy(enemy, `+${ma.value} SCAVENGER`, '#40D840', 9);
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
        break;
      case 'apply_vulnerable_self':
        enemy.addVulnerable(ma.value);
        this.floatOnEnemy(enemy, `+${ma.value} VULNERABLE`, '#C070D0', 9);
        EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
        break;
      case 'heal_ally': {
        // Heal another alive non-self enemy
        const allies = this.aliveEnemies().filter(e => e !== enemy);
        const injured = allies.filter(e => e.state.health < e.state.maxHealth);
        const target = injured.length > 0 ? injured[0] : null;
        if (target) {
          target.state.health = Math.min(target.state.maxHealth, target.state.health + ma.value);
          this.floatOnEnemy(target, `+${ma.value}`, '#40D840');
          EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...target.state });
        }
        break;
      }
      case 'shuffle_rows': {
        // Encode: 67 = rows 6,7 (bottom 2), 1 = rows 0,1 (top 2)
        const rows = ma.value === 67 ? [6, 7] : ma.value === 1 ? [0, 1] : [6, 7];
        await this.board.shuffleRowsAnimated(rows);
        break;
      }
      case 'gravity_shift': {
        // Rotate gravity clockwise: down -> left -> up -> right -> down
        const CYCLE: Array<'left' | 'up' | 'right' | 'down'> = ['left', 'up', 'right', 'down'];
        const current = this.board.getGravityDirection?.() ?? 'down';
        const idx = CYCLE.indexOf(current as 'left' | 'up' | 'right' | 'down');
        this.board.setGravityDirection(CYCLE[(idx + 1) % 4]);
        break;
      }
      case 'transform_tumbleweed': {
        // Transform random tiles into tumbleweed type
        for (let i = 0; i < ma.value; i++) {
          const grid = this.board.getGrid();
          const candidates: { row: number; col: number }[] = [];
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              const tile = grid[r]?.[c];
              if (tile && tile.type !== 'tumbleweed' && !tile.hazard) {
                candidates.push({ row: r, col: c });
              }
            }
          }
          if (candidates.length > 0) {
            const pos = candidates[Math.floor(Math.random() * candidates.length)];
            const tile = grid[pos.row]?.[pos.col];
            if (tile) tile.setType('tumbleweed');
          }
        }
        // After all transformations, resolve any matches the new tumbleweeds formed
        this.ricochetTriggeredThisResolution = false;
        let tweedSteps = 0;
        // Tumbleweed Golem transform — matches from the transformation are cascades.
        const onTweedStep = this.makeCascadeStepHandler(() => ++tweedSteps, true);
        await this.board.resolveMatchesFull(onTweedStep);
        while (this.ricochetTriggeredThisResolution) {
          this.ricochetTriggeredThisResolution = false;
          await this.board.applyGravityAnimated();
          await this.board.fillEmptyTilesAnimated();
          await this.board.resolveMatchesFull(onTweedStep);
        }
        break;
      }
    }
  }

  /** Execute a single enemy attack against the player. */
  private executeEnemyAttack(enemy: Enemy, damage: number): void {
    if (damage <= 0) return;
    // Blinded: attacks deal no damage
    if (enemy.state.blindedStacks > 0) return;
    // Enemy Rageful: +1 damage per stack (decrement handled once per move in executeMoveAction)
    let adjustedDamage = damage + enemy.state.ragefulStacks;
    // Enemy Terrified: deal 25% less damage
    if (enemy.state.terrifiedStacks > 0) {
      adjustedDamage = Math.round(adjustedDamage * 0.75);
    }
    if (this.artifacts.has('preachers_bible')) {
      adjustedDamage = Math.max(0, adjustedDamage - 1);
    }
    const preacherReduction = this.traits.getPreacherDamageReduction(enemy.state.health, this.player.health);
    if (preacherReduction > 0) adjustedDamage = Math.round(adjustedDamage * (1 - preacherReduction));
    const { hpLost, blocked, thornsDamage } = this.player.takeDamage(adjustedDamage);
    if (hpLost > 0 || blocked > 0) EventBus.emit(GameEvent.PLAYER_HIT);
    if (hpLost > 0) { playHit(); this.playerTookDamageThisFight = true; this.lastDamageSource = enemy.getDefinition().name; }
    if (blocked > 0) { playBlock(); this.floatOnPlayer(`-${blocked}`, '#6888A0'); }
    if (hpLost > 0) this.floatOnPlayer(`-${hpLost}`, '#ff4444');

    const artDmg = this.artifacts.onPlayerDamaged(hpLost, this.player);
    if (artDmg.poisonToAttacker > 0) {
      this.applyPoison(enemy, artDmg.poisonToAttacker);
      this.floatOnEnemy(enemy, `+${artDmg.poisonToAttacker} POISON`, '#40ff40', 9);
      EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
    }
    if (artDmg.grantConsumable) {
      this.grantRandomConsumable();
    }
    EventBus.emit(GameEvent.PLAYER_HP_CHANGE, this.player.health, this.player.maxHealth);
    if (damage >= 25) {
      EventBus.emit(GameEvent.SCREEN_SHAKE, 'heavy');
    } else if (damage >= 15) {
      EventBus.emit(GameEvent.SCREEN_SHAKE, 'medium');
    } else {
      EventBus.emit(GameEvent.SCREEN_SHAKE, 'light');
    }
    if (thornsDamage > 0) {
      const { hpLost } = enemy.takeDamage(thornsDamage);
      this.damageDealtThisFight += hpLost;
      this.handleBountyKill(enemy);
      this.processEnemyDeaths(null);
      EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
    }
    // Sheriff(6): block reflects 100% of absorbed damage back to the attacker.
    if (blocked > 0 && this.traits.blockReflectsDamage()) {
      const reflected = enemy.takeDamage(blocked).hpLost;
      this.damageDealtThisFight += reflected;
      this.floatOnEnemy(enemy, `-${reflected}`, '#6888A0');
      this.handleBountyKill(enemy);
      this.processEnemyDeaths(null);
      EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
    }
  }

  private trySummonEnemy(summoner: Enemy, summonType?: string, fullHp?: boolean): void {
    if (this.aliveEnemies().length >= 3) return;

    // If a specific summon type is given, look it up. Use 1/3 HP unless fullHp is set.
    if (summonType && ALL_ENEMIES[summonType]) {
      const baseDef = ALL_ENEMIES[summonType];
      const minionDef: EnemyDefinition = {
        ...baseDef,
        health: fullHp ? baseDef.health : Math.max(1, Math.round(baseDef.health / 3)),
      };
      const minion = new Enemy(minionDef);
      minion.summoned = true;
      minion.state.summoned = true;
      this.addEnemyToSlot(minion);
      this.artifacts.onEnemySummoned(minion, this.player);
      this.emitFullState();
      return;
    }

    // Fallback: weaker version of the summoner's type
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
      this.processEnemyDeaths(null);
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
      else if (this.isElite) { base = 25; range = 5; }
      else { base = 10; range = 3; }
      let goldReward = base + Math.floor(Math.random() * (range * 2 + 1)) - range;
      goldReward = Math.max(1, Math.round(goldReward * this.goldMultiplier));
      this.player.addGold(goldReward);

      EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
    }

    // Snapshot per-fight totals BEFORE resetting (resetFightEffects zeroes them,
    // which would otherwise make these always 0 — breaking the run-wide tally).
    const goldEarnedThisFight = this.player.goldThisFight;
    const goldGainedThisFight = this.player.goldObtainedThisFight;
    this.player.resetFightEffects();

    const result: CombatResult = {
      victory,
      playerHealth: this.player.health,
      playerGold: this.player.gold,
      goldEarned: goldEarnedThisFight,
      goldGainedThisFight,
      abilityCharge: this.player.abilityCharge,
      damageDealt: this.damageDealtThisFight,
      longestCascade: this.longestCascadeThisFight,
      playerDamageTaken: this.playerTookDamageThisFight,
      defeatedOutlawKing: victory && this.isOutlawKing,
      deathCause: victory ? null : (this.lastDamageSource ?? 'Unknown'),
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
  private makeCascadeStepHandler(
    getStep: () => number,
    treatAsCascade = false,
  ): (stepMatches: MatchResult[]) => Promise<void> {
    return async (stepMatches: MatchResult[]) => {
      const step = getStep();
      playMatch(step);
      const clearPoison = this.traits.clearsAdjacentPoison();
      let locksFreed = 0;
      let sandRevealed = 0;
      for (const match of stepMatches) {
        const locksBefore = this.hazardManager.countHazards('lock');
        const sandBefore = this.hazardManager.countHazards('sand');
        this.hazardManager.resolveAdjacentHazards(match.tiles, clearPoison);
        locksFreed += locksBefore - this.hazardManager.countHazards('lock');
        sandRevealed += sandBefore - this.hazardManager.countHazards('sand');
      }
      // Jail Cell Keys: gain 4 block per lock freed
      if (locksFreed > 0) {
        const lockBlock = this.artifacts.onLockFreed() * locksFreed;
        if (lockBlock > 0) {
          this.player.addBlock(lockBlock);
          this.floatOnPlayer(`+${lockBlock}`, '#6888A0');
        }
      }
      // Artifact buried-reveal hooks (Trapper's Snare, Gravedigger's Shovel, Golden Shovel)
      if (sandRevealed > 0) {
        const buriedArt = this.artifacts.onBuriedRevealed();
        if (buriedArt.goldPerReveal > 0) {
          const totalGold = sandRevealed * buriedArt.goldPerReveal;
          this.player.addGold(Math.max(1, Math.round(totalGold * this.goldMultiplier)));
          EventBus.emit(GameEvent.GOLD_CHANGE, this.player.gold);
        }
        for (let i = 0; i < sandRevealed; i++) {
          const alive = this.aliveEnemies();
          if (alive.length === 0) break;
          const rndEnemy = alive[Math.floor(Math.random() * alive.length)];
          if (buriedArt.vulnerableCount > 0) {
            rndEnemy.addVulnerable(buriedArt.vulnerableCount);
            this.floatOnEnemy(rndEnemy, `+${buriedArt.vulnerableCount} VULNERABLE`, '#C070D0', 9);
          }
          if (buriedArt.damagePerReveal > 0) {
            this.dealAuxiliaryDamageToEnemy(rndEnemy, buriedArt.damagePerReveal, '#808080');
          }
        }
        this.emitEnemyHpChanges();
      }
      const comboMultiplier = step > 1 ? Math.min(3.0, 1 + (step - 1) * 0.1) : 1.0;
      await this.processMatches(stepMatches, comboMultiplier, treatAsCascade);
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
    if (phase === 'swap-phase') {
      this.ensureSwapPhaseHasValidMoves();
    }
  }

  private buildState(): CombatState {
    return {
      character: this.character,
      turnNumber: this.turnNumber,
      swapsRemaining: this.swapsRemaining,
      swapsPerTurn: this.swapsPerTurn,
      swapIconSources: this.swapIconSources,
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
      duelStacks: this.player.duelStacks,
      chainStacks: this.player.chainStacks,
      lootStacks: this.player.lootStacks,
      jackhammerCombatLevel: this.player.jackhammerCombatLevel,
      terrifiedStacks: this.player.terrifiedStacks,
      vulnerableStacks: this.player.vulnerableStacks,
      thorns: this.player.thorns,
      protectedStacks: this.player.protectedStacks,
      deadManWalkingStacks: this.player.deadManWalkingStacks,
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
      deadeyeFinishSpinTrigger: this.deadeyeFinishSpinTrigger,
      canDeadeyeShootEnemy: this.isDeadeyeActive
        && this.deadeyeShotsRemaining === 1
        && this.artifacts.has('rusts_cylinder'),
      isShuffleHoldMode: false,
      shuffleHoldsRemaining: 0,
      shuffleMaxHolds: 0,
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

  /**
   * Cap flat-per-match status effects to 1 across a batch of single-resolved tiles
   * (e.g. explosive chain). Per-tile effects (poison, ace, lucky, bounty) stack normally.
   */
  /** Resolve a batch of individually destroyed tiles (explosive/showdown/ricochet chains). */
  private resolveDestroyedTiles(destroyed: { type: import('../../types/game').TileType; row: number; col: number }[]): void {
    const seen = new Set<string>();
    for (const info of destroyed) {
      const upgradeLevel = this.player.getUpgradeLevel(info.type);
      const output = this.resolver.resolveSingle(info.type, upgradeLevel, this.player.block, this.swapsRemaining);
      this.capFlatEffects(output, seen);
      this.applyResourceOutput(output, false, true);
    }
  }

  private capFlatEffects(output: import('./ResourceResolver').ResourceOutput, seen: Set<string>): void {
    const cap = (key: 'vulnerableStacks' | 'chainStacks' | 'duelStacks' | 'barricadeStacks') => {
      if (output[key] > 0) {
        if (seen.has(key)) output[key] = 0;
        else seen.add(key);
      }
    };
    cap('vulnerableStacks');
    cap('chainStacks');
    cap('duelStacks');
    cap('barricadeStacks');
  }

  private emitFullState(): void {
    EventBus.emit(GameEvent.COMBAT_STATE_UPDATE, this.buildState());
  }

  private emitEnemyHpChanges(): void {
    for (const enemy of this.enemies) {
      EventBus.emit(GameEvent.ENEMY_HP_CHANGE, { ...enemy.state });
    }
  }

  /** Copperhead: update multi-attack hit count to match current poison tiles on board. */
  private patchCopperheadIntent(enemy: Enemy): void {
    if (enemy.getDefinition().type === 'copperhead_cassidy' && enemy.state.intent.actions) {
      for (const a of enemy.state.intent.actions) {
        if (a.kind === 'multi_attack') {
          a.hits = Math.max(1, this.hazardManager.countHazards('poison'));
        }
      }
    }
  }
}
