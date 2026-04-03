import { memo, useMemo } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { ARTIFACTS } from '../../data/artifacts';
import type { Screen } from '../../App';

export const TreasureScreen = memo(function TreasureScreen() {
  const run = useRunStore((s) => s.run);
  const addArtifact = useRunStore((s) => s.addArtifact);

  const artifact = useMemo(() => {
    const ownedIds = new Set((run?.artifacts ?? []).map((a) => a.id));
    const available = ARTIFACTS.filter((a) => !ownedIds.has(a.id));
    const pool = available.length > 0 ? available : ARTIFACTS;
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  const handleTake = () => {
    addArtifact({ id: artifact.id, tags: artifact.tags });
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  const handleSkip = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  return (
    <div className="flex flex-col items-center justify-center bg-[#1a1a2e]" style={{ width: 960, height: 540 }}>
      <div className="text-center mb-8">
        <h2 className="text-lg text-amber-400 font-bold">Treasure Found</h2>
        <p className="text-[10px] text-stone-500 mt-1">Something worth keeping.</p>
      </div>

      <div
        className="flex flex-col items-center w-48 mb-8"
        style={{
          border: '2px solid #b45309',
          backgroundColor: 'rgba(120, 53, 15, 0.3)',
          padding: '16px 12px',
        }}
      >
        <div className="w-10 h-10 rounded-sm mb-3 bg-amber-700/60 border border-amber-600" />
        <span className="text-amber-300 text-sm font-bold text-center">{artifact.name}</span>
        <span className="text-stone-400 text-center mt-2 leading-tight" style={{ fontSize: '9px' }}>
          {artifact.description}
        </span>
        <span className="text-amber-600 text-center mt-2 leading-tight" style={{ fontSize: '9px' }}>
          {artifact.effect}
        </span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleTake}
          className="px-6 py-1.5 text-xs bg-amber-900/60 text-amber-300 border border-amber-700 hover:bg-amber-800/60"
        >
          Take It
        </button>
        <button
          onClick={handleSkip}
          className="px-6 py-1.5 text-xs bg-stone-800/50 text-stone-400 border border-stone-700 hover:bg-stone-700/50"
        >
          Skip
        </button>
      </div>
    </div>
  );
});
