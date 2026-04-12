import { memo, useEffect, useMemo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { ARTIFACTS, RARITY_COLORS_DIM, RARITY_LABELS, RARITY_BREATHE_CLASS } from '../../data/artifacts';
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
  antivenom: '#60A040', undertaker: '#606060', rattlesnake: '#80C040',
};
const TRAIT_NAMES: Record<string, string> = {
  outlaw: 'Outlaw', sheriff: 'Sheriff', prospector: 'Prospector', sapper: 'Sapper',
  mustang: 'Mustang', gunslinger: 'Gunslinger', saloon_keeper: 'Saloon Keeper',
  desperado: 'Desperado', sniper: 'Sniper', dead_man_walking: 'Dead Man Walking',
  tracker: 'Tracker', preacher: 'Preacher', antivenom: 'Antivenom', undertaker: 'Undertaker',
  rattlesnake: 'Rattlesnake',
};
import { playTreasure } from '../../services/sfx';
import { createSeededRandom } from '../../utils/seededRandom';
import { weightedArtifactPick, weightedArtifactPickN } from '../../utils/weightedSelection';
import { getAscensionMutations } from '../../data/ascension';
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
  const isLegendaryReward = run?.pendingLegendaryReward === true;
  // Choice mode: artifact nodes and boss rewards present 2 options to pick from.
  const isChoiceMode = isBossReward || isArtifactNode;

  const artifacts = useMemo(() => {
    const rand = createSeededRandom(`${run?.seed ?? ''}-treasure-${run?.currentNodeId ?? ''}`);
    const ownedIds = new Set((run?.artifacts ?? []).map((a) => a.id));
    const character = run?.character ?? 'red_panda';
    const available = ARTIFACTS.filter((a) => !ownedIds.has(a.id) && (!a.exclusive || a.exclusive === character));
    let pool = available.length > 0 ? available : ARTIFACTS;
    // Legendary-only reward (Outlaw King drop): filter pool to legendaries.
    // Falls back to the full pool if the player already owns every legendary.
    if (isLegendaryReward) {
      const legendaries = pool.filter((a) => a.rarity === 'legendary');
      if (legendaries.length > 0) pool = legendaries;
    }
    const desperadoActive = (run?.traitCounts?.desperado ?? 0) >= 2;
    const legendaryWeight = getAscensionMutations(run?.ascensionLevel ?? 0).legendaryWeight;
    if (isChoiceMode) {
      return weightedArtifactPickN(pool, 2, rand, desperadoActive, legendaryWeight, isBossReward);
    }
    return [weightedArtifactPick(pool, rand, desperadoActive, false, legendaryWeight)];
  }, [isBossReward, isLegendaryReward, isChoiceMode]);

  const [taken, setTaken] = useState(false);
  const act = run?.currentAct ?? 1;

  const bgImage = (() => {
    if (isBossReward) {
      const bossBgs: Record<number, string> = { 1: 'dusty_bg', 2: 'copperhead_bg', 3: 'ironeye_bg' };
      return `${import.meta.env.BASE_URL}assets/backgrounds/${bossBgs[act]}.png`;
    }
    if (isEliteReward) return `${import.meta.env.BASE_URL}assets/backgrounds/act${act}_bg.png`;
    return `${import.meta.env.BASE_URL}assets/backgrounds/artifact_bg.png`;
  })();

  const getNextScreen = (): Screen => {
    if (!isBossReward) return 'map';
    // Final boss -> score, otherwise -> tile-select
    return (run?.currentAct ?? 1) >= 3 ? 'score' : 'tile-select';
  };

  const markRewardTaken = () => {
    if (isBossReward) useRunStore.getState().markBossRewardTaken();
    if (isEliteReward) useRunStore.getState().markEliteRewardTaken();
    // Clear the Outlaw King legendary flag once consumed.
    if (isLegendaryReward) useRunStore.getState().setPendingLegendaryReward(false);
  };

  const handleChoose = (index: number) => {
    if (taken) return;
    setTaken(true);
    const chosen = artifacts[index];
    addArtifact({ id: chosen.id, tags: chosen.tags });
    markRewardTaken();
    const next = getNextScreen();
    if (next === 'score') {
      useRunStore.getState().endRun(true);
    }
    EventBus.emit(GameEvent.SCREEN_CHANGE, next);
  };

  const handleSkip = () => {
    markRewardTaken();
    const next = getNextScreen();
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
        className="flex flex-col items-center w-48"
        style={{
          border: '2px solid #b45309',
          backgroundColor: 'rgba(120, 53, 15, 0.6)',
          padding: '16px 12px',
        }}
      >
        <div className="w-10 h-10 rounded-sm mb-3 bg-amber-700/60 border border-amber-600 flex items-center justify-center">
          {ARTIFACT_FRAMES[artifact.id] != null ? (
            <SpriteIcon frame={ARTIFACT_FRAMES[artifact.id]} scale={2} />
          ) : (
            <span className="text-[8px] text-amber-300 font-bold">{artifact.name.slice(0, 3).toUpperCase()}</span>
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
    <div className="flex flex-col items-center justify-center" style={{ width: 960, height: 540, backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="text-center mb-8">
        <h2 className="text-lg text-amber-400 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>
          {isChoiceMode ? 'Choose an Artifact' : 'Artifact Found'}
        </h2>
      </div>

      {isChoiceMode ? (
        <>
          <div className="flex gap-6 mb-8">
            {artifacts.map((art, i) => (
              <div key={art.id} className="flex flex-col items-center">
                {renderCard(art)}
                <button
                  onClick={() => handleChoose(i)}
                  className="mt-3 px-6 py-1.5 text-xs bg-amber-900/80 text-amber-300 border border-amber-700 hover:bg-amber-800/80"
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
              className="px-6 py-1.5 text-xs bg-stone-800/80 text-stone-400 border border-stone-700 hover:bg-stone-700/80"
            >
              Skip
            </button>
            <button
              onClick={() => handleChoose(0)}
              className="px-6 py-1.5 text-xs bg-amber-900/80 text-amber-300 border border-amber-700 hover:bg-amber-800/80"
            >
              Take It
            </button>
          </div>
        </>
      )}
    </div>
  );
});
