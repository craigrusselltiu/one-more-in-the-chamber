import { memo } from 'react';
import type { EnemyIntent as EnemyIntentType } from '../../types/combat';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { INTENT_FRAMES, INTENT_COLORS } from '../../data/spriteConfig';

interface EnemyIntentProps {
  intent: EnemyIntentType;
}

/**
 * EnemyIntent: shows what the enemy will do next as icon badges.
 * If the intent has structured actions, renders icons with number badges.
 * Falls back to text display for legacy intents.
 */
export const EnemyIntent = memo(function EnemyIntent({ intent }: EnemyIntentProps) {
  const actions = intent.actions;

  // Fallback: legacy text-based intents (no actions array)
  if (!actions || actions.length === 0) {
    return (
      <div
        className="text-[8px] font-bold text-center leading-none px-1 py-px whitespace-nowrap"
        style={{ color: '#D04040' }}
      >
        {intent.description}
      </div>
    );
  }

  return (
    <Tooltip text={intent.description} position="top">
      <div className="flex items-center justify-center gap-0.5 px-1 py-px">
        {actions.map((action, i) => {
          const frame = INTENT_FRAMES[action.kind];
          const color = INTENT_COLORS[action.kind] ?? '#808080';

          // Format the badge value
          let badge = '';
          if (action.kind === 'multi_attack' && action.hits) {
            badge = `${action.value}x${action.hits}`;
          } else if (action.kind === 'summon') {
            // No number for summon
          } else if (action.kind === 'gravity_shift') {
            // No number for gravity
          } else if (action.value > 0) {
            badge = String(action.value);
          }

          return (
            <div key={i} className="relative" style={{ width: 16, height: 16 }}>
              {frame != null ? (
                <SpriteIcon frame={frame} scale={1} />
              ) : (
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: color, opacity: 0.6 }}
                />
              )}
              {badge && (
                <span
                  className="absolute font-bold"
                  style={{
                    bottom: -3,
                    right: -3,
                    fontSize: '7px',
                    color,
                    lineHeight: 1,
                    WebkitTextStroke: '2px #000',
                    paintOrder: 'stroke fill',
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Tooltip>
  );
});
