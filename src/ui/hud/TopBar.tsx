import { memo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRunStore } from '../../store/runStore';
import { FullScreenOverlay } from '../components/FullScreenOverlay';
import { useCombatStore } from '../../store/combatStore';
import { EventBus, GameEvent } from '../../game/EventBus';
import { MapScreen } from '../screens/MapScreen';
import { CombatSettingsPopup } from '../screens/SettingsScreen';
import { ConsumableSlots } from './ConsumableSlots';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { KeywordSubTooltips, getReferencedKeywords, buildTileDescription } from '../components/KeywordText';
import { TILE_DEFINITIONS } from '../../data/tiles';
import { TILE_FRAMES, UI_FRAMES } from '../../data/spriteConfig';
import type { Act, MapNodeType, TileType } from '../../types/game';
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
type TopBarProps = {
  showMapButton?: boolean;
  showConsumables?: boolean;
  mapDisabled?: boolean;
  deadeyeCursorEnabled?: boolean;
};

export const TopBar = memo(function TopBar({ showConsumables = false, mapDisabled, deadeyeCursorEnabled = false }: TopBarProps) {
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
  const combatActiveTileTypes = useCombatStore((s) => s.activeTileTypes);
  const combatTileUpgrades = useCombatStore((s) => s.tileUpgrades);
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

  // Tell the combat store (and therefore the game layer) whether a UI overlay is open.
  const setUiOverlayOpen = useCombatStore((s) => s.setUiOverlayOpen);
  const isDeadeyeActive = useCombatStore((s) => s.isDeadeyeActive);
  const canDeadeyeShootEnemy = useCombatStore((s) => s.canDeadeyeShootEnemy);
  useEffect(() => {
    const anyOpen = showMap || showSettings || showTiles;
    setUiOverlayOpen(anyOpen);
    return () => setUiOverlayOpen(false);
  }, [showMap, showSettings, showTiles, setUiOverlayOpen]);

  useEffect(() => {
    const anyOpen = showMap || showSettings || showTiles;
    if (deadeyeCursorEnabled && !anyOpen && isDeadeyeActive) {
      document.body.classList.toggle('cursor-crosshair-alt', canDeadeyeShootEnemy);
      document.body.classList.toggle('cursor-crosshair', !canDeadeyeShootEnemy);
    } else {
      document.body.classList.remove('cursor-crosshair');
      document.body.classList.remove('cursor-crosshair-alt');
    }
    return () => {
      document.body.classList.remove('cursor-crosshair');
      document.body.classList.remove('cursor-crosshair-alt');
    };
  }, [deadeyeCursorEnabled, showMap, showSettings, showTiles, isDeadeyeActive, canDeadeyeShootEnemy]);

  const handleGiveUp = () => {
    setShowSettings(false);
    endRun(false);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'score' satisfies Screen);
  };

  const handleMainMenu = () => {
    setShowSettings(false);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  const tilePopupData = run
    ? getTilePopupData(
      showConsumables,
      run.activeTileTypes,
      run.tileUpgrades,
      combatActiveTileTypes,
      combatTileUpgrades,
      mirageType,
    )
    : null;

  return (
    <>
      <div className="relative z-20 flex justify-between items-center px-2 bg-black/50 text-[8px] pointer-events-auto" style={{ height: 28 }}>
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-bold">
            Act {act}
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
      {showTiles && run && portalToScaledUi(
        <TilesPopup
          activeTileTypes={tilePopupData?.activeTileTypes ?? run.activeTileTypes}
          tileUpgrades={tilePopupData?.tileUpgrades ?? run.tileUpgrades}
          poisonBonus={(run.traitCounts?.rattlesnake ?? 0) >= 2 ? 1 : 0}
          onClose={() => setShowTiles(false)}
        />,
      )}
      {showSettings && portalToScaledUi(
        <CombatSettingsPopup
          onClose={() => setShowSettings(false)}
          onGiveUp={handleGiveUp}
          onMainMenu={handleMainMenu}
        />,
      )}
      {showMap && (
        <FullScreenOverlay
          backdropClass=""
          zIndex={140}
          dimAlpha={0.3}
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}assets/backgrounds/crate_bg.png)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
          }}
          onBackdropClick={() => setShowMap(false)}
        >
          <div className="relative" style={{ width: 960, height: 540 }}>
            <MapScreen readonly />
            <button
              onClick={() => setShowMap(false)}
              className="absolute w-4 h-4 flex items-center justify-center rounded-sm bg-red-900 text-red-200 hover:bg-red-800 active:translate-y-px transition-transform"
              style={{ top: 6, right: 34, fontSize: '8px', boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
            >
              X
            </button>
          </div>
        </FullScreenOverlay>
      )}
    </>
  );
});

/** Render `node` into the scaled-UI overlay so absolute/inset-0 positioning
 *  matches the original 960x540 design space, even when the caller (TopBar)
 *  has been hoisted into the viewport-wide top-bar container. */
function portalToScaledUi(node: React.ReactNode): React.ReactNode {
  const target = typeof document !== 'undefined' ? document.getElementById('scaled-ui-root') : null;
  if (!target) return node;
  return createPortal(node, target);
}

/** Popup overlay showing the player's active tile types. */
function TilesPopup({
  activeTileTypes,
  tileUpgrades,
  poisonBonus,
  onClose,
}: {
  activeTileTypes: TileType[];
  tileUpgrades: Partial<Record<TileType, number>>;
  poisonBonus: number;
  onClose: () => void;
}) {
  const getBonus = (t: TileType) => {
    if (poisonBonus > 0 && (t === 'waste' || t === 'rattler')) return poisonBonus;
    return 0;
  };
  return (
    <FullScreenOverlay backdropClass="bg-black/40" zIndex={140} onBackdropClick={onClose}>
      <div
        className="rounded-sm p-3"
        style={{ minWidth: 180, backgroundColor: 'rgba(28, 25, 23, 0.95)', boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
      >
        <div className="relative flex items-center justify-center mb-3">
          <span
            className="font-title text-sm text-amber-400 font-bold uppercase"
            style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill' }}
          >
            TILES
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
            return items;
          })}
          {activeTileTypes.length === 0 && (
            <span className="text-stone-500 text-xs">No active tiles</span>
          )}
        </div>
      </div>
    </FullScreenOverlay>
  );
}

function getTilePopupData(
  isCombat: boolean,
  runActiveTileTypes: TileType[],
  runTileUpgrades: Partial<Record<TileType, number>>,
  combatActiveTileTypes: TileType[],
  combatTileUpgrades: Partial<Record<TileType, number>>,
  mirageType: TileType | null,
): { activeTileTypes: TileType[]; tileUpgrades: Partial<Record<TileType, number>> } {
  if (!isCombat || combatActiveTileTypes.length === 0) {
    return { activeTileTypes: runActiveTileTypes, tileUpgrades: runTileUpgrades };
  }

  const tileUpgrades = { ...combatTileUpgrades };
  const activeTileTypes = combatActiveTileTypes.map((tileType) => {
    if (tileType !== 'mirage' || !mirageType) return tileType;

    tileUpgrades[mirageType] = (tileUpgrades[mirageType] ?? 0) + (tileUpgrades.mirage ?? 0);
    return mirageType;
  });

  return {
    activeTileTypes: Array.from(new Set(activeTileTypes)),
    tileUpgrades,
  };
}
