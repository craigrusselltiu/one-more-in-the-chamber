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
 * Layout matches SPEC combat mockup at 480x270 internal resolution:
 *
 *   [ Act I ][    gold count    ][ gear ]               <- TopBar (~16px)
 *   [ artifacts row (left-aligned, under top bar) ]     <- ArtifactBar (~14px)
 *   [        ]                         [         ]
 *   [ PLAYER ]      [ 8x8 BOARD ]     [ ENEMIES ]      <- main area
 *   [ HP bar ]      [  (Phaser)  ]    [ up to 3  ]
 *   [ status ]      [            ]    [ HP bars   ]
 *   [ ability]      [  combo xN  ]    [ status    ]
 *   [        ]                        [ intent    ]
 *   [ [_][_][_] ]                                       <- bottom area
 *   [ Swaps: X/Y ]
 *   [ END TURN   ]
 *
 * Phaser owns the board canvas. React owns this overlay.
 */
export const CombatHUD = memo(function CombatHUD() {
  const swapsRemaining = useCombatStore((s) => s.swapsRemaining);
  const swapsPerTurn = useCombatStore((s) => s.swapsPerTurn);

  return (
    <div className="absolute inset-0 pointer-events-none font-mono text-xs select-none">
      {/* EventBus -> Zustand bridge (invisible) */}
      <CombatBridge />

      {/* Top HUD bar */}
      <TopBar />

      {/* Artifact row */}
      <ArtifactBar />

      {/* Main combat area */}
      <div className="absolute inset-x-0 top-8 bottom-0 flex">
        {/* Player area (left side, ~112px) */}
        <div className="w-28 flex flex-col justify-center px-1">
          <PlayerPanel />
        </div>

        {/* Board area (center, Phaser renders the board here) */}
        <div className="flex-1 flex flex-col items-center justify-end pb-2">
          <ComboDisplay />
        </div>

        {/* Enemy area (right side, ~112px) */}
        <div className="w-28 flex flex-col justify-center px-1">
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
