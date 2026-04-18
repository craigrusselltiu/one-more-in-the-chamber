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
 * Formula: (Base + Bonus) x Ascension x Time
 */
export const ScoreScreen = memo(function ScoreScreen() {
  const run = useRunStore((s) => s.run);
  const endRun = useRunStore((s) => s.endRun);
  const setHighestAscension = useMetaStore((s) => s.setHighestAscension);
  const addReputation = useMetaStore((s) => s.addReputation);

  const score = useMemo(() => {
    if (!run) return null;

    const completed = run.status === 'completed';

    const combatsCleared = run.combatsCleared ?? 0;
    const elitesCleared = run.elitesCleared ?? 0;
    const bossesDefeated = run.bossesDefeated ?? 0;
    const flawlessFights = run.flawlessFights ?? 0;

    const combatBonus = combatsCleared * 100;
    const eliteBonus = elitesCleared * 250;
    const bossBonus = bossesDefeated * 500;
    const flawlessBonus = flawlessFights * 100;
    const baseScore = combatBonus + eliteBonus + bossBonus + flawlessBonus;

    const goldObtained = run.goldObtained ?? 0;
    const artifactCount = run.artifactsObtained ?? 0;
    const artifactBonus = artifactCount * 50;
    const totalDamageDealt = run.totalDamageDealt ?? 0;
    const damageBonus = Math.floor(totalDamageDealt / 5);
    const maxComboMultiplier = comboMultiplierFromStep(run.longestCascade ?? 0);
    const comboBonus = Math.round((maxComboMultiplier - 1.0) * 1000);
    const bonusPoints = goldObtained + artifactBonus + damageBonus + comboBonus;

    const ascensionMultiplier = 1.0 + 0.05 * run.ascensionLevel;
    const timeMultiplier = completed ? computeTimeMultiplier(run.playTimeSeconds ?? 0) : 1.0;
    const completionMultiplier = completed ? 2.0 : 1.0;

    const finalScore = Math.round((baseScore + bonusPoints) * ascensionMultiplier * timeMultiplier * completionMultiplier);

    return {
      baseScore,
      bonusPoints,
      ascensionMultiplier,
      timeMultiplier,
      completionMultiplier,
      finalScore,
      runDurationSeconds: run.playTimeSeconds ?? 0,
      combatsCleared,
      elitesCleared,
      bossesDefeated,
      flawlessFights,
      combatBonus,
      eliteBonus,
      bossBonus,
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

    const tiles = (run.activeTileTypes ?? []).map((t: string) => ({
      type: t,
      level: (run.tileUpgrades as Record<string, number>)?.[t] ?? 0,
    }));
    const artifactIds = (run.artifacts ?? []).map((a: { id: string }) => a.id);
    const record = {
      id: crypto.randomUUID(),
      runId: run.id,
      character: run.character,
      ascensionLevel: run.ascensionLevel,
      baseScore: score.baseScore,
      bonusPoints: score.bonusPoints,
      ascensionMultiplier: score.ascensionMultiplier,
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
    if (completed && run) {
      setHighestAscension(run.ascensionLevel);
    }
    if (score) {
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
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${import.meta.env.BASE_URL}assets/backgrounds/${score.completed ? 'victory' : 'defeat'}.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <h2 className="text-xl text-amber-400 mb-0.5 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>
        {score.completed ? 'Victory' : 'Defeat'}
      </h2>
      <p className="text-stone-400 mb-4" style={{ fontSize: '10px' }}>
        {score.completed
          ? 'The West remembers your name.'
          : 'The trail claims another soul.'}
      </p>

      {/* Score breakdown */}
      <div className="w-64 border border-stone-600 bg-stone-800/50 p-3 mb-3">
        <div className="flex flex-col gap-1.5">
          <ScoreLine label="Combats" value={score.combatBonus} detail={`${score.combatsCleared} cleared`} />
          <ScoreLine label="Elites" value={score.eliteBonus} detail={`${score.elitesCleared} cleared`} />
          <ScoreLine label="Bosses" value={score.bossBonus} detail={`${score.bossesDefeated} cleared`} />
          <ScoreLine label="Flawless" value={score.flawlessBonus} detail={`${score.flawlessFights} fights`} />

          <div className="border-t border-stone-600 my-1" />

          <ScoreLine label="Gold Obtained" value={score.goldObtained} detail={`${score.goldObtained} gold`} />
          <ScoreLine label="Artifacts" value={score.artifactBonus} detail={`${score.artifactCount} obtained`} />
          <ScoreLine label="Damage" value={score.damageBonus} detail={`${score.totalDamageDealt} dealt`} />
          <ScoreLine label="Max Combo" value={score.comboBonus} detail={`${score.maxComboMultiplier.toFixed(1)}x`} />

          <div className="border-t border-stone-600 my-1" />

          <ScoreLine
            label="Ascension"
            value={`x${score.ascensionMultiplier.toFixed(2)}`}
            detail={`Level ${run.ascensionLevel}`}
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
        className="px-6 py-2 bg-amber-900/60 text-amber-300 text-sm border border-amber-700 hover:bg-amber-800/60"
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
        <span className="text-stone-400 text-xs">{label}</span>
        {detail && <span className="text-stone-500" style={{ fontSize: '10px' }}>({detail})</span>}
      </div>
      <span className={`font-mono text-xs ${isMultiplier ? 'text-blue-300' : 'text-stone-200'}`}>
        {typeof value === 'number' ? (value > 0 ? `+${value}` : value.toString()) : value}
      </span>
    </div>
  );
}
