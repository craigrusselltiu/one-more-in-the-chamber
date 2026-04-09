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
  swapTileType: (oldType: TileType, newType: TileType, newLevel?: number) => void;
  upgradeTile: (type: TileType) => void;
  setTileUpgrade: (type: TileType, level: number) => void;
  tickPlayTime: () => void;
  addDamageDealt: (amount: number) => void;
  updateLongestCascade: (steps: number) => void;
  addFlawlessFight: () => void;
  addBossDefeated: () => void;
  setCurrentNode: (nodeId: string) => void;
  markNodeVisited: (nodeId: string) => void;
  resetNodeVisited: (nodeId: string) => void;
  markNodeCompleted: (nodeId: string) => void;
  addMerchantPurchase: (nodeId: string, itemId: string) => void;
  setMerchantSnapshot: (nodeId: string, snapshot: { ownedArtifactIds: string[]; activeTileTypes: TileType[] }) => void;
  markBossRewardTaken: () => void;
  markEliteRewardTaken: () => void;
  advanceAct: () => void;
  setMapState: (map: MapState) => void;
  endRun: (completed: boolean) => void;
}

export const useRunStore = create<RunStore>((set, get) => ({
  run: null,
  pendingNewGame: null,

  restoreRun: (run) => {
    // Migrations for legacy saves
    const migrated = { ...run };

    // Rename 'venom' tile type to 'waste'
    migrated.activeTileTypes = run.activeTileTypes.map(t => t === 'venom' as string ? 'waste' : t) as typeof run.activeTileTypes;
    if (run.tileUpgrades && ('venom' as string) in run.tileUpgrades) {
      const upgrades = { ...run.tileUpgrades };
      (upgrades as Record<string, number>)['waste'] = (upgrades as Record<string, number>)['venom'];
      delete (upgrades as Record<string, number>)['venom'];
      migrated.tileUpgrades = upgrades;
    }

    // Rename 'treasure' map node type to 'artifact'
    if (migrated.mapState) {
      migrated.mapState = {
        ...migrated.mapState,
        nodes: migrated.mapState.nodes.map(n =>
          (n.type as string) === 'treasure' ? { ...n, type: 'artifact' as typeof n.type } : n,
        ),
      };
    }

    set({ run: migrated });
  },

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
      // Lucky Start loadout: grant a Lucky Bullet at run start
      const def = ARTIFACTS.find((a) => a.id === 'lucky_bullet');
      if (def) {
        artifacts.push({ id: def.id, tags: def.tags });
        for (const tag of def.tags) traitCounts[tag] = (traitCounts[tag] ?? 0) + 1;
      }
    }
    if (loadouts.includes('scouts_pack')) {
      consumables.push({ id: 'bandage' }, { id: 'signal_flare' });
    }

    // Character-specific starting artifacts
    const startingArtifactId = character === 'red_panda' ? 'bamboo_canteen' : 'rigged_deck';
    const startDef = ARTIFACTS.find((a) => a.id === startingArtifactId);
    if (startDef) {
      artifacts.push({ id: startDef.id, tags: startDef.tags });
      for (const tag of startDef.tags) traitCounts[tag] = (traitCounts[tag] ?? 0) + 1;
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
        playTimeSeconds: 0,
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
      // Gold Tooth: upon pickup, gain 333 gold
      let gold = state.run.gold;
      if (artifact.id === 'gold_tooth') gold += 333;
      return { run: { ...state.run, artifacts, traitCounts, gold } };
    }),

  addConsumable: (consumable) =>
    set((state) => {
      if (!state.run) return state;
      const maxSlots = state.run.artifacts.some((a) => a.id === 'saddlebag') ? 5 : 3;
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

  swapTileType: (oldType, newType, newLevel) =>
    set((state) => {
      if (!state.run) return state;
      const idx = state.run.activeTileTypes.indexOf(oldType);
      if (idx === -1) return state;
      if (state.run.activeTileTypes.includes(newType)) return state;
      const activeTileTypes = [...state.run.activeTileTypes];
      activeTileTypes[idx] = newType;
      const tileUpgrades = { ...state.run.tileUpgrades };
      delete tileUpgrades[oldType];
      if (newLevel && newLevel > 0) tileUpgrades[newType] = newLevel;
      return { run: { ...state.run, activeTileTypes, tileUpgrades } };
    }),

  upgradeTile: (type) =>
    set((state) => {
      if (!state.run) return state;
      const tileUpgrades = { ...state.run.tileUpgrades };
      tileUpgrades[type] = (tileUpgrades[type] ?? 0) + 1;
      return { run: { ...state.run, tileUpgrades } };
    }),

  setTileUpgrade: (type, level) =>
    set((state) => {
      if (!state.run) return state;
      const tileUpgrades = { ...state.run.tileUpgrades };
      if (level > 0) tileUpgrades[type] = level;
      else delete tileUpgrades[type];
      return { run: { ...state.run, tileUpgrades } };
    }),

  tickPlayTime: () =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, playTimeSeconds: (state.run.playTimeSeconds ?? 0) + 1 } };
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
      return {
        run: {
          ...state.run,
          currentNodeId: nodeId,
          mapState: state.run.mapState
            ? { ...state.run.mapState, currentNodeId: nodeId }
            : state.run.mapState,
        },
      };
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
          eliteRewardTaken: false,
          mapState: { ...state.run.mapState, nodes, currentNodeId: nodeId },
        },
      };
    }),

  /** Reset a visited node back to unvisited (safeguard for failed combat loads). */
  resetNodeVisited: (nodeId) =>
    set((state) => {
      if (!state.run?.mapState) return state;
      const nodes = state.run.mapState.nodes.map((n) =>
        n.id === nodeId ? { ...n, visited: false } : n,
      );
      return {
        run: {
          ...state.run,
          currentNodeId: null,
          mapState: { ...state.run.mapState, nodes },
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

  addMerchantPurchase: (nodeId, itemId) =>
    set((state) => {
      if (!state.run) return state;
      const prev = state.run.merchantPurchases ?? {};
      const nodeItems = [...(prev[nodeId] ?? []), itemId];
      return {
        run: {
          ...state.run,
          merchantPurchases: { ...prev, [nodeId]: nodeItems },
        },
      };
    }),

  setMerchantSnapshot: (nodeId, snapshot) =>
    set((state) => {
      if (!state.run) return state;
      const prev = state.run.merchantSnapshots ?? {};
      if (prev[nodeId]) return state; // don't overwrite
      return {
        run: {
          ...state.run,
          merchantSnapshots: { ...prev, [nodeId]: snapshot },
        },
      };
    }),

  markBossRewardTaken: () =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, bossRewardTaken: true } };
    }),

  markEliteRewardTaken: () =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, eliteRewardTaken: true } };
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
          bossRewardTaken: false,
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
