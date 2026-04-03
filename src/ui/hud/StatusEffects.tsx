import { memo } from 'react';
import type { PlayerStatusEffect, EnemyStatusEffect } from '../../types/combat';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { STATUS_FRAMES } from '../../data/spriteConfig';

interface StatusEffectsProps {
  effects: (PlayerStatusEffect | EnemyStatusEffect)[];
}

function formatValue(type: string, value: number): string {
  if (type === 'crit') return `${value}%`;
  if (type === 'ace') return `${value.toFixed(1)}x`;
  return String(value);
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  ace: 'Ace: next match multiplier',
  crit: 'Crit: chance to deal double damage',
  thorns: 'Thorns: reflect damage to attackers',
  venom: 'Venom: poison damage per turn',
  vulnerable: 'Vulnerable: takes 25% more damage',
};

const OUTLINE_STYLE: React.CSSProperties = {
  WebkitTextStroke: '2px #000',
  paintOrder: 'stroke fill',
};

/**
 * StatusEffects: horizontal row of sprite icons with value overlaid
 * in the bottom-right corner of each sprite.
 */
export const StatusEffects = memo(function StatusEffects({ effects }: StatusEffectsProps) {
  if (effects.length === 0) return null;

  return (
    <div className="flex gap-0.5 mt-0.5">
      {effects.map((effect, i) => (
        <Tooltip key={`${effect.type}-${i}`} text={`${STATUS_DESCRIPTIONS[effect.type] ?? effect.type} (${formatValue(effect.type, effect.value)})`}>
        <div
          className="relative"
          style={{ width: 16, height: 16 }}
        >
          <SpriteIcon
            frame={STATUS_FRAMES[effect.type] ?? 0}
            scale={1}
          />
          <span
            className="absolute font-bold"
            style={{
              bottom: -2,
              right: -2,
              fontSize: '7px',
              color: '#fff',
              lineHeight: 1,
              ...OUTLINE_STYLE,
            }}
          >
            {formatValue(effect.type, effect.value)}
          </span>
        </div>
        </Tooltip>
      ))}
    </div>
  );
});
