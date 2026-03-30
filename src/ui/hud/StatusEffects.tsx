import { memo } from 'react';
import type { PlayerStatusEffect, EnemyStatusEffect } from '../../types/combat';

interface StatusEffectsProps {
  effects: (PlayerStatusEffect | EnemyStatusEffect)[];
}

const STATUS_COLORS: Record<string, string> = {
  block: '#6888A0',
  dodge: '#909090',
  ace: '#E0C880',
  crit: '#D06080',
  thorns: '#8B6030',
  venom: '#60A040',
  vulnerable: '#D04040',
};

const STATUS_LABELS: Record<string, string> = {
  block: 'B',
  dodge: 'D',
  ace: 'A',
  crit: 'C',
  thorns: 'T',
  venom: 'V',
  vulnerable: 'Vu',
};

/**
 * StatusEffects: horizontal row of 14x14 colored squares with labels.
 * Spaced out under health bar.
 */
export const StatusEffects = memo(function StatusEffects({ effects }: StatusEffectsProps) {
  if (effects.length === 0) return null;

  return (
    <div className="flex gap-0.5 mt-0.5">
      {effects.map((effect, i) => (
        <div
          key={i}
          className="flex items-center justify-center text-[6px] text-white font-bold border"
          style={{
            width: 14,
            height: 14,
            backgroundColor: STATUS_COLORS[effect.type] ?? '#808080',
            borderColor: STATUS_COLORS[effect.type] ?? '#808080',
          }}
          title={`${effect.type}: ${effect.value}`}
        >
          {STATUS_LABELS[effect.type] ?? '?'}
        </div>
      ))}
    </div>
  );
});
