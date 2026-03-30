import { memo } from 'react';

/**
 * ShopScreen: buy artifacts, consumables, or swap tiles.
 * Pricing from SPEC: consumables 15-30g, tile swap 50-75g, artifacts 100-175g.
 */
export const ShopScreen = memo(function ShopScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e]/90">
      <h2 className="text-xl text-amber-400 font-mono mb-4">Shop</h2>
      <p className="text-stone-400 font-mono text-sm">Shop coming soon</p>
    </div>
  );
});
