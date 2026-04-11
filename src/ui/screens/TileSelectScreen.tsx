import { memo, useMemo, useState, useRef } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { STARTER_POOL, ADDITIONAL_POOL, TILE_DEFINITIONS } from '../../data/tiles';
import { buildTileDescription } from '../components/KeywordText';
import { TILE_FRAMES } from '../../data/spriteConfig';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { createSeededRandom, seededShuffle } from '../../utils/seededRandom';
import { rollTileRewardLevel } from '../../utils/tileRewardLevel';

import type { TileType } from '../../types/game';
import type { Screen } from '../../App';

interface OfferedTile {
  type: TileType;
  level: number;
}

/**
 * TileSelectScreen: Choose a tile at run start (1 of 3 from starter pool)
 * or between acts (1 of 3 from additional pool, no repeats).
 */
export const TileSelectScreen = memo(function TileSelectScreen() {
  const run = useRunStore((s) => s.run);
  const addTileType = useRunStore((s) => s.addTileType);
  const advanceAct = useRunStore((s) => s.advanceAct);
  const [selected, setSelected] = useState<TileType | null>(null);

  // Starter selection: Act 1, player has only their 4 character tiles
  const isStarterSelection = run?.currentAct === 1 && (run?.activeTileTypes.length ?? 0) <= 4;
  const isBossReward = !isStarterSelection;
  const pool = isStarterSelection ? STARTER_POOL : ADDITIONAL_POOL;

  // Between-act selections roll levels for the next act's distribution.
  // Starter selection is always level 0.
  const targetAct = isBossReward ? (run?.currentAct ?? 1) + 1 : 1;
  const ascLevel = run?.ascensionLevel ?? 0;

  // Pick 3 random tiles from pool (excluding already-owned) with rolled levels.
  // Lock the offered tiles once generated so they don't re-roll when run state changes.
  const lockedRef = useRef<OfferedTile[] | null>(null);
  const offered: OfferedTile[] = useMemo(() => {
    if (lockedRef.current) return lockedRef.current;
    const owned = run?.activeTileTypes ?? [];
    let available = pool.filter((t) => !owned.includes(t));
    if (available.length < 3) {
      const otherPool = pool === STARTER_POOL ? ADDITIONAL_POOL : STARTER_POOL;
      const backfill = otherPool.filter((t) => !owned.includes(t) && !available.includes(t));
      available = [...available, ...backfill];
    }
    const rand = createSeededRandom(`${run?.seed ?? ''}-tileselect-${run?.currentAct ?? 1}-${owned.length}`);
    const shuffled = seededShuffle(available, rand);
    const result: OfferedTile[] = shuffled.slice(0, 3).map((type) => ({
      type,
      level: rollTileRewardLevel(targetAct, ascLevel, rand),
    }));
    lockedRef.current = result;
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTileUpgrade = useRunStore((s) => s.setTileUpgrade);

  const handleConfirm = () => {
    if (!selected) return;

    addTileType(selected);
    // Persist the rolled level if the offered card had one.
    const picked = offered.find((t) => t.type === selected);
    if (picked && picked.level > 0) setTileUpgrade(selected, picked.level);
    if (isBossReward) advanceAct();
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  return (
    <div className="flex flex-col items-center justify-center" style={{ width: 960, height: 540, backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${import.meta.env.BASE_URL}assets/backgrounds/tile_bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Title banner */}
      <div className="text-center mb-6">
        <h2 className="text-lg text-amber-400 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Choose a Tile</h2>
      </div>

      {/* Tile cards */}
      <div className="flex gap-3">
        {offered.map(({ type: tileType, level }) => {
          const def = TILE_DEFINITIONS[tileType];
          const isSelected = selected === tileType;
          const upgradeTooltip = def.upgradeText ? (
            <div className="whitespace-nowrap" style={{ fontSize: '8px', lineHeight: 1.3 }}>
              <span className="text-stone-400 font-bold">Upgrade</span>
              <span className="text-stone-400"> - </span>
              <span className="text-amber-300">{def.upgradeText}</span>
            </div>
          ) : undefined;
          return (
            <Tooltip
              key={tileType}
              content={upgradeTooltip}
              position="bottom"
            >
              <button
                onClick={() => setSelected(tileType)}
                className="flex flex-col items-center w-32 transition-all"
                style={{
                  border: `2px solid ${isSelected ? '#f59e0b' : '#44403c'}`,
                  backgroundColor: isSelected ? 'rgba(120, 53, 15, 0.75)' : 'rgba(28, 25, 23, 0.8)',
                  padding: '12px 10px',
                  transform: isSelected ? 'translateY(-4px)' : 'none',
                }}
              >
                <SpriteIcon frame={TILE_FRAMES[tileType]} scale={2} className="mb-1.5" />
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-300 text-xs font-bold">
                    {def.label}
                  </span>
                  <span className="text-yellow-400 font-bold" style={{ fontSize: '8px' }}>
                    Lv {level + 1}
                  </span>
                </div>
                <span className="text-stone-300 text-center mt-1 leading-tight" style={{ fontSize: '9px' }}>
                  {buildTileDescription(tileType, level)}
                </span>
                {def.flavor && (
                  <span className={`${isSelected ? 'text-stone-500' : 'text-stone-600'} text-center mt-1 leading-tight italic`} style={{ fontSize: '8px' }}>
                    "{def.flavor}"
                  </span>
                )}
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Confirm */}
      <button
        onClick={handleConfirm}
        disabled={!selected}
        className={`mt-10 px-5 py-1.5 text-xs border ${
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
