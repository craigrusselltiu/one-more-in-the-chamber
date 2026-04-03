import { memo } from 'react';
import type { PlayerStatusEffect, EnemyStatusEffect } from '../../types/combat';
import { SpriteIcon } from '../components/SpriteIcon';
import { STATUS_FRAMES } from '../../data/spriteConfig';

interface StatusEffectsProps {
  effects: (PlayerStatusEffect | EnemyStatusEffect)[];
}

function formatValue(type: string, value: number): string {
  if (type === 'crit') return `${value}%`;
  if (type === 'ace') return `${value.toFixed(1)}x`;
  return String(value);
}

/** Text style with black outline for readability over sprites. */
const outlinedText: React.CSSProperties = {
  fontSize: '7px',
  color: '#ffffff',
  fontWeight: 'bold',
  lineHeight: 1,
  textShadow: '-1px 0 0 #000, 1px 0 0 #000, 0 -1px 0 #000, 0 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
};

/**
 * StatusEffects: horizontal row of sprite icons with value labels.
 * Uses sprites from STATUS_FRAMES. No text labels, just the number.
 */
export const StatusEffects = memo(function StatusEffects({ effects }: StatusEffectsProps) {
  if (effects.length === 0) return null;

  return (
    <div className="flex gap-0.5 mt-0.5">
      {effects.map((effect, i) => (
        <div
          key={`${effect.type}-${i}`}
          className="flex flex-col items-center justify-center"
          style={{ minWidth: 20, height: 22 }}
          title={`${effect.type}: ${formatValue(effect.type, effect.value)}`}
        >
          <SpriteIcon
            frame={STATUS_FRAMES[effect.type] ?? 0}
            scale={1}
          />
          <span style={outlinedText}>
            {formatValue(effect.type, effect.value)}
          </span>
        </div>
      ))}
    </div>
  );
});
