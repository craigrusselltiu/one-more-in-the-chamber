import { create } from 'zustand';
import type {
  RunState,
  TileType,
  ArtifactInstance,
  ConsumableInstance,
  Act,
  MapState,
  CharacterId,
  MerchantSnapshot,
  PendingCampfireOutcome,
} from '../types/game';
import { generateMap } from '../game/map/MapGenerator';
import { useMetaStore } from './metaStore';
import { useSettingsStore } from './settingsStore';
import { ARTIFACTS } from '../data/artifacts';
import { CHARACTER_TILES, TILE_DEFINITIONS } from '../data/tiles';
import { getWantedLevelMutations } from '../data/wantedLevel';
import { getMaxConsumableSlots } from '../utils/consumableSlots';
import { applyArtifactGoldGainModifier } from '../utils/goldGain';
import { deleteRun as deleteRunFromDB, clearCombatSnapshot } from '../services/localSave';
import { abandonOtherActiveRuns, clearRemoteCombatSnapshot } from '../services/syncService';
import { saveLastRunSummary } from '../services/lastRunSummary';

interface PendingNewGame {
  character: CharacterId;
  wantedLevel: number;
}

interface RunStore {
  run: RunState | null;
  pendingNewGame: PendingNewGame | null;
  /** Restore a run loaded from IndexedDB (app resume). */
  restoreRun: (run: RunState) => void;
  /** Clear the active run from store and IndexedDB. */
  clearRun: () => Promise<void>;
  /** Set pending new game config (character + wanted level) before tile select. */
  setPendingNewGame: (config: PendingNewGame) => void;
  startRun: (seed: string, wantedLevel?: number) => void;
  updateHealth: (delta: number) => void;
  updateGold: (delta: number) => void;
  gainGold: (amount: number) => void;
  syncHealth: (current: number, max: number) => void;
  syncGold: (amount: number) => void;
  syncAbilityCharge: (charge: number) => void;
  addArtifact: (artifact: ArtifactInstance) => void;
  markArtifactUsed: (id: string) => void;
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
  addCombatCleared: () => void;
  addEliteCleared: () => void;
  addGoldObtained: (amount: number) => void;
  setCurrentNode: (nodeId: string) => void;
  markNodeVisited: (nodeId: string) => void;
  resetNodeVisited: (nodeId: string) => void;
  markNodeCompleted: (nodeId: string) => void;
  addMerchantPurchase: (nodeId: string, itemId: string) => void;
  setMerchantSnapshot: (nodeId: string, snapshot: MerchantSnapshot) => void;
  markBossRewardTaken: () => void;
  markEliteRewardTaken: () => void;
  markOutlawKingEncountered: () => void;
  setPendingLegendaryReward: (value: boolean) => void;
  setEventBag: (ids: string[]) => void;
  setForcedCombatEnemies: (ids: string[] | undefined) => void;
  setPendingEventResumeScreen: (screen: 'artifact' | 'combat' | undefined) => void;
  setNextMerchantDiscount: (discount: number | undefined) => void;
  setNextMerchantAllArtifactsOnSale: (value: boolean | undefined) => void;
  setPendingEventArtifactChoiceCount: (count: number | undefined) => void;
  setPendingActBossHpBonus: (amount: number | undefined) => void;
  setPendingNextFightGrace: (amount: number | undefined) => void;
  setPendingNextFightSwapBonus: (amount: number | undefined) => void;
  setPendingCampfireOutcome: (outcome: PendingCampfireOutcome | undefined) => void;
  setPendingStarterOffer: (offer: { tileId: string; upgradeId: string; sacrificeId: string } | undefined) => void;
  markStarterEncountered: () => void;
  incrementMerchantUpgradesPurchased: () => void;
  setActMerchantSurcharge: (amount: number | undefined) => void;
  advanceAct: () => void;
  setMapState: (map: MapState) => void;
  endRun: (completed: boolean) => void;
  setDeathCause: (cause: string) => void;
}

export const useRunStore = create<RunStore>((set, get) => ({
  run: null,
  pendingNewGame: null,

  restoreRun: (run) => {
    // Existing run means player isn't new -- disable tutorials by default
    useSettingsStore.getState().setTutorialsEnabled(false);

    // Migrations for legacy saves
    const migrated = { ...run };

    // Rename: ascensionLevel -> wantedLevel. Old persisted/remote-pulled runs
    // from before the rename only carry ascensionLevel, so scoring.ts reads
    // undefined and the final_score computes to NaN -> stored as NULL.
    const legacy = migrated as unknown as { ascensionLevel?: number };
    if (legacy.ascensionLevel != null && migrated.wantedLevel == null) {
      migrated.wantedLevel = legacy.ascensionLevel;
    }

    // Rename 'venom' tile type to 'waste'
    migrated.activeTileTypes = run.activeTileTypes.map(t => t === 'venom' as string ? 'waste' : t) as typeof run.activeTileTypes;
    if (run.tileUpgrades && ('venom' as string) in run.tileUpgrades) {
      const upgrades = { ...run.tileUpgrades };
      (upgrades as Record<string, number>)['waste'] = (upgrades as Record<string, number>)['venom'];
      delete (upgrades as Record<string, number>)['venom'];
      migrated.tileUpgrades = upgrades;
    }

    // Rename consumable ID: tonic -> strong_whiskey
    if (migrated.consumables) {
      migrated.consumables = migrated.consumables.map((c) =>
        c.id === 'tonic' ? { ...c, id: 'strong_whiskey' } : c,
      );
    }

    // Backfill persisted scoring counters for older saves.
    // Starting gold (~100) and starting artifacts (1 character + optional loadout) shouldn't count.
    if (migrated.combatsCleared == null) migrated.combatsCleared = 0;
    if (migrated.elitesCleared == null) migrated.elitesCleared = 0;
    if (migrated.goldObtained == null) migrated.goldObtained = Math.max(0, migrated.gold - 100);
    if (migrated.artifactsObtained == null) {
      migrated.artifactsObtained = Math.max(0, migrated.artifacts.length - 1);
    }

    // Pre-existing runs predate the starter encounter and should not be
    // re-interrupted with it on resume. Mark them encountered so the intercept
    // in App.tsx is skipped on the next map transition.
    if (migrated.starterEncountered == null) {
      migrated.starterEncountered = true;
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
      // Mark the server row (and any other stray actives for this player) as
      // abandoned, so we don't end up with orphan active runs on the backend.
      // No-op when not logged in.
      await abandonOtherActiveRuns().catch(() => {});
      await deleteRunFromDB(run.id).catch(() => {});
      await clearCombatSnapshot(run.id).catch(() => {});
      await clearRemoteCombatSnapshot(run.id).catch(() => {});
    }
    set({ run: null });
  },

  setPendingNewGame: (config) => set({ pendingNewGame: config }),

  startRun: (seed, wantedLevel = 0) => {
    const pending = get().pendingNewGame;
    const character = pending?.character ?? 'red_panda';
    // Wanted-level mutations applied at run start.
    const ascMods = getWantedLevelMutations(wantedLevel);
    const mapState = generateMap(seed, 1, ascMods.eliteCountBonus, ascMods.campfireCountPenalty);
    const loadouts = useMetaStore.getState().meta.unlockedLoadouts;

    // Apply loadout bonuses. L10: wanted-level override drops base starting gold.
    let gold = ascMods.startingGoldOverride ?? 100;
    const consumables: ConsumableInstance[] = [];
    const artifacts: ArtifactInstance[] = [];
    const traitCounts: Partial<Record<string, number>> = {};

    if (loadouts.includes('outlaws_stash')) gold += 15;
    if (loadouts.includes('healers_kit')) consumables.push({ id: 'strong_whiskey' });
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

    // L25: start with a random corrupt-tagged artifact.
    if (ascMods.startWithRandomCorruption) {
      const corruptPool = ARTIFACTS.filter((a) => a.rarity === 'corrupt');
      if (corruptPool.length > 0) {
        const pick = corruptPool[Math.floor(Math.random() * corruptPool.length)];
        artifacts.push({ id: pick.id, tags: pick.tags });
        for (const tag of pick.tags) traitCounts[tag] = (traitCounts[tag] ?? 0) + 1;
      }
    }

    // Character-specific starting tiles (5th tile chosen after 3rd node)
    const coreTiles: TileType[] = [...CHARACTER_TILES[character]];

    // L14 / L26: max HP multiplier (0.95 / 0.9 cumulative).
    const maxHealth = Math.round(100 * ascMods.maxHealthMultiplier);
    // L6: start at 90% of max HP
    const startingHealth = Math.max(1, Math.round(maxHealth * ascMods.startingHealthFraction));
    // L30: the starter tile selection is replaced with a forced Charcoal pick
    // (handled in TileSelectScreen via ascMods.extraCharcoalTile). No change to
    // the starting deck here -- player still begins with only their character tiles.

    set({
      pendingNewGame: null,
      run: {
        id: crypto.randomUUID(),
        character,
        seed,
        wantedLevel,
        currentAct: 1,
        currentNodeId: null,
        health: startingHealth,
        maxHealth,
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
        combatsCleared: 0,
        elitesCleared: 0,
        goldObtained: 0,
        artifactsObtained: 0,
        mapState,
        status: 'active',
      },
    });

    const meta = useMetaStore.getState();
    for (const t of coreTiles) meta.discoverTile(t);
    for (const a of artifacts) meta.discoverArtifact(a.id);
    for (const c of consumables) meta.discoverConsumable(c.id);
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

  gainGold: (amount) =>
    set((state) => {
      if (!state.run || amount <= 0) return state;
      const adjusted = applyArtifactGoldGainModifier(amount, state.run.artifacts);
      return {
        run: {
          ...state.run,
          gold: state.run.gold + adjusted,
          goldObtained: state.run.goldObtained + adjusted,
        },
      };
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
      // Gold Tooth's effect is fully spent on pickup, so mark it used immediately.
      const inst: ArtifactInstance =
        artifact.id === 'gold_tooth' ? { ...artifact, used: true } : artifact;
      const artifacts = [...state.run.artifacts, inst];
      const traitCounts = { ...state.run.traitCounts };
      for (const tag of artifact.tags) {
        traitCounts[tag] = (traitCounts[tag] ?? 0) + 1;
      }
      // Gold Tooth: upon pickup, gain 333 gold
      let gold = state.run.gold;
      let goldObtained = state.run.goldObtained;
      if (artifact.id === 'gold_tooth') {
        const payout = applyArtifactGoldGainModifier(333, state.run.artifacts);
        gold += payout;
        goldObtained += payout;
      }
      const artifactsObtained = state.run.artifactsObtained + 1;
      useMetaStore.getState().discoverArtifact(artifact.id);
      return { run: { ...state.run, artifacts, traitCounts, gold, goldObtained, artifactsObtained } };
    }),

  markArtifactUsed: (id) =>
    set((state) => {
      if (!state.run) return state;
      let changed = false;
      const artifacts = state.run.artifacts.map((a) => {
        if (a.id === id && !a.used) {
          changed = true;
          return { ...a, used: true };
        }
        return a;
      });
      if (!changed) return state;
      return { run: { ...state.run, artifacts } };
    }),

  addConsumable: (consumable) =>
    set((state) => {
      if (!state.run) return state;
      // Record discovery even when the slot is full - player still encountered the item.
      useMetaStore.getState().discoverConsumable(consumable.id);
      const maxSlots = getMaxConsumableSlots(state.run);
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
      useMetaStore.getState().discoverTile(type);
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
      useMetaStore.getState().discoverTile(newType);
      return { run: { ...state.run, activeTileTypes, tileUpgrades } };
    }),

  upgradeTile: (type) =>
    set((state) => {
      if (!state.run) return state;
      if (!TILE_DEFINITIONS[type]?.upgradeText) return state;
      const tileUpgrades = { ...state.run.tileUpgrades };
      const nextLevel = (tileUpgrades[type] ?? 0) + 1;
      tileUpgrades[type] = nextLevel;
      let activeTileTypes = state.run.activeTileTypes;
      if (type === 'charcoal' && nextLevel >= 10 && activeTileTypes.includes('charcoal') && !activeTileTypes.includes('obsidian')) {
        activeTileTypes = activeTileTypes.map((t) => (t === 'charcoal' ? 'obsidian' : t));
        tileUpgrades.obsidian = nextLevel;
        delete tileUpgrades.charcoal;
      }
      return { run: { ...state.run, activeTileTypes, tileUpgrades } };
    }),

  setTileUpgrade: (type, level) =>
    set((state) => {
      if (!state.run) return state;
      if (!TILE_DEFINITIONS[type]?.upgradeText) return state;
      const tileUpgrades = { ...state.run.tileUpgrades };
      if (level > 0) tileUpgrades[type] = level;
      else delete tileUpgrades[type];
      let activeTileTypes = state.run.activeTileTypes;
      if (type === 'charcoal' && level >= 10 && activeTileTypes.includes('charcoal') && !activeTileTypes.includes('obsidian')) {
        activeTileTypes = activeTileTypes.map((t) => (t === 'charcoal' ? 'obsidian' : t));
        tileUpgrades.obsidian = level;
        delete tileUpgrades.charcoal;
      }
      return { run: { ...state.run, activeTileTypes, tileUpgrades } };
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

  addCombatCleared: () =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, combatsCleared: state.run.combatsCleared + 1 } };
    }),

  addEliteCleared: () =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, elitesCleared: state.run.elitesCleared + 1 } };
    }),

  addGoldObtained: (amount) =>
    set((state) => {
      if (!state.run || amount <= 0) return state;
      return { run: { ...state.run, goldObtained: state.run.goldObtained + amount } };
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

  markOutlawKingEncountered: () =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, outlawKingEncountered: true } };
    }),

  setPendingLegendaryReward: (value) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, pendingLegendaryReward: value } };
    }),

  setEventBag: (ids) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, eventBag: ids } };
    }),

  setForcedCombatEnemies: (ids) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, forcedCombatEnemies: ids } };
    }),

  setPendingEventResumeScreen: (screen) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, pendingEventResumeScreen: screen } };
    }),

  setNextMerchantDiscount: (discount) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, nextMerchantDiscount: discount } };
    }),

  setNextMerchantAllArtifactsOnSale: (value) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, nextMerchantAllArtifactsOnSale: value } };
    }),

  setPendingEventArtifactChoiceCount: (count) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, pendingEventArtifactChoiceCount: count } };
    }),

  setPendingActBossHpBonus: (amount) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, pendingActBossHpBonus: amount } };
    }),

  setPendingNextFightGrace: (amount) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, pendingNextFightGrace: amount } };
    }),

  setPendingNextFightSwapBonus: (amount) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, pendingNextFightSwapBonus: amount } };
    }),

  setPendingCampfireOutcome: (outcome) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, pendingCampfireOutcome: outcome } };
    }),

  setPendingStarterOffer: (offer) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, pendingStarterOffer: offer } };
    }),

  markStarterEncountered: () =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, starterEncountered: true, pendingStarterOffer: undefined } };
    }),

  incrementMerchantUpgradesPurchased: () =>
    set((state) => {
      if (!state.run) return state;
      const prev = state.run.merchantUpgradesPurchased ?? 0;
      return { run: { ...state.run, merchantUpgradesPurchased: prev + 1 } };
    }),

  setActMerchantSurcharge: (amount) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, actMerchantSurcharge: amount } };
    }),

  advanceAct: () =>
    set((state) => {
      if (!state.run || state.run.currentAct >= 3) return state;
      const nextAct = (state.run.currentAct + 1) as Act;
      // L5: heal a fraction of missing HP between acts (default 100%).
      const mods = getWantedLevelMutations(state.run.wantedLevel);
      const mapState = generateMap(state.run.seed, nextAct, mods.eliteCountBonus, mods.campfireCountPenalty);
      const missing = state.run.maxHealth - state.run.health;
      const healed = Math.round(missing * mods.interActHealFraction);
      const newHealth = Math.min(state.run.maxHealth, state.run.health + healed);
      return {
        run: {
          ...state.run,
          currentAct: nextAct,
          currentNodeId: null,
          health: newHealth,
          bossRewardTaken: false,
          pendingActBossHpBonus: undefined,
          actMerchantSurcharge: undefined,
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
      const run = state.run;
      // Fire-and-forget: persist a summary so the next run's starter screen
      // can reference the outcome. Skips failures silently.
      void saveLastRunSummary({
        character: run.character,
        wantedLevel: run.wantedLevel,
        actReached: run.currentAct,
        outcome: completed ? 'victory' : 'defeat',
        deathCause: run.deathCause,
        combatsCleared: run.combatsCleared,
        endedAt: Date.now(),
      });
      return { run: { ...run, status: completed ? 'completed' : 'abandoned' } };
    }),

  setDeathCause: (cause) =>
    set((state) => {
      if (!state.run) return state;
      return { run: { ...state.run, deathCause: cause } };
    }),
}));
