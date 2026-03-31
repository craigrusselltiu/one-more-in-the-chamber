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
import { CombatHUD } from './ui/hud/CombatHUD';
import { EventBus, GameEvent } from './game/EventBus';
import { useRunStore } from './store/runStore';
import { useCombatStore } from './store/combatStore';
import { useGameScale, UI_WIDTH, UI_HEIGHT } from './ui/hooks/useGameScale';
import type { CombatConfig, CombatResult } from './game/combat/CombatManager';
import {
  rollAct1Encounter,
  rollAct1EliteEncounter,
  BOSSES,
  ACT2_ENEMIES,
  ACT3_ENEMIES,
} from './data/enemies';
import type { EnemyDefinition } from './types/combat';
import type { MapNodeType, Act } from './types/game';

export type Screen =
  | 'main-menu'
  | 'tile-select'
  | 'combat'
  | 'map'
  | 'shop'
  | 'rest-site'
  | 'event'
  | 'score'
  | 'treasure';

/** Roll enemies for a given act and node type. */
function rollEncounter(act: Act, nodeType: MapNodeType): { enemies: EnemyDefinition[]; isElite: boolean; isBoss: boolean } {
  if (nodeType === 'boss') {
    return { enemies: [BOSSES[act]], isElite: false, isBoss: true };
  }
  if (nodeType === 'elite') {
    if (act === 1) return { enemies: rollAct1EliteEncounter(), isElite: true, isBoss: false };
    // Acts 2/3 elite: tougher version of a random act enemy
    const pool = act === 2 ? Object.values(ACT2_ENEMIES) : Object.values(ACT3_ENEMIES);
    const base = pool[Math.floor(Math.random() * pool.length)];
    return {
      enemies: [{
        ...base,
        health: Math.round(base.health * 1.5),
        minDamage: base.minDamage + 2,
        maxDamage: base.maxDamage + 3,
      }],
      isElite: true,
      isBoss: false,
    };
  }
  // Regular combat
  if (act === 1) return { enemies: rollAct1Encounter(), isElite: false, isBoss: false };
  const pool = act === 2 ? Object.values(ACT2_ENEMIES) : Object.values(ACT3_ENEMIES);
  const base = pool[Math.floor(Math.random() * pool.length)];
  const count = 1 + Math.floor(Math.random() * 2);
  return {
    enemies: Array.from({ length: count }, () => ({ ...base })),
    isElite: false,
    isBoss: false,
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
        const { enemies, isElite, isBoss } = rollEncounter(run.currentAct, nodeType);

        const combatConfig: CombatConfig = {
          enemies,
          playerHealth: run.health,
          playerMaxHealth: run.maxHealth,
          playerGold: run.gold,
          activeTileTypes: run.activeTileTypes,
          tileUpgrades: run.tileUpgrades,
          abilityCharge: run.abilityCharge,
          artifacts: run.artifacts,
          traitCounts: run.traitCounts,
          isElite,
          isBoss,
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

      if (result.victory) {
        // Sync combat results back to run (use absolute values from combat end)
        const run = store.run;
        if (run) {
          store.updateHealth(result.playerHealth - run.health);
          store.updateGold(result.playerGold - run.gold);
        }
      }

      // Return to map after a brief delay
      setTimeout(() => {
        if (result.victory) {
          EventBus.emit(GameEvent.SCREEN_CHANGE, 'map');
        } else {
          EventBus.emit(GameEvent.SCREEN_CHANGE, 'score');
          store.endRun(false);
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
    <div className="relative w-full h-full">
      <div ref={gameContainerRef} className="absolute inset-0" />

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
      </div>
    </div>
  );
}
