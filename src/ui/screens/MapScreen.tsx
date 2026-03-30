import { memo } from 'react';

/**
 * MapScreen: Slay the Spire-style branching node map.
 * ~12-15 nodes per act with branching paths.
 * MVP placeholder: colored circles, color-coded by type, with connecting lines.
 */
export const MapScreen = memo(function MapScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e]/90">
      <h2 className="text-xl text-amber-400 font-mono mb-4">The Dusty Trail</h2>
      <p className="text-stone-400 font-mono text-sm">Map coming soon</p>
    </div>
  );
});
