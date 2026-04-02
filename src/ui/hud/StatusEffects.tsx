import { memo } from 'react';
import type { PlayerStatusEffect, EnemyStatusEffect } from '../../types/combat';

interface StatusEffectsProps {
  effects: (PlayerStatusEffect | EnemyStatusEffect)[];
}

const STATUS_COLORS: Record<string, string> = {
  block: '#6888A0',
  ace: '#E0C880',
  crit: '#D06080',
  thorns: '#8B6030',
  venom: '#60A040',
  vulnerable: '#D04040',
};

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
 * StatusEffects: horizontal row of small icons with value labels.
 * Spaced out under health bar per SPEC.
 */
export const StatusEffects = memo(function StatusEffects({ effects }: StatusEffectsProps) {
  if (effects.length === 0) return null;

  return (
    <div className="flex gap-0.5 mt-0.5">
      {effects.map((effect, i) => (
        <div
          key={`${effect.type}-${i}`}
          className="flex flex-col items-center justify-center border"
          style={{
            minWidth: 24,
            height: 18,
            backgroundColor: STATUS_COLORS[effect.type] ?? '#808080',
            borderColor: STATUS_COLORS[effect.type] ?? '#808080',
            padding: '0 2px',
          }}
          title={`${STATUS_LABELS[effect.type]}: ${formatValue(effect.type, effect.value)}`}
        >
          <span className="text-[6px] text-white/80 leading-none">
            {STATUS_LABELS[effect.type] ?? '?'}
          </span>
          <span className="text-[7px] text-white font-bold leading-none">
            {formatValue(effect.type, effect.value)}
          </span>
        </div>
      ))}
    </div>
  );
});
