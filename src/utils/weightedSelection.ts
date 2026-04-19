import type { ArtifactRarity } from '../data/artifacts';

/** Default rarity weights. Higher weight = more likely to appear. */
const BASE_RARITY_WEIGHTS: Record<ArtifactRarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 12,
  legendary: 3,
  corrupt: 0,
};

/** Boss reward weights -- bosses only drop Rare or Legendary. */
const BASE_BOSS_RARITY_WEIGHTS: Record<ArtifactRarity, number> = {
  common: 0,
  uncommon: 0,
  rare: 25,
  legendary: 75,
  corrupt: 0,
};

/**
 * Build weight tables with overrides (e.g. for Wanted Level L20 lowering legendary).
 */
function buildWeights(
  base: Record<ArtifactRarity, number>,
  legendaryWeightOverride?: number,
): Record<ArtifactRarity, number> {
  if (legendaryWeightOverride == null) return base;
  return { ...base, legendary: legendaryWeightOverride };
}

/**
 * Pick one artifact from a pool using weighted rarity selection.
 * Desperado(2) doubles the weight of desperado-tagged artifacts.
 * `bossReward = true` restricts the pool to Rare/Legendary with 25/75 weights.
 * `legendaryWeightOverride` lets Wanted Level L20 lower the legendary weight.
 */
export function weightedArtifactPick<T extends { rarity?: ArtifactRarity; tags: string[] }>(
  pool: T[],
  rand: () => number,
  desperadoActive = false,
  bossReward = false,
  legendaryWeightOverride?: number,
): T {
  if (pool.length <= 1) return pool[0];

  // Boss rewards: restrict to Rare/Legendary if any are available, otherwise
  // fall back to the full pool so the player still gets something.
  let effectivePool = pool;
  if (bossReward) {
    const rareOrLegendary = pool.filter((a) => a.rarity === 'rare' || a.rarity === 'legendary');
    if (rareOrLegendary.length > 0) effectivePool = rareOrLegendary;
  }
  if (effectivePool.length === 1) return effectivePool[0];

  const weightTable = buildWeights(
    bossReward ? BASE_BOSS_RARITY_WEIGHTS : BASE_RARITY_WEIGHTS,
    legendaryWeightOverride,
  );
  const weights = effectivePool.map((a) => {
    let w = weightTable[a.rarity ?? 'common'];
    if (desperadoActive && a.tags.includes('desperado')) w *= 2;
    return w;
  });

  const total = weights.reduce((sum, w) => sum + w, 0);
  // When every entry has weight 0 (e.g. a pool of all-Corrupt artifacts from a
  // tag filter, since Corrupt has base weight 0 to keep it out of normal rolls),
  // fall back to uniform selection instead of always returning the first item.
  if (total <= 0) return effectivePool[Math.floor(rand() * effectivePool.length)];
  let roll = rand() * total;
  for (let i = 0; i < effectivePool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return effectivePool[i];
  }
  return effectivePool[effectivePool.length - 1];
}

/**
 * Pick N unique artifacts from a pool using weighted rarity selection.
 */
export function weightedArtifactPickN<T extends { rarity?: ArtifactRarity; tags: string[] }>(
  pool: T[],
  count: number,
  rand: () => number,
  desperadoActive = false,
  legendaryWeightOverride?: number,
  bossReward = false,
): T[] {
  const remaining = [...pool];
  const picks: T[] = [];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const pick = weightedArtifactPick(remaining, rand, desperadoActive, bossReward, legendaryWeightOverride);
    picks.push(pick);
    remaining.splice(remaining.indexOf(pick), 1);
  }
  return picks;
}
