import { memo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useMetaStore } from '../../store/metaStore';
import { SHOP_ITEMS, type ShopCategory } from '../../data/shopItems';
import type { Screen } from '../../App';

const CATEGORIES: { key: ShopCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'artifact', label: 'Artifacts' },
  { key: 'event', label: 'Events' },
  { key: 'loadout', label: 'Loadouts' },
  { key: 'cosmetic', label: 'Cosmetics' },
  { key: 'character', label: 'Characters' },
];

const CATEGORY_COLORS: Record<ShopCategory, string> = {
  artifact: 'text-purple-300',
  event: 'text-cyan-300',
  loadout: 'text-green-300',
  cosmetic: 'text-pink-300',
  character: 'text-amber-300',
};

const CATEGORY_TAGS: Record<ShopCategory, string> = {
  artifact: '[A]',
  event: '[E]',
  loadout: '[L]',
  cosmetic: '[C]',
  character: '[Ch]',
};

export const ReputationShopScreen = memo(function ReputationShopScreen() {
  const reputation = useMetaStore((s) => s.meta.reputation);
  const purchaseShopItem = useMetaStore((s) => s.purchaseShopItem);
  const isUnlocked = useMetaStore((s) => s.isUnlocked);
  const [filter, setFilter] = useState<ShopCategory | 'all'>('all');

  const items = filter === 'all'
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter((item) => item.category === filter);

  const handleBack = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  const handlePurchase = (unlockId: string, cost: number, category: ShopCategory) => {
    purchaseShopItem(unlockId, cost, category);
  };

  return (
    <div className="flex flex-col items-center h-full bg-[#1a1a2e]/95">
      {/* Header */}
      <div className="mt-6 mb-2 text-center">
        <h2 className="text-xl text-amber-400 font-mono">Reputation Shop</h2>
        <p className="text-xs text-stone-400 font-mono mt-1">
          Reputation: <span className="text-amber-300 font-bold">{reputation}</span>
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-3 px-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-2 py-1 font-mono text-xs border transition-colors ${
              filter === cat.key
                ? 'border-amber-600 bg-amber-900/40 text-amber-300'
                : 'border-stone-700 bg-stone-800/30 text-stone-400 hover:border-stone-500'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Item grid */}
      <div className="flex-1 overflow-y-auto w-full max-w-[640px] px-4">
        <div className="flex flex-col gap-1.5 pb-4">
          {items.map((item) => {
            const unlocked = isUnlocked(item.unlockId, item.category);
            const canAfford = reputation >= item.cost;

            return (
              <button
                key={item.id}
                onClick={() => !unlocked && canAfford && handlePurchase(item.unlockId, item.cost, item.category)}
                disabled={unlocked || !canAfford}
                className={`flex items-center justify-between p-3 border text-left transition-colors ${
                  unlocked
                    ? 'border-stone-700 bg-stone-800/20 opacity-50'
                    : canAfford
                      ? 'border-stone-600 bg-stone-800/50 hover:border-amber-600 hover:bg-stone-700/50 cursor-pointer'
                      : 'border-stone-700 bg-stone-800/30 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex-1 mr-3">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-xs ${CATEGORY_COLORS[item.category]}`}>
                      {CATEGORY_TAGS[item.category]}
                    </span>
                    <span className="text-stone-200 font-mono text-sm">{item.name}</span>
                  </div>
                  <p className="text-stone-400 font-mono text-xs mt-0.5">{item.description}</p>
                </div>
                <span className={`font-mono text-sm font-bold whitespace-nowrap ${
                  unlocked ? 'text-stone-500' : 'text-amber-400'
                }`}>
                  {unlocked ? 'OWNED' : `${item.cost}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Back button */}
      <div className="py-3">
        <button
          onClick={handleBack}
          className="px-6 py-2 bg-stone-700/50 text-stone-300 font-mono text-sm border border-stone-600 hover:bg-stone-600/50"
        >
          Back
        </button>
      </div>
    </div>
  );
});
