import { memo, useState, useEffect, useRef } from 'react';
import { CombatBridge } from './CombatBridge';
import { PlayerPanel } from './PlayerPanel';
import { EnemyTargeting } from './EnemyTargeting';
import { ComboDisplay } from './ComboDisplay';
import { AbilityMeter } from './AbilityMeter';
import { CombatAttackLines } from './CombatAttackLines';

import { EventBus, GameEvent } from '../../game/EventBus';

/**
 * CombatHUD: React overlay during combat.
 *
 * TopBar + ArtifactBar are rendered by App.tsx for all in-run screens.
 *
 * The board is 432px wide centered in 960px canvas (1:1 with UI).
 * Board left in UI: ~264px, right: ~696px.
 * Player panel centered between left screen edge (0) and board left.
 * Enemy panel centered between board right and right screen edge.
 *
 * All panels use pointer-events-auto so they're clickable;
 * the board area passes through to Phaser.
 *
 * Bottom-left: swap count + end turn button.
 */
export const CombatHUD = memo(function CombatHUD() {
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={rootRef} className="pointer-events-none text-xs select-none" style={{ width: 960, height: 540, position: 'relative' }}>
      {/* EventBus -> Zustand bridge (invisible) */}
      <CombatBridge />

      {/* Player->enemy damage lines (rendered in React so it can anchor to sprite DOM bounds) */}
      <CombatAttackLines containerRef={rootRef} />

      {/* Combo display: anchored to the board top-center. */}
      <div
        className="absolute pointer-events-none"
        style={{ left: 480, top: 58, transform: 'translateX(-50%)', zIndex: 5 }}
      >
        <ComboDisplay />
      </div>

      {/* Main combat area - starts below top bar (28px) + artifact bar */}
      <div className="absolute inset-x-0 bottom-0 flex" style={{ top: 36 }}>
        {/* Player area */}
        <div
          className="relative flex flex-col items-center justify-center px-1 pointer-events-auto"
          style={{ width: '26.67%' }}
        >
          <PlayerPanel />
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

      {/* Ability meter bar: centered between screen-left (x=0) and
          board-left (~x=264 in the 960-wide UI). */}
      <div
        className="absolute pointer-events-auto flex items-center"
        style={{ bottom: 40, left: 144, transform: 'translateX(-50%)' }}
      >
        <AbilityMeter />
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
