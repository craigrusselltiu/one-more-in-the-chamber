import { memo, useMemo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { useMetaStore } from '../../store/metaStore';
import { STARTER_POOL, ADDITIONAL_POOL, TILE_DEFINITIONS } from '../../data/tiles';
import type { TileType } from '../../types/game';
import type { Screen } from '../../App';
import { getAscensionModifiers } from '../../data/ascension';

const MAX_ASCENSION = 20;

/**
 * TileSelectScreen: Choose a tile at run start (1 of 3 from starter pool)
 * or between acts (1 of 3 from additional pool, no repeats).
 *
 * Layout follows choice.jpg reference: title banner top-center,
 * cards laid out horizontally, confirm/skip at bottom.
 */
export const TileSelectScreen = memo(function TileSelectScreen() {
  const run = useRunStore((s) => s.run);
  const startRun = useRunStore((s) => s.startRun);
  const addTileType = useRunStore((s) => s.addTileType);
  const advanceAct = useRunStore((s) => s.advanceAct);
  const highestCleared = useMetaStore((s) => s.meta.highestAscensionCleared);
  const [selected, setSelected] = useState<TileType | null>(null);
  const [ascensionLevel, setAscensionLevel] = useState(0);

  const isStarterSelection = !run || run.status !== 'active';
  const pool = isStarterSelection ? STARTER_POOL : ADDITIONAL_POOL;

  // Players can select 0 through highestCleared + 1, capped at MAX_ASCENSION
  const maxSelectable = Math.min(highestCleared + 1, MAX_ASCENSION);

  // Pick 3 random tiles from pool (excluding already-owned)
  const offered = useMemo(() => {
    const owned = run?.activeTileTypes ?? [];
    const available = pool.filter((t) => !owned.includes(t));
    // Shuffle and pick 3
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [run, pool]);

  const handleConfirm = () => {
    if (!selected) return;

    if (isStarterSelection) {
      const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      startRun(seed, selected, ascensionLevel);
    } else {
      addTileType(selected);
      advanceAct();
    }
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  const title = isStarterSelection ? 'Choose Your 4th Tile' : 'Choose a New Tile';
  const subtitle = isStarterSelection
    ? 'This tile defines your early-game identity'
    : `Act ${(run?.currentAct ?? 1) + 1} begins. More tiles, more dilution.`;

  return (
    <div className="flex flex-col items-center justify-center bg-[#1a1a2e]" style={{ width: 960, height: 540 }}>
      {/* Title banner */}
      <div className="text-center mb-6">
        <h2 className="text-lg text-amber-400 font-mono font-bold">{title}</h2>
        <p className="text-[10px] text-stone-500 font-mono mt-1">{subtitle}</p>
      </div>

      {/* Tile cards */}
      <div className="flex gap-3">
        {offered.map((tileType) => {
          const def = TILE_DEFINITIONS[tileType];
          const isSelected = selected === tileType;
          return (
            <button
              key={tileType}
              onClick={() => setSelected(tileType)}
              className="flex flex-col items-center w-28 transition-all"
              style={{
                border: `2px solid ${isSelected ? '#f59e0b' : '#44403c'}`,
                backgroundColor: isSelected ? 'rgba(120, 53, 15, 0.4)' : 'rgba(28, 25, 23, 0.8)',
                padding: '8px 6px',
                transform: isSelected ? 'translateY(-4px)' : 'none',
              }}
            >
              <div
                className="w-8 h-8 rounded-sm mb-1.5"
                style={{ backgroundColor: def.color }}
              />
              <span className="text-amber-300 font-mono text-xs font-bold">
                {def.label}
              </span>
              <span className="text-stone-400 font-mono text-center mt-1 leading-tight" style={{ fontSize: '9px' }}>
                {def.description}
              </span>
              <span className="text-stone-600 font-mono mt-1.5" style={{ fontSize: '8px' }}>
                Base: {def.baseValue}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ascension selector -- only shown for new game */}
      {isStarterSelection && maxSelectable > 0 && (
        <AscensionSelector
          level={ascensionLevel}
          maxLevel={maxSelectable}
          onChange={setAscensionLevel}
        />
      )}

      {/* Confirm */}
      <button
        onClick={handleConfirm}
        disabled={!selected}
        className={`mt-5 px-5 py-1.5 font-mono text-xs border ${
          selected
            ? 'bg-amber-900/60 text-amber-300 border-amber-700 hover:bg-amber-800/60'
            : 'bg-stone-800/50 text-stone-600 border-stone-700 cursor-not-allowed'
        }`}
      >
        Confirm
      </button>
    </div>
  );
});

function AscensionSelector({
  level,
  maxLevel,
  onChange,
}: {
  level: number;
  maxLevel: number;
  onChange: (level: number) => void;
}) {
  const scoreMultiplier = (1.0 + 0.2 * level).toFixed(1);
  const mods = getAscensionModifiers(level);

  return (
    <div className="flex flex-col items-center mt-4 gap-1">
      <div className="flex items-center gap-3">
        <span className="text-stone-400 font-mono text-xs">Ascension</span>
        <button
          onClick={() => onChange(Math.max(0, level - 1))}
          disabled={level <= 0}
          className={`w-5 h-5 flex items-center justify-center font-mono text-xs border ${
            level > 0
              ? 'text-amber-300 border-amber-700 bg-amber-900/40 hover:bg-amber-800/50'
              : 'text-stone-600 border-stone-700 bg-stone-800/30 cursor-not-allowed'
          }`}
        >
          -
        </button>
        <span className="text-amber-300 font-mono text-sm w-6 text-center font-bold">
          {level}
        </span>
        <button
          onClick={() => onChange(Math.min(maxLevel, level + 1))}
          disabled={level >= maxLevel}
          className={`w-5 h-5 flex items-center justify-center font-mono text-xs border ${
            level < maxLevel
              ? 'text-amber-300 border-amber-700 bg-amber-900/40 hover:bg-amber-800/50'
              : 'text-stone-600 border-stone-700 bg-stone-800/30 cursor-not-allowed'
          }`}
        >
          +
        </button>
        {level > 0 && (
          <span className="text-stone-500 font-mono" style={{ fontSize: '10px' }}>
            Score x{scoreMultiplier}
          </span>
        )}
      </div>
      {level > 0 && (
        <div className="flex gap-3 text-stone-500 font-mono" style={{ fontSize: '9px' }}>
          <span>HP +{Math.round((mods.enemyHpMultiplier - 1) * 100)}%</span>
          <span>DMG +{Math.round((mods.enemyDamageMultiplier - 1) * 100)}%</span>
          <span>Gold -{Math.round((1 - mods.goldMultiplier) * 100)}%</span>
          <span>Prices +{Math.round((mods.shopPriceMultiplier - 1) * 100)}%</span>
        </div>
      )}
    </div>
  );
}
