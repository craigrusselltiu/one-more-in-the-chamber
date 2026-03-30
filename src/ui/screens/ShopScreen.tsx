import { memo, useMemo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { ARTIFACTS } from '../../data/artifacts';
import { CONSUMABLES } from '../../data/consumables';
import { ADDITIONAL_POOL, TILE_DEFINITIONS } from '../../data/tiles';
import type { Screen } from '../../App';

interface ShopItem {
  type: 'artifact' | 'consumable' | 'tile_swap';
  id: string;
  name: string;
  description: string;
  price: number;
}

/**
 * ShopScreen: buy artifacts, consumables, or swap tiles.
 * Pricing from SPEC: consumables 15-30g, tile swap 50-75g, artifacts 100-175g.
 */
export const ShopScreen = memo(function ShopScreen() {
  const run = useRunStore((s) => s.run);
  const updateGold = useRunStore((s) => s.updateGold);
  const addArtifact = useRunStore((s) => s.addArtifact);
  const addConsumable = useRunStore((s) => s.addConsumable);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());

  const stock = useMemo(() => {
    if (!run) return [];
    const items: ShopItem[] = [];

    // 3 consumables (random, 15-30 gold)
    const shuffledConsumables = [...CONSUMABLES].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
      const c = shuffledConsumables[i];
      items.push({
        type: 'consumable',
        id: `cons-${c.id}`,
        name: c.name,
        description: c.effect,
        price: 15 + Math.floor(Math.random() * 16),
      });
    }

    // 2 artifacts (random, not owned, 100-175 gold)
    const ownedIds = new Set(run.artifacts.map((a) => a.id));
    const availableArtifacts = ARTIFACTS.filter((a) => !ownedIds.has(a.id));
    const shuffledArtifacts = [...availableArtifacts].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(2, shuffledArtifacts.length); i++) {
      const a = shuffledArtifacts[i];
      items.push({
        type: 'artifact',
        id: `art-${a.id}`,
        name: a.name,
        description: a.effect,
        price: 100 + Math.floor(Math.random() * 76),
      });
    }

    // 1 tile swap (50-75 gold, if player has swappable tiles)
    const swappableTiles = run.activeTileTypes.filter(
      (t) => !['bullet', 'iron', 'gold'].includes(t) && !['ricochet', 'smoke', 'dynamite', 'stampede'].includes(t),
    );
    if (swappableTiles.length > 0) {
      const available = ADDITIONAL_POOL.filter((t) => !run.activeTileTypes.includes(t));
      if (available.length > 0) {
        const swapTile = available[Math.floor(Math.random() * available.length)];
        const def = TILE_DEFINITIONS[swapTile];
        items.push({
          type: 'tile_swap',
          id: `swap-${swapTile}`,
          name: `Swap for ${def.label}`,
          description: def.description,
          price: 50 + Math.floor(Math.random() * 26),
        });
      }
    }

    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuy = (item: ShopItem) => {
    if (!run || run.gold < item.price || purchased.has(item.id)) return;

    updateGold(-item.price);

    if (item.type === 'artifact') {
      const artifactId = item.id.replace('art-', '');
      const def = ARTIFACTS.find((a) => a.id === artifactId);
      if (def) {
        addArtifact({ id: def.id, tags: def.tags });
      }
    } else if (item.type === 'consumable') {
      const consumableId = item.id.replace('cons-', '');
      addConsumable({ id: consumableId });
    }
    // Tile swap would need more complex UI (choose which tile to remove) -- simplified for MVP

    setPurchased((prev) => new Set([...prev, item.id]));
  };

  const handleLeave = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  if (!run) return null;

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e]/95">
      <h2 className="text-xl text-amber-400 font-mono mb-1">General Store</h2>
      <p className="text-xs text-stone-400 font-mono mb-4">
        Gold: <span className="text-yellow-400">{run.gold}</span>
      </p>

      <div className="flex flex-col gap-2 w-80 max-h-[60vh] overflow-y-auto px-2">
        {stock.map((item) => {
          const isSold = purchased.has(item.id);
          const canAfford = run.gold >= item.price;
          const disabled = isSold || !canAfford;

          return (
            <button
              key={item.id}
              onClick={() => handleBuy(item)}
              disabled={disabled}
              className={`flex items-center justify-between p-3 border text-left ${
                isSold
                  ? 'border-stone-700 bg-stone-800/30 opacity-50'
                  : canAfford
                    ? 'border-stone-600 bg-stone-800/50 hover:border-amber-600 hover:bg-stone-700/50'
                    : 'border-stone-700 bg-stone-800/30 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex-1 mr-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-sm ${
                      item.type === 'artifact'
                        ? 'text-purple-300'
                        : item.type === 'consumable'
                          ? 'text-green-300'
                          : 'text-blue-300'
                    }`}
                  >
                    {item.type === 'artifact' ? '[A]' : item.type === 'consumable' ? '[C]' : '[T]'}
                  </span>
                  <span className="text-stone-200 font-mono text-sm">{item.name}</span>
                </div>
                <p className="text-stone-400 font-mono text-xs mt-1">{item.description}</p>
              </div>
              <span className="text-yellow-400 font-mono text-sm font-bold whitespace-nowrap">
                {isSold ? 'SOLD' : `${item.price}g`}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleLeave}
        className="mt-4 px-6 py-2 bg-stone-700/50 text-stone-300 font-mono text-sm border border-stone-600 hover:bg-stone-600/50"
      >
        Leave Shop
      </button>
    </div>
  );
});
