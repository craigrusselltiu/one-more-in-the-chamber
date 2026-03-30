import { create } from 'zustand';

interface MetaProgression {
  reputation: number;
  unlockedArtifacts: string[];
  unlockedCosmetics: string[];
  unlockedLoadouts: string[];
  unlockedCharacters: string[];
  highestAscensionCleared: number;
}

interface MetaStore {
  meta: MetaProgression;
  addReputation: (amount: number) => void;
  unlockArtifact: (id: string) => void;
  unlockCharacter: (id: string) => void;
  setHighestAscension: (level: number) => void;
}

export const useMetaStore = create<MetaStore>((set) => ({
  meta: {
    reputation: 0,
    unlockedArtifacts: [],
    unlockedCosmetics: [],
    unlockedLoadouts: [],
    unlockedCharacters: ['red_panda'],
    highestAscensionCleared: 0,
  },

  addReputation: (amount) =>
    set((state) => ({
      meta: { ...state.meta, reputation: state.meta.reputation + amount },
    })),

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

  setHighestAscension: (level) =>
    set((state) => ({
      meta: {
        ...state.meta,
        highestAscensionCleared: Math.max(state.meta.highestAscensionCleared, level),
      },
    })),
}));
