import { memo, useCallback } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useCombatStore } from '../../store/combatStore';
import { Tooltip } from '../components/Tooltip';
import { Chamber } from './Chamber';

/**
 * AbilityMeter: rotating chamber visual for the player's ability charge.
 * Rust (Deadeye): 6 usable holes, each shot clears one bullet.
 * Reno (False Shuffle): 5 usable holes + 1 blocked; instant reshuffle on activation.
 */
export const AbilityMeter = memo(function AbilityMeter() {
  const character = useCombatStore((s) => s.character);
  const charge = useCombatStore((s) => s.abilityCharge);
  const threshold = useCombatStore((s) => s.abilityThreshold);
  const isDeadeyeActive = useCombatStore((s) => s.isDeadeyeActive);
  const shotsLeft = useCombatStore((s) => s.deadeyeShotsRemaining);
  const maxShots = useCombatStore((s) => s.deadeyeMaxShots);
  const phase = useCombatStore((s) => s.phase);

  const ready = charge >= threshold && !isDeadeyeActive;
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
  const abilityName = isReno ? 'False Shuffle' : 'Deadeye';

  const tooltipText = isDeadeyeActive
    ? 'Cancel Deadeye (Space)'
    : ready
      ? `Activate ${abilityName} (Space)`
      : `${charge}/${threshold} charges`;

  return (
    <Tooltip text={tooltipText} position="top">
      <div className="mt-1 flex flex-col items-center gap-0.5 w-full">
        {isDeadeyeActive ? (
          <div className="flex items-center justify-center gap-2">
            <div className="text-[7px] text-yellow-400 font-bold leading-none">DEADEYE</div>
            <button
              className="px-1.5 py-px text-[7px] text-red-400 bg-red-900/60 border border-red-700 hover:bg-red-800/60 pointer-events-auto leading-none"
              onClick={handleCancel}
            >
              CANCEL
            </button>
          </div>
        ) : (
          <div
            className="text-[8px] text-center leading-none font-bold text-stone-200"
            style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill' }}
          >
            {abilityName.toUpperCase()}
          </div>
        )}
        <button
          className="pointer-events-auto"
          onClick={handleActivate}
          disabled={!canActivate}
        >
          <Chamber charge={charge} threshold={threshold} ready={ready} />
        </button>
        {isDeadeyeActive ? (
          <div className="flex gap-px justify-center">
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
        ) : (
          <div
            className={`text-[8px] text-center leading-none font-bold ${ready ? 'ability-ready-text' : ''}`}
            style={{
              color: '#FFD700',
              WebkitTextStroke: '2px #000',
              paintOrder: 'stroke fill',
              visibility: ready ? 'visible' : 'hidden',
            }}
          >
            READY
          </div>
        )}
      </div>
    </Tooltip>
  );
});
