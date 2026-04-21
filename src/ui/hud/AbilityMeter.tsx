import { memo, useCallback } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useCombatStore } from '../../store/combatStore';
import { Tooltip } from '../components/Tooltip';
import { SpriteIcon } from '../components/SpriteIcon';
import { ARTIFACT_FRAMES, CONSUMABLE_FRAMES, SWAP_FRAMES, TRAIT_FRAMES } from '../../data/spriteConfig';
import { Chamber } from './Chamber';
import { EndTurnButton } from './EndTurnButton';
import type { CombatSwapSource } from '../../types/combat';

/**
 * AbilityMeter: Chamber on the left, with a vertical stack on the right
 * showing ability state, swap icons, and the End Turn button.
 */
export const AbilityMeter = memo(function AbilityMeter() {
  const character = useCombatStore((s) => s.character);
  const charge = useCombatStore((s) => s.abilityCharge);
  const threshold = useCombatStore((s) => s.abilityThreshold);
  const isDeadeyeActive = useCombatStore((s) => s.isDeadeyeActive);
  const phase = useCombatStore((s) => s.phase);
  const turnNumber = useCombatStore((s) => s.turnNumber);
  const swapsRemaining = useCombatStore((s) => s.swapsRemaining);
  const swapsPerTurn = useCombatStore((s) => s.swapsPerTurn);
  const swapIconSources = useCombatStore((s) => s.swapIconSources);

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
  const abilityName = (isReno ? 'False Shuffle' : 'Deadeye').toUpperCase();

  const tooltipText = isDeadeyeActive
    ? 'Cancel Deadeye (Space)'
    : ready
      ? `Activate ${abilityName} (Space)`
      : `${charge}/${threshold} charges`;

  return (
    <div className="flex flex-col items-start gap-1" style={{ position: 'relative', top: -5 }}>
      <div className="flex items-center gap-2">
      <Tooltip text={tooltipText} position="top">
        <button
          className="pointer-events-auto"
          onClick={handleActivate}
          disabled={!canActivate}
        >
          <Chamber charge={charge} threshold={threshold} ready={ready} />
        </button>
      </Tooltip>

      <div className="flex flex-col items-start gap-1" style={{ width: 130, position: 'relative', top: 8 }}>
        <div className="flex flex-col items-start justify-center" style={{ height: 26 }}>
          <AbilityStateRow
            abilityName={abilityName}
            ready={ready}
            isDeadeyeActive={isDeadeyeActive}
            onCancel={handleCancel}
          />
        </div>
        <div className="flex items-center" style={{ height: 24 }}>
          <SwapsRow remaining={swapsRemaining} total={swapsPerTurn} sources={swapIconSources} />
        </div>
        <div className="flex items-center" style={{ height: 16, position: 'relative', top: -5 }}>
          <EndTurnButton />
        </div>
      </div>
      </div>
      {turnNumber > 0 && (
        <span
          className="text-[8px] text-white whitespace-nowrap font-bold"
          style={{
            marginLeft: 56,
            marginTop: 5,
            WebkitTextStroke: '3px #000',
            paintOrder: 'stroke fill',
          }}
        >
          {`TURN ${turnNumber}`}
        </span>
      )}
    </div>
  );
});

interface AbilityStateRowProps {
  abilityName: string;
  ready: boolean;
  isDeadeyeActive: boolean;
  onCancel: () => void;
}

const AbilityStateRow = memo(function AbilityStateRow({
  abilityName,
  ready,
  isDeadeyeActive,
  onCancel,
}: AbilityStateRowProps) {
  const label = (
    <span
      className={`text-[8px] leading-none font-bold whitespace-nowrap${ready ? ' ability-ready-text ability-ready-electric' : ''}${!ready && !isDeadeyeActive ? ' text-stone-300' : ''}`}
      style={{
        color: ready || isDeadeyeActive ? '#FFD700' : undefined,
        WebkitTextStroke: '2px #000',
        paintOrder: 'stroke fill',
      }}
    >
      {isDeadeyeActive ? `${abilityName} ACTIVE` : ready ? `${abilityName} READY` : abilityName}
    </span>
  );

  if (isDeadeyeActive) {
    return (
      <div className="relative whitespace-nowrap" style={{ width: 130, height: 24 }}>
        <div className="absolute left-0" style={{ top: -16 }}>
          {label}
        </div>
        <button
          className="absolute left-0 px-1 py-px text-[7px] text-red-300 bg-red-900/70 border border-red-600 hover:bg-red-800/70 pointer-events-auto leading-none"
          style={{ top: 0 }}
          data-no-click-sfx
          onClick={onCancel}
        >
          CANCEL
        </button>
      </div>
    );
  }

  if (ready) {
    return (
      <div className="relative" style={{ width: 130, height: 24 }}>
        <div className="absolute left-0" style={{ top: -16 }}>
          {label}
        </div>
        <img
          className="absolute left-0"
          src={`${import.meta.env.BASE_URL}assets/space.png`}
          alt="SPACE"
          style={{ top: 0, imageRendering: 'pixelated' }}
        />
        <span className="ability-spark" style={{ top: -2, left: -3, animationDelay: '0s' }} />
        <span className="ability-spark" style={{ top: 0, right: -4, animationDelay: '0.3s' }} />
        <span className="ability-spark" style={{ bottom: -2, left: 8, animationDelay: '0.6s' }} />
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: 130, height: 24 }}>
      <div className="absolute left-0" style={{ top: -16 }}>
        {label}
      </div>
      <span
        className="absolute left-0 text-[7px] leading-none font-bold text-stone-500 whitespace-nowrap"
        style={{
          top: 0,
          WebkitTextStroke: '2px #000',
          paintOrder: 'stroke fill',
        }}
      >
        CHARGING
      </span>
    </div>
  );
});

interface SwapsRowProps {
  remaining: number;
  total: number;
  sources: CombatSwapSource[];
}

const SWAP_SOURCE_FRAMES: Record<CombatSwapSource, number> = {
  default: SWAP_FRAMES.unused,
  mustang: TRAIT_FRAMES.mustang,
  dans_feather: ARTIFACT_FRAMES.dans_feather,
  pocket_watch: CONSUMABLE_FRAMES.pocket_watch,
};

const SwapsRow = memo(function SwapsRow({ remaining, total, sources }: SwapsRowProps) {
  const displayTotal = Math.max(total, remaining, sources.length);

  return (
    <div className="relative" style={{ width: 130, height: 24 }}>
      <span
        className="absolute left-0 text-[8px] leading-none font-bold text-stone-300"
        style={{
          top: -10,
          WebkitTextStroke: '2px #000',
          paintOrder: 'stroke fill',
        }}
      >
        SWAPS REMAINING
      </span>
      <div className="absolute left-0 flex items-center gap-px" style={{ top: 0 }}>
        {Array.from({ length: displayTotal }, (_, i) => {
          const used = i >= remaining;
          const source = sources[i] ?? 'default';
          const frame = used && source === 'default' ? SWAP_FRAMES.used : SWAP_SOURCE_FRAMES[source];
          const tintAlpha = used
            ? source === 'default' ? 0.7 : 0.8
            : 0;
          return (
            <SpriteIcon
              key={i}
              frame={frame}
              scale={1}
              tint={used ? '#000000' : undefined}
              tintAlpha={tintAlpha}
            />
          );
        })}
      </div>
    </div>
  );
});
