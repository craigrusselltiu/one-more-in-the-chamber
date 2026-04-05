import { create } from 'zustand';
import type { RunState, TileType, ArtifactInstance, ConsumableInstance, Act, MapState, CharacterId } from '../types/game';
import { generateMap } from '../game/map/MapGenerator';
import { useMetaStore } from './metaStore';
import { ARTIFACTS } from '../data/artifacts';
import { CHARACTER_TILES } from '../data/tiles';
import { deleteRun as deleteRunFromDB, clearCombatSnapshot } from '../services/localSave';

interface PendingNewGame {
  character: CharacterId;
  ascensionLevel: number;
}

interface RunStore {
  run: RunState | null;
  pendingNewGame: PendingNewGame | null;
  /** Restore a run loaded from IndexedDB (app resume). */
  restoreRun: (run: RunState) => void;
  /** Clear the active run from store and IndexedDB. */
  clearRun: () => Promise<void>;
  /** Set pending new game config (character + ascension) before tile select. */
  setPendingNewGame: (config: PendingNewGame) => void;
  startRun: (seed: string, ascensionLevel?: number) => void;
  updateHealth: (delta: number) => void;
  updateGold: (delta: number) => void;
  syncHealth: (current: number, max: number) => void;
  syncGold: (amount: number) => void;
  syncAbilityCharge: (charge: number) => void;
  addArtifact: (artifact: ArtifactInstance) => void;
  addConsumable: (consumable: ConsumableInstance) => void;
  removeConsumable: (index: number) => void;
  addTileType: (type: TileType) => void;
  removeTileType: (type: TileType) => void;
  swapTileType: (oldType: TileType, newType: TileType) => void;
  upgradeTile: (type: TileType) => void;
  addDamageDealt: (amount: number) => void;
  updateLongestCascade: (steps: number) => void;
  addFlawlessFight: () => void;
  addBossDefeated: () => void;
  setCurrentNode: (nodeId: string) => void;
  markNodeVisited: (nodeId: string) => void;
  markNodeCompleted: (nodeId: string) => void;
  advanceAct: () => void;
  setMapState: (map: MapState) => void;
  endRun: (completed: boolean) => void;
}

export const useRunStore = create<RunStore>((set, get) => ({
  run: null,
  pendingNewGame: null,

  restoreRun: (run) => set({ run }),

  clearRun: async () => {
    const run = get().run;
    if (run) {
      await deleteRunFromDB(run.id).catch(() => {});
      await clearCombatSnapshot(run.id).catch(() => {});
    }
    set({ run: null });
  },

  setPendingNewGame: (config) => set({ pendingNewGame: config }),

  startRun: (seed, ascensionLevel = 0) => {
    const pending = get().pendingNewGame;
    const character = pending?.character ?? 'red_panda';
    const mapState = generateMap(seed, 1);
    const loadouts = useMetaStore.getState().meta.unlockedLoadouts;

    // Apply loadout bonuses
    let gold = 100;
    const consumables: ConsumableInstance[] = [];
    const artifacts: ArtifactInstance[] = [];
    const traitCounts: Partial<Record<string, number>> = {};

    if (loadouts.includes('outlaws_stash')) gold += 15;
    if (loadouts.includes('healers_kit')) consumables.push({ id: 'tonic' });
    if (loadouts.includes('demolitions_kit')) {
      consumables.push({ id: 'stick_of_tnt' }, { id: 'stick_of_tnt' });
    }
    if (loadouts.includes('lucky_start')) {
      const def = ARTIFACTS.find((a) => a.id === 'horseshoe_charm');
      if (def) {
        artifacts.push({ id: def.id, tags: def.tags });
        for (const tag of def.tags) traitCounts[tag] = (traitCounts[tag] ?? 0) + 1;
      }
    }
    if (loadouts.includes('scouts_pack')) {
      consumables.push({ id: 'smoke_bomb' }, { id: 'signal_flare' });
    }

    // Character-specific starting tiles (5th tile chosen after 3rd node)
    const coreTiles: TileType[] = [...CHARACTER_TILES[character]];

    set({
      pendingNewGame: null,
      run: {
        id: crypto.randomUUID(),
        character,
        seed,
        ascensionLevel,
        currentAct: 1,
        currentNodeId: null,
        health: 100,
        maxHealth: 100,
        gold,
        activeTileTypes: coreTiles,
        tileUpgrades: {},
        artifacts,
        traitCounts,
        consumables,
        abilityCharge: 0,
        totalDamageDealt: 0,
        runStartedAt: Date.now(),
        longestCascade: 0,
        flawlessFights: 0,
        bossesDefeated: 0,
        mapState,
        status: 'active',
      },
    });
  },

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

  syncHealth: (current, max) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, health: current, maxHealth: max } };
    }),

  syncGold: (amount) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, gold: amount } };
    }),

  syncAbilityCharge: (charge) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, abilityCharge: charge } };
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

  removeTileType: (type) =>
    set((state) => {
      if (!state.run) return state;
      const activeTileTypes = state.run.activeTileTypes.filter((t) => t !== type);
      return { run: { ...state.run, activeTileTypes } };
    }),

  swapTileType: (oldType, newType) =>
    set((state) => {
      if (!state.run) return state;
      const idx = state.run.activeTileTypes.indexOf(oldType);
      if (idx === -1) return state;
      if (state.run.activeTileTypes.includes(newType)) return state;
      const activeTileTypes = [...state.run.activeTileTypes];
      activeTileTypes[idx] = newType;
      return { run: { ...state.run, activeTileTypes } };
    }),

  upgradeTile: (type) =>
    set((state) => {
      if (!state.run) return state;
      const tileUpgrades = { ...state.run.tileUpgrades };
      tileUpgrades[type] = (tileUpgrades[type] ?? 0) + 1;
      return { run: { ...state.run, tileUpgrades } };
    }),

  addDamageDealt: (amount) =>
    set((state) => {
      if (!state.run || amount <= 0) return state;
      return { run: { ...state.run, totalDamageDealt: state.run.totalDamageDealt + amount } };
    }),

  updateLongestCascade: (steps) =>
    set((state) => {
      if (!state.run || steps <= state.run.longestCascade) return state;
      return { run: { ...state.run, longestCascade: steps } };
    }),

  addFlawlessFight: () =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, flawlessFights: state.run.flawlessFights + 1 } };
    }),

  addBossDefeated: () =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, bossesDefeated: state.run.bossesDefeated + 1 } };
    }),

  setCurrentNode: (nodeId) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, currentNodeId: nodeId } };
    }),

  markNodeVisited: (nodeId) =>
    set((state) => {
      if (!state.run?.mapState) return state;
      const nodes = state.run.mapState.nodes.map((n) =>
        n.id === nodeId ? { ...n, visited: true } : n,
      );
      return {
        run: {
          ...state.run,
          currentNodeId: nodeId,
          mapState: { ...state.run.mapState, nodes, currentNodeId: nodeId },
        },
      };
    }),

  markNodeCompleted: (nodeId) =>
    set((state) => {
      if (!state.run?.mapState) return state;
      const nodes = state.run.mapState.nodes.map((n) =>
        n.id === nodeId ? { ...n, completed: true } : n,
      );
      return {
        run: {
          ...state.run,
          mapState: { ...state.run.mapState, nodes },
        },
      };
    }),

  advanceAct: () =>
    set((state) => {
      if (!state.run || state.run.currentAct >= 3) return state;
      const nextAct = (state.run.currentAct + 1) as Act;
      const mapState = generateMap(state.run.seed, nextAct);
      return {
        run: {
          ...state.run,
          currentAct: nextAct,
          currentNodeId: null,
          health: state.run.maxHealth,
          mapState,
        },
      };
    }),

  setMapState: (map) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, mapState: map } };
    }),

  endRun: (completed) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, status: completed ? 'completed' : 'abandoned' } };
    }),
}));
