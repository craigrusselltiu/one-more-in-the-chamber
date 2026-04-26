import { memo, useEffect, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { playCampfire, stopCampfire, playUpgrade } from '../../services/sfx';
import { TILE_DEFINITIONS } from '../../data/tiles';
import { TILE_FRAMES, UI_FRAMES, NODE_FRAMES } from '../../data/spriteConfig';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { KeywordSubTooltips, getReferencedKeywords, buildUpgradePreview } from '../components/KeywordText';
import { adjustHeal } from '../../utils/healAdjust';
import { forceSaveRun } from '../../services/runPersistence';
import type { TileType } from '../../types/game';
import type { Screen } from '../../App';

/**
 * CampfireScreen: choose rest (heal 30% max HP) or upgrade a tile.
 */
export const CampfireScreen = memo(function CampfireScreen() {
  const run = useRunStore((s) => s.run);
  const updateHealth = useRunStore((s) => s.updateHealth);
  const upgradeTile = useRunStore((s) => s.upgradeTile);
  const setPendingCampfireOutcome = useRunStore((s) => s.setPendingCampfireOutcome);
  const initialOutcome = run?.pendingCampfireOutcome;
  const [choice, setChoice] = useState<'none' | 'rest' | 'upgrade' | 'upgraded'>(
    initialOutcome?.type === 'rest'
      ? 'rest'
      : initialOutcome?.type === 'upgrade'
      ? 'upgraded'
      : 'none',
  );
  const [selectedTile, setSelectedTile] = useState<TileType | null>(
    initialOutcome?.type === 'upgrade' ? initialOutcome.tileType : null,
  );

  useEffect(() => { playCampfire(); return () => stopCampfire(); }, []);

  if (!run) return null;

  const healAmount = adjustHeal(run, Math.floor(run.maxHealth * 0.3));
  const isFullHealth = run.health >= run.maxHealth;
  const displayedHealAmount =
    run.pendingCampfireOutcome?.type === 'rest'
      ? run.pendingCampfireOutcome.healAmount
      : healAmount;

  const handleRest = () => {
    setPendingCampfireOutcome({ type: 'rest', healAmount });
    updateHealth(healAmount);
    setChoice('rest');
    forceSaveRun();
  };

  const handleUpgrade = () => {
    setChoice('upgrade');
  };

  const handleConfirmUpgrade = () => {
    if (!selectedTile) return;
    setPendingCampfireOutcome({ type: 'upgrade', tileType: selectedTile });
    upgradeTile(selectedTile);
    playUpgrade();
    setChoice('upgraded');
    forceSaveRun();
  };

  const handleLeave = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  // Rested
  if (choice === 'rest') {
    return (
      <div className="flex flex-col h-full"><div className="flex-1 flex flex-col items-center justify-center">
        <div className="mb-4"><SpriteIcon frame={NODE_FRAMES.campfire} scale={3} /></div>
        <h2 className="text-xl text-amber-400 mb-2 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Rested</h2>
        <p className="text-stone-300 text-sm mb-4">
          You rest by the fire. Healed {displayedHealAmount} HP.
        </p>
        <p className="text-red-400 text-xs mb-6">
          HP: {run.health}/{run.maxHealth}
        </p>
        <button
          onClick={handleLeave}
          style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
          className="px-6 py-2 text-sm rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 transition-transform active:translate-y-0.5"
        >
          Continue
        </button>
      </div></div>
    );
  }

  // Upgraded
  if (choice === 'upgraded') {
    const tileDef = selectedTile ? TILE_DEFINITIONS[selectedTile] : null;
    return (
      <div className="flex flex-col h-full"><div className="flex-1 flex flex-col items-center justify-center">
        <div className="mb-4"><SpriteIcon frame={UI_FRAMES.upgrade} scale={3} /></div>
        <h2 className="text-xl text-amber-400 mb-2 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Upgraded</h2>
        <p className="text-stone-300 text-sm mb-4">
          {tileDef?.label ?? 'Tile'} has been upgraded.
        </p>
        <button
          onClick={handleLeave}
          style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
          className="px-6 py-2 text-sm rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 transition-transform active:translate-y-0.5"
        >
          Continue
        </button>
      </div></div>
    );
  }

  // Upgrade tile selection
  if (choice === 'upgrade') {
    return (
      <div className="flex flex-col h-full"><div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="text-xl text-amber-400 mb-2 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Upgrade a Tile</h2>
        <p className="text-stone-400 text-xs mb-4">
          Permanent +1 tier for the rest of the run
        </p>

        <div className="grid grid-cols-4 gap-3 justify-items-center">
          {run.activeTileTypes.filter((t) => TILE_DEFINITIONS[t]?.upgradeText).map((tileType) => {
            const def = TILE_DEFINITIONS[tileType];
            const currentLevel = run.tileUpgrades[tileType] ?? 0;
            const poisonBonus = (run.traitCounts?.rattlesnake ?? 0) >= 2 && (tileType === 'waste' || tileType === 'rattler') ? 1 : 0;
            const isSelected = selectedTile === tileType;

            const previewTooltip = (
              <div className="whitespace-nowrap" style={{ fontSize: '9px', lineHeight: 1.3 }}>
                {buildUpgradePreview(tileType, currentLevel)}
              </div>
            );
            const hasKeywords = getReferencedKeywords(def.description).length > 0;
            const keywordTooltip = hasKeywords ? <KeywordSubTooltips text={def.description} /> : undefined;
            return (
              <Tooltip key={tileType} content={previewTooltip} secondContent={keywordTooltip} position="bottom" gap={35}>
                <button
                  onClick={() => setSelectedTile(tileType)}
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
                    Lv {currentLevel + 1} {'\u2192'} {currentLevel + 2}{poisonBonus > 0 ? ` (+${poisonBonus})` : ''}
                  </span>
                  <span className="text-stone-500 text-center mt-1" style={{ fontSize: '9px' }}>
                    {def.upgradeText}
                  </span>
                </button>
              </Tooltip>
            );
          })}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setChoice('none')}
            style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
            className="px-4 py-2 text-sm rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 transition-transform active:translate-y-0.5"
          >
            Back
          </button>
          <button
            onClick={handleConfirmUpgrade}
            disabled={!selectedTile}
            style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
            className={`px-6 py-2 text-sm rounded-sm transition-transform ${
              selectedTile
                ? 'bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5'
                : 'bg-stone-800 text-stone-600 cursor-not-allowed opacity-70'
            }`}
          >
            Upgrade
          </button>
        </div>
      </div></div>
    );
  }

  // Initial choice
  return (
    <div className="flex flex-col h-full"><div className="flex-1 flex flex-col items-center justify-center">
      <div className="mb-4">
        <SpriteIcon frame={NODE_FRAMES.campfire} scale={3} />
      </div>
      <h2 className="text-xl text-amber-400 mb-6 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Campfire</h2>

      <div className="flex gap-4">
        <button
          onClick={handleRest}
          disabled={isFullHealth}
          className={`flex flex-col items-center w-40 rounded-sm transition-transform active:translate-y-0.5 ${
            isFullHealth ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'
          }`}
          style={{
            backgroundColor: isFullHealth ? 'rgba(28, 25, 23, 0.5)' : 'rgba(28, 25, 23, 0.8)',
            padding: '16px 14px',
            boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
          }}
        >
          <SpriteIcon frame={UI_FRAMES.rest} scale={2} className="mb-1" />
          <span className="text-stone-200 text-sm font-bold">Rest</span>
          <span className="text-stone-400 text-xs mt-1">
            Heal 30% of your max HP.
          </span>
        </button>

        <button
          onClick={handleUpgrade}
          className="flex flex-col items-center w-40 rounded-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
          style={{
            backgroundColor: 'rgba(28, 25, 23, 0.8)',
            padding: '16px 14px',
            boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
          }}
        >
          <SpriteIcon frame={UI_FRAMES.upgrade} scale={2} className="mb-1" />
          <span className="text-stone-200 text-sm font-bold">Upgrade</span>
          <span className="text-stone-400 text-xs mt-1">
            Upgrade one of your tiles.
          </span>
        </button>
      </div>
    </div></div>
  );
});
