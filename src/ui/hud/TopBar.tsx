import { memo, useState, useEffect } from 'react';
import { useRunStore } from '../../store/runStore';
import { getActName } from '../../game/map/MapGenerator';
import { EventBus, GameEvent } from '../../game/EventBus';
import { MapScreen } from '../screens/MapScreen';
import { CombatSettingsPopup } from '../screens/SettingsScreen';
import { ConsumableSlots } from './ConsumableSlots';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { TILE_DEFINITIONS } from '../../data/tiles';
import { TILE_FRAMES, UI_FRAMES } from '../../data/spriteConfig';
import type { Act, MapNodeType } from '../../types/game';
import type { Screen } from '../../App';

/** Color class per map node type for the top-bar indicator. */
const NODE_TYPE_COLORS: Record<MapNodeType, string> = {
  combat: 'text-red-400',
  elite: 'text-amber-400',
  shop: 'text-blue-400',
  rest: 'text-green-400',
  event: 'text-purple-400',
  treasure: 'text-yellow-400',
  boss: 'text-red-500',
};

const NODE_TYPE_LABELS: Record<MapNodeType, string> = {
  combat: 'Combat',
  elite: 'Elite',
  shop: 'Shop',
  rest: 'Rest',
  event: 'Event',
  treasure: 'Treasure',
  boss: 'Boss',
};

/** Format seconds into MM:SS or H:MM:SS. */
function formatTimer(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * TopBar: act label + consumable slots (left), HP + gold (right), icon buttons (far right).
 * Rendered once by App.tsx for all in-run screens.
 * Consumable slots are always visible. Taller bar to fit them.
 */
export const TopBar = memo(function TopBar({ showMapButton }: { showMapButton?: boolean; showConsumables?: boolean }) {
  const run = useRunStore((s) => s.run);
  const act = (run?.currentAct ?? 1) as Act;
  const health = run?.health ?? 100;
  const maxHealth = run?.maxHealth ?? 100;
  const gold = run?.gold ?? 0;
  const runStartedAt = run?.runStartedAt ?? 0;
  const [showMap, setShowMap] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTiles, setShowTiles] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const endRun = useRunStore((s) => s.endRun);

  // Derive current node type
  const currentNodeType: MapNodeType | null = (() => {
    if (!run?.mapState?.currentNodeId) return null;
    const node = run.mapState.nodes.find((n) => n.id === run.mapState!.currentNodeId);
    return node?.type ?? null;
  })();

  // Update elapsed timer every second
  useEffect(() => {
    if (!runStartedAt) return;
    setElapsed(Math.floor((Date.now() - runStartedAt) / 1000));
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - runStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [runStartedAt]);

  const handleGiveUp = () => {
    setShowSettings(false);
    endRun(false);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'score' satisfies Screen);
  };

  return (
    <>
      <div className="flex justify-between items-center px-2 bg-black/50 text-[8px] font-mono pointer-events-auto" style={{ height: 28 }}>
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-bold">
            Act {act} - {getActName(act)}
          </span>
          <ConsumableSlots />
          {currentNodeType && (
            <span className={`${NODE_TYPE_COLORS[currentNodeType]} font-bold`}>
              {NODE_TYPE_LABELS[currentNodeType]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-stone-500">{formatTimer(elapsed)}</span>
          <span className="text-red-400 flex items-center gap-0.5">
            <SpriteIcon frame={UI_FRAMES.health} scale={1} />
            {health}/{maxHealth}
          </span>
          <span className="text-yellow-300 flex items-center gap-0.5">
            <SpriteIcon frame={UI_FRAMES.gold} scale={1} />
            {gold}
          </span>
          <Tooltip text="Tiles" position="bottom">
            <button onClick={() => setShowTiles((v) => !v)} className="hover:opacity-80">
              <SpriteIcon frame={UI_FRAMES.tiles} scale={1} />
            </button>
          </Tooltip>
          {showMapButton && (
            <Tooltip text="Map" position="bottom">
              <button onClick={() => setShowMap((v) => !v)} className="hover:opacity-80">
                <SpriteIcon frame={UI_FRAMES.map} scale={1} />
              </button>
            </Tooltip>
          )}
          <Tooltip text="Settings" position="bottom">
            <button onClick={() => setShowSettings(true)} className="hover:opacity-80">
              <SpriteIcon frame={UI_FRAMES.settings} scale={1} />
            </button>
          </Tooltip>
        </div>
      </div>
      {showTiles && run && (
        <TilesPopup
          activeTileTypes={run.activeTileTypes}
          tileUpgrades={run.tileUpgrades}
          onClose={() => setShowTiles(false)}
        />
      )}
      {showSettings && (
        <CombatSettingsPopup
          onClose={() => setShowSettings(false)}
          onGiveUp={handleGiveUp}
        />
      )}
      {showMap && (
        <div
          className="absolute inset-0 z-50 pointer-events-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowMap(false); }}
        >
          <MapScreen readonly onClose={() => setShowMap(false)} />
        </div>
      )}
    </>
  );
});

/** Popup overlay showing the player's active tile types. */
function TilesPopup({
  activeTileTypes,
  tileUpgrades,
  onClose,
}: {
  activeTileTypes: import('../../types/game').TileType[];
  tileUpgrades: Partial<Record<import('../../types/game').TileType, number>>;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-stone-900 border border-stone-600 p-3" style={{ minWidth: 140 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-stone-200 font-mono text-sm font-bold">Active Tiles</span>
          <button
            onClick={onClose}
            className="w-4 h-4 flex items-center justify-center bg-stone-800/80 text-red-400 font-mono font-bold border border-red-900/50 hover:bg-red-900/40"
            style={{ fontSize: '8px' }}
          >
            X
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {activeTileTypes.map((tileType) => {
            const def = TILE_DEFINITIONS[tileType];
            if (!def) return null;
            const level = tileUpgrades[tileType] ?? 0;
            return (
              <div key={tileType} className="flex items-center gap-2">
                <SpriteIcon frame={TILE_FRAMES[tileType]} scale={1} />
                <span className="text-stone-200 font-mono text-xs font-bold">{def.label}</span>
                <span className="text-amber-400 font-mono" style={{ fontSize: '10px' }}>
                  Lv {level}
                </span>
              </div>
            );
          })}
          {activeTileTypes.length === 0 && (
            <span className="text-stone-500 font-mono text-xs">No active tiles</span>
          )}
        </div>
      </div>
    </div>
  );
}
