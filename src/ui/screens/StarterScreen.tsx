import { memo, useEffect, useRef, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { forceSaveRun } from '../../services/runPersistence';
import { loadLastRunSummary } from '../../services/lastRunSummary';
import { playUpgrade } from '../../services/sfx';
import {
  generateStarterOffer,
  resolveOffer,
  makeApplyRand,
  type StarterOffer,
  type StarterReward,
} from '../../data/starterRewards';
import {
  NPC_NAME,
  CHARACTER_GREETINGS,
  OFFER_INTRO,
  SENDOFF_LINE,
  buildLastRunLine,
} from '../../data/starterDialogue';
import { renderNarrativeText } from '../components/AnimatedNarrativeText';
import { Tooltip } from '../components/Tooltip';
import { SpriteIcon } from '../components/SpriteIcon';
import { buildTileDescription, buildUpgradePreview } from '../components/KeywordText';
import { ARTIFACTS } from '../../data/artifacts';
import { TILE_FRAMES } from '../../data/spriteConfig';
import { ArtifactTooltipContent } from '../components/ArtifactTooltipContent';
import { TILE_DEFINITIONS } from '../../data/tiles';
import type { LastRunSummary } from '../../types/game';
import type { TileType } from '../../types/game';
import type { Screen } from '../../App';

/** Label color per slot -- same palette the reward cards used before, now tinting the choice button label. */
const SLOT_ACCENT: Record<StarterReward['slot'], string> = {
  tile: 'text-amber-300',
  upgrade: 'text-emerald-300',
  sacrifice: 'text-red-400',
};

/** Align the dialogue+choice panel relative to the saloon background. */
const PANEL_ALIGN = 'left' as 'left' | 'center' | 'right';
const SWAPPABLE_TILE_EXCLUSIONS = new Set<TileType>(['tumbleweed', 'showdown', 'fools_gold', 'charcoal']);
const STARTER_UPGRADE_REWARD_IDS = new Set(['bonesmith', 'bone_rattle', 'bone_tax']);

/**
 * Pre-run starter encounter rendered in the event-screen visual style:
 * full-scene saloon background, side-aligned dialogue panel, stacked
 * choice buttons. Applies the chosen reward before handing off to the map.
 */
export const StarterScreen = memo(function StarterScreen() {
  const run = useRunStore((s) => s.run);
  const setPendingStarterOffer = useRunStore((s) => s.setPendingStarterOffer);
  const markStarterEncountered = useRunStore((s) => s.markStarterEncountered);

  const [offer, setOffer] = useState<StarterOffer | null>(null);
  const [resolved, setResolved] = useState(false);
  const [upgradePending, setUpgradePending] = useState<StarterReward | null>(null);
  const [swapPending, setSwapPending] = useState<StarterReward | null>(null);
  const [upgradeSelectedTile, setUpgradeSelectedTile] = useState<TileType | null>(null);
  const [swapSelectedTile, setSwapSelectedTile] = useState<TileType | null>(null);
  const [lastRun, setLastRun] = useState<LastRunSummary | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!run) return;
    if (run.pendingStarterOffer) {
      const restored = resolveOffer(run.pendingStarterOffer, run.seed, run);
      if (restored) {
        setOffer(restored);
        return;
      }
    }
    const fresh = generateStarterOffer(run.seed, run);
    setOffer(fresh);
    setPendingStarterOffer({
      tileId: fresh.tile.id,
      upgradeId: fresh.upgrade.id,
      sacrificeId: fresh.sacrifice.id,
    });
    forceSaveRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLastRunSummary().then((summary) => {
      if (!cancelled) setLastRun(summary);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!run || !offer) return null;

  const swappableTiles = run.activeTileTypes.filter((tileType) => !SWAPPABLE_TILE_EXCLUSIONS.has(tileType));

  const applyReward = (reward: StarterReward, selectedTileType?: TileType) => {
    if (appliedRef.current || isApplying) return;
    appliedRef.current = true;
    setIsApplying(true);
    reward.apply(makeApplyRand(run.seed, reward.id), selectedTileType);
    if (STARTER_UPGRADE_REWARD_IDS.has(reward.id)) {
      playUpgrade();
    }
    setUpgradePending(null);
    setSwapPending(null);
    setUpgradeSelectedTile(null);
    setSwapSelectedTile(null);
    markStarterEncountered();
    forceSaveRun();
    setResolved(true);
  };

  const handleChoose = (reward: StarterReward) => {
    if (appliedRef.current || isApplying) return;
    if (reward.kind === 'upgrade_choice') {
      setUpgradePending(reward);
      setUpgradeSelectedTile(null);
      return;
    }
    if (reward.kind === 'swap_choice') {
      setSwapPending(reward);
      setSwapSelectedTile(null);
      return;
    }
    applyReward(reward);
  };

  const handleContinue = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  const bg = `${import.meta.env.BASE_URL}assets/backgrounds/bones.png`;

  const paragraphs: string[] = [];
  if (resolved) {
    paragraphs.push(SENDOFF_LINE);
  } else {
    paragraphs.push(CHARACTER_GREETINGS[run.character]);
    if (lastRun) paragraphs.push(buildLastRunLine(lastRun));
    paragraphs.push(OFFER_INTRO);
  }

  const choices: StarterReward[] = [offer.tile, offer.upgrade, offer.sacrifice];

  return (
    <div
      className="relative flex flex-col h-full"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Title */}
      <div className="pt-10 px-4 flex flex-col items-center">
        <h2
          className="text-xl text-amber-400 text-center font-bold uppercase"
          style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}
        >
          {NPC_NAME}
        </h2>
      </div>

      {/* Dialogue + choices panel */}
      <div
        className="flex-1 flex flex-col justify-center"
        style={{
          alignItems:
            PANEL_ALIGN === 'left' ? 'flex-start' : PANEL_ALIGN === 'right' ? 'flex-end' : 'center',
          paddingLeft: PANEL_ALIGN === 'left' ? 96 : 16,
          paddingRight: PANEL_ALIGN === 'right' ? 96 : 16,
        }}
      >
        <div className="w-full" style={{ maxWidth: 340, marginTop: -40 }}>
          <div className="min-h-[56px] flex items-center" style={{ marginBottom: 20 }}>
            <p
              className="text-stone-300 font-bold leading-relaxed text-left"
              style={{
                fontSize: 10,
                WebkitTextStroke: '2px #000',
                paintOrder: 'stroke fill',
                whiteSpace: 'pre-line',
              }}
            >
              {renderNarrativeText(paragraphs.join('\n'), 12)}
            </p>
          </div>

          {!resolved && (
            <div className="flex flex-col gap-2">
              {choices.map((reward) => (
                <button
                  key={reward.id}
                  onClick={() => handleChoose(reward)}
                  disabled={isApplying}
                  style={{ fontSize: 10, boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
                  className="p-2 rounded-sm text-left transition-transform active:translate-y-0.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <span
                      className={`block font-bold ${SLOT_ACCENT[reward.slot]}`}
                      style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.6)' }}
                    >
                      {reward.label}
                    </span>
                    <span className="block text-stone-400">{renderRewardDescription(reward)}</span>
                </button>
              ))}
            </div>
          )}

          {resolved && (
            <button
              onClick={handleContinue}
              style={{ fontSize: 10, boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
              className="block mx-auto px-6 py-2 rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 transition-transform active:translate-y-0.5"
            >
              Continue
            </button>
          )}
        </div>
      </div>

      {upgradePending && (
        <div className="absolute inset-0 flex flex-col bg-black/80 z-10">
          <div className="flex-1 flex flex-col items-center justify-center">
            <h2 className="text-xl text-amber-400 mb-2 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Upgrade a Tile</h2>
            <p className="text-stone-400 text-xs mb-4">Choose which tile Bones sharpens before the run starts.</p>

            <div className="grid grid-cols-4 gap-3 justify-items-center">
              {run.activeTileTypes
                .filter((tileType) => TILE_DEFINITIONS[tileType]?.upgradeText)
                .map((tileType) => {
                  const def = TILE_DEFINITIONS[tileType];
                  const currentLevel = run.tileUpgrades[tileType] ?? 0;
                  const isSelected = upgradeSelectedTile === tileType;
                  return (
                    <Tooltip
                      key={tileType}
                      content={
                        <div className="whitespace-nowrap" style={{ fontSize: '9px', lineHeight: 1.3 }}>
                          {buildUpgradePreview(tileType, currentLevel)}
                        </div>
                      }
                      position="bottom"
                      gap={10}
                    >
                      <button
                        onClick={() => setUpgradeSelectedTile(tileType)}
                        className="flex flex-col items-center w-28 rounded-sm transition-all"
                        style={{
                          backgroundColor: isSelected ? 'rgba(120, 53, 15, 0.75)' : 'rgba(28, 25, 23, 0.8)',
                          padding: '12px 10px',
                          transform: isSelected ? 'translateY(-4px)' : 'none',
                          boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
                        }}
                      >
                        <SpriteIcon frame={TILE_FRAMES[tileType]} scale={2} className="mb-1" />
                        <span className="text-amber-300 text-xs font-bold" style={{ fontSize: def.label.length > 13 ? '10px' : undefined }}>{def.label}</span>
                        <span className="text-yellow-400" style={{ fontSize: '8px' }}>
                          Lv {currentLevel + 1} {'\u2192'} {currentLevel + 2}
                        </span>
                        <span className="text-stone-500 text-center" style={{ fontSize: '9px' }}>
                          {def.upgradeText}
                        </span>
                      </button>
                    </Tooltip>
                  );
                })}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  if (isApplying) return;
                  setUpgradePending(null);
                  setUpgradeSelectedTile(null);
                }}
                disabled={isApplying}
                style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
                className="px-4 py-2 text-sm rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 transition-transform active:translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (upgradeSelectedTile) applyReward(upgradePending, upgradeSelectedTile);
                }}
                disabled={!upgradeSelectedTile || isApplying}
                style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
                className={`px-6 py-2 text-sm rounded-sm transition-transform ${
                  upgradeSelectedTile
                    ? 'bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5'
                    : 'bg-stone-800 text-stone-600 cursor-not-allowed opacity-70'
                }`}
              >
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {swapPending && swapPending.swapTileType && (() => {
        const newTileType = swapPending.swapTileType;
        const newDef = TILE_DEFINITIONS[newTileType];
        return (
          <div className="absolute inset-0 flex flex-col bg-black/80 z-10">
            <div className="flex-1 flex flex-col items-center justify-center">
              <h2 className="text-xl text-amber-400 mb-2 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Swap a Tile</h2>
              <p className="text-stone-400 text-xs mb-4">Choose which tile Bones trades away.</p>

              <div className="flex items-center gap-6">
                <div className="grid grid-cols-4 gap-2">
                  {swappableTiles.map((tileType) => {
                    const def = TILE_DEFINITIONS[tileType];
                    const level = run.tileUpgrades[tileType] ?? 0;
                    const isSelected = swapSelectedTile === tileType;
                    return (
                      <button
                        key={tileType}
                        onClick={() => setSwapSelectedTile(tileType)}
                        className="flex flex-col items-center w-28 rounded-sm transition-all"
                        style={{
                          backgroundColor: isSelected ? 'rgba(120, 53, 15, 0.75)' : 'rgba(28, 25, 23, 0.8)',
                          padding: '8px 6px',
                          transform: isSelected ? 'translateY(-4px)' : 'none',
                          boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
                        }}
                      >
                        <SpriteIcon frame={TILE_FRAMES[tileType]} scale={2} className="mb-1.5" />
                        <span className="text-amber-300 text-xs font-bold" style={{ fontSize: def.label.length > 13 ? '10px' : undefined }}>{def.label}</span>
                        <span className="text-yellow-400" style={{ fontSize: '8px' }}>Lv {level + 1}</span>
                        <span className="text-stone-300 text-center mt-1 leading-tight" style={{ fontSize: '9px' }}>
                          {buildTileDescription(tileType, level)}
                        </span>
                        {def.flavor && (
                          <span className="text-stone-600 text-center mt-1 leading-tight italic" style={{ fontSize: '8px' }}>
                            "{def.flavor}"
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <span className="text-amber-400 text-2xl font-bold">{'\u2190'}</span>

                <div
                  className="flex flex-col items-center w-28 rounded-sm"
                  style={{
                    backgroundColor: 'rgba(120, 53, 15, 0.55)',
                    padding: '8px 6px',
                    boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
                  }}
                >
                  <SpriteIcon frame={TILE_FRAMES[newTileType]} scale={2} className="mb-1.5" />
                  <span className="text-amber-300 text-xs font-bold" style={{ fontSize: newDef.label.length > 13 ? '10px' : undefined }}>{newDef.label}</span>
                  <span className="text-stone-300 text-center mt-1 leading-tight" style={{ fontSize: '9px' }}>
                    {buildTileDescription(newTileType, 0)}
                  </span>
                  {newDef.flavor && (
                    <span className="text-stone-600 text-center mt-1 leading-tight italic" style={{ fontSize: '8px' }}>
                      "{newDef.flavor}"
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    if (isApplying) return;
                    setSwapPending(null);
                    setSwapSelectedTile(null);
                  }}
                  disabled={isApplying}
                  style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
                  className="px-4 py-2 text-sm rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 transition-transform active:translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (swapSelectedTile) applyReward(swapPending, swapSelectedTile);
                  }}
                  disabled={!swapSelectedTile || isApplying}
                  style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
                  className={`px-6 py-2 text-sm rounded-sm transition-transform ${
                    swapSelectedTile
                      ? 'bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5'
                      : 'bg-stone-800 text-stone-600 cursor-not-allowed opacity-70'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
});

function renderRewardDescription(reward: StarterReward) {
  if (!reward.artifactKeyword) return reward.description;
  const { text, artifactId } = reward.artifactKeyword;
  const index = reward.description.indexOf(text);
  if (index === -1) return reward.description;
  return (
    <>
      {reward.description.slice(0, index)}
      <ArtifactKeywordInline artifactId={artifactId} text={text} />
      {reward.description.slice(index + text.length)}
    </>
  );
}

function ArtifactKeywordInline({ artifactId, text }: { artifactId: string; text: string }) {
  const artifact = ARTIFACTS.find((entry) => entry.id === artifactId);
  if (!artifact) return <span className="font-bold text-red-400">{text}</span>;

  return (
    <Tooltip content={<ArtifactTooltipContent artifact={artifact} />} position="bottom" gap={10}>
      <span className="font-bold text-red-400">{text}</span>
    </Tooltip>
  );
}
