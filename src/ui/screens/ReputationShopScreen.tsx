import { memo } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useMetaStore } from '../../store/metaStore';
import type { Screen } from '../../App';

export const ReputationShopScreen = memo(function ReputationShopScreen() {
  const reputation = useMetaStore((s) => s.meta.reputation);

  const handleBack = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  return (
    <div className="flex flex-col items-center h-full bg-[#1a1a2e]/95" style={{ width: 960, height: 540 }}>
      {/* Header */}
      <div className="mt-6 mb-2 text-center">
        <h2 className="text-xl text-amber-400 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Reputation Shop</h2>
        <p className="text-xs text-stone-400 mt-1">
          Reputation: <span className="text-amber-300 font-bold">{reputation}</span>
        </p>
      </div>

      {/* Empty content area */}
      <div className="flex-1 flex items-center justify-center">
        <span className="text-stone-500 text-sm">Coming soon</span>
      </div>

      {/* Back button */}
      <div className="py-3">
        <button
          onClick={handleBack}
          className="px-6 py-2 bg-stone-700/50 text-stone-300 text-sm border border-stone-600 hover:bg-stone-600/50"
        >
          Back
        </button>
      </div>
    </div>
  );
});
