import { memo, useEffect, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { playCampfire, stopCampfire, playUpgrade } from '../../services/sfx';
import { TILE_DEFINITIONS } from '../../data/tiles';
import { TILE_FRAMES, UI_FRAMES, NODE_FRAMES } from '../../data/spriteConfig';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { KeywordSubTooltips, getReferencedKeywords, buildUpgradePreview } from '../components/KeywordText';
import type { TileType } from '../../types/game';
import type { Screen } from '../../App';

/**
 * CampfireScreen: choose rest (heal 30% max HP) or upgrade a tile.
 */
export const CampfireScreen = memo(function CampfireScreen() {
  const run = useRunStore((s) => s.run);
  const updateHealth = useRunStore((s) => s.updateHealth);
  const upgradeTile = useRunStore((s) => s.upgradeTile);
  const [choice, setChoice] = useState<'none' | 'rest' | 'upgrade' | 'upgraded'>('none');
  const [selectedTile, setSelectedTile] = useState<TileType | null>(null);

  useEffect(() => { playCampfire(); return () => stopCampfire(); }, []);

  if (!run) return null;

  const healAmount = Math.floor(run.maxHealth * 0.3);
  const isFullHealth = run.health >= run.maxHealth;

  const handleRest = () => {
    updateHealth(healAmount);
    setChoice('rest');
  };

  const handleUpgrade = () => {
    setChoice('upgrade');
  };

  const handleConfirmUpgrade = () => {
    if (!selectedTile) return;
    upgradeTile(selectedTile);
    playUpgrade();
    setChoice('upgraded');
  };

  const handleLeave = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  // Rested
  if (choice === 'rest') {
    return (
      <div className="flex flex-col h-full" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${import.meta.env.BASE_URL}assets/campfire_bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}><div className="flex-1 flex flex-col items-center justify-center">
        <div className="mb-4"><SpriteIcon frame={NODE_FRAMES.campfire} scale={3} /></div>
        <h2 className="text-xl text-amber-400 mb-2 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Rested</h2>
        <p className="text-stone-300 text-sm mb-4">
          You rest by the fire. Healed {healAmount} HP.
        </p>
        <p className="text-red-400 text-xs mb-6">
          HP: {run.health}/{run.maxHealth}
        </p>
        <button
          onClick={handleLeave}
          className="px-6 py-2 bg-amber-900/60 text-amber-300 text-sm border border-amber-700 hover:bg-amber-800/60"
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
      <div className="flex flex-col h-full" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${import.meta.env.BASE_URL}assets/campfire_bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}><div className="flex-1 flex flex-col items-center justify-center">
        <div className="mb-4"><SpriteIcon frame={UI_FRAMES.upgrade} scale={3} /></div>
        <h2 className="text-xl text-amber-400 mb-2 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Upgraded</h2>
        <p className="text-stone-300 text-sm mb-4">
          {tileDef?.label ?? 'Tile'} has been upgraded.
        </p>
        <button
          onClick={handleLeave}
          className="px-6 py-2 bg-amber-900/60 text-amber-300 text-sm border border-amber-700 hover:bg-amber-800/60"
        >
          Continue
        </button>
      </div></div>
    );
  }

  // Upgrade tile selection
  if (choice === 'upgrade') {
    return (
      <div className="flex flex-col h-full" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${import.meta.env.BASE_URL}assets/campfire_bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}><div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="text-xl text-amber-400 mb-2 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Upgrade a Tile</h2>
        <p className="text-stone-400 text-xs mb-4">
          Permanent +1 tier for the rest of the run
        </p>

        <div className="grid grid-cols-4 gap-3 justify-items-center">
          {run.activeTileTypes.filter((t) => TILE_DEFINITIONS[t]?.upgradeText).map((tileType) => {
            const def = TILE_DEFINITIONS[tileType];
            const currentLevel = run.tileUpgrades[tileType] ?? 0;
            const isSelected = selectedTile === tileType;

            const previewTooltip = (
              <div className="whitespace-nowrap" style={{ fontSize: '9px', lineHeight: 1.3 }}>
                {buildUpgradePreview(tileType, currentLevel)}
              </div>
            );
            const hasKeywords = getReferencedKeywords(def.description).length > 0;
            const keywordTooltip = hasKeywords ? <KeywordSubTooltips text={def.description} /> : undefined;
            return (
              <Tooltip key={tileType} content={previewTooltip} secondContent={keywordTooltip} position="bottom">
                <button
                  onClick={() => setSelectedTile(tileType)}
                  className={`flex flex-col items-center p-3 w-28 border-2 transition-colors ${
                    isSelected
                      ? 'border-amber-400 bg-amber-900/50'
                      : 'border-stone-600 bg-stone-800/80 hover:border-stone-400'
                  }`}
                >
                  <SpriteIcon frame={TILE_FRAMES[tileType]} scale={2} className="mb-1" />
                  <span className="text-amber-300 text-xs font-bold">{def.label}</span>
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
            onClick={() => setChoice('none')}
            className="px-4 py-2 bg-stone-700/80 text-stone-400 text-sm border border-stone-600 hover:bg-stone-600/50"
          >
            Back
          </button>
          <button
            onClick={handleConfirmUpgrade}
            disabled={!selectedTile}
            className={`px-6 py-2 text-sm border ${
              selectedTile
                ? 'bg-amber-900/60 text-amber-300 border-amber-700 hover:bg-amber-800/60'
                : 'bg-stone-700/80 text-stone-500 border-stone-600 cursor-not-allowed'
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
    <div className="flex flex-col h-full" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${import.meta.env.BASE_URL}assets/campfire_bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}><div className="flex-1 flex flex-col items-center justify-center">
      <div className="mb-4">
        <SpriteIcon frame={NODE_FRAMES.campfire} scale={3} />
      </div>
      <h2 className="text-xl text-amber-400 mb-6 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Campfire</h2>

      <div className="flex gap-4">
        <button
          onClick={handleRest}
          disabled={isFullHealth}
          className={`flex flex-col items-center p-4 w-40 border-2 ${
            isFullHealth
              ? 'border-stone-700 bg-stone-800/30 opacity-50 cursor-not-allowed'
              : 'border-stone-600 bg-stone-800/80 hover:border-green-500 hover:bg-stone-700/80'
          }`}
        >
          <SpriteIcon frame={UI_FRAMES.rest} scale={2} className="mb-1" />
          <span className="text-stone-200 text-sm font-bold">Rest</span>
          <span className="text-stone-400 text-xs mt-1">
            Heal 30% of your max HP.
          </span>
        </button>

        <button
          onClick={handleUpgrade}
          className="flex flex-col items-center p-4 w-40 border-2 border-stone-600 bg-stone-800/80 hover:border-amber-500 hover:bg-stone-700/80"
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
