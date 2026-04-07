import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './game/GameConfig';
import { MainMenu } from './ui/screens/MainMenu';
import { CharacterSelectScreen } from './ui/screens/CharacterSelectScreen';
import { TileSelectScreen } from './ui/screens/TileSelectScreen';
import { MapScreen } from './ui/screens/MapScreen';
import { MerchantScreen } from './ui/screens/MerchantScreen';
import { CampfireScreen } from './ui/screens/CampfireScreen';
import { EventScreen } from './ui/screens/EventScreen';
import { ScoreScreen } from './ui/screens/ScoreScreen';
import { TreasureScreen } from './ui/screens/TreasureScreen';
import { ReputationShopScreen } from './ui/screens/ReputationShopScreen';
import { LeaderboardScreen } from './ui/screens/LeaderboardScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { CombatHUD } from './ui/hud/CombatHUD';
import { FloatingNumbers } from './ui/hud/FloatingNumbers';
import { TopBar } from './ui/hud/TopBar';
import { ArtifactBar } from './ui/hud/ArtifactBar';
import { OfflineIndicator } from './ui/components/OfflineIndicator';
import { GameNotification } from './ui/components/GameNotification';
import { EventBus, GameEvent } from './game/EventBus';
import { useRunStore } from './store/runStore';
import { useCombatStore } from './store/combatStore';
import { useGameScale, UI_WIDTH, UI_HEIGHT } from './ui/hooks/useGameScale';
import type { CombatConfig, CombatResult } from './game/combat/CombatManager';
import type { CombatSnapshot } from './types/combatSnapshot';
import { saveCombatSnapshot, clearCombatSnapshot, purgeCorruptSnapshots } from './services/localSave';
import { initSfx } from './services/sfx';
import { consumePendingSnapshot } from './services/combatResume';
import { setCombatSceneData } from './game/scenes/CombatScene';
import { loadPersistedRun, startRunPersistence } from './services/runPersistence';
import {
  rollAct1Encounter,
  rollAct1EliteEncounter,
  rollAct2Encounter,
  rollAct2EliteEncounter,
  rollAct3Encounter,
  rollAct3EliteEncounter,
  BOSSES,
} from './data/enemies';
import type { EnemyDefinition } from './types/combat';
import type { MapNodeType, Act } from './types/game';
import { applyAscensionToEnemies, getAscensionModifiers } from './data/ascension';
import { createSeededRandom } from './utils/seededRandom';

export type Screen =
  | 'main-menu'
  | 'character-select'
  | 'tile-select'
  | 'combat'
  | 'map'
  | 'merchant'
  | 'campfire'
  | 'event'
  | 'score'
  | 'treasure'
  | 'reputation-shop'
  | 'leaderboard'
  | 'settings';

const ENCOUNTER_ROLLERS: Record<Act, { regular: (r?: () => number) => EnemyDefinition[]; elite: (r?: () => number) => EnemyDefinition[] }> = {
  1: { regular: rollAct1Encounter, elite: rollAct1EliteEncounter },
  2: { regular: rollAct2Encounter, elite: rollAct2EliteEncounter },
  3: { regular: rollAct3Encounter, elite: rollAct3EliteEncounter },
};

/** Mine Cart timed encounter config. */
const MINE_CART_TURN_LIMIT = 6;
const MINE_CART_FAILURE_DAMAGE = 50;

interface EncounterInfo {
  enemies: EnemyDefinition[];
  isElite: boolean;
  isBoss: boolean;
  turnLimit?: number;
  timedFailureDamage?: number;
}

/** Roll enemies for a given act and node type. */
function rollEncounter(act: Act, nodeType: MapNodeType, seed?: string, nodeId?: string): EncounterInfo {
  const rand = seed && nodeId ? createSeededRandom(`${seed}-encounter-${nodeId}`) : undefined;
  if (nodeType === 'boss') {
    return { enemies: [BOSSES[act]], isElite: false, isBoss: true };
  }
  const rollers = ENCOUNTER_ROLLERS[act];
  if (nodeType === 'elite') {
    return { enemies: rollers.elite(rand), isElite: true, isBoss: false };
  }
  const enemies = rollers.regular(rand);
  const isMineCart = enemies.some((e) => e.type === 'mine_cart');
  return {
    enemies,
    isElite: false,
    isBoss: false,
    turnLimit: isMineCart ? MINE_CART_TURN_LIMIT : undefined,
    timedFailureDamage: isMineCart ? MINE_CART_FAILURE_DAMAGE : undefined,
  };
}

export default function App() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [screen, setScreen] = useState<Screen>('main-menu');
  const [ready, setReady] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [loadingDismissed, setLoadingDismissed] = useState(false);
  const prevScreenRef = useRef<Screen>('main-menu');
  const [wipePhase, setWipePhase] = useState<'none' | 'in' | 'out'>('none');
  /** Ref mirror of wipePhase so the onAnimationEnd handler always reads the latest value. */
  const wipePhaseRef = useRef<'none' | 'in' | 'out'>('none');
  /** Safety timeout ID — forces wipe completion if animationend doesn't fire. */
  const wipeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScreenRef = useRef<Screen | null>(null);
  const applyScreenChangeRef = useRef<((next: Screen) => void) | null>(null);

  /** Handle a wipe phase completion (shared by onAnimationEnd and safety timeout). */
  const handleWipeComplete = useRef<(() => void) | null>(null);

  /** Update wipe phase state + ref, and arm a safety timeout. */
  const setWipePhaseWithFallback = (phase: 'none' | 'in' | 'out') => {
    // Clear any existing safety timeout
    if (wipeTimeoutRef.current) {
      clearTimeout(wipeTimeoutRef.current);
      wipeTimeoutRef.current = null;
    }
    wipePhaseRef.current = phase;
    setWipePhase(phase);
    // Arm a safety timeout for active animation phases.
    // The CSS animation is 250ms; 500ms gives generous margin.
    if (phase === 'in' || phase === 'out') {
      wipeTimeoutRef.current = setTimeout(() => {
        wipeTimeoutRef.current = null;
        handleWipeComplete.current?.();
      }, 500);
    }
  };

  // Restore persisted run from IndexedDB and start auto-save subscription
  useEffect(() => {
    purgeCorruptSnapshots().then(() => loadPersistedRun()).finally(() => {
      startRunPersistence();
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!gameContainerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      ...gameConfig,
      parent: gameContainerRef.current,
    };

    gameRef.current = new Phaser.Game(config);
    initSfx(gameRef.current);

    // Wait for BootScene to finish loading all assets
    EventBus.on(GameEvent.BOOT_COMPLETE, () => setBootComplete(true));

    const NON_COMBAT_NODE_SCREENS: Set<Screen> = new Set(['merchant', 'campfire', 'event', 'treasure']);

    /** Tracks the last screen applied by the wipe system (updated synchronously). */
    let lastAppliedScreen: Screen = 'main-menu';

    applyScreenChangeRef.current = (next: Screen) => {
      // Use lastAppliedScreen instead of prevScreenRef (which updates async
      // in a useEffect). This avoids a race where rapid transitions or the
      // safety timeout fire before the effect updates prevScreenRef, causing
      // the non-combat node completion check to see a stale value.
      const prev = lastAppliedScreen;

      // Mark non-combat nodes completed when returning to map
      if (next === 'map' && NON_COMBAT_NODE_SCREENS.has(prev)) {
        const store = useRunStore.getState();
        const nodeId = store.run?.currentNodeId;
        if (nodeId) store.markNodeCompleted(nodeId);
      }

      // Safeguard: if arriving at map and current node is a non-combat node
      // that's visited but not completed (wipe race condition), complete it.
      if (next === 'map') {
        const store = useRunStore.getState();
        const currentNode = store.run?.mapState?.nodes.find(
          (n) => n.id === store.run?.currentNodeId,
        );
        if (currentNode && currentNode.visited && !currentNode.completed) {
          const NON_COMBAT_TYPES = new Set(['merchant', 'campfire', 'event', 'treasure']);
          if (NON_COMBAT_TYPES.has(currentNode.type)) {
            store.markNodeCompleted(currentNode.id);
          }
        }
      }

      lastAppliedScreen = next;
      setScreen(next);

      // Act 1: choose 5th tile before first map visit
      if (next === 'map') {
        const run = useRunStore.getState().run;
        if (run && run.currentAct === 1 && run.activeTileTypes.length <= 4) {
          setScreen('tile-select');
          return;
        }
      }

      if (next === 'map') {
        const run = useRunStore.getState().run;
        const store = useRunStore.getState();

        if (run && run.currentAct === 1) {
          // Dust storm rolls in after the treasure node (row 6) is completed
          const treasureCompleted = run.mapState?.nodes.some((n) => n.type === 'treasure' && n.completed) ?? false;
          if (treasureCompleted && !run.activeTileTypes.includes('tumbleweed')) {
            store.addTileType('tumbleweed');
            setTimeout(() => {
              EventBus.emit('game:notification', { text: 'A dust storm rolls in...' });
            }, 1000);
          }
        }

        // Act 2: show settled notification on first visit
        if (run && run.currentAct === 2 && !run.activeTileTypes.includes('tumbleweed')) {
          const visited = run.mapState?.nodes.filter((n) => n.visited).length ?? 0;
          if (visited === 0) {
            setTimeout(() => {
              EventBus.emit('game:notification', { text: 'The dust storm has settled.' });
            }, 1000);
          }
        }
      }
    };

    const handleScreenChange = (...args: unknown[]) => {
      const next = args[0] as Screen;
      // Start wipe-in, store pending screen
      pendingScreenRef.current = next;
      setWipePhaseWithFallback('in');
    };

    EventBus.on(GameEvent.SCREEN_CHANGE, handleScreenChange);

    return () => {
      EventBus.off(GameEvent.SCREEN_CHANGE, handleScreenChange);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [ready]);

  // Start/stop CombatScene based on screen transitions
  useEffect(() => {
    const game = gameRef.current;
    if (!game || !bootComplete) return;

    if (screen === 'combat' && prevScreenRef.current !== 'combat') {
      // Check if we have a pending snapshot to restore (mid-combat resume)
      const snapshot = consumePendingSnapshot();
      if (snapshot) {
        const run = useRunStore.getState().run;
        useCombatStore.getState().reset();
        useCombatStore.getState().setPlayerHealth(snapshot.player.health, snapshot.player.maxHealth);
        useCombatStore.getState().setGold(snapshot.player.gold);
        if (run) useCombatStore.getState().setAct(run.currentAct);

        setCombatSceneData({ snapshot });
        game.scene.start('CombatScene', { snapshot });
      } else {
        // Fresh combat: build config from run state and start CombatScene
        const run = useRunStore.getState().run;
        if (run) {
          const currentNode = run.mapState?.nodes.find((n) => n.id === run.currentNodeId);
          const nodeType = currentNode?.type ?? 'combat';
          const encounter = rollEncounter(run.currentAct, nodeType, run.seed, run.currentNodeId ?? undefined);
          applyAscensionToEnemies(encounter.enemies, run.ascensionLevel);
          const ascMods = getAscensionModifiers(run.ascensionLevel);

          const combatConfig: CombatConfig = {
            character: run.character,
            enemies: encounter.enemies,
            playerHealth: run.health,
            playerMaxHealth: run.maxHealth,
            playerGold: run.gold,
            activeTileTypes: run.activeTileTypes,
            tileUpgrades: run.tileUpgrades,
            abilityCharge: run.abilityCharge,
            artifacts: run.artifacts,
            traitCounts: run.traitCounts,
            isElite: encounter.isElite,
            isBoss: encounter.isBoss,
            turnLimit: encounter.turnLimit,
            timedFailureDamage: encounter.timedFailureDamage,
            goldMultiplier: ascMods.goldMultiplier,
          };

          // Clear any stale combat snapshot before starting fresh
          clearCombatSnapshot(run.id).catch(() => {});

          // Reset combat store before starting
          useCombatStore.getState().reset();
          useCombatStore.getState().setPlayerHealth(run.health, run.maxHealth);
          useCombatStore.getState().setGold(run.gold);
          useCombatStore.getState().setAct(run.currentAct);

          setCombatSceneData({ config: combatConfig });
          game.scene.start('CombatScene', { config: combatConfig });

          // Mark combat node as visited now that combat is starting
          const nodeId = run.currentNodeId;
          if (nodeId) {
            useRunStore.getState().markNodeVisited(nodeId);
          }
        }
      }
    } else if (screen !== 'combat' && prevScreenRef.current === 'combat') {
      // Leaving combat: stop CombatScene
      game.scene.stop('CombatScene');
    }

    prevScreenRef.current = screen;
  }, [screen, bootComplete]);

  // Handle combat end: sync results to run store and return to map
  useEffect(() => {
    const handleCombatEnd = (...args: unknown[]) => {
      const result = args[0] as CombatResult;
      const store = useRunStore.getState();

      // Always track stats (even on defeat)
      store.addDamageDealt(result.damageDealt);
      store.updateLongestCascade(result.longestCascade);
      if (result.victory && !result.playerDamageTaken) {
        store.addFlawlessFight();
      }

      // Clear the mid-combat snapshot -- fight is over
      const runId = store.run?.id;
      if (runId) {
        clearCombatSnapshot(runId).catch(() => {});
      }

      // Always sync ability charge (persists between combats)
      store.syncAbilityCharge(result.abilityCharge);

      if (result.victory) {
        // Mark the current node as completed
        const currentNodeId = store.run?.currentNodeId;
        if (currentNodeId) store.markNodeCompleted(currentNodeId);

        // Sync combat results back to run (use absolute values from combat end)
        const run = store.run;
        if (run) {
          store.updateHealth(result.playerHealth - run.health);
          store.updateGold(result.playerGold - run.gold);
        }
      }

      // Return to map (or tile-select after boss) after a brief delay
      setTimeout(() => {
        if (!result.victory) {
          EventBus.emit(GameEvent.SCREEN_CHANGE, 'score');
          store.endRun(false);
          return;
        }

        // Check if the just-completed fight was a boss
        const currentRun = store.run;
        const currentNode = currentRun?.mapState?.nodes.find((n) => n.id === currentRun?.currentNodeId);

        if (currentNode && currentNode.type === 'boss') {
          store.addBossDefeated();

          // Remove tumbleweed after Act 1 boss (notification shows on Act 2 map)
          if (currentRun!.currentAct === 1) {
            store.removeTileType('tumbleweed');
          }

          // Final boss (Act 3): go straight to score, no treasure
          if (currentRun!.currentAct === 3) {
            EventBus.emit(GameEvent.SCREEN_CHANGE, 'score');
            store.endRun(true);
          } else {
            // Non-final boss: artifact reward first, then tile-select
            EventBus.emit(GameEvent.SCREEN_CHANGE, 'treasure');
          }
        } else if (currentNode && currentNode.type === 'elite') {
          // Elite victory: artifact reward before returning to map
          EventBus.emit(GameEvent.SCREEN_CHANGE, 'treasure');
        } else {
          EventBus.emit(GameEvent.SCREEN_CHANGE, 'map');
        }
      }, 1000);
    };

    EventBus.on(GameEvent.COMBAT_END, handleCombatEnd);
    return () => { EventBus.off(GameEvent.COMBAT_END, handleCombatEnd); };
  }, []);

  // Handle mid-combat save requests (emitted after each swap resolution)
  useEffect(() => {
    const handleSaveRequest = () => {
      const game = gameRef.current;
      const run = useRunStore.getState().run;
      if (!game || !run) return;

      const scene = game.scene.getScene('CombatScene') as
        | (Phaser.Scene & { combatManager?: { createSnapshot: (runId: string) => CombatSnapshot } })
        | null;
      if (!scene?.scene?.isActive() || !scene?.combatManager) return;

      const snapshot = scene.combatManager.createSnapshot(run.id);
      saveCombatSnapshot(snapshot).catch((err) => {
        console.error('[save] combat snapshot failed:', err);
      });
    };

    EventBus.on(GameEvent.COMBAT_SAVE_REQUESTED, handleSaveRequest);
    return () => { EventBus.off(GameEvent.COMBAT_SAVE_REQUESTED, handleSaveRequest); };
  }, []);

  // Save combat snapshot when the app is backgrounded or closed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return;
      if (prevScreenRef.current !== 'combat') return; // Only save during combat
      const game = gameRef.current;
      const run = useRunStore.getState().run;
      if (!game || !run) return;

      const scene = game.scene.getScene('CombatScene') as
        | (Phaser.Scene & { combatManager?: { createSnapshot: (runId: string) => CombatSnapshot } })
        | null;
      if (!scene?.scene?.isActive() || !scene?.combatManager) return;

      const snapshot = scene.combatManager.createSnapshot(run.id);
      saveCombatSnapshot(snapshot).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); };
  }, []);

  // Keep the wipe completion handler up to date (uses ref to read latest phase).
  handleWipeComplete.current = () => {
    // Clear safety timeout since we're handling it now
    if (wipeTimeoutRef.current) {
      clearTimeout(wipeTimeoutRef.current);
      wipeTimeoutRef.current = null;
    }
    const currentPhase = wipePhaseRef.current;
    if (currentPhase === 'in') {
      // Screen is covered -- swap content
      if (pendingScreenRef.current && applyScreenChangeRef.current) {
        applyScreenChangeRef.current(pendingScreenRef.current);
        pendingScreenRef.current = null;
      }
      setWipePhaseWithFallback('out');
    } else if (currentPhase === 'out') {
      // Only finish wipe if no new screen change is pending
      if (pendingScreenRef.current) {
        // A new screen change arrived during wipe-out; start new wipe-in
        setWipePhaseWithFallback('in');
      } else {
        setWipePhaseWithFallback('none');
      }
    }
  };

  const { scale, offsetX, offsetY } = useGameScale();

  // Don't render until persisted run is loaded from IndexedDB
  if (!ready) return null;

  // Combat uses pointer-events-none so Phaser board receives clicks;
  // all other screens are pointer-events-auto (opaque overlays).
  const pointerMode = screen === 'combat' ? 'none' : 'auto';

  // Screens that show the unified TopBar + ArtifactBar (all in-run screens)
  const IN_RUN_SCREENS: Set<Screen> = new Set([
    'combat', 'map', 'merchant', 'campfire', 'event', 'treasure', 'tile-select',
  ]);
  const showTopBar = IN_RUN_SCREENS.has(screen);

  return (
    <div className="relative w-full h-full" onContextMenu={(e) => e.preventDefault()}>
      <div ref={gameContainerRef} className="absolute inset-0" />
      <OfflineIndicator />

      {/* Scaled overlay: 960x540 virtual pixels, CSS-transformed to match Phaser canvas */}
      <div
        className={`absolute overflow-hidden ${showTopBar ? 'flex flex-col' : ''}`}
        style={{
          width: UI_WIDTH,
          height: UI_HEIGHT,
          left: offsetX,
          top: offsetY,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: pointerMode,
        }}
      >
        <GameNotification />

        {/* Full-area screens rendered behind TopBar */}
        {screen === 'treasure' && (
          <div className="absolute inset-0">
            <TreasureScreen />
          </div>
        )}
        {screen === 'tile-select' && (
          <div className="absolute inset-0">
            <TileSelectScreen />
          </div>
        )}

        {/* Unified TopBar + ArtifactBar for all in-run screens */}
        {showTopBar && (
          <>
            <TopBar
              mapDisabled={screen === 'map'}
              showConsumables={screen === 'combat'}
            />
            <ArtifactBar />
          </>
        )}

        {/* Combat HUD: uses absolute positioning, overlays full area */}
        {screen === 'combat' && <CombatHUD />}

        {/* Non-combat screen content fills remaining space below TopBar */}
        {screen !== 'combat' && screen !== 'treasure' && screen !== 'tile-select' && (
          <div className={showTopBar ? 'flex-1 overflow-hidden' : 'h-full'}>
            {screen === 'main-menu' && <MainMenu />}
            {screen === 'character-select' && <CharacterSelectScreen />}
            {screen === 'map' && <MapScreen />}
            {screen === 'merchant' && <MerchantScreen />}
            {screen === 'campfire' && <CampfireScreen />}
            {screen === 'event' && <EventScreen />}
            {screen === 'score' && <ScoreScreen />}
            {screen === 'reputation-shop' && <ReputationShopScreen />}
            {screen === 'leaderboard' && <LeaderboardScreen />}
            {screen === 'settings' && <SettingsScreen />}
          </div>
        )}

        {/* Floating numbers: rendered at top level so they appear above TopBar */}
        {screen === 'combat' && <FloatingNumbers />}

        {/* Loading screen -- shown until assets are loaded, then slides left */}
        {!loadingDismissed && (
          <div
            className={`absolute inset-0 bg-black z-[200] flex items-end justify-end p-4 ${bootComplete ? 'screen-wipe-out' : ''}`}
            onAnimationEnd={() => setLoadingDismissed(true)}
          >
            {!bootComplete && <span className="text-stone-500 text-xs tracking-widest font-bold animate-welcome-breathe">LOADING</span>}
          </div>
        )}

        {/* Screen transition wipe overlay */}
        {wipePhase !== 'none' && (
          <div
            className={`absolute inset-0 bg-black z-[100] ${wipePhase === 'in' ? 'screen-wipe-in' : 'screen-wipe-out'}`}
            onAnimationEnd={() => handleWipeComplete.current?.()}
          />
        )}

        {/* Global version label */}
        <span
          className="absolute right-2 bottom-1 pointer-events-none z-[60]"
          style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}
        >
          Pre-alpha v0.4.15
        </span>
      </div>
    </div>
  );
}
