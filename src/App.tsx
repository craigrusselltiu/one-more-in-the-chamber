import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './game/GameConfig';
import { MainMenu } from './ui/screens/MainMenu';
import { TileSelectScreen } from './ui/screens/TileSelectScreen';
import { MapScreen } from './ui/screens/MapScreen';
import { ShopScreen } from './ui/screens/ShopScreen';
import { RestSiteScreen } from './ui/screens/RestSiteScreen';
import { EventScreen } from './ui/screens/EventScreen';
import { ScoreScreen } from './ui/screens/ScoreScreen';
import { TreasureScreen } from './ui/screens/TreasureScreen';
import { ReputationShopScreen } from './ui/screens/ReputationShopScreen';
import { CombatHUD } from './ui/hud/CombatHUD';
import { OfflineIndicator } from './ui/components/OfflineIndicator';
import { EventBus, GameEvent } from './game/EventBus';
import { useRunStore } from './store/runStore';
import { useCombatStore } from './store/combatStore';
import { useGameScale, UI_WIDTH, UI_HEIGHT } from './ui/hooks/useGameScale';
import type { CombatConfig, CombatResult } from './game/combat/CombatManager';
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

export type Screen =
  | 'main-menu'
  | 'tile-select'
  | 'combat'
  | 'map'
  | 'shop'
  | 'rest-site'
  | 'event'
  | 'score'
  | 'treasure'
  | 'reputation-shop';

const ENCOUNTER_ROLLERS: Record<Act, { regular: () => EnemyDefinition[]; elite: () => EnemyDefinition[] }> = {
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
function rollEncounter(act: Act, nodeType: MapNodeType): EncounterInfo {
  if (nodeType === 'boss') {
    return { enemies: [BOSSES[act]], isElite: false, isBoss: true };
  }
  const rollers = ENCOUNTER_ROLLERS[act];
  if (nodeType === 'elite') {
    return { enemies: rollers.elite(), isElite: true, isBoss: false };
  }
  const enemies = rollers.regular();
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
  const prevScreenRef = useRef<Screen>('main-menu');

  useEffect(() => {
    if (!gameContainerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      ...gameConfig,
      parent: gameContainerRef.current,
    };

    gameRef.current = new Phaser.Game(config);

    const handleScreenChange = (...args: unknown[]) => {
      setScreen(args[0] as Screen);
    };

    EventBus.on(GameEvent.SCREEN_CHANGE, handleScreenChange);

    return () => {
      EventBus.off(GameEvent.SCREEN_CHANGE, handleScreenChange);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // Start/stop CombatScene based on screen transitions
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;

    if (screen === 'combat' && prevScreenRef.current !== 'combat') {
      // Entering combat: build config from run state and start CombatScene
      const run = useRunStore.getState().run;
      if (run) {
        const currentNode = run.mapState?.nodes.find((n) => n.id === run.currentNodeId);
        const nodeType = currentNode?.type ?? 'combat';
        const encounter = rollEncounter(run.currentAct, nodeType);
        applyAscensionToEnemies(encounter.enemies, run.ascensionLevel);
        const ascMods = getAscensionModifiers(run.ascensionLevel);

        const combatConfig: CombatConfig = {
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

        // Reset combat store before starting
        useCombatStore.getState().reset();
        useCombatStore.getState().setPlayerHealth(run.health, run.maxHealth);
        useCombatStore.getState().setGold(run.gold);
        useCombatStore.getState().setAct(run.currentAct);

        game.scene.start('CombatScene', { config: combatConfig });
      }
    } else if (screen !== 'combat' && prevScreenRef.current === 'combat') {
      // Leaving combat: stop CombatScene
      game.scene.stop('CombatScene');
    }

    prevScreenRef.current = screen;
  }, [screen]);

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

      if (result.victory) {
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
        if (currentNode?.type === 'boss') {
          if (currentRun!.currentAct >= 3) {
            // Final boss: run complete
            store.endRun(true);
            EventBus.emit(GameEvent.SCREEN_CHANGE, 'score');
          } else {
            // Between-act: pick a new tile before advancing
            EventBus.emit(GameEvent.SCREEN_CHANGE, 'tile-select');
          }
        } else {
          EventBus.emit(GameEvent.SCREEN_CHANGE, 'map');
        }
      }, 1000);
    };

    EventBus.on(GameEvent.COMBAT_END, handleCombatEnd);
    return () => { EventBus.off(GameEvent.COMBAT_END, handleCombatEnd); };
  }, []);

  const { scale, offsetX, offsetY } = useGameScale();

  // Combat uses pointer-events-none so Phaser board receives clicks;
  // all other screens are pointer-events-auto (opaque overlays).
  const pointerMode = screen === 'combat' ? 'none' : 'auto';

  return (
    <div className="relative w-full h-full" onContextMenu={(e) => e.preventDefault()}>
      <div ref={gameContainerRef} className="absolute inset-0" />
      <OfflineIndicator />

      {/* Scaled overlay: 960x540 virtual pixels, CSS-transformed to match Phaser canvas */}
      <div
        className="absolute overflow-hidden"
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
        {screen === 'main-menu' && <MainMenu />}
        {screen === 'tile-select' && <TileSelectScreen />}
        {screen === 'combat' && <CombatHUD />}
        {screen === 'map' && <MapScreen />}
        {screen === 'shop' && <ShopScreen />}
        {screen === 'rest-site' && <RestSiteScreen />}
        {screen === 'event' && <EventScreen />}
        {screen === 'score' && <ScoreScreen />}
        {screen === 'treasure' && <TreasureScreen />}
        {screen === 'reputation-shop' && <ReputationShopScreen />}
      </div>
    </div>
  );
}
