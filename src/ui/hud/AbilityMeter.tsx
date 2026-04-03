import { memo, useCallback } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useCombatStore } from '../../store/combatStore';
import { Tooltip } from '../components/Tooltip';

/**
 * AbilityMeter: Deadeye charge bar below player.
 * Fills left-to-right, glows gold when ready.
 * Click to activate when charged.
 */
export const AbilityMeter = memo(function AbilityMeter() {
  const charge = useCombatStore((s) => s.abilityCharge);
  const threshold = useCombatStore((s) => s.abilityThreshold);
  const isActive = useCombatStore((s) => s.isDeadeyeActive);
  const shotsLeft = useCombatStore((s) => s.deadeyeShotsRemaining);
  const phase = useCombatStore((s) => s.phase);

  const pct = threshold > 0 ? Math.min(1, charge / threshold) : 0;
  const ready = charge >= threshold && !isActive;
  const canActivate = ready && phase === 'swap-phase';

  const handleActivate = useCallback(() => {
    if (canActivate) {
      EventBus.emit(GameEvent.ACTIVATE_ABILITY);
    }
  }, [canActivate]);

  // During Deadeye, show shots remaining
  if (isActive) {
    return (
      <div className="mt-1">
        <div className="text-[7px] text-yellow-400 font-bold text-center leading-none">
          DEADEYE
        </div>
        <div className="flex gap-px justify-center mt-px">
          {Array.from({ length: 3 }, (_, i) => (
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

  return (
    <Tooltip text={ready ? 'Activate Deadeye' : `${charge}/${threshold} charges`} position="top">
    <button
      className="mt-1 pointer-events-auto"
      onClick={handleActivate}
      disabled={!canActivate}
    >
      <div
        className="relative bg-stone-800 border"
        style={{
          width: 80,
          height: 6,
          borderColor: ready ? '#FFD700' : '#555',
        }}
      >
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${pct * 100}%`,
            backgroundColor: ready ? '#FFD700' : '#D06080',
          }}
        />
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
