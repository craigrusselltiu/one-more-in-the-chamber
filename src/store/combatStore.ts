import { create } from 'zustand';
import type { CombatState, EnemyState, PlayerStatusEffect, EnemyStatusEffect, CombatPhase, CombatSwapSource } from '../types/combat';
import type { CharacterId, TileType } from '../types/game';

/**
 * Combat store: reactive state for React HUD components.
 * Updated by EventBus listeners bridging Phaser -> React.
 */
interface CombatStore {
  character: CharacterId;

  // Player
  playerHealth: number;
  playerMaxHealth: number;
  playerBlock: number;
  aceStacks: number;
  aceMultiplier: number;
  luckyStacks: number;
  barricadeStacks: number;
  ragefulStacks: number;
  sturdyStacks: number;
  graceStacks: number;
  poisonedStacks: number;
  readyStacks: number;
  duelStacks: number;
  chainStacks: number;
  lootStacks: number;
  jackhammerCombatLevel: number;
  terrifiedStacks: number;
  vulnerableStacks: number;
  thorns: number;
  protectedStacks: number;
  deadManWalkingStacks: number;

  // Ability
  abilityCharge: number;
  abilityThreshold: number;
  isDeadeyeActive: boolean;
  deadeyeShotsRemaining: number;
  deadeyeMaxShots: number;
  deadeyeFinishSpinTrigger: number;
  canDeadeyeShootEnemy: boolean;
  isShuffleHoldMode: boolean;
  shuffleHoldsRemaining: number;
  shuffleMaxHolds: number;

  // Resources
  gold: number;
  swapsRemaining: number;
  swapsPerTurn: number;
  swapIconSources: CombatSwapSource[];

  // Enemies
  enemies: EnemyState[];
  targetedEnemyIndex: number;

  // Combat flow
  phase: CombatPhase;
  turnNumber: number;
  comboCount: number;
  currentAct: number;
  activeTileTypes: TileType[];
  tileUpgrades: Partial<Record<TileType, number>>;
  mirageType: TileType | null;
  /** Tinnitus: when true, enemy intents are hidden (turn 1 only). */
  intentsHidden: boolean;
  /** Lethargic: when true, the next swap attempt will do nothing. Cleared once consumed. */
  lethargicActive: boolean;
  /** True while a UI overlay (settings, map, tiles) covers the combat board. */
  uiOverlayOpen: boolean;

  // Actions
  syncFromCombatState: (state: CombatState) => void;
  setPlayerHealth: (current: number, max: number) => void;
  setGold: (gold: number) => void;
  setSwaps: (remaining: number, total: number) => void;
  setAbilityCharge: (charge: number, threshold: number) => void;
  setTargetedEnemy: (index: number) => void;
  setCombo: (combo: number) => void;
  setAct: (act: number) => void;
  setIntentsHidden: (hidden: boolean) => void;
  setLethargicActive: (active: boolean) => void;
  setUiOverlayOpen: (open: boolean) => void;
  reset: () => void;
}

const initialState = {
  character: 'red_panda' as CharacterId,
  playerHealth: 100,
  playerMaxHealth: 100,
  playerBlock: 0,
  aceStacks: 0,
  aceMultiplier: 1.0,
  luckyStacks: 0,
  barricadeStacks: 0,
  ragefulStacks: 0,
  sturdyStacks: 0,
  graceStacks: 0,
  poisonedStacks: 0,
  readyStacks: 0,
  duelStacks: 0,
  chainStacks: 0,
  lootStacks: 0,
  jackhammerCombatLevel: 0,
  terrifiedStacks: 0,
  vulnerableStacks: 0,
  thorns: 0,
  protectedStacks: 0,
  deadManWalkingStacks: 0,
  abilityCharge: 0,
  abilityThreshold: 10,
  isDeadeyeActive: false,
  deadeyeShotsRemaining: 0,
  deadeyeMaxShots: 3,
  deadeyeFinishSpinTrigger: 0,
  canDeadeyeShootEnemy: false,
  isShuffleHoldMode: false,
  shuffleHoldsRemaining: 0,
  shuffleMaxHolds: 3,
  gold: 0,
  swapsRemaining: 2,
  swapsPerTurn: 2,
  swapIconSources: ['default', 'default'] as CombatSwapSource[],
  enemies: [] as EnemyState[],
  targetedEnemyIndex: 0,
  phase: 'turn-start' as CombatPhase,
  turnNumber: 0,
  comboCount: 0,
  currentAct: 1,
  activeTileTypes: [] as TileType[],
  tileUpgrades: {} as Partial<Record<TileType, number>>,
  mirageType: null,
  intentsHidden: false,
  lethargicActive: false,
  uiOverlayOpen: false,
};

export const useCombatStore = create<CombatStore>((set) => ({
  ...initialState,

  syncFromCombatState: (state: CombatState) =>
    set({
      character: state.character,
      playerBlock: state.playerBlock,
      aceStacks: state.aceStacks,
      aceMultiplier: state.aceMultiplier,
      luckyStacks: state.luckyStacks,
      barricadeStacks: state.barricadeStacks,
      ragefulStacks: state.ragefulStacks,
      sturdyStacks: state.sturdyStacks,
      graceStacks: state.graceStacks,
      poisonedStacks: state.poisonedStacks,
      readyStacks: state.readyStacks,
      duelStacks: state.duelStacks,
      chainStacks: state.chainStacks,
      lootStacks: state.lootStacks ?? 0,
      jackhammerCombatLevel: state.jackhammerCombatLevel ?? 0,
      terrifiedStacks: state.terrifiedStacks,
      vulnerableStacks: state.vulnerableStacks,
      thorns: state.thorns,
      protectedStacks: state.protectedStacks ?? 0,
      deadManWalkingStacks: state.deadManWalkingStacks ?? 0,
      abilityCharge: state.abilityCharge,
      abilityThreshold: state.abilityThreshold,
      isDeadeyeActive: state.isDeadeyeActive,
      deadeyeShotsRemaining: state.deadeyeShotsRemaining,
      deadeyeMaxShots: state.deadeyeMaxShots,
      deadeyeFinishSpinTrigger: state.deadeyeFinishSpinTrigger,
      canDeadeyeShootEnemy: state.canDeadeyeShootEnemy,
      isShuffleHoldMode: state.isShuffleHoldMode,
      shuffleHoldsRemaining: state.shuffleHoldsRemaining,
      shuffleMaxHolds: state.shuffleMaxHolds,
      swapsRemaining: state.swapsRemaining,
      swapsPerTurn: state.swapsPerTurn,
      swapIconSources: state.swapIconSources,
      enemies: state.enemies,
      targetedEnemyIndex: state.targetedEnemyIndex,
      phase: state.phase,
      turnNumber: state.turnNumber,
      activeTileTypes: state.activeTileTypes,
      tileUpgrades: state.tileUpgrades,
      mirageType: state.mirageType,
    }),

  setPlayerHealth: (current, max) =>
    set((state) => (
      state.playerHealth === current && state.playerMaxHealth === max
        ? state
        : { playerHealth: current, playerMaxHealth: max }
    )),

  setGold: (gold) => set((state) => (state.gold === gold ? state : { gold })),

  setSwaps: (remaining, total) =>
    set((state) => (
      state.swapsRemaining === remaining && state.swapsPerTurn === total
        ? state
        : { swapsRemaining: remaining, swapsPerTurn: total }
    )),

  setAbilityCharge: (charge, threshold) =>
    set((state) => (
      state.abilityCharge === charge && state.abilityThreshold === threshold
        ? state
        : { abilityCharge: charge, abilityThreshold: threshold }
    )),

  setTargetedEnemy: (index) =>
    set((state) => (state.targetedEnemyIndex === index ? state : { targetedEnemyIndex: index })),

  setCombo: (combo) => set((state) => (state.comboCount === combo ? state : { comboCount: combo })),

  setAct: (act) => set({ currentAct: act }),

  setIntentsHidden: (hidden) => set({ intentsHidden: hidden }),

  setLethargicActive: (active) => set({ lethargicActive: active }),

  setUiOverlayOpen: (open) => set({ uiOverlayOpen: open }),

  reset: () => set(initialState),
}));

/** Derive player status effects from combat store state. */
export function getPlayerStatusEffects(store: CombatStore): PlayerStatusEffect[] {
  const effects: PlayerStatusEffect[] = [];
  if (store.playerBlock > 0) effects.push({ type: 'block', value: store.playerBlock });
  if (store.aceStacks > 0) effects.push({ type: 'ace', value: store.aceStacks });
  if (store.luckyStacks > 0) effects.push({ type: 'lucky', value: store.luckyStacks });
  if (store.barricadeStacks > 0) effects.push({ type: 'barricade', value: store.barricadeStacks });
  if (store.ragefulStacks > 0) effects.push({ type: 'rageful', value: store.ragefulStacks });
  if (store.sturdyStacks > 0) effects.push({ type: 'sturdy', value: store.sturdyStacks });
  if (store.graceStacks > 0) effects.push({ type: 'grace', value: store.graceStacks });
  if (store.poisonedStacks > 0) effects.push({ type: 'poisoned', value: store.poisonedStacks });
  if (store.readyStacks > 0) effects.push({ type: 'ready', value: store.readyStacks });
  if (store.duelStacks > 0) effects.push({ type: 'duel', value: store.duelStacks });
  if (store.chainStacks > 0) effects.push({ type: 'chain', value: store.chainStacks });
  if (store.lootStacks > 0) effects.push({ type: 'loot', value: store.lootStacks });
  if (store.jackhammerCombatLevel > 0) effects.push({ type: 'jackhammer', value: store.jackhammerCombatLevel });
  if (store.terrifiedStacks > 0) effects.push({ type: 'terrified', value: store.terrifiedStacks });
  if (store.vulnerableStacks > 0) effects.push({ type: 'vulnerable', value: store.vulnerableStacks });
  if (store.thorns > 0) effects.push({ type: 'thorns', value: store.thorns });
  if (store.protectedStacks > 0) effects.push({ type: 'protected', value: store.protectedStacks });
  if (store.deadManWalkingStacks > 0) effects.push({ type: 'dead_man_walking', value: store.deadManWalkingStacks });
  if (store.lethargicActive) effects.push({ type: 'lethargic', value: 1 });
  if (store.intentsHidden) effects.push({ type: 'tinnitus', value: 1 });
  return effects;
}

/** Derive enemy status effects from an enemy state. */
export function getEnemyStatusEffects(enemy: EnemyState): EnemyStatusEffect[] {
  const effects: EnemyStatusEffect[] = [];
  if (enemy.block > 0) effects.push({ type: 'block', value: enemy.block });
  if (enemy.poisonStacks > 0) effects.push({ type: 'poison', value: enemy.poisonStacks });
  if (enemy.vulnerable > 0) effects.push({ type: 'vulnerable', value: enemy.vulnerable });
  if (enemy.cloak > 0) effects.push({ type: 'cloak', value: enemy.cloak });
  if (enemy.bountyStacks > 0) effects.push({ type: 'bounty', value: enemy.bountyStacks });
  if (enemy.terrifiedStacks > 0) effects.push({ type: 'terrified', value: enemy.terrifiedStacks });
  if (enemy.blindedStacks > 0) effects.push({ type: 'blinded', value: enemy.blindedStacks });
  if (enemy.ragefulStacks > 0) effects.push({ type: 'rageful', value: enemy.ragefulStacks });
  if (enemy.thorns > 0) effects.push({ type: 'thorns', value: enemy.thorns });
  if (enemy.graceStacks > 0) effects.push({ type: 'grace', value: enemy.graceStacks });
  if (enemy.hardened > 0) effects.push({ type: 'hardened', value: enemy.hardened });
  if (enemy.fuse > 0) effects.push({ type: 'fuse', value: enemy.fuse });
  if (enemy.deadManWalking > 0) effects.push({ type: 'dead_man_walking', value: enemy.deadManWalking });
  if (enemy.barricadeStacks > 0) effects.push({ type: 'barricade', value: enemy.barricadeStacks });
  if (enemy.invulnerable > 0) effects.push({ type: 'invulnerable', value: enemy.invulnerable });
  if (enemy.scavenger > 0) effects.push({ type: 'scavenger', value: enemy.scavenger });
  if (enemy.summoned) effects.push({ type: 'summoned', value: 1 });
  return effects;
}
