import { create } from 'zustand';
import type { ShopCategory } from '../data/shopItems';
import { pushMeta } from '../services/syncService';

const META_STORAGE_KEY = 'omitc-meta';
/** ISO timestamp of the last local meta write. Used by syncMeta to decide
 *  whether the local or remote row is newer. */
const META_UPDATED_AT_KEY = 'omitc-meta-updated-at';

export function readLocalMetaUpdatedAt(): string | null {
  try { return localStorage.getItem(META_UPDATED_AT_KEY); } catch { return null; }
}

function writeLocalMetaUpdatedAt(iso: string): void {
  try { localStorage.setItem(META_UPDATED_AT_KEY, iso); } catch { /* ignore */ }
}

/** Fire-and-forget push to Supabase, debounced so a burst of shop purchases
 *  or reputation grants only fires once. No-op when logged out. */
const REMOTE_PUSH_DELAY_MS = 1200;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
function pushMetaDebounced(meta: MetaProgression): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushMeta({
      reputation: meta.reputation,
      unlockedArtifacts: meta.unlockedArtifacts,
      unlockedEvents: meta.unlockedEvents,
      unlockedCosmetics: meta.unlockedCosmetics,
      unlockedLoadouts: meta.unlockedLoadouts,
      unlockedCharacters: meta.unlockedCharacters,
      highestAscensionCleared: meta.highestAscensionCleared,
    }).catch((err) => console.error('[sync] pushMeta failed:', err));
  }, REMOTE_PUSH_DELAY_MS);
}

interface MetaProgression {
  reputation: number;
  unlockedArtifacts: string[];
  unlockedEvents: string[];
  unlockedCosmetics: string[];
  unlockedLoadouts: string[];
  unlockedCharacters: string[];
  highestAscensionCleared: number;
  lastAscensionLevel: number;
  lastCharacter: string;
  playerName: string;
  completedTutorials: string[];
}

interface MetaStore {
  meta: MetaProgression;
  addReputation: (amount: number) => void;
  spendReputation: (amount: number) => boolean;
  unlockArtifact: (id: string) => void;
  unlockEvent: (id: string) => void;
  unlockCosmetic: (id: string) => void;
  unlockLoadout: (id: string) => void;
  unlockCharacter: (id: string) => void;
  /** Purchase a shop item: deducts reputation and unlocks into the correct category. */
  purchaseShopItem: (unlockId: string, cost: number, category: ShopCategory) => boolean;
  isUnlocked: (unlockId: string, category: ShopCategory) => boolean;
  setHighestAscension: (level: number) => void;
  setLastAscensionLevel: (level: number) => void;
  setLastCharacter: (id: string) => void;
  setPlayerName: (name: string) => void;
  markTutorialComplete: (id: string) => void;
  isTutorialComplete: (id: string) => boolean;
  /** Clear all account-scoped progression back to first-launch defaults. Used on sign-out
   *  so a subsequent login doesn't merge the previous account's unlocks into the new one. */
  resetToDefaults: () => void;
  /** Apply a merged snapshot pulled from Supabase. Updates zustand + localStorage but
   *  does NOT re-push to remote (preserves the just-pulled source of truth). */
  hydrateFromRemote: (meta: Partial<MetaProgression>) => void;
}

const CATEGORY_KEY: Record<ShopCategory, keyof Pick<MetaProgression, 'unlockedArtifacts' | 'unlockedEvents' | 'unlockedCosmetics' | 'unlockedLoadouts' | 'unlockedCharacters'>> = {
  artifact: 'unlockedArtifacts',
  event: 'unlockedEvents',
  cosmetic: 'unlockedCosmetics',
  loadout: 'unlockedLoadouts',
  character: 'unlockedCharacters',
};

const DEFAULT_META: MetaProgression = {
  reputation: 0,
  unlockedArtifacts: [],
  unlockedEvents: [],
  unlockedCosmetics: [],
  unlockedLoadouts: [],
  unlockedCharacters: ['red_panda'],
  highestAscensionCleared: -1,
  lastAscensionLevel: 0,
  lastCharacter: 'red_panda',
  playerName: '',
  completedTutorials: [],
};

function loadMeta(): MetaProgression {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (raw) {
      const parsed = { ...DEFAULT_META, ...JSON.parse(raw) } as MetaProgression;
      // Sanitize numeric fields: any NaN / Infinity / non-number from a
      // previously-broken save resets to the default (0 / -1) so it can
      // never propagate further.
      const safeNum = (v: unknown, fallback: number): number =>
        typeof v === 'number' && Number.isFinite(v) ? v : fallback;
      parsed.reputation = safeNum(parsed.reputation, 0);
      parsed.highestAscensionCleared = safeNum(parsed.highestAscensionCleared, -1);
      parsed.lastAscensionLevel = safeNum(parsed.lastAscensionLevel, 0);
      return parsed;
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_META };
}

function persistLocal(meta: MetaProgression): void {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
  } catch { /* ignore */ }
}

function persistMeta(meta: MetaProgression): void {
  persistLocal(meta);
  // Stamp the "last local write" time BEFORE the remote push, so if syncMeta
  // races against a recent change it can see that local is fresh.
  writeLocalMetaUpdatedAt(new Date().toISOString());
  pushMetaDebounced(meta);
}

/** Called by syncMeta after pulling remote, so local "lastUpdatedAt" reflects
 *  the same timestamp the server row carries. */
export function markLocalMetaSynced(iso: string): void {
  writeLocalMetaUpdatedAt(iso);
}

export const useMetaStore = create<MetaStore>((set, get) => ({
  meta: loadMeta(),

  addReputation: (amount) =>
    set((state) => {
      // Guard against NaN/Infinity from a broken score calc poisoning the
      // persisted reputation counter. Ignore non-finite or non-positive grants.
      const delta = Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
      const current = Number.isFinite(state.meta.reputation) ? state.meta.reputation : 0;
      const meta = { ...state.meta, reputation: current + delta };
      persistMeta(meta);
      return { meta };
    }),

  spendReputation: (amount) => {
    const { meta } = get();
    const current = Number.isFinite(meta.reputation) ? meta.reputation : 0;
    const cost = Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
    if (current < cost) return false;
    set((state) => {
      const next = { ...state.meta, reputation: current - cost };
      persistMeta(next);
      return { meta: next };
    });
    return true;
  },

  unlockArtifact: (id) =>
    set((state) => {
      if (state.meta.unlockedArtifacts.includes(id)) return state;
      const meta = { ...state.meta, unlockedArtifacts: [...state.meta.unlockedArtifacts, id] };
      persistMeta(meta);
      return { meta };
    }),

  unlockEvent: (id) =>
    set((state) => {
      if (state.meta.unlockedEvents.includes(id)) return state;
      const meta = { ...state.meta, unlockedEvents: [...state.meta.unlockedEvents, id] };
      persistMeta(meta);
      return { meta };
    }),

  unlockCosmetic: (id) =>
    set((state) => {
      if (state.meta.unlockedCosmetics.includes(id)) return state;
      const meta = { ...state.meta, unlockedCosmetics: [...state.meta.unlockedCosmetics, id] };
      persistMeta(meta);
      return { meta };
    }),

  unlockLoadout: (id) =>
    set((state) => {
      if (state.meta.unlockedLoadouts.includes(id)) return state;
      const meta = { ...state.meta, unlockedLoadouts: [...state.meta.unlockedLoadouts, id] };
      persistMeta(meta);
      return { meta };
    }),

  unlockCharacter: (id) =>
    set((state) => {
      if (state.meta.unlockedCharacters.includes(id)) return state;
      const meta = { ...state.meta, unlockedCharacters: [...state.meta.unlockedCharacters, id] };
      persistMeta(meta);
      return { meta };
    }),

  purchaseShopItem: (unlockId, cost, category) => {
    const store = get();
    if (store.isUnlocked(unlockId, category)) return false;
    if (!store.spendReputation(cost)) return false;
    const key = CATEGORY_KEY[category];
    set((state) => {
      const meta = { ...state.meta, [key]: [...state.meta[key], unlockId] };
      persistMeta(meta);
      return { meta };
    });
    return true;
  },

  isUnlocked: (unlockId, category) => {
    const { meta } = get();
    const key = CATEGORY_KEY[category];
    return meta[key].includes(unlockId);
  },

  setHighestAscension: (level) =>
    set((state) => {
      const meta = { ...state.meta, highestAscensionCleared: Math.max(state.meta.highestAscensionCleared, level) };
      persistMeta(meta);
      return { meta };
    }),

  setLastAscensionLevel: (level) =>
    set((state) => {
      const meta = { ...state.meta, lastAscensionLevel: level };
      persistMeta(meta);
      return { meta };
    }),

  setLastCharacter: (id) =>
    set((state) => {
      const meta = { ...state.meta, lastCharacter: id };
      persistMeta(meta);
      return { meta };
    }),

  setPlayerName: (name) =>
    set((state) => {
      const meta = { ...state.meta, playerName: name };
      persistMeta(meta);
      return { meta };
    }),

  markTutorialComplete: (id) =>
    set((state) => {
      if (state.meta.completedTutorials.includes(id)) return state;
      const meta = { ...state.meta, completedTutorials: [...state.meta.completedTutorials, id] };
      persistMeta(meta);
      return { meta };
    }),

  isTutorialComplete: (id) => {
    return get().meta.completedTutorials.includes(id);
  },

  resetToDefaults: () =>
    set(() => {
      const meta: MetaProgression = { ...DEFAULT_META };
      persistMeta(meta);
      return { meta };
    }),

  hydrateFromRemote: (incoming) =>
    set((state) => {
      const meta: MetaProgression = { ...state.meta, ...incoming };
      persistLocal(meta);
      return { meta };
    }),
}));
