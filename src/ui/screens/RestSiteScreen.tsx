import { memo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { TILE_DEFINITIONS } from '../../data/tiles';
import { TILE_FRAMES } from '../../data/spriteConfig';
import { SpriteIcon } from '../components/SpriteIcon';
import type { TileType } from '../../types/game';
import type { Screen } from '../../App';

/**
 * RestSiteScreen: choose rest (heal 30% max HP) or upgrade a tile.
 */
export const RestSiteScreen = memo(function RestSiteScreen() {
  const run = useRunStore((s) => s.run);
  const updateHealth = useRunStore((s) => s.updateHealth);
  const upgradeTile = useRunStore((s) => s.upgradeTile);
  const [choice, setChoice] = useState<'none' | 'rest' | 'upgrade' | 'upgraded'>('none');
  const [selectedTile, setSelectedTile] = useState<TileType | null>(null);

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
    setChoice('upgraded');
  };

  const handleLeave = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  // Rested
  if (choice === 'rest') {
    return (
      <div className="flex flex-col h-full bg-[#1a1a2e]/95"><div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-3xl mb-4">{'\u2618'}</div>
        <h2 className="text-xl text-amber-400 mb-2">Rested</h2>
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
      <div className="flex flex-col h-full bg-[#1a1a2e]/95"><div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-3xl mb-4">{'\u2B06'}</div>
        <h2 className="text-xl text-amber-400 mb-2">Upgraded</h2>
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
      <div className="flex flex-col h-full bg-[#1a1a2e]/95"><div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="text-xl text-amber-400 mb-2">Upgrade a Tile</h2>
        <p className="text-stone-400 text-xs mb-4">
          Permanent +1 tier for the rest of the run
        </p>

        <div className="flex flex-wrap justify-center gap-3 max-w-md">
          {run.activeTileTypes.filter((t) => t !== 'tumbleweed' && t !== 'showdown').map((tileType) => {
            const def = TILE_DEFINITIONS[tileType];
            const currentLevel = run.tileUpgrades[tileType] ?? 0;
            const isSelected = selectedTile === tileType;

            return (
              <button
                key={tileType}
                onClick={() => setSelectedTile(tileType)}
                className={`flex flex-col items-center p-3 w-28 border-2 transition-colors ${
                  isSelected
                    ? 'border-amber-400 bg-amber-900/30'
                    : 'border-stone-600 bg-stone-800/50 hover:border-stone-400'
                }`}
              >
                <SpriteIcon frame={TILE_FRAMES[tileType]} scale={2} className="mb-1" />
                <span className="text-amber-300 text-xs font-bold">{def.label}</span>
                <span className="text-stone-400" style={{ fontSize: '10px' }}>
                  Lv {currentLevel} {'\u2192'} {currentLevel + 1}
                </span>
                <span className="text-stone-500" style={{ fontSize: '10px' }}>
                  +{def.upgradeValue} per upgrade
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setChoice('none')}
            className="px-4 py-2 bg-stone-700/50 text-stone-400 text-sm border border-stone-600 hover:bg-stone-600/50"
          >
            Back
          </button>
          <button
            onClick={handleConfirmUpgrade}
            disabled={!selectedTile}
            className={`px-6 py-2 text-sm border ${
              selectedTile
                ? 'bg-amber-900/60 text-amber-300 border-amber-700 hover:bg-amber-800/60'
                : 'bg-stone-700/50 text-stone-500 border-stone-600 cursor-not-allowed'
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
    <div className="flex flex-col h-full bg-[#1a1a2e]/95"><div className="flex-1 flex flex-col items-center justify-center">
      <div className="text-3xl mb-4">
        {'\u2618'}
      </div>
      <h2 className="text-xl text-amber-400 mb-2">Campfire</h2>
      <p className="text-stone-400 text-xs mb-6">
        A moment of peace. Choose wisely.
      </p>

      <div className="flex gap-4">
        <button
          onClick={handleRest}
          disabled={isFullHealth}
          className={`flex flex-col items-center p-4 w-40 border-2 ${
            isFullHealth
              ? 'border-stone-700 bg-stone-800/30 opacity-50 cursor-not-allowed'
              : 'border-stone-600 bg-stone-800/50 hover:border-green-500 hover:bg-stone-700/50'
          }`}
        >
          <span className="text-green-400 text-lg mb-1">{'\u2665'}</span>
          <span className="text-stone-200 text-sm font-bold">Rest</span>
          <span className="text-stone-400 text-xs mt-1">
            Heal {healAmount} HP
          </span>
          <span className="text-red-400 text-xs mt-1">
            {run.health}/{run.maxHealth}
          </span>
        </button>

        <button
          onClick={handleUpgrade}
          className="flex flex-col items-center p-4 w-40 border-2 border-stone-600 bg-stone-800/50 hover:border-amber-500 hover:bg-stone-700/50"
        >
          <span className="text-amber-400 text-lg mb-1">{'\u2B06'}</span>
          <span className="text-stone-200 text-sm font-bold">Upgrade Tile</span>
          <span className="text-stone-400 text-xs mt-1">
            Permanent +1 tier
          </span>
        </button>
      </div>
    </div></div>
  );
});
