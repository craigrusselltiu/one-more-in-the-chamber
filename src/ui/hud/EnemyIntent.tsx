import { memo } from 'react';
import type { EnemyIntent as EnemyIntentType, EnemyIntentType as IntentKind } from '../../types/combat';

interface EnemyIntentProps {
  intent: EnemyIntentType;
}

const INTENT_COLORS: Record<IntentKind, string> = {
  attack: '#D04040',
  block: '#6888A0',
  ability: '#C070D0',
  summon: '#E0C880',
  'board-manipulation': '#D4A030',
};

const INTENT_ICONS: Record<IntentKind, string> = {
  attack: 'ATK',
  block: 'DEF',
  ability: 'BUFF',
  summon: 'CALL',
  'board-manipulation': 'HEX',
};

/**
 * EnemyIntent: small text label showing what the enemy will do next.
 * Displayed above each enemy in the targeting panel.
 */
export const EnemyIntent = memo(function EnemyIntent({ intent }: EnemyIntentProps) {
  const color = INTENT_COLORS[intent.type] ?? '#808080';
  const icon = INTENT_ICONS[intent.type] ?? '???';

  return (
    <div
      className="text-[7px] font-bold text-center leading-none px-1 py-px"
      style={{ color }}
    >
      {icon}
      {intent.value != null && ` ${intent.value}`}
    </div>
  );
});
