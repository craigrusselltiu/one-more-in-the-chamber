import { memo } from 'react';
import { HealthBar } from './HealthBar';
import { StatusEffects } from './StatusEffects';
import { EnemyIntent } from './EnemyIntent';
import { EnemyTargeting } from './EnemyTargeting';
import { ArtifactBar } from './ArtifactBar';
import { AbilityMeter } from './AbilityMeter';

/**
 * CombatHUD: React overlay during combat.
 * Layout matches SPEC combat mockup at 480x270 internal resolution.
 */
export const CombatHUD = memo(function CombatHUD() {
  return (
    <div className="absolute inset-0 pointer-events-none font-mono text-xs">
      {/* Top HUD bar */}
      <div className="flex justify-between items-center px-2 py-1 bg-black/40 pointer-events-auto">
        <span className="text-amber-400">Act I</span>
        <span className="text-yellow-300">Gold: 0</span>
        <span className="text-stone-300">Swaps: 2</span>
      </div>

      {/* Artifact row */}
      <ArtifactBar />

      {/* Player area (left side) */}
      <div className="absolute left-1 top-16">
        <HealthBar current={100} max={100} label="P" />
        <StatusEffects effects={[]} />
        <AbilityMeter charge={0} threshold={10} />
      </div>

      {/* Enemy area (right side) */}
      <div className="absolute right-1 top-16">
        <EnemyTargeting />
        <EnemyIntent />
      </div>
    </div>
  );
});
