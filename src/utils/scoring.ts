import type { RunState } from '../types/game';

/** Finite-number guard. Null/undefined/NaN/Infinity all fall back. */
function n(x: unknown, fallback = 0): number {
  return typeof x === 'number' && Number.isFinite(x) ? x : fallback;
}

/** Combo multiplier capped at 3.0x, derived from longest cascade step (step 1 = 1.0x). */
export function comboMultiplierFromStep(step: number): number {
  const s = n(step, 0);
  if (s <= 1) return 1.0;
  return Math.min(3.0, 1 + (s - 1) * 0.1);
}

/** Calculate final score for a run. Used by ScoreScreen and MainMenu (abandon).
 *  All run fields are read through `n()` so a missing or corrupt field can
 *  never produce NaN downstream. */
export function calculateScore(run: RunState): number {
  const completed = run.status === 'completed';

  const combatBonus = n(run.combatsCleared) * 100;
  const eliteBonus = n(run.elitesCleared) * 250;
  const bossBonus = n(run.bossesDefeated) * 500;
  const flawlessBonus = n(run.flawlessFights) * 100;
  const baseScore = combatBonus + eliteBonus + bossBonus + flawlessBonus;

  const goldBonus = n(run.goldObtained);
  const artifactBonus = n(run.artifactsObtained) * 50;
  const damageBonus = Math.floor(n(run.totalDamageDealt) / 5);
  const maxCombo = comboMultiplierFromStep(n(run.longestCascade));
  const comboBonus = Math.round((maxCombo - 1.0) * 1000);
  const bonusPoints = goldBonus + artifactBonus + damageBonus + comboBonus;

  // Wanted-level multiplier always applies; time + completion bonus only on a win.
  const wantedLevelMultiplier = 1.0 + 0.05 * n(run.wantedLevel);
  const timeMultiplier = completed ? computeTimeMultiplier(n(run.playTimeSeconds)) : 1.0;
  const completionMultiplier = completed ? 2.0 : 1.0;

  const raw = (baseScore + bonusPoints) * wantedLevelMultiplier * timeMultiplier * completionMultiplier;
  return Number.isFinite(raw) ? Math.round(raw) : 0;
}

/**
 * Time multiplier: 2.0x at 0h, linear down to 1.0x at 1.5h, floor at 1.0x.
 * Only meaningful on completed runs.
 */
export function computeTimeMultiplier(durationSeconds: number): number {
  const NINETY_MIN = 90 * 60;
  if (durationSeconds <= 0) return 2.0;
  if (durationSeconds >= NINETY_MIN) return 1.0;
  return 2.0 - (durationSeconds / NINETY_MIN);
}
