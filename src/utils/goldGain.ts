import type { ArtifactInstance } from '../types/game';

export function getArtifactGoldGainMultiplier(artifacts: Pick<ArtifactInstance, 'id' | 'used'>[]): number {
  const activeIds = new Set(artifacts.filter((artifact) => !artifact.used).map((artifact) => artifact.id));
  let multiplier = 1;
  if (activeIds.has('golden_scarab')) multiplier += 0.3;
  if (activeIds.has('golden_pickaxe')) multiplier += 0.1;
  if (activeIds.has('greed')) multiplier -= 0.1;
  return Math.max(0, multiplier);
}

export function applyArtifactGoldGainModifier(
  amount: number,
  artifacts: Pick<ArtifactInstance, 'id' | 'used'>[],
): number {
  if (amount <= 0) return amount;
  return Math.max(1, Math.round(amount * getArtifactGoldGainMultiplier(artifacts)));
}
