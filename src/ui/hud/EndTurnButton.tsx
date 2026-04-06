import { memo, useCallback } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useCombatStore } from '../../store/combatStore';

/**
 * EndTurnButton: allows the player to end their turn early.
 * Only visible during swap phase or consumable window.
 */
export const EndTurnButton = memo(function EndTurnButton() {
  const phase = useCombatStore((s) => s.phase);

  const canEnd =
    phase === 'swap-phase' || phase === 'consumable-window';

  const handleEndTurn = useCallback(() => {
    if (canEnd) {
      EventBus.emit(GameEvent.END_TURN_EARLY);
    }
  }, [canEnd]);

  return (
    <button
      onClick={handleEndTurn}
      disabled={!canEnd}
      className="pointer-events-auto text-[7px] px-2 py-0.5 font-bold border"
      style={{
        color: canEnd ? '#D4A030' : '#555',
        borderColor: canEnd ? '#D4A030' : '#444',
        backgroundColor: 'rgba(0,0,0,0.5)',
        opacity: canEnd ? 1 : 0.5,
      }}
    >
      END TURN
    </button>
  );
});
