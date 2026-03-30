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

  if (!canEnd) return null;

  return (
    <button
      onClick={handleEndTurn}
      className="pointer-events-auto text-[7px] px-2 py-0.5 font-bold border"
      style={{
        color: '#D4A030',
        borderColor: '#D4A030',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}
    >
      END TURN
    </button>
  );
});
