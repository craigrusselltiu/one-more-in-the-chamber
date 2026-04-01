import { memo, useMemo } from 'react';
import { useCombatStore, getPlayerStatusEffects } from '../../store/combatStore';
import { HealthBar } from './HealthBar';
import { BlockBadge } from './BlockBadge';
import { StatusEffects } from './StatusEffects';
import { AbilityMeter } from './AbilityMeter';

/**
 * PlayerPanel: left-side player area during combat.
 * Shows: sprite placeholder, HP bar, status effects, ability meter.
 */
export const PlayerPanel = memo(function PlayerPanel() {
  const health = useCombatStore((s) => s.playerHealth);
  const maxHealth = useCombatStore((s) => s.playerMaxHealth);
  const block = useCombatStore((s) => s.playerBlock);
  const store = useCombatStore();
  const effects = getPlayerStatusEffects(store);
  const nonBlockEffects = useMemo(() => effects.filter((e) => e.type !== 'block'), [effects]);

  return (
    <div className="flex flex-col items-center">
      {/* Character sprite placeholder */}
      <div
        className="border border-stone-600 border-dashed mb-1 flex items-center justify-center"
        style={{ width: 96, height: 96 }}
      >
        <span className="text-stone-600" style={{ fontSize: '9px' }}>PLAYER</span>
      </div>

      {/* HP bar with BLK badge to the left */}
      <div className="relative">
        {block > 0 && (
          <div className="absolute right-full top-0 mr-0.5" style={{ marginTop: 11 }}>
            <BlockBadge value={block} />
          </div>
        )}
        <HealthBar current={health} max={maxHealth} label="HP" width={80} />
      </div>

      {/* Status effects row (without block) */}
      <StatusEffects effects={nonBlockEffects} />

      {/* Ability meter */}
      <AbilityMeter />
    </div>
  );
});
