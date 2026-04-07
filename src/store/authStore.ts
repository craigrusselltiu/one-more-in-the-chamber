/**
 * Reactive auth state store.
 * Mirrors the auth service state so React components can subscribe to changes.
 */

import { create } from 'zustand';

interface AuthStore {
  isLoggedIn: boolean;
  userId: string | null;
  displayName: string | null;
  loading: boolean;

  /** Called by the auth service whenever auth state changes. */
  setAuth: (isLoggedIn: boolean, userId: string | null, displayName: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isLoggedIn: false,
  userId: null,
  displayName: null,
  loading: true,

  setAuth: (isLoggedIn, userId, displayName) =>
    set({ isLoggedIn, userId, displayName, loading: false }),

  setLoading: (loading) => set({ loading }),
}));
