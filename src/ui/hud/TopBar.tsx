import { memo, useState, useEffect } from 'react';
import { useRunStore } from '../../store/runStore';
import { useCombatStore } from '../../store/combatStore';
import { getActName } from '../../game/map/MapGenerator';
import { EventBus, GameEvent } from '../../game/EventBus';
import { MapScreen } from '../screens/MapScreen';
import { CombatSettingsPopup } from '../screens/SettingsScreen';
import { ConsumableSlots } from './ConsumableSlots';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { KeywordSubTooltips, getReferencedKeywords, buildTileDescription } from '../components/KeywordText';
import { TILE_DEFINITIONS } from '../../data/tiles';
import { TILE_FRAMES, UI_FRAMES } from '../../data/spriteConfig';
import type { Act, MapNodeType } from '../../types/game';
import type { Screen } from '../../App';

/** Color class per map node type for the top-bar indicator. */
const NODE_TYPE_COLORS: Record<MapNodeType, string> = {
  combat: 'text-red-400',
  elite: 'text-amber-400',
  merchant: 'text-blue-400',
  campfire: 'text-green-400',
  event: 'text-purple-400',
  artifact: 'text-yellow-400',
  boss: 'text-red-500',
};

const NODE_TYPE_LABELS: Record<MapNodeType, string> = {
  combat: 'Combat',
  elite: 'Elite',
  merchant: 'Merchant',
  campfire: 'Campfire',
  event: 'Event',
  artifact: 'Artifact',
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
export const TopBar = memo(function TopBar({ mapDisabled }: { showMapButton?: boolean; showConsumables?: boolean; mapDisabled?: boolean }) {
  const run = useRunStore((s) => s.run);
  const act = (run?.currentAct ?? 1) as Act;
  const health = run?.health ?? 100;
  const maxHealth = run?.maxHealth ?? 100;
  const gold = run?.gold ?? 0;
  const wantedLevel = run?.wantedLevel ?? 0;
  const playTimeSeconds = run?.playTimeSeconds ?? 0;
  const [showMap, setShowMap] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTiles, setShowTiles] = useState(false);
  const mirageType = useCombatStore((s) => s.mirageType);
  const jackhammerCombatLevel = useCombatStore((s) => s.jackhammerCombatLevel);
  const [seedCopied, setSeedCopied] = useState(false);
  const [elapsed, setElapsed] = useState(playTimeSeconds);
  const endRun = useRunStore((s) => s.endRun);
  const tickPlayTime = useRunStore((s) => s.tickPlayTime);

  // Derive current node type
  const currentNodeType: MapNodeType | null = (() => {
    if (!run?.mapState?.currentNodeId) return null;
    const node = run.mapState.nodes.find((n) => n.id === run.mapState!.currentNodeId);
    return node?.type ?? null;
  })();

  // Tick play time every second (only while TopBar is mounted = player is in-run)
  useEffect(() => {
    setElapsed(playTimeSeconds);
    const id = setInterval(() => {
      tickPlayTime();
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleGiveUp = () => {
    setShowSettings(false);
    endRun(false);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'score' satisfies Screen);
  };

  const handleMainMenu = () => {
    setShowSettings(false);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  const seed = run?.seed ?? '';

  return (
    <>
      <div className="relative z-20 flex justify-between items-center px-2 bg-black/50 text-[8px] pointer-events-auto" style={{ height: 28 }}>
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-bold">
            Act {act} - {getActName(act)}
          </span>
          <div style={{ position: 'relative', top: 2 }}>
            <ConsumableSlots />
          </div>
          {currentNodeType && (
            <span className={`${NODE_TYPE_COLORS[currentNodeType]} font-bold`}>
              {NODE_TYPE_LABELS[currentNodeType]}
            </span>
          )}
        </div>
        {wantedLevel > 0 && (
          <span className="absolute left-1/2 -translate-x-1/2 text-stone-500 font-bold z-10">Wanted Level {wantedLevel}</span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-stone-500">{formatTimer(elapsed)}</span>
          <Tooltip text="Health" position="bottom">
            <span className="text-red-400 flex items-center gap-0.5 font-bold">
              <SpriteIcon frame={UI_FRAMES.health} scale={1} />
              {health}/{maxHealth}
            </span>
          </Tooltip>
          <Tooltip text="Gold" position="bottom">
            <span className="text-yellow-300 flex items-center gap-0.5 font-bold">
              <SpriteIcon frame={UI_FRAMES.gold} scale={1} />
              {gold}
            </span>
          </Tooltip>
          <Tooltip text="Tiles" position="bottom">
            <button onClick={() => setShowTiles((v) => !v)} className="hover:opacity-80">
              <SpriteIcon frame={UI_FRAMES.tiles} scale={1} />
            </button>
          </Tooltip>
          <Tooltip text="Map" position="bottom">
            <button
              onClick={() => !mapDisabled && setShowMap((v) => !v)}
              className={mapDisabled ? 'opacity-30' : 'hover:opacity-80'}
              style={mapDisabled ? { cursor: 'default' } : undefined}
            >
              <SpriteIcon frame={UI_FRAMES.map} scale={1} />
            </button>
          </Tooltip>
          <Tooltip text="Settings" position="bottom">
            <button onClick={() => setShowSettings(true)} className="hover:opacity-80">
              <SpriteIcon frame={UI_FRAMES.settings} scale={1} />
            </button>
          </Tooltip>
        </div>
      </div>
      {/* Seed indicator — absolute so it doesn't affect layout */}
      {seed && (
        <div className="absolute z-0 left-2 pointer-events-auto" style={{ bottom: 4, fontSize: '7px' }}>
          <Tooltip text={seedCopied ? 'Copied!' : 'Copy seed'} position="bottom">
            <button
              className="text-white/40 hover:text-white/70"
              data-no-click-sfx
              onClick={() => {
                navigator.clipboard.writeText(seed.toUpperCase());
                setSeedCopied(true);
                setTimeout(() => setSeedCopied(false), 2000);
              }}
            >
              Seed: {seed.toUpperCase()}
            </button>
          </Tooltip>
        </div>
      )}
      {showTiles && run && (
        <TilesPopup
          activeTileTypes={run.activeTileTypes}
          tileUpgrades={run.tileUpgrades}
          mirageType={mirageType}
          poisonBonus={(run.traitCounts?.rattlesnake ?? 0) >= 2 ? 1 : 0}
          jackhammerCombatLevel={jackhammerCombatLevel}
          onClose={() => setShowTiles(false)}
        />
      )}
      {showSettings && (
        <CombatSettingsPopup
          onClose={() => setShowSettings(false)}
          onGiveUp={handleGiveUp}
          onMainMenu={handleMainMenu}
        />
      )}
      {showMap && (
        <div
          className="absolute inset-0 z-50 pointer-events-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowMap(false); }}
        >
          <MapScreen readonly />
          {/* Close button positioned at top-right near the map icon */}
          <button
            onClick={() => setShowMap(false)}
            className="absolute flex items-center justify-center bg-stone-800/80 text-red-400 font-bold border border-red-900/50 hover:bg-red-900/40"
            style={{ top: 6, right: 34, width: 16, height: 16, fontSize: '8px' }}
          >
            X
          </button>
        </div>
      )}
    </>
  );
});

/** Popup overlay showing the player's active tile types. */
function TilesPopup({
  activeTileTypes,
  tileUpgrades,
  mirageType,
  poisonBonus,
  jackhammerCombatLevel,
  onClose,
}: {
  activeTileTypes: import('../../types/game').TileType[];
  tileUpgrades: Partial<Record<import('../../types/game').TileType, number>>;
  mirageType: import('../../types/game').TileType | null;
  poisonBonus: number;
  jackhammerCombatLevel: number;
  onClose: () => void;
}) {
  const getBonus = (t: import('../../types/game').TileType) => {
    if (poisonBonus > 0 && (t === 'waste' || t === 'rattler')) return poisonBonus;
    if (t === 'jackhammer' && jackhammerCombatLevel > 0) return jackhammerCombatLevel;
    return 0;
  };
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-sm p-3"
        style={{ minWidth: 180, backgroundColor: 'rgba(28, 25, 23, 0.95)', boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-center mb-3">
          <span
            className="text-[11px] text-amber-400 font-bold uppercase"
            style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill', letterSpacing: '1px' }}
          >
            Tiles
          </span>
          <button
            onClick={onClose}
            className="absolute right-0 w-4 h-4 flex items-center justify-center rounded-sm bg-red-900 text-red-200 hover:bg-red-800 active:translate-y-px transition-transform"
            style={{ fontSize: '8px', boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
          >
            X
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {activeTileTypes.flatMap((tileType) => {
            const def = TILE_DEFINITIONS[tileType];
            if (!def) return [];
            const baseLevel = tileUpgrades[tileType] ?? 0;
            const bonus = getBonus(tileType);
            const level = baseLevel + bonus;
            const tooltipContent = (
              <div className="flex flex-col gap-0.5">
                <div className="font-bold text-amber-400" style={{ fontSize: '10px' }}>{def.label}</div>
                <div className="text-stone-200 whitespace-nowrap" style={{ fontSize: '9px' }}>{buildTileDescription(tileType, level)}</div>
                {def.flavor && (
                  <div className="text-stone-500 italic whitespace-nowrap" style={{ fontSize: '8px' }}>"{def.flavor}"</div>
                )}
              </div>
            );
            const hasKeywords = getReferencedKeywords(def.description).length > 0;
            const keywordTooltip = hasKeywords ? <KeywordSubTooltips text={def.description} /> : undefined;
            const items = [
              <Tooltip key={tileType} content={tooltipContent} secondContent={keywordTooltip} position="bottom" align="left">
                <div className="flex items-center gap-2">
                  <SpriteIcon frame={TILE_FRAMES[tileType]} scale={1} />
                  <span className="text-amber-300 text-xs font-bold">{def.label}</span>
                  <span className="text-yellow-400" style={{ fontSize: '8px' }}>
                    Lv {baseLevel + 1}{bonus > 0 ? ` (+${bonus})` : ''}
                  </span>
                </div>
              </Tooltip>,
            ];
            // Show mirage transformed tile right after the Mirage entry
            if (tileType === 'mirage' && mirageType) {
              const mDef = TILE_DEFINITIONS[mirageType];
              if (mDef) {
                // Mirage adds its upgrade level to the transformed tile's level.
                const mLevel = (tileUpgrades[mirageType] ?? 0) + (tileUpgrades['mirage'] ?? 0) + getBonus(mirageType);
                const mTooltip = (
                  <div className="flex flex-col gap-0.5">
                    <div className="font-bold text-amber-400" style={{ fontSize: '10px' }}>{mDef.label}</div>
                    <div className="text-stone-200 whitespace-nowrap" style={{ fontSize: '9px' }}>{buildTileDescription(mirageType, mLevel)}</div>
                    {mDef.flavor && (
                      <div className="text-stone-500 italic whitespace-nowrap" style={{ fontSize: '8px' }}>"{mDef.flavor}"</div>
                    )}
                  </div>
                );
                const mHasKeywords = getReferencedKeywords(mDef.description).length > 0;
                const mKeywordTooltip = mHasKeywords ? <KeywordSubTooltips text={mDef.description} /> : undefined;
                items.push(
                  <Tooltip key="mirage-transformed" content={mTooltip} secondContent={mKeywordTooltip} position="bottom" align="left">
                    <div className="flex items-center gap-2 opacity-50">
                      <SpriteIcon frame={TILE_FRAMES[mirageType]} scale={1} />
                      <span className="text-stone-400 text-xs">{mDef.label} <span className="text-stone-500">(Mirage)</span></span>
                    </div>
                  </Tooltip>,
                );
              }
            }
            return items;
          })}
          {activeTileTypes.length === 0 && (
            <span className="text-stone-500 text-xs">No active tiles</span>
          )}
        </div>
      </div>
    </div>
  );
}
