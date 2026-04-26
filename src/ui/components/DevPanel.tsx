import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ARTIFACTS } from '../../data/artifacts';
import { TILE_DEFINITIONS } from '../../data/tiles';
import { EventBus, GameEvent } from '../../game/EventBus';
import { forceSaveRun } from '../../services/runPersistence';
import { useRunStore } from '../../store/runStore';
import type { ArtifactInstance, Act, TileType } from '../../types/game';
import type { TileHazardState } from '../../types/tiles';
import type { DevBoardEditOperation } from '../../types/devControls';
import type { Screen } from '../../App';

interface DevPanelProps {
  open: boolean;
  screen: Screen;
  onClose: () => void;
}

const TILE_TYPES = Object.keys(TILE_DEFINITIONS) as TileType[];
const FIELD_CLASS = 'min-w-0 w-full bg-stone-950 border border-amber-700/70 text-amber-100 rounded-sm px-1.5 py-0.5 outline-none';
const BUTTON_CLASS = 'min-w-0 rounded-sm bg-amber-800 px-1.5 py-0.5 text-amber-100 hover:bg-amber-700 disabled:opacity-45 disabled:hover:bg-amber-800 whitespace-nowrap';
const DANGER_BUTTON_CLASS = 'min-w-0 rounded-sm bg-red-900 px-1.5 py-0.5 text-red-100 hover:bg-red-800 disabled:opacity-45 disabled:hover:bg-red-900 whitespace-nowrap';
const SECTION_CLASS = 'min-w-0 rounded-sm bg-stone-900/75 p-1.5';
const PANEL_WIDTH = 270;
const PANEL_HEIGHT = 462;
const UI_WIDTH = 960;
const UI_HEIGHT = 540;
const PANEL_EDGE_GAP = 4;
const PANEL_TOP_GAP = 66;

function saveSoon(): void {
  queueMicrotask(() => forceSaveRun());
}

function buildArtifactInstance(id: string): ArtifactInstance | null {
  const def = ARTIFACTS.find((artifact) => artifact.id === id);
  if (!def) return null;
  return { id: def.id, tags: def.tags };
}

function emitBoardEdit(operation: DevBoardEditOperation | null): void {
  EventBus.emit(GameEvent.DEV_SET_BOARD_EDIT, operation);
}

export function DevPanel({ open, screen, onClose }: DevPanelProps) {
  const run = useRunStore((s) => s.run);
  const store = useRunStore();
  const isCombat = screen === 'combat';
  const abilityThreshold = run?.character === 'reno' ? 7 : 10;

  const [gold, setGold] = useState(0);
  const [hp, setHp] = useState(1);
  const [maxHp, setMaxHp] = useState(1);
  const [abilityCharge, setAbilityCharge] = useState(0);
  const [deckTile, setDeckTile] = useState<TileType>('bullet');
  const [deckLevel, setDeckLevel] = useState(0);
  const [boardTile, setBoardTile] = useState<TileType>('bullet');
  const [tileLevelTarget, setTileLevelTarget] = useState<TileType>('bullet');
  const [tileLevel, setTileLevel] = useState(0);
  const [artifactId, setArtifactId] = useState(ARTIFACTS[0]?.id ?? '');
  const [boardModeLabel, setBoardModeLabel] = useState('None');
  const [lockHits, setLockHits] = useState(1);
  const [bombCountdown, setBombCountdown] = useState(3);
  const [panelPos, setPanelPos] = useState(() => ({
    x: UI_WIDTH - PANEL_WIDTH - PANEL_EDGE_GAP,
    y: PANEL_TOP_GAP,
  }));
  const dragRef = useRef<{ dx: number; dy: number; scale: number } | null>(null);

  const activeTiles = useMemo(() => run?.activeTileTypes ?? [], [run?.activeTileTypes]);
  const ownedArtifactIds = useMemo(() => new Set(run?.artifacts.map((artifact) => artifact.id) ?? []), [run?.artifacts]);

  useEffect(() => {
    if (!run) return;
    setGold(run.gold);
    setHp(run.health);
    setMaxHp(run.maxHealth);
    setAbilityCharge(run.abilityCharge);
    const firstTile = run.activeTileTypes[0] ?? 'bullet';
    setDeckTile(firstTile);
    setTileLevelTarget(firstTile);
    setDeckLevel(run.tileUpgrades[firstTile] ?? 0);
    setTileLevel(run.tileUpgrades[firstTile] ?? 0);
  }, [run?.id]);

  // Seed input fields when the panel opens. Intentionally NOT reactive to
  // run state changes -- the run ticks (e.g. playTimeSeconds) every second,
  // which would otherwise overwrite anything the user is typing.
  useEffect(() => {
    if (!open) return;
    const r = useRunStore.getState().run;
    if (!r) return;
    setGold(r.gold);
    setHp(r.health);
    setMaxHp(r.maxHealth);
    setAbilityCharge(r.abilityCharge);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || isCombat) return;
    emitBoardEdit(null);
    setBoardModeLabel('None');
  }, [open, isCombat]);

  useEffect(() => {
    if (!open) {
      emitBoardEdit(null);
      setBoardModeLabel('None');
    }
  }, [open]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const root = document.getElementById('scaled-ui-root');
      const bounds = root?.getBoundingClientRect();
      if (!bounds) return;
      const x = (event.clientX - bounds.left) / drag.scale - drag.dx;
      const y = (event.clientY - bounds.top) / drag.scale - drag.dy;
      setPanelPos({
        x: Math.max(PANEL_EDGE_GAP, Math.min(UI_WIDTH - PANEL_WIDTH - PANEL_EDGE_GAP, x)),
        y: Math.max(PANEL_EDGE_GAP, Math.min(UI_HEIGHT - PANEL_HEIGHT - PANEL_EDGE_GAP, y)),
      });
    };

    const handlePointerUp = () => {
      dragRef.current = null;
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const root = document.getElementById('scaled-ui-root');
    const bounds = root?.getBoundingClientRect();
    if (!bounds) return;
    const scale = bounds.width / UI_WIDTH;
    dragRef.current = {
      dx: (event.clientX - bounds.left) / scale - panelPos.x,
      dy: (event.clientY - bounds.top) / scale - panelPos.y,
      scale,
    };
    event.preventDefault();
  };

  if (!open) return null;

  const applyGold = () => {
    if (!run) return;
    if (isCombat) EventBus.emit(GameEvent.DEV_SET_GOLD, gold);
    else store.devSetGold(gold);
    saveSoon();
  };

  const applyHp = () => {
    if (!run) return;
    if (isCombat) EventBus.emit(GameEvent.DEV_SET_HP, hp, maxHp);
    else store.devSetHealth(hp, maxHp);
    saveSoon();
  };

  const applyAbility = (charge = abilityCharge) => {
    if (!run) return;
    if (isCombat) EventBus.emit(GameEvent.DEV_SET_ABILITY_CHARGE, charge);
    else store.devSetAbilityCharge(charge);
    saveSoon();
  };

  const skipToAct = (act: Act) => {
    if (!run) return;
    store.devSkipToAct(act);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
    saveSoon();
  };

  const addDeckTile = () => {
    if (!run) return;
    if (isCombat) EventBus.emit(GameEvent.DEV_ADD_TILE, deckTile, deckLevel);
    else {
      store.addTileType(deckTile);
      store.setTileUpgrade(deckTile, deckLevel);
      store.markDevControlsUsed();
    }
    saveSoon();
  };

  const removeDeckTile = () => {
    if (!run) return;
    if (isCombat) EventBus.emit(GameEvent.DEV_REMOVE_TILE, deckTile);
    else {
      store.removeTileType(deckTile);
      store.markDevControlsUsed();
    }
    saveSoon();
  };

  const applyTileLevel = () => {
    if (!run) return;
    if (isCombat) EventBus.emit(GameEvent.DEV_SET_TILE_LEVEL, tileLevelTarget, tileLevel);
    else {
      store.setTileUpgrade(tileLevelTarget, tileLevel);
      store.markDevControlsUsed();
    }
    saveSoon();
  };

  const addArtifact = () => {
    const artifact = buildArtifactInstance(artifactId);
    if (!artifact) return;
    if (isCombat) EventBus.emit(GameEvent.DEV_ADD_ARTIFACT, artifact);
    else store.devAddArtifact(artifact);
    saveSoon();
  };

  const removeArtifact = (id = artifactId) => {
    if (!id) return;
    if (isCombat) EventBus.emit(GameEvent.DEV_REMOVE_ARTIFACT, id);
    else store.devRemoveArtifact(id);
    saveSoon();
  };

  const setBoardOperation = (label: string, operation: DevBoardEditOperation | null) => {
    if (!isCombat) return;
    setBoardModeLabel(label);
    emitBoardEdit(operation);
  };

  const setHazardOperation = (label: string, hazard: TileHazardState) => {
    setBoardOperation(label, { kind: 'hazard', hazard });
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1000]"
    >
      <div
        className="pointer-events-auto absolute overflow-hidden rounded-sm bg-stone-950/80 text-amber-100"
        style={{
          left: panelPos.x,
          top: panelPos.y,
          width: PANEL_WIDTH,
          height: PANEL_HEIGHT,
        }}
      >
        <div className="flex items-center justify-between gap-2 bg-stone-900/85 px-2.5 py-1.5">
          <div className="min-w-0 flex-1 cursor-move select-none" onPointerDown={startDrag}>
            <div className="text-xs font-bold uppercase text-amber-300">Dev Controls</div>
            <div className="text-[10px] uppercase text-amber-600">F9 or Ctrl+Shift+D - dev accounts only</div>
          </div>
          <button className={BUTTON_CLASS} onClick={onClose}>CLOSE</button>
        </div>

        <div className="dev-scrollbar h-[calc(100%-42px)] overflow-y-auto overflow-x-hidden bg-stone-950/55 px-2.5 py-2.5">
          {!run && (
            <div className="rounded-sm bg-stone-900 p-3 text-xs text-amber-300">
              Start or continue a run to use dev controls.
            </div>
          )}

          {run && (
          <div className="grid grid-cols-1 gap-2 text-[11px]">
          <section className={SECTION_CLASS}>
            <div className="mb-2 font-bold uppercase text-amber-300">Run</div>
            <div className="mb-2 grid grid-cols-3 gap-1">
              {[1, 2, 3].map((act) => (
                <button key={act} className={BUTTON_CLASS} onClick={() => skipToAct(act as Act)}>
                  ACT {act}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <label className="flex items-center gap-2">
                <span className="w-16 uppercase text-amber-500">Gold</span>
                <input className={`${FIELD_CLASS} min-w-0 flex-1`} type="number" value={gold} onChange={(e) => setGold(Number(e.target.value))} />
              </label>
              <button className={BUTTON_CLASS} onClick={applyGold}>SET</button>

              <label className="flex items-center gap-2">
                <span className="w-16 uppercase text-amber-500">HP</span>
                <input className={`${FIELD_CLASS} min-w-0 flex-1`} type="number" value={hp} onChange={(e) => setHp(Number(e.target.value))} />
              </label>
              <button className={BUTTON_CLASS} onClick={applyHp}>SET</button>

              <label className="flex items-center gap-2">
                <span className="w-16 uppercase text-amber-500">Max HP</span>
                <input className={`${FIELD_CLASS} min-w-0 flex-1`} type="number" value={maxHp} onChange={(e) => setMaxHp(Number(e.target.value))} />
              </label>
              <button className={BUTTON_CLASS} onClick={applyHp}>SET</button>

              <label className="flex items-center gap-2">
                <span className="w-16 uppercase text-amber-500">Ability</span>
                <input className={`${FIELD_CLASS} min-w-0 flex-1`} type="number" value={abilityCharge} onChange={(e) => setAbilityCharge(Number(e.target.value))} />
              </label>
              <button className={BUTTON_CLASS} onClick={() => applyAbility()}>SET</button>
            </div>
            <button className={`${BUTTON_CLASS} mt-2 w-full`} onClick={() => applyAbility(abilityThreshold)}>
              CHARGE ABILITY
            </button>
          </section>

          <section className={SECTION_CLASS}>
            <div className="mb-2 font-bold uppercase text-amber-300">Deck</div>
            <select className={`${FIELD_CLASS} mb-2 w-full`} value={deckTile} onChange={(e) => setDeckTile(e.target.value as TileType)}>
              {TILE_TYPES.map((type) => (
                <option key={type} value={type}>{TILE_DEFINITIONS[type].label}</option>
              ))}
            </select>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
              <input className={FIELD_CLASS} type="number" min={0} value={deckLevel} onChange={(e) => setDeckLevel(Number(e.target.value))} />
              <button className={BUTTON_CLASS} onClick={addDeckTile}>ADD</button>
              <button className={DANGER_BUTTON_CLASS} onClick={removeDeckTile}>REMOVE</button>
            </div>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_70px_auto] gap-2">
              <select className={FIELD_CLASS} value={tileLevelTarget} onChange={(e) => {
                const type = e.target.value as TileType;
                setTileLevelTarget(type);
                setTileLevel(run.tileUpgrades[type] ?? 0);
              }}>
                {(activeTiles.length > 0 ? activeTiles : TILE_TYPES).map((type) => (
                  <option key={type} value={type}>{TILE_DEFINITIONS[type].label}</option>
                ))}
              </select>
              <input className={FIELD_CLASS} type="number" min={0} value={tileLevel} onChange={(e) => setTileLevel(Number(e.target.value))} />
              <button className={BUTTON_CLASS} onClick={applyTileLevel}>LEVEL</button>
            </div>
          </section>

          <section className={SECTION_CLASS}>
            <div className="mb-2 font-bold uppercase text-amber-300">Artifacts</div>
            <select className={`${FIELD_CLASS} mb-2 w-full`} value={artifactId} onChange={(e) => setArtifactId(e.target.value)}>
              {ARTIFACTS.map((artifact) => (
                <option key={artifact.id} value={artifact.id}>
                  {ownedArtifactIds.has(artifact.id) ? '* ' : ''}{artifact.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <button className={BUTTON_CLASS} onClick={addArtifact}>GIVE</button>
              <button className={DANGER_BUTTON_CLASS} onClick={() => removeArtifact()}>REMOVE</button>
            </div>
          </section>

          <section className={SECTION_CLASS}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-bold uppercase text-amber-300">Board Painter</div>
              <div className="truncate text-[10px] uppercase text-amber-500">{isCombat ? boardModeLabel : 'Combat only'}</div>
            </div>
            <div className="mb-2 text-[10px] uppercase leading-snug text-amber-600">
              Pick an operation, then click a board tile. SET TILE uses the tile selected below.
            </div>
            <select className={`${FIELD_CLASS} mb-2 w-full`} value={boardTile} onChange={(e) => setBoardTile(e.target.value as TileType)} disabled={!isCombat}>
              {TILE_TYPES.map((type) => (
                <option key={type} value={type}>{TILE_DEFINITIONS[type].label}</option>
              ))}
            </select>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <button className={BUTTON_CLASS} disabled={!isCombat} onClick={() => setBoardOperation(`Set ${TILE_DEFINITIONS[boardTile].label}`, { kind: 'set_tile', tileType: boardTile })}>
                SET TILE
              </button>
              <button className={BUTTON_CLASS} disabled={!isCombat} onClick={() => setBoardOperation('Clear Effects', { kind: 'clear_effects' })}>
                CLEAR
              </button>
              <button className={BUTTON_CLASS} disabled={!isCombat} onClick={() => setBoardOperation('Explosive', { kind: 'special', special: 'explosive' })}>
                EXPLOSIVE
              </button>
              <button className={BUTTON_CLASS} disabled={!isCombat} onClick={() => setBoardOperation('Showdown', { kind: 'special', special: 'showdown' })}>
                SHOWDOWN
              </button>
              <button className={BUTTON_CLASS} disabled={!isCombat} onClick={() => setBoardOperation('Shadow', { kind: 'special', special: 'shadow' })}>
                SHADOW
              </button>
              <button className={BUTTON_CLASS} disabled={!isCombat} onClick={() => setBoardOperation('No Special', { kind: 'special', special: 'none' })}>
                NONE
              </button>
            </div>
            <div className="mb-2 grid grid-cols-[1fr_70px] gap-2">
              <button className={BUTTON_CLASS} disabled={!isCombat} onClick={() => setHazardOperation(`Lock ${lockHits}`, { type: 'lock', hits: Math.max(1, Math.floor(lockHits)) })}>
                LOCK
              </button>
              <input className={FIELD_CLASS} disabled={!isCombat} type="number" min={1} value={lockHits} onChange={(e) => setLockHits(Number(e.target.value))} />
              <button className={BUTTON_CLASS} disabled={!isCombat} onClick={() => setHazardOperation(`Bomb ${bombCountdown}`, { type: 'bomb', countdown: Math.max(0, Math.floor(bombCountdown)) })}>
                BOMB
              </button>
              <input className={FIELD_CLASS} disabled={!isCombat} type="number" min={0} value={bombCountdown} onChange={(e) => setBombCountdown(Number(e.target.value))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className={BUTTON_CLASS} disabled={!isCombat} onClick={() => setHazardOperation('Poison', { type: 'poison' })}>POISON</button>
              <button className={BUTTON_CLASS} disabled={!isCombat} onClick={() => setHazardOperation('Sand', { type: 'sand' })}>SAND</button>
              <button className={BUTTON_CLASS} disabled={!isCombat} onClick={() => setHazardOperation('Fools Gold', { type: 'fools_gold' })}>FOOLS GOLD</button>
              <button className={BUTTON_CLASS} disabled={!isCombat} onClick={() => setHazardOperation('Suppress', { type: 'suppress' })}>SUPPRESS</button>
            </div>
            <button className={`${DANGER_BUTTON_CLASS} mt-2 w-full`} disabled={!isCombat} onClick={() => setBoardOperation('None', null)}>
              STOP BOARD EDIT
            </button>
          </section>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
