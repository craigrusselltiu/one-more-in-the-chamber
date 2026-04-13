import { memo, type ReactNode } from 'react';
import type { PlayerStatusEffect, EnemyStatusEffect } from '../../types/combat';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { STATUS_FRAMES, TILE_FRAMES } from '../../data/spriteConfig';
import { KEYWORDS } from '../../data/keywords';
import { KeywordLine } from '../components/KeywordText';

interface StatusEffectsProps {
  effects: (PlayerStatusEffect | EnemyStatusEffect)[];
}

function formatValue(type: string, value: number): string {
  if (type === 'crit' || type === 'lucky') return `${value}%`;
  return String(value);
}

/** Map status effect type to keyword name for lookup. */
const STATUS_TO_KEYWORD: Record<string, string> = {
  ace: 'Ace',
  lucky: 'Lucky',
  barricade: 'Barricade',
  rageful: 'Rageful',
  sturdy: 'Sturdy',
  grace: 'Grace',
  poisoned: 'Poison',
  vulnerable: 'Vulnerable',
  poison: 'Poison',
  bounty: 'Bounty',
  terrified: 'Terrified',
  ready: 'Ready',
  duel: 'Duel',
  chain: 'Chain',
  protected: 'Protected',
};

/** Descriptions for effects not in keywords.ts. */
const EXTRA_DESCRIPTIONS: Record<string, { name: string; color: string; description: string }> = {
  block: { name: 'Block', color: '#6888A0', description: 'Absorbs incoming damage.' },
  crit: { name: 'Crit', color: '#D06080', description: 'Chance to deal 1.5x damage.' },
  thorns: { name: 'Thorns', color: '#C04040', description: 'When attacked, deal damage back equal to stacks. Cleared at end of turn.' },
  cloak: { name: 'Cloak', color: '#808080', description: 'Cascade damage taken is reduced by 50%. Decrease stacks by 1 at the end of the turn.' },
  blinded: { name: 'Blinded', color: '#A0A0A0', description: 'Attacks deal no damage.' },
  hardened: { name: 'Hardened', color: '#8B7355', description: 'Damage taken per swap is capped to the number of Hardened stacks.' },
  summoned: { name: 'Summoned', color: '#E0C880', description: 'Dies when all non-summoned enemies have died.' },
  fuse: { name: 'Fuse', color: '#ff4444', description: 'When this reaches zero, blows up dealing 50 damage, then dies.' },
  dead_man_walking: { name: 'Dead Man Walking', color: '#C8B060', description: 'Immune to debuffs. Decrease stacks by 1 at the end of the turn or whenever a debuff is applied.' },
  invulnerable: { name: 'Invulnerable', color: '#FFD700', description: 'Immune to all damage. Decrease stacks by 1 at the end of the turn.' },
};

function getStatusTooltip(type: string, value: number, hideValue: boolean): ReactNode {
  const kwName = STATUS_TO_KEYWORD[type];
  const kw = kwName ? KEYWORDS[kwName] : null;
  const entry = kw
    ? { name: kwName!, color: kw.color, description: kw.description }
    : EXTRA_DESCRIPTIONS[type];
  if (!entry) return type;
  const suffix = hideValue ? '' : ` (${formatValue(type, value)})`;
  return (
    <span>
      <KeywordLine name={entry.name} color={entry.color} description={entry.description + suffix} />
    </span>
  );
}

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
      {effects.map((effect, i) => {
        const hideValue = effect.type === 'summoned';
        const tooltipContent = getStatusTooltip(effect.type, effect.value, hideValue);
        return (
          <Tooltip key={`${effect.type}-${i}`} content={tooltipContent} position="bottom">
          <div
            className="relative"
            style={{ width: 16, height: 16 }}
          >
            <SpriteIcon
              frame={STATUS_FRAMES[effect.type] ?? (TILE_FRAMES as Record<string, number>)[effect.type] ?? 0}
              scale={1}
            />
            {!hideValue && (
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
            )}
          </div>
          </Tooltip>
        );
      })}
    </div>
  );
});
