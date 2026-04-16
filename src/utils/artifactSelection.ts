import { ARTIFACTS, type ArtifactDefinition } from '../data/artifacts';
import { getAscensionMutations } from '../data/ascension';
import { weightedArtifactPick, weightedArtifactPickN } from './weightedSelection';
import type { RunState } from '../types/game';

interface ArtifactPickOptions {
  /** Only legendary rarities (falls back to full pool if none available). */
  legendaryOnly?: boolean;
  /** Boss-tier reward weights (Rare/Legendary only, 25/75). */
  bossReward?: boolean;
}

/**
 * Filter the full artifact list to what's valid for this run: unowned and
 * character-compatible. Corrupt-tagged artifacts are excluded -- they can
 * only be granted by specific events (e.g. Traveling Preacher "Draw").
 * Falls back to the full non-corrupt pool if filtering empties it.
 */
export function getArtifactPoolForRun(run: RunState, opts: ArtifactPickOptions = {}): ArtifactDefinition[] {
  const ownedIds = new Set(run.artifacts.map((a) => a.id));
  const nonCorrupt = ARTIFACTS.filter((a) => !a.tags.includes('corrupt'));
  const available = nonCorrupt.filter(
    (a) => !ownedIds.has(a.id) && (!a.exclusive || a.exclusive === run.character),
  );
  let pool = available.length > 0 ? available : nonCorrupt;
  if (opts.legendaryOnly) {
    const legendaries = pool.filter((a) => a.rarity === 'legendary');
    if (legendaries.length > 0) pool = legendaries;
  }
  return pool;
}

/** Pick one artifact for the given run using weighted rarity selection. */
export function pickArtifactForRun(
  run: RunState,
  rand: () => number,
  opts: ArtifactPickOptions = {},
): ArtifactDefinition {
  const pool = getArtifactPoolForRun(run, opts);
  const desperadoActive = (run.traitCounts?.desperado ?? 0) >= 2;
  const legendaryWeight = getAscensionMutations(run.ascensionLevel).legendaryWeight;
  return weightedArtifactPick(pool, rand, desperadoActive, opts.bossReward ?? false, legendaryWeight);
}

/** Pick N unique artifacts for the given run using weighted rarity selection. */
export function pickArtifactsForRun(
  run: RunState,
  count: number,
  rand: () => number,
  opts: ArtifactPickOptions = {},
): ArtifactDefinition[] {
  const pool = getArtifactPoolForRun(run, opts);
  const desperadoActive = (run.traitCounts?.desperado ?? 0) >= 2;
  const legendaryWeight = getAscensionMutations(run.ascensionLevel).legendaryWeight;
  return weightedArtifactPickN(pool, count, rand, desperadoActive, legendaryWeight, opts.bossReward ?? false);
}
