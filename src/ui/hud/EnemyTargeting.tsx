import { memo } from 'react';

/**
 * EnemyTargeting: target selection UI.
 * Tap/click an enemy to switch target (free action).
 */
export const EnemyTargeting = memo(function EnemyTargeting() {
  // TODO: list enemies with health bars, highlight targeted
  return (
    <div className="text-[8px] text-stone-400">
      No enemies
    </div>
  );
});
