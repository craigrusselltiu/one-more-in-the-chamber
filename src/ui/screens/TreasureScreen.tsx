import { memo, useEffect, useMemo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { ARTIFACTS } from '../../data/artifacts';
import { playTreasure } from '../../services/sfx';
import { createSeededRandom } from '../../utils/seededRandom';
import type { Screen } from '../../App';

export const TreasureScreen = memo(function TreasureScreen() {
  const run = useRunStore((s) => s.run);
  const addArtifact = useRunStore((s) => s.addArtifact);

  useEffect(() => { playTreasure(); }, []);

  const artifact = useMemo(() => {
    const rand = createSeededRandom(`${run?.seed ?? ''}-treasure-${run?.currentNodeId ?? ''}`);
    const ownedIds = new Set((run?.artifacts ?? []).map((a) => a.id));
    const character = run?.character ?? 'red_panda';
    const available = ARTIFACTS.filter((a) => !ownedIds.has(a.id) && (!a.exclusive || a.exclusive === character));
    const pool = available.length > 0 ? available : ARTIFACTS;
    return pool[Math.floor(rand() * pool.length)];
  }, []);

  const [taken, setTaken] = useState(false);

  // Determine where to go after treasure based on current node
  const currentNode = run?.mapState?.nodes.find((n) => n.id === run?.currentNodeId);
  const isBossReward = currentNode?.type === 'boss';

  const getNextScreen = (): Screen => {
    if (!isBossReward) return 'map';
    // Final boss -> score, otherwise -> tile-select
    return (run?.currentAct ?? 1) >= 3 ? 'score' : 'tile-select';
  };

  const handleTake = () => {
    if (taken) return;
    setTaken(true);
    addArtifact({ id: artifact.id, tags: artifact.tags });
    if (isBossReward) useRunStore.getState().markBossRewardTaken();
    const next = getNextScreen();
    if (next === 'score') {
      useRunStore.getState().endRun(true);
    }
    EventBus.emit(GameEvent.SCREEN_CHANGE, next);
  };

  const handleSkip = () => {
    if (isBossReward) useRunStore.getState().markBossRewardTaken();
    const next = getNextScreen();
    if (next === 'score') {
      useRunStore.getState().endRun(true);
    }
    EventBus.emit(GameEvent.SCREEN_CHANGE, next);
  };

  return (
    <div className="flex flex-col items-center justify-center" style={{ width: 960, height: 540, backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${import.meta.env.BASE_URL}assets/treasure_bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="text-center mb-8">
        <h2 className="text-lg text-amber-400 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Treasure Found</h2>
      </div>

      <div
        className="flex flex-col items-center w-48 mb-8"
        style={{
          border: '2px solid #b45309',
          backgroundColor: 'rgba(120, 53, 15, 0.6)',
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
          className="px-6 py-1.5 text-xs bg-amber-900/80 text-amber-300 border border-amber-700 hover:bg-amber-800/80"
        >
          Take It
        </button>
        <button
          onClick={handleSkip}
          className="px-6 py-1.5 text-xs bg-stone-800/80 text-stone-400 border border-stone-700 hover:bg-stone-700/80"
        >
          Skip
        </button>
      </div>
    </div>
  );
});
