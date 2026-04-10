import { create } from 'zustand';
import type { CombatState, EnemyState, PlayerStatusEffect, EnemyStatusEffect, CombatPhase } from '../types/combat';
import type { CharacterId } from '../types/game';

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
  chainStacks: number;
  thorns: number;

  // Ability
  abilityCharge: number;
  abilityThreshold: number;
  isDeadeyeActive: boolean;
  deadeyeShotsRemaining: number;
  deadeyeMaxShots: number;
  canDeadeyeShootEnemy: boolean;
  isShuffleHoldMode: boolean;
  shuffleHoldsRemaining: number;
  shuffleMaxHolds: number;

  // Resources
  gold: number;
  swapsRemaining: number;
  swapsPerTurn: number;

  // Enemies
  enemies: EnemyState[];
  targetedEnemyIndex: number;

  // Combat flow
  phase: CombatPhase;
  turnNumber: number;
  turnLimit: number;
  comboCount: number;
  currentAct: number;
  isBoss: boolean;
  mirageType: import('../types/game').TileType | null;

  // Actions
  syncFromCombatState: (state: CombatState) => void;
  setPlayerHealth: (current: number, max: number) => void;
  setGold: (gold: number) => void;
  setSwaps: (remaining: number, total: number) => void;
  setAbilityCharge: (charge: number, threshold: number) => void;
  setTargetedEnemy: (index: number) => void;
  setCombo: (combo: number) => void;
  setAct: (act: number) => void;
  setIsBoss: (isBoss: boolean) => void;
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
  chainStacks: 0,
  thorns: 0,
  abilityCharge: 0,
  abilityThreshold: 10,
  isDeadeyeActive: false,
  deadeyeShotsRemaining: 0,
  deadeyeMaxShots: 3,
  canDeadeyeShootEnemy: false,
  isShuffleHoldMode: false,
  shuffleHoldsRemaining: 0,
  shuffleMaxHolds: 3,
  gold: 0,
  swapsRemaining: 2,
  swapsPerTurn: 2,
  enemies: [] as EnemyState[],
  targetedEnemyIndex: 0,
  phase: 'turn-start' as CombatPhase,
  turnNumber: 0,
  turnLimit: 0,
  comboCount: 0,
  currentAct: 1,
  isBoss: false,
  mirageType: null,
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
      chainStacks: state.chainStacks,
      thorns: state.thorns,
      abilityCharge: state.abilityCharge,
      abilityThreshold: state.abilityThreshold,
      isDeadeyeActive: state.isDeadeyeActive,
      deadeyeShotsRemaining: state.deadeyeShotsRemaining,
      deadeyeMaxShots: state.deadeyeMaxShots,
      canDeadeyeShootEnemy: state.canDeadeyeShootEnemy,
      isShuffleHoldMode: state.isShuffleHoldMode,
      shuffleHoldsRemaining: state.shuffleHoldsRemaining,
      shuffleMaxHolds: state.shuffleMaxHolds,
      swapsRemaining: state.swapsRemaining,
      swapsPerTurn: state.swapsPerTurn,
      enemies: state.enemies,
      targetedEnemyIndex: state.targetedEnemyIndex,
      phase: state.phase,
      turnNumber: state.turnNumber,
      turnLimit: state.turnLimit,
      mirageType: state.mirageType,
    }),

  setPlayerHealth: (current, max) =>
    set({ playerHealth: current, playerMaxHealth: max }),

  setGold: (gold) => set({ gold }),

  setSwaps: (remaining, total) =>
    set({ swapsRemaining: remaining, swapsPerTurn: total }),

  setAbilityCharge: (charge, threshold) =>
    set({ abilityCharge: charge, abilityThreshold: threshold }),

  setTargetedEnemy: (index) => set({ targetedEnemyIndex: index }),

  setCombo: (combo) => set({ comboCount: combo }),

  setAct: (act) => set({ currentAct: act }),

  setIsBoss: (isBoss) => set({ isBoss }),

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
  if (store.chainStacks > 0) effects.push({ type: 'chain', value: store.chainStacks });
  if (store.thorns > 0) effects.push({ type: 'thorns', value: store.thorns });
  return effects;
}

/** Derive enemy status effects from an enemy state. */
export function getEnemyStatusEffects(enemy: EnemyState): EnemyStatusEffect[] {
  const effects: EnemyStatusEffect[] = [];
  if (enemy.block > 0) effects.push({ type: 'block', value: enemy.block });
  if (enemy.poisonStacks > 0) effects.push({ type: 'poison', value: enemy.poisonStacks });
  if (enemy.vulnerable > 0) effects.push({ type: 'vulnerable', value: enemy.vulnerable });
  if (enemy.crackedGround > 0) effects.push({ type: 'cracked_ground', value: enemy.crackedGround });
  if (enemy.bountyStacks > 0) effects.push({ type: 'bounty', value: enemy.bountyStacks });
  if (enemy.terrifiedStacks > 0) effects.push({ type: 'terrified', value: enemy.terrifiedStacks });
  if (enemy.summoned) effects.push({ type: 'summoned', value: 1 });
  return effects;
}
