import { memo, useMemo } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import type { Screen } from '../../App';

/**
 * ScoreScreen: end-of-run scoring breakdown.
 * Formula: (Base + Bonus) x Ascension x Time
 */
export const ScoreScreen = memo(function ScoreScreen() {
  const run = useRunStore((s) => s.run);
  const endRun = useRunStore((s) => s.endRun);

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
    const baseScore = baseCombat + baseElite + baseBoss + baseComplete;

    // Bonus: gold earned, artifacts, trait breakpoints
    const goldBonus = run.gold;
    const artifactBonus = run.artifacts.length * 50;
    const traitBonus = Object.values(run.traitCounts).reduce((sum, v) => sum + (v ?? 0), 0) * 25;
    const bonusPoints = goldBonus + artifactBonus + traitBonus;

    // Multipliers
    const ascensionMultiplier = 1.0 + 0.2 * run.ascensionLevel;
    const timeBonus = 1.0; // No timer tracking yet

    const finalScore = Math.round((baseScore + bonusPoints) * ascensionMultiplier * timeBonus);

    return {
      baseScore,
      bonusPoints,
      ascensionMultiplier,
      timeBonus,
      finalScore,
      nodesVisited,
      bossNodes,
      combatNodes,
      eliteNodes,
      completed,
      gold: run.gold,
      artifacts: run.artifacts.length,
    };
  }, [run]);

  const handleMainMenu = () => {
    endRun(score?.completed ?? false);
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
    <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e]/95">
      <h2 className="text-2xl text-amber-400 font-mono mb-1">
        {score.completed ? 'Victory' : 'Defeat'}
      </h2>
      <p className="text-stone-400 font-mono text-xs mb-6">
        {score.completed
          ? 'The West remembers your name.'
          : 'The trail claims another soul.'}
      </p>

      {/* Score breakdown */}
      <div className="w-72 border border-stone-600 bg-stone-800/50 p-4 mb-4">
        <div className="flex flex-col gap-1.5">
          <ScoreLine label="Combat" value={score.combatNodes * 100} detail={`${score.combatNodes} fights`} />
          <ScoreLine label="Elites" value={score.eliteNodes * 200} detail={`${score.eliteNodes} elites`} />
          <ScoreLine label="Bosses" value={score.bossNodes * 500} detail={`${score.bossNodes} bosses`} />
          {score.completed && <ScoreLine label="Run Complete" value={1000} />}

          <div className="border-t border-stone-600 my-1" />

          <ScoreLine label="Gold held" value={score.gold} />
          <ScoreLine label="Artifacts" value={score.artifacts * 50} detail={`${score.artifacts} collected`} />
          <ScoreLine label="Traits" value={score.bonusPoints - score.gold - score.artifacts * 50} />

          <div className="border-t border-stone-600 my-1" />

          {run.ascensionLevel > 0 && (
            <ScoreLine
              label="Ascension"
              value={`x${score.ascensionMultiplier.toFixed(1)}`}
              isMultiplier
            />
          )}
        </div>
      </div>

      {/* Final score */}
      <div className="w-72 border-2 border-amber-700 bg-amber-900/20 p-3 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-amber-300 font-mono text-sm font-bold">FINAL SCORE</span>
          <span className="text-amber-400 font-mono text-xl font-bold">
            {score.finalScore.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 mb-6">
        <StatBadge label="Nodes" value={score.nodesVisited} />
        <StatBadge label="Act" value={run.currentAct} />
        <StatBadge label="HP" value={`${run.health}/${run.maxHealth}`} />
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

function StatBadge({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-stone-200 font-mono text-sm font-bold">{value}</span>
      <span className="text-stone-500 font-mono" style={{ fontSize: '10px' }}>{label}</span>
    </div>
  );
}
