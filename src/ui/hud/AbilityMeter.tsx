import { memo, useCallback } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useCombatStore } from '../../store/combatStore';
import { Tooltip } from '../components/Tooltip';

/**
 * AbilityMeter: charge bar spanning the full board width.
 *
 * Rust (Deadeye): 10-segment bar, shots remaining as gold dots when active.
 * Reno (Shuffle the Deck): 7-segment bar, instant reshuffle when activated.
 */
export const AbilityMeter = memo(function AbilityMeter() {
  const character = useCombatStore((s) => s.character);
  const charge = useCombatStore((s) => s.abilityCharge);
  const threshold = useCombatStore((s) => s.abilityThreshold);
  const isDeadeyeActive = useCombatStore((s) => s.isDeadeyeActive);
  const shotsLeft = useCombatStore((s) => s.deadeyeShotsRemaining);
  const maxShots = useCombatStore((s) => s.deadeyeMaxShots);
  const phase = useCombatStore((s) => s.phase);

  const isActive = isDeadeyeActive;
  const ready = charge >= threshold && !isActive;
  const canActivate = ready && (phase === 'swap-phase' || phase === 'consumable-window');

  const handleActivate = useCallback(() => {
    if (canActivate) {
      EventBus.emit(GameEvent.ACTIVATE_ABILITY);
    }
  }, [canActivate]);

  const handleCancel = useCallback(() => {
    EventBus.emit(GameEvent.CANCEL_ABILITY);
  }, []);

  const isReno = character === 'reno';
  const abilityName = isReno ? 'Shuffle the Deck' : 'Deadeye';

  // During Deadeye, show shots remaining as gold dots + cancel button
  if (isDeadeyeActive) {
    return (
      <div className="mt-1">
        <div className="flex items-center justify-center gap-2">
          <div className="text-[7px] text-yellow-400 font-bold leading-none">
            DEADEYE
          </div>
          <button
            className="px-1.5 py-px text-[7px] text-red-400 bg-red-900/60 border border-red-700 hover:bg-red-800/60 pointer-events-auto leading-none"
            onClick={handleCancel}
          >
            CANCEL
          </button>
        </div>
        <div className="flex gap-px justify-center mt-px">
          {Array.from({ length: maxShots }, (_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: 6,
                height: 6,
                backgroundColor: i < shotsLeft ? '#FFD700' : '#333',
                border: '1px solid #FFD700',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Charge bar
  const segments = threshold;
  const filledCount = Math.min(charge, segments);

  return (
    <Tooltip text={ready ? `Activate ${abilityName} (Space)` : `${charge}/${threshold} charges`} position="top">
      <button
        className="mt-1 pointer-events-auto"
        onClick={handleActivate}
        disabled={!canActivate}
      >
        <div className="flex gap-px" style={{ width: 8 * 32 }}>
          {Array.from({ length: segments }, (_, i) => {
            const filled = i < filledCount;
            let bgColor: string;
            let extraClass = '';

            if (ready) {
              bgColor = '#FFD700';
              extraClass = 'ability-segment-ready';
            } else if (filled) {
              bgColor = isReno ? '#B060D0' : '#C04050';
            } else {
              bgColor = '#2a2a2a';
            }

            return (
              <div
                key={i}
                className={extraClass}
                style={{
                  flex: 1,
                  height: 6,
                  backgroundColor: bgColor,
                  borderRadius: 1,
                }}
              />
            );
          })}
        </div>
        <div
          className="text-[7px] text-center leading-none mt-px"
          style={{ color: ready ? '#FFD700' : '#888' }}
        >
          {ready ? 'READY' : `${charge}/${threshold}`}
        </div>
      </button>
    </Tooltip>
  );
});
