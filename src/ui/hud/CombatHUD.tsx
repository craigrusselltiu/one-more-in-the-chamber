import { memo, useState, useEffect } from 'react';
import { CombatBridge } from './CombatBridge';
import { PlayerPanel } from './PlayerPanel';
import { EnemyTargeting } from './EnemyTargeting';
import { ComboDisplay } from './ComboDisplay';
import { AbilityMeter } from './AbilityMeter';
import { EndTurnButton } from './EndTurnButton';

import { TraitDisplay } from './TraitDisplay';
import { useCombatStore } from '../../store/combatStore';
import { useRunStore } from '../../store/runStore';
import { EventBus, GameEvent } from '../../game/EventBus';

/**
 * CombatHUD: React overlay during combat.
 *
 * TopBar + ArtifactBar are rendered by App.tsx for all in-run screens.
 *
 * The board is 224px wide centered in 480px game width.
 * Board left edge: 128px, right edge: 352px.
 * Player panel centered between left screen edge (0) and board left (128).
 * Enemy panel centered between board right (352) and right screen edge (480).
 *
 * All panels use pointer-events-auto so they're clickable;
 * the board area passes through to Phaser.
 *
 * Bottom-left: swap count + end turn button.
 */
export const CombatHUD = memo(function CombatHUD() {
  const swapsRemaining = useCombatStore((s) => s.swapsRemaining);
  const swapsPerTurn = useCombatStore((s) => s.swapsPerTurn);
  const hasArtifacts = useRunStore((s) => (s.run?.artifacts.length ?? 0) > 0);

  return (
    <div className="pointer-events-none text-xs select-none" style={{ width: 960, height: 540, position: 'relative' }}>
      {/* EventBus -> Zustand bridge (invisible) */}
      <CombatBridge />

      {/* Main combat area - starts below top bar (28px) + artifact bar */}
      <div className="absolute inset-x-0 bottom-0 flex" style={{ top: 36 }}>
        {/* Player area -- combo has fixed height so it doesn't shift the sprite */}
        <div
          className="relative flex flex-col items-center justify-center px-1 pointer-events-auto"
          style={{ width: '26.67%' }}
        >
          <PlayerPanel />
          {/* Combo + Swap count + end turn - absolute above player */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <div style={{ height: 16 }}>
              <ComboDisplay />
            </div>
            <span
              className="text-sm text-stone-200 font-bold"
              style={{
                WebkitTextStroke: '3px #000',
                paintOrder: 'stroke fill',
              }}
            >
              SWAPS {swapsRemaining}/{swapsPerTurn}
            </span>
            <EndTurnButton />
          </div>
          {/* Ability meter - fixed position below player */}
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <AbilityMeter />
          </div>
          {/* Traits - fixed position at bottom, hidden when no artifacts */}
          {hasArtifacts && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <span
                className="text-[8px] text-stone-200 font-bold block text-center mb-0.5"
                style={{
                  WebkitTextStroke: '2px #000',
                  paintOrder: 'stroke fill',
                }}
              >
                TRAITS
              </span>
              <TraitDisplay />
            </div>
          )}
        </div>

        {/* Board area (center, Phaser renders the board here) */}
        <div className="flex-1" />

        {/* Enemy area -- centered, shifted up to align with player sprite */}
        <div
          className="flex flex-col items-center justify-center px-1"
          style={{ width: '26.67%', marginTop: -20 }}
        >
          <EnemyTargeting />
        </div>
      </div>

      <TurnBanner />
    </div>
  );
});

/** Large text banner that fades in and out for "ENEMY TURN" / "YOUR TURN". */
function TurnBanner() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      setText(args[0] as string);
      setTimeout(() => setText(null), 800);
    };
    EventBus.on(GameEvent.TURN_BANNER, handler);
    return () => { EventBus.off(GameEvent.TURN_BANNER, handler); };
  }, []);

  if (!text) return null;

  return (
    <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ zIndex: 50, top: '25%' }}>
      <span
        className="text-4xl text-white font-bold uppercase turn-banner-text"
        style={{ WebkitTextStroke: '6px #000', paintOrder: 'stroke fill' }}
      >
        {text}
      </span>
    </div>
  );
}
