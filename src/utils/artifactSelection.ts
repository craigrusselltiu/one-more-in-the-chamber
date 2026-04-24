import { ARTIFACTS, type ArtifactDefinition } from '../data/artifacts';
import { getWantedLevelMutations } from '../data/wantedLevel';
import { weightedArtifactPick, weightedArtifactPickN } from './weightedSelection';
import type { RunState, TraitId } from '../types/game';

interface ArtifactPickOptions {
  /** Only legendary rarities (falls back to full pool if none available). */
  legendaryOnly?: boolean;
  /** Boss-tier reward weights (Rare/Legendary only, 25/75). */
  bossReward?: boolean;
}

/**
 * Filter the full artifact list to what's valid for this run: unowned and
 * character-compatible. Corrupt-tagged artifacts are excluded -- they can
 * only be granted by specific events (e.g. Travelling Preacher "Draw").
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
  const legendaryWeight = getWantedLevelMutations(run.wantedLevel).legendaryWeight;
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
  const legendaryWeight = getWantedLevelMutations(run.wantedLevel).legendaryWeight;
  return weightedArtifactPickN(pool, count, rand, desperadoActive, legendaryWeight, opts.bossReward ?? false);
}

/**
 * Pick a single artifact for the given run filtered to a specific tag
 * (e.g. 'rattlesnake', 'preacher', 'corrupt'), using weighted rarity selection.
 * Prefers unowned; falls back to the full tagged pool if every candidate is
 * already owned. Returns null only if no artifact carries the tag.
 *
 * For the 'corrupt' tag, Greed is excluded until after the Bones encounter
 * (and only included if the player doesn't already own it).
 */
export function pickArtifactByTag(
  run: RunState,
  tag: TraitId,
  rand: () => number,
): ArtifactDefinition | null {
  let tagged = ARTIFACTS.filter(
    (a) => a.tags.includes(tag) && (!a.exclusive || a.exclusive === run.character),
  );
  if (tag === 'corrupt') {
    tagged = filterCorruptPool(tagged, run);
  }
  if (tagged.length === 0) return null;
  const ownedIds = new Set(run.artifacts.map((a) => a.id));
  const unowned = tagged.filter((a) => !ownedIds.has(a.id));
  const pool = unowned.length > 0 ? unowned : tagged;
  const desperadoActive = (run.traitCounts?.desperado ?? 0) >= 2;
  const legendaryWeight = getWantedLevelMutations(run.wantedLevel).legendaryWeight;
  return weightedArtifactPick(pool, rand, desperadoActive, false, legendaryWeight);
}

/**
 * Filter the corrupt artifact pool: Greed is excluded until after Bones,
 * and only re-included if the player doesn't already own it.
 */
export function filterCorruptPool(pool: ArtifactDefinition[], run: RunState): ArtifactDefinition[] {
  const ownedIds = new Set(run.artifacts.map((a) => a.id));
  const greedAvailable = run.starterEncountered && !ownedIds.has('greed');
  if (greedAvailable) return pool;
  return pool.filter((a) => a.id !== 'greed');
}
