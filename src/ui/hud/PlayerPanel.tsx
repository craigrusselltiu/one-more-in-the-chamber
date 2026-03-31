import { memo } from 'react';
import { useCombatStore, getPlayerStatusEffects } from '../../store/combatStore';
import { HealthBar } from './HealthBar';
import { StatusEffects } from './StatusEffects';
import { AbilityMeter } from './AbilityMeter';
import { ConsumableSlots } from './ConsumableSlots';

/**
 * PlayerPanel: left-side player area during combat.
 * Shows: sprite placeholder, HP bar, status effects, ability meter, consumable slots.
 */
export const PlayerPanel = memo(function PlayerPanel() {
  const health = useCombatStore((s) => s.playerHealth);
  const maxHealth = useCombatStore((s) => s.playerMaxHealth);
  const store = useCombatStore();
  const effects = getPlayerStatusEffects(store);

  return (
    <div className="flex flex-col items-center">
      {/* Character sprite placeholder */}
      <div
        className="border border-stone-600 border-dashed mb-1 flex items-center justify-center"
        style={{ width: 48, height: 48 }}
      >
        <span className="text-stone-600" style={{ fontSize: '7px' }}>PLAYER</span>
      </div>

      {/* HP bar */}
      <HealthBar current={health} max={maxHealth} label="HP" />

      {/* Status effects row */}
      <StatusEffects effects={effects} />

      {/* Ability meter */}
      <AbilityMeter />

      {/* Consumable slots */}
      <div className="mt-2 pointer-events-auto">
        <ConsumableSlots />
      </div>
    </div>
  );
});
