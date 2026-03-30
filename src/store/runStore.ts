import { create } from 'zustand';
import type { RunState, TileType, ArtifactInstance, ConsumableInstance, Act } from '../types/game';

interface RunStore {
  run: RunState | null;
  startRun: (seed: string, starterTile: TileType) => void;
  updateHealth: (delta: number) => void;
  updateGold: (delta: number) => void;
  addArtifact: (artifact: ArtifactInstance) => void;
  addConsumable: (consumable: ConsumableInstance) => void;
  removeConsumable: (index: number) => void;
  addTileType: (type: TileType) => void;
  upgradeTile: (type: TileType) => void;
  setCurrentNode: (nodeId: string) => void;
  advanceAct: () => void;
  endRun: (completed: boolean) => void;
}

export const useRunStore = create<RunStore>((set) => ({
  run: null,

  startRun: (seed, starterTile) =>
    set({
      run: {
        id: crypto.randomUUID(),
        character: 'red_panda',
        seed,
        ascensionLevel: 0,
        currentAct: 1,
        currentNodeId: null,
        health: 100,
        maxHealth: 100,
        gold: 0,
        activeTileTypes: ['bullet', 'iron', 'gold', starterTile],
        tileUpgrades: {},
        artifacts: [],
        traitCounts: {},
        consumables: [],
        abilityCharge: 0,
        mapState: null,
        status: 'active',
      },
    }),

  updateHealth: (delta) =>
    set((state) => {
      if (!state.run) return state;
      const newHealth = Math.max(0, Math.min(state.run.maxHealth, state.run.health + delta));
      return { run: { ...state.run, health: newHealth } };
    }),

  updateGold: (delta) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, gold: Math.max(0, state.run.gold + delta) } };
    }),

  addArtifact: (artifact) =>
    set((state) => {
      if (!state.run) return state;
      const artifacts = [...state.run.artifacts, artifact];
      const traitCounts = { ...state.run.traitCounts };
      for (const tag of artifact.tags) {
        traitCounts[tag] = (traitCounts[tag] ?? 0) + 1;
      }
      return { run: { ...state.run, artifacts, traitCounts } };
    }),

  addConsumable: (consumable) =>
    set((state) => {
      if (!state.run) return state;
      const maxSlots = state.run.artifacts.some((a) => a.id === 'saddlebag') ? 4 : 3;
      if (state.run.consumables.length >= maxSlots) return state;
      return { run: { ...state.run, consumables: [...state.run.consumables, consumable] } };
    }),

  removeConsumable: (index) =>
    set((state) => {
      if (!state.run) return state;
      const consumables = state.run.consumables.filter((_, i) => i !== index);
      return { run: { ...state.run, consumables } };
    }),

  addTileType: (type) =>
    set((state) => {
      if (!state.run) return state;
      if (state.run.activeTileTypes.includes(type)) return state;
      return { run: { ...state.run, activeTileTypes: [...state.run.activeTileTypes, type] } };
    }),

  upgradeTile: (type) =>
    set((state) => {
      if (!state.run) return state;
      const tileUpgrades = { ...state.run.tileUpgrades };
      tileUpgrades[type] = (tileUpgrades[type] ?? 0) + 1;
      return { run: { ...state.run, tileUpgrades } };
    }),

  setCurrentNode: (nodeId) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, currentNodeId: nodeId } };
    }),

  advanceAct: () =>
    set((state) => {
      if (!state.run || state.run.currentAct >= 3) return state;
      return { run: { ...state.run, currentAct: (state.run.currentAct + 1) as Act } };
    }),

  endRun: (completed) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, status: completed ? 'completed' : 'abandoned' } };
    }),
}));
