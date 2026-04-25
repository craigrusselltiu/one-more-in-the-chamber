import { getWantedLevelMutations } from '../data/wantedLevel';
import type { TileType } from '../types/game';
import { TILE_DEFINITIONS } from '../data/tiles';

/**
 * Roll a reward tile's starting upgrade level (internal 0-indexed) based on
 * the target act and wanted-level L12 mutation.
 *
 * Base distributions by target act:
 *   Act 1: always level 0 (Lv 1)
 *   Act 2: 80% level 0, 20% level 1             (Lv 1 / Lv 2)
 *   Act 3: 20% level 0, 60% level 1, 20% level 2 (Lv 1 / Lv 2 / Lv 3)
 *
 * L12 mutation -- "Upgraded tiles appear less often":
 *   Act 2: 90% level 0, 10% level 1
 *   Act 3: 50% level 0, 40% level 1, 10% level 2
 *
 * Used by:
 *   - Merchant (targetAct = run.currentAct)
 *   - Act-start tile select (targetAct = run.currentAct)
 */
export function rollTileRewardLevel(
  targetAct: number,
  wantedLevel: number,
  rand: () => number,
  tileType?: TileType,
): number {
  // Non-upgradeable tiles should never roll an upgraded starting level.
  if (tileType && !TILE_DEFINITIONS[tileType]?.upgradeText) return 0;

  const l12 = getWantedLevelMutations(wantedLevel).reducedTileUpgradeFrequency;
  const r = rand();
  if (targetAct <= 1) return 0;
  if (targetAct === 2) {
    const threshold = l12 ? 0.9 : 0.8;
    return r < threshold ? 0 : 1;
  }
  // Act 3+
  if (l12) {
    if (r < 0.5) return 0;
    if (r < 0.9) return 1;
    return 2;
  }
  if (r < 0.2) return 0;
  if (r < 0.8) return 1;
  return 2;
}
