import { memo } from 'react';
import type { EnemyIntent as EnemyIntentType } from '../../types/combat';

interface EnemyIntentProps {
  intent: EnemyIntentType;
}

const KEYWORD_COLORS: Record<string, string> = {
  ATK: '#D04040',
  DEF: '#6888A0',
  BLOCK: '#6888A0',
  BUFF: '#C070D0',
  CALL: '#E0C880',
  HOWL: '#E0C880',
  LOCK: '#D4A030',
  BOMB: '#D04040',
  POISON: '#60A040',
  STRIKE: '#D04040',
  COIL: '#6888A0',
};

/** Get the primary color from the last action keyword (the main threat). */
function getIntentColor(description: string): string {
  const parts = description.split(',');
  const last = parts[parts.length - 1].trim().split(' ')[0].toUpperCase();
  return KEYWORD_COLORS[last] ?? '#808080';
}

/**
 * EnemyIntent: shows what the enemy will do next.
 * Displays the full description which may include multiple actions.
 */
export const EnemyIntent = memo(function EnemyIntent({ intent }: EnemyIntentProps) {
  const color = getIntentColor(intent.description);

  return (
    <div
      className="text-[8px] font-bold text-center leading-none px-1 py-px"
      style={{ color }}
    >
      {intent.description}
    </div>
  );
});
