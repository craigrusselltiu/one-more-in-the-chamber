import { memo, useCallback } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useCombatStore } from '../../store/combatStore';
import { Tooltip } from '../components/Tooltip';

/**
 * AbilityMeter: charge bar spanning the full board width.
 *
 * Russ (Deadeye): 10-segment bar, shots remaining as gold dots when active.
 * Reno (Shuffle the Deck): 7-segment bar, hold count when active.
 */
export const AbilityMeter = memo(function AbilityMeter() {
  const character = useCombatStore((s) => s.character);
  const charge = useCombatStore((s) => s.abilityCharge);
  const threshold = useCombatStore((s) => s.abilityThreshold);
  const isDeadeyeActive = useCombatStore((s) => s.isDeadeyeActive);
  const shotsLeft = useCombatStore((s) => s.deadeyeShotsRemaining);
  const maxShots = useCombatStore((s) => s.deadeyeMaxShots);
  const isShuffleHoldMode = useCombatStore((s) => s.isShuffleHoldMode);
  const shuffleHoldsRemaining = useCombatStore((s) => s.shuffleHoldsRemaining);
  const shuffleMaxHolds = useCombatStore((s) => s.shuffleMaxHolds);
  const phase = useCombatStore((s) => s.phase);

  const isActive = isDeadeyeActive || isShuffleHoldMode;
  const ready = charge >= threshold && !isActive;
  const canActivate = (ready || isShuffleHoldMode) && (phase === 'swap-phase' || phase === 'consumable-window');

  const handleActivate = useCallback(() => {
    if (canActivate) {
      EventBus.emit(GameEvent.ACTIVATE_ABILITY);
    }
  }, [canActivate]);

  const isReno = character === 'reno';
  const abilityName = isReno ? 'Shuffle the Deck' : 'Deadeye';

  // During Deadeye, show shots remaining as gold dots
  if (isDeadeyeActive) {
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

  // During Shuffle hold mode, show holds remaining
  if (isShuffleHoldMode) {
    const holdsUsed = shuffleMaxHolds - shuffleHoldsRemaining;
    return (
      <div className="mt-1">
        <div className="text-[7px] text-yellow-400 font-bold text-center leading-none">
          HOLD TILES ({holdsUsed}/{shuffleMaxHolds})
        </div>
        <div className="flex gap-px justify-center mt-px">
          {Array.from({ length: shuffleMaxHolds }, (_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: 6,
                height: 6,
                backgroundColor: i < holdsUsed ? '#FFD700' : '#333',
                border: '1px solid #FFD700',
              }}
            />
          ))}
        </div>
        <Tooltip text="Confirm shuffle (Space)" position="top">
          <button
            className="mt-0.5 px-2 py-px text-[7px] text-amber-300 bg-amber-900/60 border border-amber-700 hover:bg-amber-800/60 pointer-events-auto"
            onClick={handleActivate}
          >
            SHUFFLE
          </button>
        </Tooltip>
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
