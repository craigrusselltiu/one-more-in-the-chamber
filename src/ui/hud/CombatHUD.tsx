import { memo } from 'react';
import { CombatBridge } from './CombatBridge';
import { TopBar } from './TopBar';
import { ArtifactBar } from './ArtifactBar';
import { PlayerPanel } from './PlayerPanel';
import { EnemyTargeting } from './EnemyTargeting';
import { ComboDisplay } from './ComboDisplay';
import { EndTurnButton } from './EndTurnButton';

/**
 * CombatHUD: React overlay during combat.
 * Layout matches SPEC combat mockup at 480x270 internal resolution:
 *
 *   [ Act I ][    gold count    ][ swaps: 2 ][ gear ]   <- TopBar (~16px)
 *   [ artifacts row (left-aligned, under top bar) ]     <- ArtifactBar (~14px)
 *   [        ]                         [         ]
 *   [ PLAYER ]      [ 8x8 BOARD ]     [ ENEMIES ]      <- main area
 *   [ HP bar ]      [  (Phaser)  ]    [ up to 3  ]
 *   [ status ]      [            ]    [ HP bars   ]
 *   [ ability]      [  combo xN  ]    [ status    ]
 *   [        ]                        [ intent    ]
 *   [ [_][_][_] ]              [ END TURN ]             <- bottom area
 *
 * Phaser owns the board canvas. React owns this overlay.
 */
export const CombatHUD = memo(function CombatHUD() {
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
          <div className="mt-1">
            <EndTurnButton />
          </div>
        </div>

        {/* Enemy area (right side, ~112px) */}
        <div className="w-28 flex flex-col justify-center px-1">
          <EnemyTargeting />
        </div>
      </div>
    </div>
  );
});
