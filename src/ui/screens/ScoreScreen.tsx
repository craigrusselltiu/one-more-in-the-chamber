import { memo, useEffect, useMemo, useRef } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { useMetaStore } from '../../store/metaStore';
import { saveScore } from '../../services/localSave';
import { pushScore } from '../../services/syncService';
import { computeTimeMultiplier, comboMultiplierFromStep } from '../../utils/scoring';
import type { Screen } from '../../App';

/** Format seconds into MM:SS or H:MM:SS. */
function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * ScoreScreen: end-of-run scoring breakdown.
 * Formula: (Base + Bonus) x Wanted Level x Time
 */
export const ScoreScreen = memo(function ScoreScreen() {
  const run = useRunStore((s) => s.run);
  const endRun = useRunStore((s) => s.endRun);
  const setHighestWantedLevel = useMetaStore((s) => s.setHighestWantedLevel);
  const addReputation = useMetaStore((s) => s.addReputation);

  const score = useMemo(() => {
    if (!run) return null;

    const completed = run.status === 'completed';

    const combatsCleared = run.combatsCleared ?? 0;
    const elitesCleared = run.elitesCleared ?? 0;
    const bossesDefeated = run.bossesDefeated ?? 0;
    const outlawKingsDefeated = run.outlawKingsDefeated ?? 0;
    const flawlessFights = run.flawlessFights ?? 0;

    const combatBonus = combatsCleared * 100;
    const eliteBonus = elitesCleared * 250;
    const bossBonus = bossesDefeated * 500;
    const outlawKingBonus = outlawKingsDefeated * 1000;
    const flawlessBonus = flawlessFights * 100;
    const baseScore = combatBonus + eliteBonus + bossBonus + outlawKingBonus + flawlessBonus;

    const goldObtained = run.goldObtained ?? 0;
    const artifactCount = run.artifactsObtained ?? 0;
    const artifactBonus = artifactCount * 50;
    const totalDamageDealt = run.totalDamageDealt ?? 0;
    const damageBonus = Math.floor(totalDamageDealt / 5);
    const maxComboMultiplier = comboMultiplierFromStep(run.longestCascade ?? 0);
    const comboBonus = Math.round((maxComboMultiplier - 1.0) * 1000);
    const bonusPoints = goldObtained + artifactBonus + damageBonus + comboBonus;

    // Guard every numeric against NaN/undefined so we never push NaN through
    // to Supabase (Postgres stores NaN as NULL on numeric columns, silently
    // losing the score on a downstream leaderboard read).
    const safeNum = (v: unknown, d: number): number =>
      typeof v === 'number' && Number.isFinite(v) ? v : d;
    const wantedLevelSafe = safeNum(run.wantedLevel, 0);
    const wantedLevelMultiplier = 1.0 + 0.05 * wantedLevelSafe;
    const timeMultiplier = completed ? computeTimeMultiplier(safeNum(run.playTimeSeconds, 0)) : 1.0;
    const completionMultiplier = completed ? 2.0 : 1.0;

    const rawFinal = (baseScore + bonusPoints) * wantedLevelMultiplier * timeMultiplier * completionMultiplier;
    const finalScore = Number.isFinite(rawFinal) ? Math.round(rawFinal) : 0;

    return {
      baseScore,
      bonusPoints,
      wantedLevelMultiplier,
      timeMultiplier,
      completionMultiplier,
      finalScore,
      runDurationSeconds: run.playTimeSeconds ?? 0,
      combatsCleared,
      elitesCleared,
      bossesDefeated,
      outlawKingsDefeated,
      flawlessFights,
      combatBonus,
      eliteBonus,
      bossBonus,
      outlawKingBonus,
      flawlessBonus,
      goldObtained,
      artifactCount,
      artifactBonus,
      totalDamageDealt,
      damageBonus,
      maxComboMultiplier,
      comboBonus,
      completed,
    };
  }, [run]);

  // Persist score to IndexedDB and push to Supabase (fire-and-forget)
  const submittedRef = useRef(false);
  useEffect(() => {
    if (!run || !score || submittedRef.current) return;
    submittedRef.current = true;
    if (run.devControlsUsed) return;

    const tiles = (run.activeTileTypes ?? []).map((t: string) => ({
      type: t,
      level: (run.tileUpgrades as Record<string, number>)?.[t] ?? 0,
    }));
    const artifactIds = (run.artifacts ?? []).map((a: { id: string }) => a.id);
    const record = {
      id: crypto.randomUUID(),
      runId: run.id,
      character: run.character,
      wantedLevel: run.wantedLevel,
      baseScore: score.baseScore,
      bonusPoints: score.bonusPoints,
      wantedLevelMultiplier: score.wantedLevelMultiplier,
      timeBonus: score.timeMultiplier,
      finalScore: score.finalScore,
      runDurationSeconds: score.runDurationSeconds,
      nodesCleared: score.combatsCleared + score.elitesCleared + score.bossesDefeated,
      bossesDefeated: score.bossesDefeated,
      runCompleted: score.completed,
      tiles,
      artifacts: artifactIds,
      killedBy: score.completed ? null : (run.deathCause ?? null),
      createdAt: new Date().toISOString(),
    };

    const playerName = useMetaStore.getState().meta.playerName;
    saveScore(record).catch(console.error);
    pushScore(record, playerName).catch(console.error);
  }, [run, score]);

  const handleMainMenu = () => {
    const completed = score?.completed ?? false;
    const devRun = !!run?.devControlsUsed;
    if (completed && run && !devRun) {
      setHighestWantedLevel(run.wantedLevel);
    }
    if (score && !devRun) {
      const rep = Math.floor(score.finalScore / 10);
      if (rep > 0) addReputation(rep);
    }
    endRun(completed);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  if (!run || !score) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e]/90">
        <p className="text-stone-400 text-sm">No run data</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-8"
    >
      <h2 className="text-xl text-amber-400 mb-0.5 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>
        {score.completed ? 'Victory' : 'Defeat'}
      </h2>
      <p
        className="mb-4 uppercase"
        style={{
          fontSize: '10px',
          letterSpacing: '1px',
          color: '#b8b8b8',
          textShadow: '1px 1px 3px rgba(0,0,0,1), 1px 1px 6px rgba(0,0,0,0.95), 1px 1px 9px rgba(0,0,0,0.85)',
        }}
      >
        {score.completed
          ? 'The West remembers your name'
          : 'The trail claims another soul'}
      </p>
      {run.devControlsUsed && (
        <p className="mb-2 text-red-300 font-bold uppercase" style={{ fontSize: '9px' }}>
          Dev Run - Score Not Submitted
        </p>
      )}

      {/* Score breakdown */}
      <div className="w-64 border border-stone-600 bg-stone-800/50 p-3 mb-3">
        <div className="flex flex-col gap-1.5">
          <ScoreLine label="Combats" value={score.combatBonus} detail={`${score.combatsCleared} cleared`} />
          <ScoreLine label="Elites" value={score.eliteBonus} detail={`${score.elitesCleared} cleared`} />
          <ScoreLine label="Bosses" value={score.bossBonus} detail={`${score.bossesDefeated} cleared`} />
          {score.outlawKingsDefeated > 0 && (
            <ScoreLine label="Outlaw King" value={score.outlawKingBonus} detail={`${score.outlawKingsDefeated} killed`} />
          )}
          <ScoreLine label="Flawless" value={score.flawlessBonus} detail={`${score.flawlessFights} fights`} />

          <div className="border-t border-stone-600 my-1" />

          <ScoreLine label="Gold Obtained" value={score.goldObtained} detail={`${score.goldObtained} gold`} />
          <ScoreLine label="Artifacts" value={score.artifactBonus} detail={`${score.artifactCount} obtained`} />
          <ScoreLine label="Damage" value={score.damageBonus} detail={`${score.totalDamageDealt} dealt`} />
          <ScoreLine label="Max Combo" value={score.comboBonus} detail={`${score.maxComboMultiplier.toFixed(1)}x`} />

          <div className="border-t border-stone-600 my-1" />

          <ScoreLine
            label="Wanted Level"
            value={`x${score.wantedLevelMultiplier.toFixed(2)}`}
            detail={`Level ${run.wantedLevel}`}
            isMultiplier
          />
          {score.completed && (
            <ScoreLine
              label="Time"
              value={`x${score.timeMultiplier.toFixed(2)}`}
              detail={formatDuration(score.runDurationSeconds)}
              isMultiplier
            />
          )}
          {score.completed && (
            <ScoreLine
              label="Completion"
              value={`x${score.completionMultiplier.toFixed(2)}`}
              isMultiplier
            />
          )}
        </div>
      </div>

      {/* Final score */}
      <div className="w-64 border-2 border-amber-700 bg-amber-900/20 p-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-amber-300 text-xs font-bold">FINAL SCORE</span>
          <span className="text-amber-400 text-lg font-bold">
            {score.finalScore.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Reputation earned */}
      <div className="w-64 flex items-center justify-between mb-4 px-1">
        <span className="text-stone-400 text-xs">Reputation earned</span>
        <span className="text-amber-300 text-xs font-bold">
          +{Math.floor(score.finalScore / 10).toLocaleString()}
        </span>
      </div>

      <button
        onClick={handleMainMenu}
        style={{
          boxShadow: '2px 2px 1px rgba(0,0,0,0.4)',
          cursor: 'pointer',
          textShadow: '1px 1px 3px rgba(0,0,0,1), 1px 1px 6px rgba(0,0,0,0.95), 1px 1px 9px rgba(0,0,0,0.85)',
        }}
        className="px-3.5 py-1 text-[10px] uppercase rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5 transition-transform"
      >
        Main Menu
      </button>
    </div>
  );
});

function ScoreLine({
  label,
  value,
  detail,
  isMultiplier,
}: {
  label: string;
  value: number | string;
  detail?: string;
  isMultiplier?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-stone-400" style={{ fontSize: '9px' }}>{label}</span>
        {detail && <span className="text-stone-500" style={{ fontSize: '8px' }}>({detail})</span>}
      </div>
      <span className={`font-mono ${isMultiplier ? 'text-blue-300' : 'text-stone-200'}`} style={{ fontSize: '10px' }}>
        {typeof value === 'number' ? (value > 0 ? `+${value}` : value.toString()) : value}
      </span>
    </div>
  );
}
