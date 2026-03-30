import { memo } from 'react';

/**
 * EnemyIntent: text above enemy showing next action.
 * e.g. "ATK 12", "BLK", "PSN 2"
 */
export const EnemyIntent = memo(function EnemyIntent() {
  // TODO: read from combat state via EventBus or Zustand
  return (
    <div className="text-[8px] text-red-400 mt-1 text-center">
      ATK --
    </div>
  );
});
