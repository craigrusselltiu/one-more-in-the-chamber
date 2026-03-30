import { memo, useCallback } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { useCombatStore } from '../../store/combatStore';
import { CONSUMABLES } from '../../data/consumables';

const CATEGORY_COLORS: Record<string, string> = {
  offensive: '#D04040',
  defensive: '#6888A0',
  utility: '#D4A030',
};

/**
 * ConsumableSlots: 3 fixed square slots (4 with Saddlebag) near the player.
 * Empty slots show as visible outlines. Click to use during consumable window.
 */
export const ConsumableSlots = memo(function ConsumableSlots() {
  const consumables = useRunStore((s) => s.run?.consumables ?? []);
  const hasSaddlebag = useRunStore((s) =>
    s.run?.artifacts.some((a) => a.id === 'saddlebag') ?? false,
  );
  const phase = useCombatStore((s) => s.phase);

  const maxSlots = hasSaddlebag ? 4 : 3;
  const canUse = phase === 'consumable-window';

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: maxSlots }, (_, i) => {
        const instance = consumables[i];
        const def = instance
          ? CONSUMABLES.find((c) => c.id === instance.id)
          : undefined;

        return (
          <ConsumableSlot
            key={i}
            index={i}
            name={def?.name}
            category={def?.category}
            effect={def?.effect}
            filled={!!instance}
            canUse={canUse && !!instance}
          />
        );
      })}
    </div>
  );
});

interface ConsumableSlotProps {
  index: number;
  name?: string;
  category?: string;
  effect?: string;
  filled: boolean;
  canUse: boolean;
}

const ConsumableSlot = memo(function ConsumableSlot({
  index,
  name,
  category,
  effect,
  filled,
  canUse,
}: ConsumableSlotProps) {
  const handleUse = useCallback(() => {
    if (canUse) {
      EventBus.emit(GameEvent.USE_CONSUMABLE, index);
    }
  }, [canUse, index]);

  const bgColor = filled && category
    ? CATEGORY_COLORS[category] ?? '#555'
    : 'transparent';
  const borderColor = canUse ? '#FFD700' : '#555';

  return (
    <button
      onClick={handleUse}
      disabled={!canUse}
      className="pointer-events-auto flex items-center justify-center"
      style={{
        width: 18,
        height: 18,
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        opacity: filled ? 1 : 0.4,
      }}
      title={filled ? `${name}: ${effect}` : 'Empty slot'}
    >
      {filled && name && (
        <span className="text-[6px] text-white font-bold leading-none">
          {name.charAt(0)}
        </span>
      )}
    </button>
  );
});
