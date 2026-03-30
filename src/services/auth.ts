/**
 * Authentication service.
 * Handles login/signup via Supabase (email + Google).
 * TODO: implement when Supabase is configured.
 */

export interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  displayName: string | null;
}

const authState: AuthState = {
  isLoggedIn: false,
  userId: null,
  displayName: null,
};

export function getAuthState(): AuthState {
  return authState;
}

export async function loginWithEmail(_email: string, _password: string): Promise<boolean> {
  // TODO: Supabase auth
  return false;
}

export async function loginWithGoogle(): Promise<boolean> {
  // TODO: Supabase OAuth
  return false;
}

export async function logout(): Promise<void> {
  authState.isLoggedIn = false;
  authState.userId = null;
  authState.displayName = null;
}
