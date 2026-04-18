/**
 * Leaderboard service: fetches top 10 scores from Supabase by time period.
 * Falls back gracefully when offline or Supabase is not configured.
 */

import { getSupabase } from './supabase';
import { withSyncIndicator } from './syncService';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'all-time';

export interface LeaderboardTile {
  type: string;
  level: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  /** True when the score was posted by a guest (no authenticated account). */
  isGuest: boolean;
  score: number;
  ascensionLevel: number;
  runCompleted: boolean;
  runDurationSeconds: number;
  character: string;
  tiles: LeaderboardTile[];
  artifacts: string[];
  /** What killed the player on defeat (enemy name or event title). Null for completed runs. */
  killedBy: string | null;
  /** Player's currently equipped cosmetics (pulled from meta_progression at fetch time, so equipping retroactively updates all past entries). Null when unequipped or guest. */
  equippedNameplate: string | null;
  equippedColour: string | null;
  equippedTitle: string | null;
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

  return withSyncIndicator(async () => {
    let query = sb
      .from('scores')
      .select('final_score, ascension_level, run_completed, run_duration_seconds, character, created_at, player_id, player_name, tiles, artifacts, killed_by')
      .order('final_score', { ascending: false })
      .limit(100);

    const start = periodStart(period);
    if (start) {
      query = query.gte('created_at', start);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    // Second fetch: the player's currently equipped cosmetics, resolved at
    // render time so equipping a new nameplate retroactively changes the
    // look of every past entry. The `player_equipped_cosmetics` view exposes
    // only the three cosmetic columns and is publicly readable; the rest of
    // meta_progression stays owner-only.
    const playerIds = Array.from(
      new Set(
        data
          .map((r: Record<string, unknown>) => r.player_id as string | null | undefined)
          .filter((id): id is string => !!id),
      ),
    );
    const cosmeticsById = new Map<string, { nameplate: string | null; colour: string | null; title: string | null }>();
    if (playerIds.length > 0) {
      const { data: cosmeticRows } = await sb
        .from('player_equipped_cosmetics')
        .select('player_id, equipped_nameplate, equipped_colour, equipped_title')
        .in('player_id', playerIds);
      for (const row of (cosmeticRows ?? []) as Array<Record<string, unknown>>) {
        cosmeticsById.set(row.player_id as string, {
          nameplate: (row.equipped_nameplate as string | null | undefined) ?? null,
          colour: (row.equipped_colour as string | null | undefined) ?? null,
          title: (row.equipped_title as string | null | undefined) ?? null,
        });
      }
    }
    return mapLeaderboardRows(data, cosmeticsById);
  });
}

function mapLeaderboardRows(
  data: Array<Record<string, unknown>>,
  cosmeticsById: Map<string, { nameplate: string | null; colour: string | null; title: string | null }>,
): LeaderboardEntry[] {
  return data.map((row: Record<string, unknown>, i: number) => {
    const playerId = row.player_id as string | null | undefined;
    const cosmetics = playerId ? cosmeticsById.get(playerId) : undefined;
    return {
      rank: i + 1,
      playerName: (row.player_name as string) ?? 'Anonymous',
      isGuest: row.player_id == null,
      score: (row.final_score as number) ?? 0,
      ascensionLevel: (row.ascension_level as number) ?? 0,
      runCompleted: (row.run_completed as boolean) ?? false,
      runDurationSeconds: (row.run_duration_seconds as number) ?? 0,
      character: (row.character as string) ?? 'red_panda',
      tiles: (Array.isArray(row.tiles) ? row.tiles : []) as LeaderboardTile[],
      artifacts: (Array.isArray(row.artifacts) ? row.artifacts : []) as string[],
      killedBy: (row.killed_by as string | null | undefined) ?? null,
      equippedNameplate: cosmetics?.nameplate ?? null,
      equippedColour: cosmetics?.colour ?? null,
      equippedTitle: cosmetics?.title ?? null,
      createdAt: (row.created_at as string) ?? '',
    };
  });
}
