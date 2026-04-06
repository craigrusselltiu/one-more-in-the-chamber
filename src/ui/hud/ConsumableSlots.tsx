import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { useCombatStore } from '../../store/combatStore';
import { CONSUMABLES } from '../../data/consumables';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { CONSUMABLE_FRAMES } from '../../data/spriteConfig';

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
  const canUse = phase === 'consumable-window' || phase === 'swap-phase';

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
            consumableId={instance?.id}
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
  consumableId,
}: ConsumableSlotProps & { consumableId?: string }) {
  const removeConsumable = useRunStore((s) => s.removeConsumable);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleUse = useCallback(() => {
    if (canUse && consumableId) {
      EventBus.emit(GameEvent.USE_CONSUMABLE, consumableId);
      removeConsumable(index);
    }
  }, [canUse, consumableId, index, removeConsumable]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (filled) {
      setShowMenu(true);
    }
  }, [filled]);

  const handleDiscard = useCallback(() => {
    removeConsumable(index);
    setShowMenu(false);
  }, [index, removeConsumable]);

  // Close menu on click outside
  useEffect(() => {
    if (!showMenu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showMenu]);

  const bgColor = filled && category
    ? CATEGORY_COLORS[category] ?? '#555'
    : 'transparent';
  const borderColor = canUse ? '#FFD700' : '#555';

  const tooltipText = filled ? `${name}: ${effect}` : 'Empty slot';

  return (
    <div className="relative">
      <Tooltip text={tooltipText} position="bottom">
        <button
          ref={buttonRef}
          onClick={handleUse}
          onContextMenu={handleContextMenu}
          disabled={!canUse}
          className="pointer-events-auto flex items-center justify-center"
          style={{
            width: 18,
            height: 18,
            backgroundColor: bgColor,
            border: `1px solid ${borderColor}`,
            opacity: filled ? 1 : 0.4,
          }}
        >
          {filled && consumableId && CONSUMABLE_FRAMES[consumableId] != null ? (
            <SpriteIcon frame={CONSUMABLE_FRAMES[consumableId]} scale={1} />
          ) : filled && name ? (
            <span className="text-[6px] text-white font-bold leading-none">
              {name.charAt(0)}
            </span>
          ) : null}
        </button>
      </Tooltip>
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute z-[100] pointer-events-auto"
          style={{ top: '100%', left: '50%', transform: 'translateX(-50%)' }}
        >
          <button
            onClick={handleDiscard}
            className="px-1.5 py-0.5 font-bold text-red-300 bg-stone-800 border border-stone-600 hover:bg-stone-700 hover:text-red-200 whitespace-nowrap"
            style={{ fontSize: '7px' }}
          >
            Discard
          </button>
        </div>
      )}
    </div>
  );
});
