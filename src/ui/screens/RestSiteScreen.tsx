import { memo } from 'react';

/**
 * RestSiteScreen: choose rest (heal 30% max HP) or upgrade a tile.
 */
export const RestSiteScreen = memo(function RestSiteScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e]/90">
      <h2 className="text-xl text-amber-400 font-mono mb-4">Campfire</h2>
      <p className="text-stone-400 font-mono text-sm">Rest site coming soon</p>
    </div>
  );
});
