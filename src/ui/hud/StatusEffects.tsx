import { memo } from 'react';
import type { PlayerStatusEffect, EnemyStatusEffect } from '../../types/combat';
import { SpriteIcon } from '../components/SpriteIcon';
import { STATUS_FRAMES } from '../../data/uiFrames';

interface StatusEffectsProps {
  effects: (PlayerStatusEffect | EnemyStatusEffect)[];
}

const STATUS_LABELS: Record<string, string> = {
  block: 'BLK',
  ace: 'ACE',
  crit: 'CRT',
  thorns: 'THN',
  venom: 'VNM',
  vulnerable: 'VUL',
};

function formatValue(type: string, value: number): string {
  if (type === 'crit') return `${value}%`;
  if (type === 'ace') return `${value.toFixed(1)}x`;
  return String(value);
}

/**
 * StatusEffects: horizontal row of sprite icons with value labels.
 */
export const StatusEffects = memo(function StatusEffects({ effects }: StatusEffectsProps) {
  if (effects.length === 0) return null;

  return (
    <div className="flex gap-0.5 mt-0.5">
      {effects.map((effect, i) => (
        <div
          key={`${effect.type}-${i}`}
          className="flex flex-col items-center justify-center"
          style={{ minWidth: 24, height: 22 }}
          title={`${STATUS_LABELS[effect.type]}: ${formatValue(effect.type, effect.value)}`}
        >
          <SpriteIcon
            frame={STATUS_FRAMES[effect.type] ?? 0}
            scale={1}
          />
          <span className="text-[7px] text-white font-bold leading-none">
            {formatValue(effect.type, effect.value)}
          </span>
        </div>
      ))}
    </div>
  );
});
