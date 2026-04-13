import { create } from 'zustand';
import type { ShopCategory } from '../data/shopItems';

const META_STORAGE_KEY = 'omitc-meta';

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
    if (raw) return { ...DEFAULT_META, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_META };
}

function persistMeta(meta: MetaProgression): void {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
  } catch { /* ignore */ }
}

export const useMetaStore = create<MetaStore>((set, get) => ({
  meta: loadMeta(),

  addReputation: (amount) =>
    set((state) => {
      const meta = { ...state.meta, reputation: state.meta.reputation + amount };
      persistMeta(meta);
      return { meta };
    }),

  spendReputation: (amount) => {
    const { meta } = get();
    if (meta.reputation < amount) return false;
    set((state) => {
      const next = { ...state.meta, reputation: state.meta.reputation - amount };
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
}));
