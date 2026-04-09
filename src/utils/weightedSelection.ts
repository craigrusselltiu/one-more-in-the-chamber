import type { ArtifactRarity } from '../data/artifacts';

/** Default rarity weights. Higher weight = more likely to appear. */
const RARITY_WEIGHTS: Record<ArtifactRarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 12,
  legendary: 3,
};

/**
 * Pick one artifact from a pool using weighted rarity selection.
 * Desperado(2) doubles the weight of desperado-tagged artifacts.
 */
export function weightedArtifactPick<T extends { rarity?: ArtifactRarity; tags: string[] }>(
  pool: T[],
  rand: () => number,
  desperadoActive = false,
): T {
  if (pool.length <= 1) return pool[0];

  const weights = pool.map((a) => {
    let w = RARITY_WEIGHTS[a.rarity ?? 'common'];
    if (desperadoActive && a.tags.includes('desperado')) w *= 2;
    return w;
  });

  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rand() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/**
 * Pick N unique artifacts from a pool using weighted rarity selection.
 */
export function weightedArtifactPickN<T extends { rarity?: ArtifactRarity; tags: string[] }>(
  pool: T[],
  count: number,
  rand: () => number,
  desperadoActive = false,
): T[] {
  const remaining = [...pool];
  const picks: T[] = [];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const pick = weightedArtifactPick(remaining, rand, desperadoActive);
    picks.push(pick);
    remaining.splice(remaining.indexOf(pick), 1);
  }
  return picks;
}
