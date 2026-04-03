import { memo } from 'react';
import { CombatBridge } from './CombatBridge';
import { PlayerPanel } from './PlayerPanel';
import { EnemyTargeting } from './EnemyTargeting';
import { ComboDisplay } from './ComboDisplay';
import { AbilityMeter } from './AbilityMeter';
import { EndTurnButton } from './EndTurnButton';
import { useCombatStore } from '../../store/combatStore';

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

  return (
    <div className="pointer-events-none font-mono text-xs select-none" style={{ width: 960, height: 540, position: 'relative' }}>
      {/* EventBus -> Zustand bridge (invisible) */}
      <CombatBridge />

      {/* Main combat area */}
      <div className="absolute inset-x-0 top-5 bottom-0 flex">
        {/* Player area -- combo has fixed height so it doesn't shift the sprite */}
        <div
          className="flex flex-col items-center justify-center px-1"
          style={{ width: '26.67%' }}
        >
          {/* Combo indicator - fixed height so it doesn't push player panel */}
          <div style={{ height: 16 }}>
            <ComboDisplay />
          </div>
          <PlayerPanel />
        </div>

        {/* Board area (center, Phaser renders the board here) */}
        <div className="flex-1 flex flex-col items-center justify-end pb-1">
          <AbilityMeter />
        </div>

        {/* Enemy area -- centered between board right and screen right */}
        <div
          className="flex flex-col items-center justify-center px-1"
          style={{ width: '26.67%' }}
        >
          <EnemyTargeting />
        </div>
      </div>

      {/* Bottom-left: swap count + end turn button */}
      <div className="absolute bottom-1 left-1 flex flex-col items-start gap-0.5">
        <span className="text-[7px] text-stone-300">
          Swaps: {swapsRemaining}/{swapsPerTurn}
        </span>
        <EndTurnButton />
      </div>
    </div>
  );
});
