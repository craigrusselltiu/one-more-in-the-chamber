import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { useCombatStore } from '../../store/combatStore';
import { CONSUMABLES } from '../../data/consumables';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { CONSUMABLE_FRAMES } from '../../data/spriteConfig';
import { colorizeKeywords, getReferencedKeywords, KeywordSubTooltips } from '../components/KeywordText';
import { getMaxConsumableSlots } from '../../utils/consumableSlots';

/** Use a map-usable consumable outside of combat. Returns true if handled. */
function useConsumableOnMap(consumableId: string): boolean {
  const store = useRunStore.getState();
  if (!store.run) return false;
  switch (consumableId) {
    case 'tonic':
      store.updateHealth(20);
      return true;
    case 'bandage':
      store.updateHealth(10);
      return true;
    case 'snake_oil': {
      const roll = Math.random();
      if (roll < 0.33) {
        store.updateHealth(15);
      } else if (roll < 0.66) {
        store.updateGold(10);
      } else {
        store.updateHealth(-8);
      }
      return true;
    }
    default:
      return false;
  }
}

/**
 * ConsumableSlots: 3 fixed square slots (4 with Saddlebag) near the player.
 * Empty slots show as visible outlines. Click to use during consumable window.
 */
export const ConsumableSlots = memo(function ConsumableSlots() {
  const consumables = useRunStore((s) => s.run?.consumables ?? []);
  const run = useRunStore((s) => s.run);
  const removeConsumable = useRunStore((s) => s.removeConsumable);
  const phase = useCombatStore((s) => s.phase);

  const maxSlots = run ? getMaxConsumableSlots(run) : 3;
  const inCombat = useCombatStore((s) => s.enemies.length > 0);
  const canUseCombat = phase === 'consumable-window' || phase === 'swap-phase';

  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: maxSlots }, (_, i) => {
        const instance = consumables[i];
        const def = instance
          ? CONSUMABLES.find((c) => c.id === instance.id)
          : undefined;

        const canUseThis = !!instance && (
          inCombat ? canUseCombat : !!(def?.canUseInMap)
        );

        return (
          <ConsumableSlot
            key={i}
            index={i}
            name={def?.name}
            category={def?.category}
            effect={def?.effect}
            filled={!!instance}
            canUse={canUseThis}
            inCombat={inCombat}
            consumableId={instance?.id}
            onRemove={removeConsumable}
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
  inCombat: boolean;
}

const ConsumableSlot = memo(function ConsumableSlot({
  index,
  name,
  category: _category,
  effect,
  filled,
  canUse,
  inCombat,
  consumableId,
  onRemove,
}: ConsumableSlotProps & { consumableId?: string; onRemove: (index: number) => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    if (filled) {
      setShowMenu((prev) => !prev);
    }
  }, [filled]);

  const handleUse = useCallback(() => {
    if (canUse && consumableId) {
      if (inCombat) {
        EventBus.emit(GameEvent.USE_CONSUMABLE, consumableId);
      } else {
        useConsumableOnMap(consumableId);
      }
      onRemove(index);
    }
    setShowMenu(false);
  }, [canUse, consumableId, index, onRemove, inCombat]);

  const handleDiscard = useCallback(() => {
    onRemove(index);
    setShowMenu(false);
  }, [index, onRemove]);

  // Close menu on click outside
  useEffect(() => {
    if (!showMenu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)
        && buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showMenu]);

  const bgColor = filled ? '#333' : 'transparent';
  const borderColor = canUse ? '#FFD700' : '#555';

  const hasKeywords = filled && effect ? getReferencedKeywords(effect ?? '').length > 0 : false;
  const tooltipContent = filled ? (
    <div className="flex flex-col gap-0.5">
      <div className="text-amber-300 font-bold whitespace-nowrap" style={{ fontSize: '10px' }}>{name}</div>
      <div className="text-stone-200 whitespace-nowrap" style={{ fontSize: '9px' }}>{colorizeKeywords(effect ?? '')}</div>
    </div>
  ) : undefined;
  const keywordTooltip = hasKeywords && effect ? <KeywordSubTooltips text={effect} /> : undefined;

  return (
    <div className="relative">
      <Tooltip text={!filled && !showMenu ? 'Empty slot' : undefined} content={showMenu ? undefined : tooltipContent} secondContent={showMenu ? undefined : keywordTooltip} position="bottom">
        <button
          ref={buttonRef}
          onClick={handleClick}
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
          className="absolute z-[100] pointer-events-auto bg-stone-800 border border-stone-600 overflow-hidden"
          style={{ top: 'calc(100% + 3px)', left: 0, minWidth: 42 }}
        >
          {canUse && (
            <button
              onClick={handleUse}
              className="block w-full px-2 py-1 font-bold text-amber-300 hover:bg-stone-700 hover:text-amber-200 whitespace-nowrap text-left"
              style={{ fontSize: '7px' }}
            >
              Use
            </button>
          )}
          <button
            onClick={handleDiscard}
            className="block w-full px-2 py-1 font-bold text-red-300 hover:bg-stone-700 hover:text-red-200 whitespace-nowrap text-left"
            style={{ fontSize: '7px' }}
          >
            Discard
          </button>
        </div>
      )}
    </div>
  );
});
