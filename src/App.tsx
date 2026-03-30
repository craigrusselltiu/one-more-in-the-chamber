import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './game/GameConfig';
import { MainMenu } from './ui/screens/MainMenu';
import { MapScreen } from './ui/screens/MapScreen';
import { ShopScreen } from './ui/screens/ShopScreen';
import { RestSiteScreen } from './ui/screens/RestSiteScreen';
import { EventScreen } from './ui/screens/EventScreen';
import { ScoreScreen } from './ui/screens/ScoreScreen';
import { CombatHUD } from './ui/hud/CombatHUD';
import { EventBus, GameEvent } from './game/EventBus';

export type Screen =
  | 'main-menu'
  | 'combat'
  | 'map'
  | 'shop'
  | 'rest-site'
  | 'event'
  | 'score';

export default function App() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [screen, setScreen] = useState<Screen>('main-menu');

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

  return (
    <div className="relative w-full h-full">
      <div ref={gameContainerRef} className="absolute inset-0" />

      <div className="absolute inset-0 pointer-events-none">
        {screen === 'main-menu' && (
          <div className="pointer-events-auto">
            <MainMenu />
          </div>
        )}
        {screen === 'combat' && (
          <div className="pointer-events-auto">
            <CombatHUD />
          </div>
        )}
        {screen === 'map' && (
          <div className="pointer-events-auto">
            <MapScreen />
          </div>
        )}
        {screen === 'shop' && (
          <div className="pointer-events-auto">
            <ShopScreen />
          </div>
        )}
        {screen === 'rest-site' && (
          <div className="pointer-events-auto">
            <RestSiteScreen />
          </div>
        )}
        {screen === 'event' && (
          <div className="pointer-events-auto">
            <EventScreen />
          </div>
        )}
        {screen === 'score' && (
          <div className="pointer-events-auto">
            <ScoreScreen />
          </div>
        )}
      </div>
    </div>
  );
}
