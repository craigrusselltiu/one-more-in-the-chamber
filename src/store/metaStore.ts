import { create } from 'zustand';
import type { ShopCategory } from '../data/shopItems';

interface MetaProgression {
  reputation: number;
  unlockedArtifacts: string[];
  unlockedEvents: string[];
  unlockedCosmetics: string[];
  unlockedLoadouts: string[];
  unlockedCharacters: string[];
  highestAscensionCleared: number;
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
}

const CATEGORY_KEY: Record<ShopCategory, keyof Pick<MetaProgression, 'unlockedArtifacts' | 'unlockedEvents' | 'unlockedCosmetics' | 'unlockedLoadouts' | 'unlockedCharacters'>> = {
  artifact: 'unlockedArtifacts',
  event: 'unlockedEvents',
  cosmetic: 'unlockedCosmetics',
  loadout: 'unlockedLoadouts',
  character: 'unlockedCharacters',
};

export const useMetaStore = create<MetaStore>((set, get) => ({
  meta: {
    reputation: 0,
    unlockedArtifacts: [],
    unlockedEvents: [],
    unlockedCosmetics: [],
    unlockedLoadouts: [],
    unlockedCharacters: ['red_panda'],
    highestAscensionCleared: 0,
  },

  addReputation: (amount) =>
    set((state) => ({
      meta: { ...state.meta, reputation: state.meta.reputation + amount },
    })),

  spendReputation: (amount) => {
    const { meta } = get();
    if (meta.reputation < amount) return false;
    set((state) => ({
      meta: { ...state.meta, reputation: state.meta.reputation - amount },
    }));
    return true;
  },

  unlockArtifact: (id) =>
    set((state) => {
      if (state.meta.unlockedArtifacts.includes(id)) return state;
      return {
        meta: {
          ...state.meta,
          unlockedArtifacts: [...state.meta.unlockedArtifacts, id],
        },
      };
    }),

  unlockEvent: (id) =>
    set((state) => {
      if (state.meta.unlockedEvents.includes(id)) return state;
      return {
        meta: {
          ...state.meta,
          unlockedEvents: [...state.meta.unlockedEvents, id],
        },
      };
    }),

  unlockCosmetic: (id) =>
    set((state) => {
      if (state.meta.unlockedCosmetics.includes(id)) return state;
      return {
        meta: {
          ...state.meta,
          unlockedCosmetics: [...state.meta.unlockedCosmetics, id],
        },
      };
    }),

  unlockLoadout: (id) =>
    set((state) => {
      if (state.meta.unlockedLoadouts.includes(id)) return state;
      return {
        meta: {
          ...state.meta,
          unlockedLoadouts: [...state.meta.unlockedLoadouts, id],
        },
      };
    }),

  unlockCharacter: (id) =>
    set((state) => {
      if (state.meta.unlockedCharacters.includes(id)) return state;
      return {
        meta: {
          ...state.meta,
          unlockedCharacters: [...state.meta.unlockedCharacters, id],
        },
      };
    }),

  purchaseShopItem: (unlockId, cost, category) => {
    const store = get();
    if (store.isUnlocked(unlockId, category)) return false;
    if (!store.spendReputation(cost)) return false;
    const key = CATEGORY_KEY[category];
    set((state) => ({
      meta: {
        ...state.meta,
        [key]: [...state.meta[key], unlockId],
      },
    }));
    return true;
  },

  isUnlocked: (unlockId, category) => {
    const { meta } = get();
    const key = CATEGORY_KEY[category];
    return meta[key].includes(unlockId);
  },

  setHighestAscension: (level) =>
    set((state) => ({
      meta: {
        ...state.meta,
        highestAscensionCleared: Math.max(state.meta.highestAscensionCleared, level),
      },
    })),
}));
