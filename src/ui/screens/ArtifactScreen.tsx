import { memo, useEffect, useRef, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { RARITY_COLORS_DIM, RARITY_LABELS, RARITY_BREATHE_CLASS } from '../../data/artifacts';
import type { ArtifactDefinition } from '../../data/artifacts';
import { ARTIFACT_FRAMES } from '../../data/spriteConfig';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { colorizeKeywords } from '../components/KeywordText';
import type { TraitId } from '../../types/game';

const TRAIT_COLORS: Record<TraitId, string> = {
  outlaw: '#D04040', sheriff: '#6888A0', prospector: '#E0C880', sapper: '#D4A030',
  mustang: '#70B0D0', gunslinger: '#D06080', saloon_keeper: '#D4A870', desperado: '#B060D0',
  sniper: '#7090B8', dead_man_walking: '#808080', tracker: '#C8A040', preacher: '#A0C8FF',
  antivenom: '#60A040', undertaker: '#606060', rattlesnake: '#80C040', corrupt: '#8B3A9B',
};
const TRAIT_NAMES: Record<string, string> = {
  outlaw: 'Outlaw', sheriff: 'Sheriff', prospector: 'Prospector', sapper: 'Sapper',
  mustang: 'Mustang', gunslinger: 'Gunslinger', saloon_keeper: 'Saloon Keeper',
  desperado: 'Desperado', sniper: 'Sniper', dead_man_walking: 'Dead Man Walking',
  tracker: 'Tracker', preacher: 'Preacher', antivenom: 'Antivenom', undertaker: 'Undertaker',
  rattlesnake: 'Rattlesnake', corrupt: 'Corrupt',
};
import { playTreasure } from '../../services/sfx';
import { forceSaveRun } from '../../services/runPersistence';
import { createSeededRandom } from '../../utils/seededRandom';
import { pickArtifactForRun, pickArtifactsForRun } from '../../utils/artifactSelection';
import type { Screen } from '../../App';

export const ArtifactScreen = memo(function ArtifactScreen() {
  const run = useRunStore((s) => s.run);
  const addArtifact = useRunStore((s) => s.addArtifact);

  useEffect(() => { playTreasure(); }, []);

  // Determine where to go after treasure based on current node
  const currentNode = run?.mapState?.nodes.find((n) => n.id === run?.currentNodeId);
  const isBossReward = currentNode?.type === 'boss';
  const isEliteReward = currentNode?.type === 'elite';
  const isArtifactNode = currentNode?.type === 'artifact';
  // Outlaw King defeats flag a pending legendary reward, guaranteeing a legendary pick.
  const initialLegendaryReward = run?.pendingLegendaryReward === true;
  // Events can redirect here with a custom choice count (e.g. Train Wreck "Search the engine" -> 3).
  const initialEventChoiceCount = run?.pendingEventArtifactChoiceCount;

  // Lock the rolled artifacts AND display mode once, so clearing the reward flags
  // on pick doesn't re-roll or change the UI before the screen transitions away.
  const lockedRef = useRef<{ isChoiceMode: boolean; artifacts: ArtifactDefinition[] } | null>(null);
  if (!lockedRef.current && run) {
    const mode =
      isBossReward ||
      isArtifactNode ||
      (initialEventChoiceCount != null && initialEventChoiceCount > 1);
    const rand = createSeededRandom(`${run.seed}-treasure-${run.currentNodeId ?? ''}-${initialEventChoiceCount ?? 'x'}`);
    const opts = { legendaryOnly: initialLegendaryReward, bossReward: isBossReward };
    const result = mode
      ? pickArtifactsForRun(run, initialEventChoiceCount ?? 2, rand, opts)
      : [pickArtifactForRun(run, rand, opts)];
    lockedRef.current = { isChoiceMode: mode, artifacts: result };
  }
  const isChoiceMode = lockedRef.current?.isChoiceMode ?? false;
  const artifacts = lockedRef.current?.artifacts ?? [];

  const [taken, setTaken] = useState(false);

  const getNextScreen = (): Screen => {
    if (!isBossReward) return 'map';
    // Final boss -> score, otherwise -> tile-select
    return (run?.currentAct ?? 1) >= 3 ? 'score' : 'tile-select';
  };

  const markRewardTaken = () => {
    if (isBossReward) useRunStore.getState().markBossRewardTaken();
    if (isEliteReward) useRunStore.getState().markEliteRewardTaken();
    // Clear the Outlaw King legendary flag once consumed.
    if (initialLegendaryReward) useRunStore.getState().setPendingLegendaryReward(false);
    // Clear any event-driven choice count.
    if (initialEventChoiceCount != null) useRunStore.getState().setPendingEventArtifactChoiceCount(undefined);
    if (currentNode?.type === 'artifact') {
      useRunStore.getState().markNodeCompleted(currentNode.id);
    }
    if (currentNode?.type === 'event') {
      useRunStore.getState().setPendingEventResumeScreen(undefined);
      useRunStore.getState().markNodeCompleted(currentNode.id);
    }
    forceSaveRun();
  };

  const takenRef = useRef(false);
  const completeReward = (): Screen => {
    markRewardTaken();
    const next = getNextScreen();
    if (isBossReward && next === 'tile-select') {
      useRunStore.getState().advanceAct();
      forceSaveRun();
    }
    return next;
  };

  const handleChoose = (index: number) => {
    if (taken || takenRef.current) return;
    takenRef.current = true;
    setTaken(true);
    const chosen = artifacts[index];
    addArtifact({ id: chosen.id, tags: chosen.tags });
    const next = completeReward();
    if (next === 'score') {
      useRunStore.getState().endRun(true);
    }
    EventBus.emit(GameEvent.SCREEN_CHANGE, next);
  };

  const handleSkip = () => {
    if (taken || takenRef.current) return;
    takenRef.current = true;
    setTaken(true);
    const next = completeReward();
    if (next === 'score') {
      useRunStore.getState().endRun(true);
    }
    EventBus.emit(GameEvent.SCREEN_CHANGE, next);
  };

  const renderCard = (artifact: ArtifactDefinition) => (
    <Tooltip position="top" content={artifact.tags.length > 0 ? (
      <span style={{ fontSize: '9px' }}>
        <span className="text-stone-400">Traits: </span>
        {artifact.tags.map((tag, i) => (
          <span key={tag}>
            {i > 0 && <span className="text-stone-500">, </span>}
            <span style={{ color: TRAIT_COLORS[tag] }}>{TRAIT_NAMES[tag]}</span>
          </span>
        ))}
      </span>
    ) : undefined}>
      <div
        className="flex flex-col items-center w-48 rounded-sm"
        style={{
          backgroundColor: 'rgba(28, 25, 23, 0.85)',
          padding: '16px 12px',
          boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
        }}
      >
        <div className="mb-3 flex items-center justify-center">
          {ARTIFACT_FRAMES[artifact.id] != null ? (
            <SpriteIcon frame={ARTIFACT_FRAMES[artifact.id]} scale={2} />
          ) : (
            <span className="text-[8px] text-amber-300">{artifact.name.slice(0, 3).toUpperCase()}</span>
          )}
        </div>
        <span className={`text-sm text-center ${RARITY_BREATHE_CLASS[artifact.rarity ?? 'common']}`}>{artifact.name}</span>
        <span className="text-center" style={{ fontSize: '7px', color: RARITY_COLORS_DIM[artifact.rarity ?? 'common'] }}>
          {RARITY_LABELS[artifact.rarity ?? 'common']}
        </span>
        <span className="text-stone-300 text-center mt-2 leading-tight" style={{ fontSize: '9px' }}>
          {colorizeKeywords(artifact.effect)}
        </span>
        {artifact.description && (
          <span className="text-center mt-2 leading-tight italic" style={{ fontSize: '8px', color: '#6b6560' }}>
            "{artifact.description}"
          </span>
        )}
      </div>
    </Tooltip>
  );

  return (
    <div className="flex flex-col items-center justify-center" style={{ width: 960, height: 540 }}>
      <div className="text-center mb-8">
        <h2 className="text-lg text-amber-400 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>
          {isChoiceMode ? 'Choose an Artifact' : 'Artifact Found'}
        </h2>
      </div>

      {isChoiceMode ? (
        <>
          <div className="flex gap-6 mb-8 items-stretch">
            {artifacts.map((art, i) => (
              <div key={art.id} className="flex flex-col items-center">
                <div className="flex-1 flex">
                  {renderCard(art)}
                </div>
                <button
                  onClick={() => handleChoose(i)}
                  style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
                  className="mt-3 px-6 py-1.5 text-xs font-bold rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5 transition-transform"
                >
                  Choose
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-8">
            {renderCard(artifacts[0])}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
              className="px-6 py-1.5 text-xs font-bold rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 active:translate-y-0.5 transition-transform"
            >
              Skip
            </button>
            <button
              onClick={() => handleChoose(0)}
              style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
              className="px-6 py-1.5 text-xs font-bold rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5 transition-transform"
            >
              Take It
            </button>
          </div>
        </>
      )}
    </div>
  );
});
