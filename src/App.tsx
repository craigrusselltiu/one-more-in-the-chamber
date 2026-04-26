import { useEffect, useMemo, useRef, useState } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './game/GameConfig';
import { MainMenu, pickRandomMainMenuBackground, type MainMenuBackground } from './ui/screens/MainMenu';
import { CharacterSelectScreen, CHARACTERS } from './ui/screens/CharacterSelectScreen';
import { TileSelectScreen } from './ui/screens/TileSelectScreen';
import { StarterScreen } from './ui/screens/StarterScreen';
import { MapScreen } from './ui/screens/MapScreen';
import { MerchantScreen } from './ui/screens/MerchantScreen';
import { CampfireScreen } from './ui/screens/CampfireScreen';
import { EventScreen } from './ui/screens/EventScreen';
import { ScoreScreen } from './ui/screens/ScoreScreen';
import { ArtifactScreen } from './ui/screens/ArtifactScreen';
import { ReputationShopScreen } from './ui/screens/ReputationShopScreen';
import { CustomizeScreen } from './ui/screens/CustomizeScreen';
import { LedgerScreen } from './ui/screens/LedgerScreen';
import { LeaderboardScreen } from './ui/screens/LeaderboardScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { LoginScreen, PickNameScreen } from './ui/screens/LoginScreen';
import { WelcomeScreen } from './ui/screens/WelcomeScreen';
import { useMetaStore } from './store/metaStore';
import { CombatHUD } from './ui/hud/CombatHUD';
import { FloatingNumbers } from './ui/hud/FloatingNumbers';
import { NonCombatFloats } from './ui/hud/NonCombatFloats';
import { TopBar } from './ui/hud/TopBar';
import { ArtifactBar } from './ui/hud/ArtifactBar';
import { TraitRow } from './ui/hud/TraitRow';
import { OfflineIndicator } from './ui/components/OfflineIndicator';
import { GameNotification } from './ui/components/GameNotification';
import { TutorialOverlay } from './ui/components/TutorialOverlay';
import { SyncIndicator } from './ui/components/SyncIndicator';
import { LoginSyncOverlay } from './ui/components/LoginSyncOverlay';
import { KickoutOverlay } from './ui/components/KickoutOverlay';
import { BloodOverlay } from './ui/components/BloodOverlay';
import { DevPanel } from './ui/components/DevPanel';
import { EventBus, GameEvent } from './game/EventBus';
import { useRunStore } from './store/runStore';
import { useCombatStore } from './store/combatStore';
import { useGameScale, UI_WIDTH, UI_HEIGHT } from './ui/hooks/useGameScale';
import { subscribeAuth, getAuthState, type AuthState } from './services/auth';
import type { CombatConfig, CombatResult } from './game/combat/CombatManager';
import type { CombatSnapshot } from './types/combatSnapshot';
import { saveCombatSnapshot, clearCombatSnapshot, purgeCorruptSnapshots } from './services/localSave';
import { pushCombatSnapshot, clearRemoteCombatSnapshot } from './services/syncService';
import { initSfx } from './services/sfx';
import { consumePendingSnapshot } from './services/combatResume';
import { setCombatSceneData } from './game/scenes/CombatScene';
import { forceSaveRun, loadPersistedRun, startRunPersistence } from './services/runPersistence';
import {
  rollAct1Encounter,
  rollAct1EliteEncounter,
  rollAct2Encounter,
  rollAct2EliteEncounter,
  rollAct3Encounter,
  rollAct3EliteEncounter,
  BOSSES,
  BOSS_COMPANIONS,
  ALL_ENEMIES,
  ACT3_ELITE,
  encounterContainsOutlawKing,
  OUTLAW_KING_ENCOUNTER_CHANCE_BY_ACT,
} from './data/enemies';
import type { EnemyDefinition } from './types/combat';
import type { MapNodeType, Act, RunState } from './types/game';
import { applyWantedLevelToEnemies, getWantedLevelMutations } from './data/wantedLevel';
import { createSeededRandom } from './utils/seededRandom';
import { APP_VERSION_LABEL } from './version';
import { pickEventFromBag } from './data/events';

export type Screen =
  | 'main-menu'
  | 'character-select'
  | 'starter'
  | 'tile-select'
  | 'combat'
  | 'map'
  | 'merchant'
  | 'campfire'
  | 'event'
  | 'score'
  | 'artifact'
  | 'reputation-shop'
  | 'customize'
  | 'ledger'
  | 'leaderboard'
  | 'settings'
  | 'login'
  | 'pick-name'
  | 'welcome';

const ENCOUNTER_ROLLERS: Record<Act, {
  regular: (r: () => number, nodeIndex?: number, outlawKingAvailable?: boolean, okChanceMult?: number) => EnemyDefinition[];
  elite: (r?: () => number, outlawKingAvailable?: boolean, nodeIndex?: number, okChanceMult?: number) => EnemyDefinition[];
}> = {
  1: { regular: rollAct1Encounter, elite: rollAct1EliteEncounter },
  2: { regular: rollAct2Encounter, elite: rollAct2EliteEncounter },
  3: { regular: rollAct3Encounter, elite: rollAct3EliteEncounter },
};

interface EncounterInfo {
  enemies: EnemyDefinition[];
  isElite: boolean;
  isBoss: boolean;
}

type CombatScenePayload = { config?: CombatConfig; snapshot?: CombatSnapshot };
type CombatRuntimeScene = Phaser.Scene & {
  combatManager?: { createSnapshot: (runId: string) => CombatSnapshot };
};

function getCombatScene(game: Phaser.Game): CombatRuntimeScene | null {
  try {
    return game.scene.getScene('CombatScene') as CombatRuntimeScene;
  } catch {
    return null;
  }
}

function getCombatSceneStatus(game: Phaser.Game): number | null {
  return getCombatScene(game)?.sys.settings.status ?? null;
}

function isCombatSceneBootstrapping(status: number | null): boolean {
  return status === Phaser.Scenes.INIT
    || status === Phaser.Scenes.START
    || status === Phaser.Scenes.LOADING
    || status === Phaser.Scenes.CREATING;
}

function getScreenBackground(
  screen: Screen,
  run: RunState | null,
  mainMenuBackground: MainMenuBackground,
  eventBackground?: string,
  characterSelectId?: string,
): string {
  const base = import.meta.env.BASE_URL;
  const act = run?.currentAct ?? 1;
  const currentNodeId = run?.currentNodeId ?? run?.mapState?.currentNodeId ?? null;
  const currentNodeType = currentNodeId && run?.mapState
    ? run.mapState.nodes.find((node) => node.id === currentNodeId)?.type
    : null;

  if (screen === 'event' && eventBackground) {
    return `${base}assets/events/${eventBackground}`;
  }

  if (screen === 'character-select') {
    const charBg = CHARACTERS.find((c) => c.id === characterSelectId)?.bg
      ?? CHARACTERS[0].bg;
    return `${base}assets/${charBg}`;
  }

  if (screen === 'main-menu' || screen === 'welcome') {
    return `${base}assets/main_menu/${mainMenuBackground}`;
  }

  if (screen === 'combat' || screen === 'artifact') {
    if (currentNodeType === 'boss') {
      const bossBgs: Record<number, string> = { 1: 'dusty_bg', 2: 'copperhead_bg', 3: 'ironeye_bg' };
      return `${base}assets/backgrounds/${bossBgs[act] ?? 'act1_bg'}.png`;
    }
    if (screen === 'combat' || currentNodeType === 'elite') {
      return `${base}assets/backgrounds/act${act}_bg.png`;
    }
  }

  const byScreen: Partial<Record<Screen, string>> = {
    map: 'crate_bg.png',
    merchant: 'merchant_bg.png',
    campfire: 'campfire_bg.png',
    event: 'artifact_bg.png',
    artifact: 'artifact_bg.png',
    'tile-select': 'tile_bg.png',
    starter: 'bones.png',
    score: run?.status === 'completed' ? 'victory.png' : 'defeat.png',
    'reputation-shop': 'reputation.png',
    customize: 'customize.png',
    ledger: 'ledger.png',
    settings: 'blur.png',
    login: 'artifact_bg.png',
    'pick-name': 'artifact_bg.png',
    leaderboard: 'leaderboard.png',
  };

  const file = byScreen[screen] ?? 'artifact_bg.png';
  const folder = file === 'blur.png' ? 'assets' : 'assets/backgrounds';
  return `${base}${folder}/${file}`;
}

function isCombatSceneRunningLike(game: Phaser.Game, status: number | null): boolean {
  return game.scene.isActive('CombatScene')
    || status === Phaser.Scenes.RUNNING
    || status === Phaser.Scenes.PAUSED
    || status === Phaser.Scenes.SLEEPING
    || isCombatSceneBootstrapping(status);
}

function logCombatSceneStatus(game: Phaser.Game, reason: string, screen: Screen): void {
  const scene = getCombatScene(game);
  console.info('[app] combat scene status', {
    reason,
    screen,
    isActive: game.scene.isActive('CombatScene'),
    status: scene?.sys.settings.status ?? 'missing',
    visible: scene?.sys.settings.visible ?? null,
  });
}

/** Roll enemies for a given act and node type. */
function rollEncounter(
  act: Act,
  nodeType: MapNodeType,
  seed?: string,
  nodeId?: string,
  nodeIndex = 99,
  outlawKingAvailable = false,
  okChanceMult = 1,
): EncounterInfo {
  const rand = seed && nodeId ? createSeededRandom(`${seed}-encounter-${nodeId}`) : undefined;
  if (nodeType === 'boss') {
    const enemies: EnemyDefinition[] = [{ ...BOSSES[act] }];
    for (const type of (BOSS_COMPANIONS[act] ?? [])) {
      const def = ALL_ENEMIES[type];
      // Boss companions spawn at full HP and are tagged as summoned
      if (def) enemies.push({ ...def, _summoned: true } as EnemyDefinition);
    }
    return { enemies, isElite: false, isBoss: true };
  }
  const rollers = ENCOUNTER_ROLLERS[act];
  if (nodeType === 'elite') {
    return { enemies: rollers.elite(rand, outlawKingAvailable, nodeIndex, okChanceMult), isElite: true, isBoss: false };
  }
  const enemies = rollers.regular(rand ?? Math.random, nodeIndex, outlawKingAvailable, okChanceMult);
  return {
    enemies,
    isElite: false,
    isBoss: false,
  };
}

export default function App() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  // First-visit gate: if there's no local player name AND no authenticated
  // session, drop the user onto the welcome screen where they pick Login vs
  // Continue as Guest. Returning users (guest with a name OR a restored auth
  // session) skip straight to the main menu.
  const [screen, setScreen] = useState<Screen>(() => {
    const { playerName } = useMetaStore.getState().meta;
    if (!playerName && !getAuthState().isLoggedIn) return 'welcome';
    return 'main-menu';
  });
  const [ready, setReady] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [loadingDismissed, setLoadingDismissed] = useState(false);
  const [mainMenuIntroPlayed, setMainMenuIntroPlayed] = useState(false);
  const [bootProgress, setBootProgress] = useState<{ loaded: number; total: number }>({ loaded: 0, total: 0 });
  const run = useRunStore((s) => s.run);
  const [mainMenuBackground, setMainMenuBackground] = useState<MainMenuBackground>(pickRandomMainMenuBackground);
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>(() => ({ ...getAuthState() }));
  const canUseDevControls = auth.isLoggedIn && auth.isDev;
  const currentScreenRef = useRef<Screen>(screen);
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
    const canvas = gameRef.current.canvas;
    if (canvas) {
      canvas.style.imageRendering = 'pixelated';
    }

    const handleContextLost = () => {
      const game = gameRef.current;
      if (!game) return;
      logCombatSceneStatus(game, 'webglcontextlost', currentScreenRef.current);
    };

    const handleContextRestored = () => {
      const game = gameRef.current;
      if (!game) return;
      logCombatSceneStatus(game, 'webglcontextrestored', currentScreenRef.current);
    };

    canvas?.addEventListener('webglcontextlost', handleContextLost);
    canvas?.addEventListener('webglcontextrestored', handleContextRestored);

    // Wait for BootScene to finish loading all assets
    const handleBootComplete = () => setBootComplete(true);
    const handleBootProgress = (...args: unknown[]) => {
      const { loaded, total } = args[0] as { loaded: number; total: number };
      setBootProgress({ loaded, total });
    };

    EventBus.on(GameEvent.BOOT_COMPLETE, handleBootComplete);
    EventBus.on(GameEvent.BOOT_PROGRESS, handleBootProgress);

    const NON_COMBAT_NODE_SCREENS: Set<Screen> = new Set(['merchant', 'campfire', 'event', 'artifact']);

    /** Tracks the last screen applied by the wipe system (updated synchronously). */
    let lastAppliedScreen: Screen = 'main-menu';

    applyScreenChangeRef.current = (next: Screen) => {
      // Use lastAppliedScreen instead of React state timing so rapid
      // transitions and the wipe safety timeout always see the latest screen.
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
          const NON_COMBAT_TYPES = new Set(['merchant', 'campfire', 'event', 'artifact']);
          if (NON_COMBAT_TYPES.has(currentNode.type)) {
            store.markNodeCompleted(currentNode.id);
          }
        }
      }

      lastAppliedScreen = next;
      setScreen(next);

      // New acts begin with a tile choice; keep the map visible via the
      // TopBar popup but prevent entering nodes before the pick is made.
      if (next === 'map') {
        const run = useRunStore.getState().run;
        if (run?.pendingActTileSelection) {
          setScreen('tile-select');
          return;
        }
      }

      // Act 1: choose 5th tile before first map visit
      if (next === 'map') {
        const run = useRunStore.getState().run;
        if (run && run.currentAct === 1 && run.activeTileTypes.length <= 4) {
          setScreen('tile-select');
          return;
        }
      }

      // Act 1: Bones appears after the initial tile selection (requires at least one win).
      if (next === 'map') {
        const run = useRunStore.getState().run;
        const hasWon = useMetaStore.getState().meta.highestWantedLevelCleared >= 0;
        if (run && run.currentAct === 1 && !run.starterEncountered && hasWon) {
          setScreen('starter');
          return;
        }
      }

      if (next === 'map') {
        const run = useRunStore.getState().run;
        const store = useRunStore.getState();

        if (run && run.currentAct === 1) {
          // Dust storm rolls in after the treasure node (row 6) is completed
          const artifactNodeCompleted = run.mapState?.nodes.some((n) => n.type === 'artifact' && n.completed) ?? false;
          if (artifactNodeCompleted && !run.activeTileTypes.includes('tumbleweed')) {
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

        // Outlaw King warning: pre-roll eligible nodes to check if he'd appear
        if (run && !run.outlawKingEncountered) {
          const visited = run.mapState?.nodes.filter((n) => n.visited).length ?? 0;
          if (visited === 0 && run.mapState) {
            const act = run.currentAct;
            const okChanceMult = getWantedLevelMutations(run.wantedLevel).outlawKingChanceMultiplier;
            const hasOutlawKing = run.mapState.nodes.some((n) => {
              if (n.type !== 'combat' && n.type !== 'elite') return false;
              // Act 1: only after artifact node (row > 6); Acts 2/3: after early rows (row >= 3)
              if (act === 1 && n.row <= 6) return false;
              if (act !== 1 && n.row < 3) return false;
              const rand = createSeededRandom(`${run.seed}-encounter-${n.id}`);
              return rand() < OUTLAW_KING_ENCOUNTER_CHANCE_BY_ACT[act] * okChanceMult;
            });
            if (hasOutlawKing) {
              setTimeout(() => {
                EventBus.emit('game:notification', { text: 'A chill runs down your spine...' });
              }, 2000);
            }
          }
        }
      }
    };

    const handleScreenChange = (...args: unknown[]) => {
      const next = args[0] as Screen;
      document.body.classList.remove('cursor-crosshair');
      document.body.classList.remove('cursor-crosshair-alt');
      // Start wipe-in, store pending screen
      pendingScreenRef.current = next;
      setWipePhaseWithFallback('in');
    };

    EventBus.on(GameEvent.SCREEN_CHANGE, handleScreenChange);

    // Force OAuth first-time signers to pick a display name before anything else.
    // Skip while the user is on the login screen -- LoginScreen handles its own
    // claim flow and a redirect here would interrupt signup mid-submit.
    const unsubscribeAuth = subscribeAuth((s) => {
      // If a late auth restore happens while we're still on the welcome gate,
      // auto-dismiss to main-menu so signed-in users never see the gate.
      if (lastAppliedScreen === 'welcome' && s.isLoggedIn) {
        EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
        return;
      }
      if (!s.isLoggedIn || !s.needsDisplayName) return;
      if (lastAppliedScreen === 'login' || lastAppliedScreen === 'pick-name') return;
      EventBus.emit(GameEvent.SCREEN_CHANGE, 'pick-name' satisfies Screen);
    });

    return () => {
      canvas?.removeEventListener('webglcontextlost', handleContextLost);
      canvas?.removeEventListener('webglcontextrestored', handleContextRestored);
      EventBus.off(GameEvent.BOOT_COMPLETE, handleBootComplete);
      EventBus.off(GameEvent.BOOT_PROGRESS, handleBootProgress);
      EventBus.off(GameEvent.SCREEN_CHANGE, handleScreenChange);
      unsubscribeAuth();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [ready]);

  useEffect(() => {
    currentScreenRef.current = screen;
  }, [screen]);

  // Re-roll the main-menu background each time we land on it (or the welcome
  // gate, which uses the same random pool).
  useEffect(() => {
    if (screen === 'main-menu' || screen === 'welcome') {
      setMainMenuBackground(pickRandomMainMenuBackground());
    }
  }, [screen]);

  useEffect(() => subscribeAuth(setAuth), []);

  useEffect(() => {
    if (!canUseDevControls) setDevPanelOpen(false);
  }, [canUseDevControls]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isDevToggle =
        event.key === 'F9' ||
        (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd');
      if (isDevToggle) {
        event.preventDefault();
        if (canUseDevControls) setDevPanelOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [canUseDevControls]);

  const shouldAnimateMainMenuButtons =
    screen === 'main-menu'
    && loadingDismissed
    && wipePhase === 'none'
    && !mainMenuIntroPlayed;
  const mainMenuButtonEntryState =
    screen === 'main-menu' && !mainMenuIntroPlayed
      ? shouldAnimateMainMenuButtons ? 'animate' : 'pending'
      : 'static';

  useEffect(() => {
    if (!shouldAnimateMainMenuButtons) return;
    const id = setTimeout(() => setMainMenuIntroPlayed(true), 1100);
    return () => clearTimeout(id);
  }, [shouldAnimateMainMenuButtons]);

  // Start/stop CombatScene based on screen transitions
  useEffect(() => {
    const game = gameRef.current;
    if (!game || !bootComplete) return;
    const combatSceneStatus = getCombatSceneStatus(game);
    const combatSceneRunningLike = isCombatSceneRunningLike(game, combatSceneStatus);

    if (screen === 'combat') {
      if (combatSceneRunningLike) return;

      let scenePayload: CombatScenePayload | null = null;

      // Check if we have a pending snapshot to restore (mid-combat resume)
      const snapshot = consumePendingSnapshot();
      if (snapshot) {
        const run = useRunStore.getState().run;
        useCombatStore.getState().reset();
        useCombatStore.getState().setPlayerHealth(snapshot.player.health, snapshot.player.maxHealth);
        useCombatStore.getState().setGold(snapshot.player.gold);
        if (run) useCombatStore.getState().setAct(run.currentAct);

        // Announce encounter so BootScene can pick the right combat music
        if (run) {
          const currentNode = run.mapState?.nodes.find((n) => n.id === run.currentNodeId);
          EventBus.emit(GameEvent.COMBAT_MUSIC_SET, {
            enemyTypes: snapshot.enemies.map((e) => e.definition.type),
            isElite: currentNode?.type === 'elite',
            isBoss: currentNode?.type === 'boss',
            act: run.currentAct,
          });
        }

        scenePayload = { snapshot };
      } else {
        // Fresh combat: build config from run state and start CombatScene
        const run = useRunStore.getState().run;
        if (!run) return;

        const isPendingEventCombat = run.pendingEventResumeScreen === 'combat';
        const currentNode = run.mapState?.nodes.find((n) => n.id === run.currentNodeId);
        const nodeType = currentNode?.type ?? 'combat';
        const nodeRow = currentNode?.row ?? 99;
        const outlawKingAvailable = !run.outlawKingEncountered;
        const ascMods = getWantedLevelMutations(run.wantedLevel);
        // Event-driven fights (e.g. Coyote Den) override the roll with a specific enemy list.
        const forcedIds = run.forcedCombatEnemies;
        const encounter: EncounterInfo = forcedIds && forcedIds.length > 0
          ? {
              enemies: forcedIds
                .map((id) => ALL_ENEMIES[id])
                .filter((def): def is EnemyDefinition => !!def)
                .map((def) => ({ ...def })),
              isElite: false,
              isBoss: false,
            }
          : rollEncounter(
              run.currentAct, nodeType, run.seed, run.currentNodeId ?? undefined, nodeRow, outlawKingAvailable,
              ascMods.outlawKingChanceMultiplier,
            );
        if (forcedIds && forcedIds.length > 0 && !isPendingEventCombat) {
          useRunStore.getState().setForcedCombatEnemies(undefined);
        }
        // Once-per-run: mark Outlaw King encountered if he was rolled.
        if (encounterContainsOutlawKing(encounter.enemies)) {
          useRunStore.getState().markOutlawKingEncountered();
        }
        // Categorize the encounter for wanted-level scaling.
        // Outlaw King in a "normal" combat node still counts as elite.
        const hasOutlawKing = encounterContainsOutlawKing(encounter.enemies);
        const category: 'normal' | 'elite' | 'boss' = encounter.isBoss
          ? 'boss'
          : encounter.isElite || hasOutlawKing
          ? 'elite'
          : 'normal';

        // Scale the base encounter first.
        applyWantedLevelToEnemies(encounter.enemies, run.wantedLevel, category);

        // Vulture Circle event penalty: apply a +HP multiplier to this act's
        // boss on top of wanted-level scaling, then clear the flag.
        const bossHpBonus = run.pendingActBossHpBonus ?? 0;
        if (encounter.isBoss && bossHpBonus > 0) {
          for (const e of encounter.enemies) {
            e.health = Math.round(e.health * (1 + bossHpBonus));
          }
          useRunStore.getState().setPendingActBossHpBonus(undefined);
        }

        // L20: the Act 3 final boss spawns with a random Act 3 elite companion,
        // scaled with elite-category modifiers (not boss).
        if (
          encounter.isBoss &&
          run.currentAct === 3 &&
          ascMods.finalBossExtraElite
        ) {
          const elitePool = Object.values(ACT3_ELITE);
          if (elitePool.length > 0) {
            const pick = elitePool[Math.floor(Math.random() * elitePool.length)];
            const companion = { ...pick, _summoned: true } as typeof pick;
            applyWantedLevelToEnemies([companion], run.wantedLevel, 'elite');
            encounter.enemies.push(companion);
          }
        }

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
          isOutlawKing: hasOutlawKing,
          goldMultiplier: ascMods.goldMultiplier,
        };

        // Clear any stale combat snapshot before starting fresh
        clearCombatSnapshot(run.id).catch(() => {});
        clearRemoteCombatSnapshot(run.id).catch(() => {});

        // Reset combat store before starting
        useCombatStore.getState().reset();
        useCombatStore.getState().setPlayerHealth(run.health, run.maxHealth);
        useCombatStore.getState().setGold(run.gold);
        useCombatStore.getState().setAct(run.currentAct);

        // Announce encounter so BootScene can pick the right combat music
        EventBus.emit(GameEvent.COMBAT_MUSIC_SET, {
          enemyTypes: encounter.enemies.map((e) => e.type),
          isElite: encounter.isElite,
          isBoss: encounter.isBoss,
          act: run.currentAct,
        });

        scenePayload = { config: combatConfig };

        // Mark combat node as visited now that combat is starting
        const nodeId = run.currentNodeId;
        if (nodeId) {
          useRunStore.getState().markNodeVisited(nodeId);
        }
        if (isPendingEventCombat) {
          forceSaveRun();
        }
      }

      setCombatSceneData(scenePayload);
      EventBus.emit(GameEvent.COMBAT_SCENE_RUN, scenePayload);
      return;
    }

    if (!combatSceneRunningLike) return;

    // Leaving combat: stop CombatScene and clear combat store so the HUD
    // (consumable slots, etc.) reports `inCombat = false` on the map.
    EventBus.emit(GameEvent.COMBAT_SCENE_STOP);
    useCombatStore.getState().reset();
  }, [screen, bootComplete]);

  // Event redirects checkpoint only after the destination has actually opened.
  useEffect(() => {
    if (screen !== 'artifact') return;
    const run = useRunStore.getState().run;
    if (run?.pendingEventResumeScreen !== 'artifact') return;
    forceSaveRun();
  }, [screen]);

  useEffect(() => {
    if (screen !== 'map') return;
    const store = useRunStore.getState();
    const run = store.run;
    const currentNode = run?.mapState?.nodes.find((n) => n.id === run?.currentNodeId);
    if (currentNode?.type === 'event') {
      if (run?.pendingEventResumeScreen) {
        store.setPendingEventResumeScreen(undefined);
      }
      forceSaveRun();
      return;
    }
    if (currentNode?.type === 'campfire') {
      if (run?.pendingCampfireOutcome) {
        store.setPendingCampfireOutcome(undefined);
      }
      forceSaveRun();
    }
  }, [screen]);

  // Handle combat end: sync results to run store and return to map
  useEffect(() => {
    const handleCombatEnd = (...args: unknown[]) => {
      const result = args[0] as CombatResult;
      const store = useRunStore.getState();
      const runAtCombatEnd = store.run;
      const currentNodeId = runAtCombatEnd?.currentNodeId;
      const currentNode = runAtCombatEnd?.mapState?.nodes.find((n) => n.id === currentNodeId);
      const wasPendingEventCombat = runAtCombatEnd?.pendingEventResumeScreen === 'combat';

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
        clearRemoteCombatSnapshot(runId).catch(() => {});
      }

      // Always sync ability charge (persists between combats)
      store.syncAbilityCharge(result.abilityCharge);

      if (wasPendingEventCombat) {
        store.setPendingEventResumeScreen(undefined);
        store.setForcedCombatEnemies(undefined);
      }

      if (result.victory) {
        // Mark the current node as completed
        if (currentNodeId) store.markNodeCompleted(currentNodeId);

        // Track persistent clear counts (mapState resets each act, so counters must be separate)
        if (currentNode?.type === 'combat') store.addCombatCleared();
        else if (currentNode?.type === 'elite') store.addEliteCleared();

        // Record gold obtained during the fight. Use the positive-only counter
        // (goldGainedThisFight) so penalties like fool's-gold or Reno's-Coin
        // don't erase the underlying gains from the run-wide tally.
        store.addGoldObtained(result.goldGainedThisFight);

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
          if (result.deathCause) store.setDeathCause(result.deathCause);
          EventBus.emit(GameEvent.SCREEN_CHANGE, 'score');
          store.endRun(false);
          return;
        }

        // Check if the just-completed fight was a boss
        const currentRun = store.run;
        const latestNode = currentRun?.mapState?.nodes.find((n) => n.id === currentRun?.currentNodeId);

        // Outlaw King defeat guarantees a legendary artifact reward.
        // Flag the run so ArtifactScreen forces legendary on the next visit.
        if (result.defeatedOutlawKing) {
          store.addOutlawKingDefeated();
          store.setPendingLegendaryReward(true);
        }

        if (latestNode && latestNode.type === 'boss') {
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
            EventBus.emit(GameEvent.SCREEN_CHANGE, 'artifact');
          }
        } else if (latestNode && latestNode.type === 'elite') {
          // Elite victory: artifact reward before returning to map
          EventBus.emit(GameEvent.SCREEN_CHANGE, 'artifact');
        } else if (result.defeatedOutlawKing) {
          // Outlaw King in a normal combat node still routes through the artifact
          // screen so the legendary drop is delivered.
          EventBus.emit(GameEvent.SCREEN_CHANGE, 'artifact');
        } else {
          EventBus.emit(GameEvent.SCREEN_CHANGE, 'map');
        }
      }, 1000);
    };

    EventBus.on(GameEvent.COMBAT_END, handleCombatEnd);
    return () => { EventBus.off(GameEvent.COMBAT_END, handleCombatEnd); };
  }, []);

  // Mark one-shot artifacts as used (greys them out and prevents future combat triggers)
  useEffect(() => {
    const handleArtifactUsed = (...args: unknown[]) => {
      const id = args[0] as string;
      useRunStore.getState().markArtifactUsed(id);
    };
    EventBus.on(GameEvent.ARTIFACT_USED, handleArtifactUsed);
    return () => { EventBus.off(GameEvent.ARTIFACT_USED, handleArtifactUsed); };
  }, []);

  // Handle mid-combat save requests (emitted after each swap resolution)
  useEffect(() => {
    const handleSaveRequest = () => {
      const game = gameRef.current;
      const run = useRunStore.getState().run;
      if (!game || !run) return;

      const scene = getCombatScene(game);
      if (!scene?.scene?.isActive() || !scene?.combatManager) return;

      const snapshot = scene.combatManager.createSnapshot(run.id);
      saveCombatSnapshot(snapshot).catch((err) => {
        console.error('[save] combat snapshot failed:', err);
      });
      pushCombatSnapshot(snapshot).catch(() => {});
    };

    EventBus.on(GameEvent.COMBAT_SAVE_REQUESTED, handleSaveRequest);
    return () => { EventBus.off(GameEvent.COMBAT_SAVE_REQUESTED, handleSaveRequest); };
  }, []);

  // Save combat snapshot when the app is backgrounded or closed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return;
      if (currentScreenRef.current !== 'combat') return; // Only save during combat
      const game = gameRef.current;
      const run = useRunStore.getState().run;
      if (!game || !run) return;

      const scene = getCombatScene(game);
      if (!scene?.scene?.isActive() || !scene?.combatManager) return;

      const snapshot = scene.combatManager.createSnapshot(run.id);
      saveCombatSnapshot(snapshot).catch(() => {});
      pushCombatSnapshot(snapshot).catch(() => {});
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

  const { scale, offsetX, offsetY, viewportWidth } = useGameScale();
  const lastCharacter = useMetaStore((s) => s.meta.lastCharacter);
  const eventBackground = useMemo(() => {
    if (screen !== 'event' || !run) return undefined;
    return pickEventFromBag(
      run.currentAct,
      `${run.seed}-event-${run.currentNodeId ?? ''}`,
      run.eventBag ?? [],
    ).event.background;
    // Match EventScreen: the event stays stable for the current node even after
    // the bag is persisted on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, run?.currentAct, run?.seed, run?.currentNodeId]);
  const windowBackground = getScreenBackground(screen, run, mainMenuBackground, eventBackground, lastCharacter);

  // Don't render until persisted run is loaded from IndexedDB
  if (!ready) return null;

  // Combat uses pointer-events-none so Phaser board receives clicks;
  // all other screens are pointer-events-auto (opaque overlays).
  const pointerMode = screen === 'combat' ? 'none' : 'auto';

  // Screens that show the unified TopBar + ArtifactBar (all in-run screens)
  const IN_RUN_SCREENS: Set<Screen> = new Set([
    'combat', 'map', 'merchant', 'campfire', 'event', 'artifact', 'tile-select', 'starter',
  ]);
  const showTopBar = IN_RUN_SCREENS.has(screen);

  // Screens whose background gets a translucent dim layer for foreground readability.
  const DIM_BG_SCREENS: Set<Screen> = new Set([
    'reputation-shop', 'customize', 'ledger', 'leaderboard', 'combat', 'map',
    'campfire', 'merchant', 'tile-select',
  ]);

  const dimBackground = DIM_BG_SCREENS.has(screen);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black" onContextMenu={(e) => e.preventDefault()}>
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${windowBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
        }}
      />
      {dimBackground && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        />
      )}
      <div ref={gameContainerRef} className="absolute inset-0" />
      <OfflineIndicator />

      {/* Global SVG defs. The enemy-target-outline filter produces ONLY the
          dilated-alpha ring around a sprite (no source merge), so a duplicate
          sprite layered on top renders as a clean white outline whose opacity
          can be animated without ever tinting the original sprite body. */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden>
        <defs>
          <filter id="enemy-target-outline" x="-20%" y="-20%" width="140%" height="140%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="dilated" />
            <feComposite in="dilated" in2="SourceAlpha" operator="out" result="ring" />
            <feFlood floodColor="white" result="white" />
            <feComposite in="white" in2="ring" operator="in" />
          </filter>
          <filter id="chamber-ready-outline" x="-20%" y="-20%" width="140%" height="140%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="dilated" />
            <feComposite in="dilated" in2="SourceAlpha" operator="out" result="ring" />
            <feFlood floodColor="#FFD700" result="gold" />
            <feComposite in="gold" in2="ring" operator="in" />
          </filter>
          {/* Per-rarity artifact outline filters. Same dilate+subtract pattern as
              the enemy target outline, just with rarity-dim colors flooded in.
              Used by ArtifactBar to draw the HUD rarity ring. */}
          {(
            [
              ['common', '#9a9a9a'],
              ['uncommon', '#4a9a4a'],
              ['rare', '#4070b0'],
              ['legendary', '#b09830'],
              ['corrupt', '#a82020'],
            ] as const
          ).map(([name, color]) => (
            <filter key={name} id={`artifact-outline-${name}`} x="-20%" y="-20%" width="140%" height="140%">
              <feMorphology in="SourceAlpha" operator="dilate" radius="1.25" result="dilated" />
              <feComposite in="dilated" in2="SourceAlpha" operator="out" result="ring" />
              <feFlood floodColor={color} result="color" />
              <feComposite in="color" in2="ring" operator="in" />
            </filter>
          ))}
        </defs>
      </svg>

      {/* Scaled overlay: 960x540 virtual pixels, CSS-transformed to match Phaser canvas */}
      <div
        data-tooltip-root
        id="scaled-ui-root"
        className={`absolute overflow-hidden select-none ${showTopBar ? 'flex flex-col' : ''}`}
        style={{
          width: UI_WIDTH,
          height: UI_HEIGHT,
          left: offsetX,
          top: offsetY,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          fontSize: 16,
          pointerEvents: pointerMode,
        }}
      >
        <GameNotification />
        {canUseDevControls && (
          <DevPanel open={devPanelOpen} screen={screen} onClose={() => setDevPanelOpen(false)} />
        )}

        {/* Full-area screens rendered behind TopBar */}
        {screen === 'artifact' && (
          <div className="absolute inset-0">
            <ArtifactScreen />
          </div>
        )}
        {screen === 'tile-select' && (
          <div className="absolute inset-0">
            <TileSelectScreen />
          </div>
        )}
        {screen === 'starter' && (
          <div className="absolute inset-0">
            <StarterScreen />
          </div>
        )}

        {/* Top bar reserves vertical space here so screens lay out underneath;
            the actual TopBar / ArtifactBar / TraitRow are rendered in a
            viewport-wide container outside the scaled overlay (see below). */}
        {showTopBar && <div style={{ height: 28, flexShrink: 0 }} aria-hidden />}

        {/* Combat HUD: uses absolute positioning, overlays full area */}
        {screen === 'combat' && <CombatHUD />}

        {/* Non-combat screen content fills remaining space below TopBar */}
        {screen !== 'combat' && screen !== 'artifact' && screen !== 'tile-select' && screen !== 'starter' && (
          <div className={showTopBar ? 'flex-1 overflow-hidden' : 'h-full'}>
            {screen === 'main-menu' && <MainMenu buttonEntryState={mainMenuButtonEntryState} />}
            {screen === 'character-select' && <CharacterSelectScreen />}
            {screen === 'map' && <MapScreen />}
            {screen === 'merchant' && <MerchantScreen />}
            {screen === 'campfire' && <CampfireScreen />}
            {screen === 'event' && <EventScreen />}
            {screen === 'score' && <ScoreScreen />}
            {screen === 'reputation-shop' && <ReputationShopScreen />}
            {screen === 'customize' && <CustomizeScreen />}
            {screen === 'ledger' && <LedgerScreen />}
            {screen === 'leaderboard' && <LeaderboardScreen />}
            {screen === 'settings' && <SettingsScreen />}
            {screen === 'login' && <LoginScreen />}
            {screen === 'pick-name' && <PickNameScreen />}
            {screen === 'welcome' && <WelcomeScreen />}
          </div>
        )}

        {/* Floating numbers: rendered at top level so they appear above TopBar */}
        {showTopBar && <FloatingNumbers />}
        {showTopBar && screen !== 'combat' && <NonCombatFloats />}

        {/* Tutorial overlay: dark overlay with optional spotlight + tooltip */}
        <TutorialOverlay />

        {/* "Retrieving data..." badge during long-running Supabase pulls. */}
        <SyncIndicator />

        {/* Blocking "Syncing data..." overlay during post-login sync. */}
        <LoginSyncOverlay />

        {/* Blocking "Signed in elsewhere" overlay when another device takes over. */}
        <KickoutOverlay />
      </div>

      {/* Viewport-wide top bar: scaled like the UI overlay but fills the
          entire viewport width so the bar stripe and its content reach the
          screen edges. Anchored to viewport top:0. */}
      {showTopBar && (
        <div
          data-tooltip-root
          className="absolute top-0 left-0 z-[80]"
          style={{
            width: viewportWidth / scale,
            height: 60,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          <TopBar
            mapDisabled={screen === 'map'}
            showConsumables={screen === 'combat'}
            deadeyeCursorEnabled={screen === 'combat' && wipePhase === 'none'}
          />
          <ArtifactBar />
          <TraitRow />
        </div>
      )}

      {/* Seed indicator -- viewport-anchored bottom-left, only while in a run */}
      {showTopBar && <SeedIndicator />}

      {/* Main-menu account indicator -- viewport-anchored bottom-right */}
      {screen === 'main-menu' && <MainMenuAccountIndicator />}

      {/* Screen transition wipe overlay -- covers the entire viewport */}
      {wipePhase !== 'none' && (
        <div
          className={`absolute inset-0 bg-black z-[100] ${wipePhase === 'in' ? 'screen-wipe-in' : 'screen-wipe-out'}`}
          onAnimationEnd={() => handleWipeComplete.current?.()}
        />
      )}

      {/* Loading screen -- covers the entire viewport, anchors text+bar bottom-right */}
      {!loadingDismissed && (
        <div
          className={`absolute inset-0 bg-black z-[200] flex flex-col items-end justify-end p-8 ${bootComplete ? 'screen-wipe-out' : ''}`}
          onAnimationEnd={() => setLoadingDismissed(true)}
        >
          {!bootComplete && (
            <div className="flex flex-col items-end gap-4">
              <span className="text-6xl text-white tracking-widest font-bold animate-loading-breathe">LOADING</span>
              <div
                className="relative overflow-hidden bg-stone-800 rounded-sm"
                style={{ width: 720, height: 20, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }}
              >
                <div
                  className="h-full bg-amber-600 transition-[width] duration-150 ease-linear"
                  style={{
                    width: bootProgress.total > 0
                      ? `${(bootProgress.loaded / bootProgress.total) * 100}%`
                      : '0%',
                  }}
                />
              </div>
              <span className="text-2xl text-stone-400 font-bold tabular-nums">
                {bootProgress.loaded} / {bootProgress.total || '?'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Global version label -- viewport-anchored bottom-right */}
      <span
        className="absolute right-2 bottom-1 pointer-events-none z-[60]"
        style={{ fontSize: '17px', color: 'rgba(255,255,255,0.45)' }}
      >
        {APP_VERSION_LABEL.toUpperCase().replace(/^ALPHA V/, 'ALPHA v')}
      </span>

      <BloodOverlay />
    </div>
  );
}

function SeedIndicator() {
  const seed = useRunStore((s) => s.run?.seed ?? '');
  const [copied, setCopied] = useState(false);
  if (!seed) return null;
  return (
    <div
      className="absolute left-2 bottom-1 z-[60] pointer-events-auto"
      style={{ fontSize: '17px' }}
    >
      <button
        className="text-white/45 hover:text-white/70 uppercase tracking-wider"
        data-no-click-sfx
        onClick={() => {
          navigator.clipboard.writeText(seed.toUpperCase());
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        title={copied ? 'Copied!' : 'Copy seed'}
      >
        SEED {seed.toUpperCase()}
      </button>
    </div>
  );
}

function MainMenuAccountIndicator() {
  const [auth, setAuthState] = useState<AuthState>(() => ({ ...getAuthState() }));
  useEffect(() => subscribeAuth(setAuthState), []);
  const handleLogin = () => EventBus.emit(GameEvent.SCREEN_CHANGE, 'login' satisfies Screen);

  return (
    <div className="absolute right-5 bottom-9 z-[60] pointer-events-auto text-right">
      {auth.isLoggedIn ? (
        <span
          style={{
            fontSize: '24px',
            color: '#b8b8b8',
            letterSpacing: '1px',
            textShadow: '1px 1px 3px rgba(0,0,0,1), 1px 1px 6px rgba(0,0,0,0.95)',
          }}
        >
          Signed In
        </span>
      ) : (
        <button
          onClick={handleLogin}
          style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer', fontSize: '24px' }}
          className="px-7 py-3 uppercase rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5 transition-transform"
        >
          Login
        </button>
      )}
    </div>
  );
}
