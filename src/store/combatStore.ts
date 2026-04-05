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
  venomousStacks: number;
  critChance: number;
  thorns: number;

  // Ability
  abilityCharge: number;
  abilityThreshold: number;
  isDeadeyeActive: boolean;
  deadeyeShotsRemaining: number;
  deadeyeMaxShots: number;
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

  // Actions
  syncFromCombatState: (state: CombatState) => void;
  setPlayerHealth: (current: number, max: number) => void;
  setGold: (gold: number) => void;
  setSwaps: (remaining: number, total: number) => void;
  setAbilityCharge: (charge: number, threshold: number) => void;
  setTargetedEnemy: (index: number) => void;
  setCombo: (combo: number) => void;
  setAct: (act: number) => void;
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
  venomousStacks: 0,
  critChance: 0,
  thorns: 0,
  abilityCharge: 0,
  abilityThreshold: 10,
  isDeadeyeActive: false,
  deadeyeShotsRemaining: 0,
  deadeyeMaxShots: 3,
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
      venomousStacks: state.venomousStacks,
      critChance: state.critChance,
      thorns: state.thorns,
      abilityCharge: state.abilityCharge,
      abilityThreshold: state.abilityThreshold,
      isDeadeyeActive: state.isDeadeyeActive,
      deadeyeShotsRemaining: state.deadeyeShotsRemaining,
      deadeyeMaxShots: state.deadeyeMaxShots,
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
  if (store.venomousStacks > 0) effects.push({ type: 'venomous', value: store.venomousStacks });
  if (store.critChance > 0) effects.push({ type: 'crit', value: store.critChance });
  if (store.thorns > 0) effects.push({ type: 'thorns', value: store.thorns });
  return effects;
}

/** Derive enemy status effects from an enemy state. */
export function getEnemyStatusEffects(enemy: EnemyState): EnemyStatusEffect[] {
  const effects: EnemyStatusEffect[] = [];
  if (enemy.block > 0) effects.push({ type: 'block', value: enemy.block });
  if (enemy.venomStacks > 0) effects.push({ type: 'venom', value: enemy.venomStacks });
  if (enemy.vulnerable > 0) effects.push({ type: 'vulnerable', value: enemy.vulnerable });
  if (enemy.crackedGround > 0) effects.push({ type: 'cracked_ground', value: enemy.crackedGround });
  if (enemy.bountyStacks > 0) effects.push({ type: 'bounty', value: enemy.bountyStacks });
  if (enemy.summoned) effects.push({ type: 'summoned', value: 1 });
  return effects;
}
