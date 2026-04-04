import { memo, useCallback } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useCombatStore } from '../../store/combatStore';
import { Tooltip } from '../components/Tooltip';

/**
 * AbilityMeter: Deadeye charge bar spanning the full board width.
 *
 * 10 segments (one per charge threshold):
 *   - Charging: filled segments RED, unfilled dark gray
 *   - Ready (10/10): all segments YELLOW with pulsing glow
 *   - Active Deadeye: shows shots remaining as gold indicator dots
 */
export const AbilityMeter = memo(function AbilityMeter() {
  const charge = useCombatStore((s) => s.abilityCharge);
  const threshold = useCombatStore((s) => s.abilityThreshold);
  const isActive = useCombatStore((s) => s.isDeadeyeActive);
  const shotsLeft = useCombatStore((s) => s.deadeyeShotsRemaining);
  const maxShots = useCombatStore((s) => s.deadeyeMaxShots);
  const phase = useCombatStore((s) => s.phase);

  const ready = charge >= threshold && !isActive;
  const canActivate = ready && (phase === 'swap-phase' || phase === 'consumable-window');

  const handleActivate = useCallback(() => {
    if (canActivate) {
      EventBus.emit(GameEvent.ACTIVATE_ABILITY);
    }
  }, [canActivate]);

  // During Deadeye, show shots remaining as gold dots
  if (isActive) {
    return (
      <div className="mt-1">
        <div className="text-[7px] text-yellow-400 font-bold text-center leading-none">
          DEADEYE
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

  // 10-segment charge bar
  const segments = threshold;
  const filledCount = Math.min(charge, segments);

  return (
    <Tooltip text={ready ? 'Activate Deadeye (Space)' : `${charge}/${threshold} charges`} position="top">
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
              bgColor = '#C04050';
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
