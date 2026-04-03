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

const OUTLINE = '-1px 0 0 #000, 1px 0 0 #000, 0 -1px 0 #000, 0 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, -2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000';

/**
 * StatusEffects: horizontal row of sprite icons with value overlaid
 * in the bottom-right corner of each sprite.
 */
export const StatusEffects = memo(function StatusEffects({ effects }: StatusEffectsProps) {
  if (effects.length === 0) return null;

  return (
    <div className="flex gap-0.5 mt-0.5">
      {effects.map((effect, i) => (
        <div
          key={`${effect.type}-${i}`}
          className="relative"
          style={{ width: 16, height: 16 }}
          title={`${effect.type}: ${formatValue(effect.type, effect.value)}`}
        >
          <SpriteIcon
            frame={STATUS_FRAMES[effect.type] ?? 0}
            scale={1}
          />
          <span
            className="absolute font-bold font-mono"
            style={{
              bottom: -2,
              right: -2,
              fontSize: '7px',
              color: '#fff',
              lineHeight: 1,
              textShadow: OUTLINE,
            }}
          >
            {formatValue(effect.type, effect.value)}
          </span>
        </div>
      ))}
    </div>
  );
});
