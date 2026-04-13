/**
 * Leaderboard service: fetches top 10 scores from Supabase by time period.
 * Falls back gracefully when offline or Supabase is not configured.
 */

import { getSupabase } from './supabase';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'all-time';

export interface LeaderboardTile {
  type: string;
  level: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  score: number;
  ascensionLevel: number;
  runCompleted: boolean;
  runDurationSeconds: number;
  character: string;
  tiles: LeaderboardTile[];
  artifacts: string[];
  createdAt: string;
}

/** Get the start-of-period timestamp for filtering. */
function periodStart(period: LeaderboardPeriod): string | null {
  if (period === 'all-time') return null;
  const now = new Date();
  if (period === 'daily') {
    now.setHours(0, 0, 0, 0);
  } else {
    // Weekly: start of current week (Monday)
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
    now.setDate(now.getDate() - diff);
    now.setHours(0, 0, 0, 0);
  }
  return now.toISOString();
}

/** Fetch top 10 scores for a given period. Returns empty array if offline. */
export async function fetchLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];

  let query = sb
    .from('scores')
    .select('final_score, ascension_level, run_completed, run_duration_seconds, character, created_at, player_name, tiles, artifacts')
    .order('final_score', { ascending: false })
    .limit(100);

  const start = periodStart(period);
  if (start) {
    query = query.gte('created_at', start);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row: Record<string, unknown>, i: number) => ({
    rank: i + 1,
    playerName: (row.player_name as string) ?? 'Anonymous',
    score: (row.final_score as number) ?? 0,
    ascensionLevel: (row.ascension_level as number) ?? 0,
    runCompleted: (row.run_completed as boolean) ?? false,
    runDurationSeconds: (row.run_duration_seconds as number) ?? 0,
    character: (row.character as string) ?? 'red_panda',
    tiles: (Array.isArray(row.tiles) ? row.tiles : []) as LeaderboardTile[],
    artifacts: (Array.isArray(row.artifacts) ? row.artifacts : []) as string[],
    createdAt: (row.created_at as string) ?? '',
  }));
}
