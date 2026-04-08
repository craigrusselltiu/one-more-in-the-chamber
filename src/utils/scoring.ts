import type { RunState } from '../types/game';

/** Calculate final score for a run. Used by ScoreScreen and MainMenu (abandon). */
export function calculateScore(run: RunState): number {
  const completed = run.status === 'completed';

  const nodesCompleted = run.mapState?.nodes.filter((n) => n.completed).length ?? 0;
  const combatNodes = run.mapState?.nodes.filter((n) => n.completed && n.type === 'combat').length ?? 0;
  const eliteNodes = run.mapState?.nodes.filter((n) => n.completed && n.type === 'elite').length ?? 0;
  const bossNodes = run.bossesDefeated ?? 0;

  const baseCombat = combatNodes * 100;
  const baseElite = eliteNodes * 200;
  const baseBoss = bossNodes * 500;
  const baseComplete = completed ? 1000 : 0;
  const actBonus = (run.currentAct - 1) * 200;
  const otherNodes = nodesCompleted - combatNodes - eliteNodes - bossNodes;
  const nodeBonus = otherNodes * 50;
  const baseScore = baseCombat + baseElite + baseBoss + baseComplete + actBonus + nodeBonus;

  const goldBonus = run.gold;
  const artifactBonus = run.artifacts.length * 50;
  const traitBonus = Object.values(run.traitCounts).reduce((sum, v) => sum + (v ?? 0), 0) * 25;
  const damageBonus = Math.floor((run.totalDamageDealt ?? 0) / 10);
  const cascadeBonus = (run.longestCascade ?? 0) * 50;
  const flawlessBonus = (run.flawlessFights ?? 0) * 150;
  const bonusPoints = goldBonus + artifactBonus + traitBonus + damageBonus + cascadeBonus + flawlessBonus;

  const ascensionMultiplier = 1.0 + 0.2 * run.ascensionLevel;
  const timeMultiplier = completed ? computeTimeMultiplier(run.playTimeSeconds ?? 0) : 1.0;

  return Math.round((baseScore + bonusPoints) * ascensionMultiplier * timeMultiplier);
}

function computeTimeMultiplier(durationSeconds: number): number {
  const MIN_45 = 45 * 60;
  const MIN_90 = 90 * 60;
  const MIN_180 = 180 * 60;
  if (durationSeconds <= MIN_45) return 1.5;
  if (durationSeconds <= MIN_90) return 1.5 - 0.5 * (durationSeconds - MIN_45) / (MIN_90 - MIN_45);
  if (durationSeconds >= MIN_180) return 0.5;
  return 1.0 - 0.5 * (durationSeconds - MIN_90) / (MIN_180 - MIN_90);
}
