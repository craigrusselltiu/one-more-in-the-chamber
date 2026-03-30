/**
 * Supabase client initialization.
 * TODO: wire up with actual Supabase URL and anon key.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Placeholder -- replace with real values at deploy time
const config: SupabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL ?? '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
};

export function getSupabaseConfig(): SupabaseConfig {
  return config;
}
