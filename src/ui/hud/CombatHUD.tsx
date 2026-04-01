import { memo } from 'react';
import { CombatBridge } from './CombatBridge';
import { TopBar } from './TopBar';
import { ArtifactBar } from './ArtifactBar';
import { PlayerPanel } from './PlayerPanel';
import { EnemyTargeting } from './EnemyTargeting';
import { ComboDisplay } from './ComboDisplay';
import { EndTurnButton } from './EndTurnButton';
import { useCombatStore } from '../../store/combatStore';

/**
 * CombatHUD: React overlay during combat.
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

      {/* Top HUD bar */}
      <TopBar showMapButton showConsumables />

      {/* Artifact row */}
      <ArtifactBar />

      {/* Main combat area */}
      <div className="absolute inset-x-0 top-5 bottom-0 flex">
        {/* Player area -- centered between screen left and board left */}
        {/* Board left is at 128/480 = 26.67% of width */}
        <div
          className="flex flex-col items-center justify-center px-1"
          style={{ width: '26.67%' }}
        >
          <PlayerPanel />
        </div>

        {/* Board area (center, Phaser renders the board here) */}
        <div className="flex-1 flex flex-col items-center justify-end pb-1">
          <ComboDisplay />
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
