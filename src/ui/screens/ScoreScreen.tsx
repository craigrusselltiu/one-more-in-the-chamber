import { memo, useEffect, useMemo, useRef } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { useMetaStore } from '../../store/metaStore';
import { saveScore } from '../../services/localSave';
import { pushScore } from '../../services/syncService';
import type { Screen } from '../../App';

/**
 * Compute the time multiplier for scoring.
 * <=45 min: 1.5x, linear to 1.0x at 90 min, continues decreasing to 0.5x at 180 min.
 */
function computeTimeMultiplier(durationSeconds: number): number {
  const MIN_45 = 45 * 60;
  const MIN_90 = 90 * 60;
  const MIN_180 = 180 * 60;
  if (durationSeconds <= MIN_45) return 1.5;
  if (durationSeconds <= MIN_90) return 1.5 - 0.5 * (durationSeconds - MIN_45) / (MIN_90 - MIN_45);
  if (durationSeconds >= MIN_180) return 0.5;
  return 1.0 - 0.5 * (durationSeconds - MIN_90) / (MIN_180 - MIN_90);
}

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

    // Base scoring
    const nodesVisited = run.mapState?.nodes.filter((n) => n.visited).length ?? 0;
    const combatNodes = run.mapState?.nodes.filter((n) => n.visited && n.type === 'combat').length ?? 0;
    const eliteNodes = run.mapState?.nodes.filter((n) => n.visited && n.type === 'elite').length ?? 0;
    const bossNodes = run.mapState?.nodes.filter((n) => n.visited && n.type === 'boss').length ?? 0;

    const baseCombat = combatNodes * 100;
    const baseElite = eliteNodes * 200;
    const baseBoss = bossNodes * 500;
    const baseComplete = completed ? 1000 : 0;
    const actBonus = (run.currentAct - 1) * 200;
    const otherNodes = nodesVisited - combatNodes - eliteNodes - bossNodes;
    const nodeBonus = otherNodes * 50;
    const baseScore = baseCombat + baseElite + baseBoss + baseComplete + actBonus + nodeBonus;

    // Bonus: gold earned, artifacts, trait breakpoints, damage dealt, cascade, flawless
    const goldBonus = run.gold;
    const artifactBonus = run.artifacts.length * 50;
    const traitBonus = Object.values(run.traitCounts).reduce((sum, v) => sum + (v ?? 0), 0) * 25;
    const damageBonus = Math.floor((run.totalDamageDealt ?? 0) / 10);
    const cascadeBonus = (run.longestCascade ?? 0) * 50;
    const flawlessBonus = (run.flawlessFights ?? 0) * 150;
    const bonusPoints = goldBonus + artifactBonus + traitBonus + damageBonus + cascadeBonus + flawlessBonus;

    // Multipliers
    const ascensionMultiplier = 1.0 + 0.2 * run.ascensionLevel;
    const runDurationSeconds = Math.floor((Date.now() - run.runStartedAt) / 1000);
    const timeMultiplier = computeTimeMultiplier(runDurationSeconds);

    const finalScore = Math.round((baseScore + bonusPoints) * ascensionMultiplier * timeMultiplier);

    return {
      baseScore,
      bonusPoints,
      ascensionMultiplier,
      timeMultiplier,
      finalScore,
      runDurationSeconds,
      nodesVisited,
      bossNodes,
      combatNodes,
      eliteNodes,
      completed,
      gold: run.gold,
      artifacts: run.artifacts.length,
      act: run.currentAct,
      actBonus,
      otherNodes,
      nodeBonus,
      damageBonus,
      totalDamageDealt: run.totalDamageDealt ?? 0,
      cascadeBonus,
      longestCascade: run.longestCascade ?? 0,
      flawlessBonus,
      flawlessFights: run.flawlessFights ?? 0,
    };
  }, [run]);

  // Persist score to IndexedDB and push to Supabase (fire-and-forget)
  const submittedRef = useRef(false);
  useEffect(() => {
    if (!run || !score || submittedRef.current) return;
    submittedRef.current = true;

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
      nodesCleared: score.nodesVisited,
      bossesDefeated: score.bossNodes,
      runCompleted: score.completed,
      createdAt: new Date().toISOString(),
    };

    saveScore(record).catch(console.error);
    pushScore(record).catch(console.error);
  }, [run, score]);

  const handleMainMenu = () => {
    const completed = score?.completed ?? false;
    if (completed && run) {
      setHighestAscension(run.ascensionLevel);
    }
    // Award reputation based on score (SPEC: "Reputation earned per run based on score")
    if (score) {
      const rep = Math.max(10, Math.floor(score.finalScore / 10));
      addReputation(rep);
    }
    endRun(completed);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  if (!run || !score) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e]/90">
        <p className="text-stone-400 font-mono text-sm">No run data</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e]/95 px-8">
      <h2 className="text-xl text-amber-400 font-mono mb-0.5">
        {score.completed ? 'Victory' : 'Defeat'}
      </h2>
      <p className="text-stone-400 font-mono mb-4" style={{ fontSize: '10px' }}>
        {score.completed
          ? 'The West remembers your name.'
          : 'The trail claims another soul.'}
      </p>

      {/* Score breakdown */}
      <div className="w-64 border border-stone-600 bg-stone-800/50 p-3 mb-3">
        <div className="flex flex-col gap-1.5">
          <ScoreLine label="Combat" value={score.combatNodes * 100} detail={`${score.combatNodes} fights`} />
          <ScoreLine label="Elites" value={score.eliteNodes * 200} detail={`${score.eliteNodes} elites`} />
          <ScoreLine label="Bosses" value={score.bossNodes * 500} detail={`${score.bossNodes} bosses`} />
          {score.actBonus > 0 && <ScoreLine label="Act Reached" value={score.actBonus} detail={`Act ${score.act}`} />}
          {score.nodeBonus > 0 && <ScoreLine label="Explored" value={score.nodeBonus} detail={`${score.otherNodes} nodes`} />}
          {score.completed && <ScoreLine label="Run Complete" value={1000} />}

          <div className="border-t border-stone-600 my-1" />

          <ScoreLine label="Gold held" value={score.gold} />
          <ScoreLine label="Artifacts" value={score.artifacts * 50} detail={`${score.artifacts} collected`} />
          <ScoreLine label="Damage" value={score.damageBonus} detail={`${score.totalDamageDealt} dealt`} />
          {score.cascadeBonus > 0 && <ScoreLine label="Cascade" value={score.cascadeBonus} detail={`${score.longestCascade} chain`} />}
          {score.flawlessBonus > 0 && <ScoreLine label="Flawless" value={score.flawlessBonus} detail={`${score.flawlessFights} fights`} />}
          <ScoreLine label="Traits" value={score.bonusPoints - score.gold - score.artifacts * 50 - score.damageBonus - score.cascadeBonus - score.flawlessBonus} />

          <div className="border-t border-stone-600 my-1" />

          {run.ascensionLevel > 0 && (
            <ScoreLine
              label="Ascension"
              value={`x${score.ascensionMultiplier.toFixed(1)}`}
              isMultiplier
            />
          )}
          <ScoreLine
            label="Time"
            value={`x${score.timeMultiplier.toFixed(2)}`}
            detail={formatDuration(score.runDurationSeconds)}
            isMultiplier
          />
        </div>
      </div>

      {/* Final score */}
      <div className="w-64 border-2 border-amber-700 bg-amber-900/20 p-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-amber-300 font-mono text-xs font-bold">FINAL SCORE</span>
          <span className="text-amber-400 font-mono text-lg font-bold">
            {score.finalScore.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Reputation earned */}
      <div className="w-64 flex items-center justify-between mb-4 px-1">
        <span className="text-stone-400 font-mono text-xs">Reputation earned</span>
        <span className="text-amber-300 font-mono text-xs font-bold">
          +{Math.max(10, Math.floor(score.finalScore / 10)).toLocaleString()}
        </span>
      </div>

      <button
        onClick={handleMainMenu}
        className="px-6 py-2 bg-amber-900/60 text-amber-300 font-mono text-sm border border-amber-700 hover:bg-amber-800/60"
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
        <span className="text-stone-400 font-mono text-xs">{label}</span>
        {detail && <span className="text-stone-500 font-mono" style={{ fontSize: '10px' }}>({detail})</span>}
      </div>
      <span className={`font-mono text-xs ${isMultiplier ? 'text-blue-300' : 'text-stone-200'}`}>
        {typeof value === 'number' ? (value > 0 ? `+${value}` : value.toString()) : value}
      </span>
    </div>
  );
}
