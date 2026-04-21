import { memo, useCallback } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useCombatStore } from '../../store/combatStore';

/**
 * EndTurnButton: ends the turn early. Styled to match the game's
 * small settings buttons (RedButton in SettingsScreen) -- shadowed
 * rounded button with press-down active state -- but in a gold palette.
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
      style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: canEnd ? 'pointer' : 'not-allowed' }}
      className="pointer-events-auto px-2 py-0.5 text-[8px] font-bold rounded-sm bg-amber-900 text-amber-200 hover:bg-amber-800 active:translate-y-0.5 transition-transform disabled:opacity-50 disabled:hover:bg-amber-900"
    >
      END TURN
    </button>
  );
});
