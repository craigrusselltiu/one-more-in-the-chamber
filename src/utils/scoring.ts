import type { RunState } from '../types/game';

/** Combo multiplier capped at 3.0x, derived from longest cascade step (step 1 = 1.0x). */
export function comboMultiplierFromStep(step: number): number {
  if (step <= 1) return 1.0;
  return Math.min(3.0, 1 + (step - 1) * 0.1);
}

/** Calculate final score for a run. Used by ScoreScreen and MainMenu (abandon). */
export function calculateScore(run: RunState): number {
  const completed = run.status === 'completed';

  const combatBonus = (run.combatsCleared ?? 0) * 100;
  const eliteBonus = (run.elitesCleared ?? 0) * 250;
  const bossBonus = (run.bossesDefeated ?? 0) * 500;
  const flawlessBonus = (run.flawlessFights ?? 0) * 100;
  const baseScore = combatBonus + eliteBonus + bossBonus + flawlessBonus;

  const goldBonus = run.goldObtained ?? 0;
  const artifactBonus = (run.artifactsObtained ?? 0) * 50;
  const damageBonus = Math.floor((run.totalDamageDealt ?? 0) / 5);
  const maxCombo = comboMultiplierFromStep(run.longestCascade ?? 0);
  const comboBonus = Math.round((maxCombo - 1.0) * 1000);
  const bonusPoints = goldBonus + artifactBonus + damageBonus + comboBonus;

  // Ascension multiplier always applies; time + completion bonus only on a win.
  const ascensionMultiplier = 1.0 + 0.05 * run.ascensionLevel;
  const timeMultiplier = completed ? computeTimeMultiplier(run.playTimeSeconds ?? 0) : 1.0;
  const completionMultiplier = completed ? 2.0 : 1.0;

  return Math.round((baseScore + bonusPoints) * ascensionMultiplier * timeMultiplier * completionMultiplier);
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
