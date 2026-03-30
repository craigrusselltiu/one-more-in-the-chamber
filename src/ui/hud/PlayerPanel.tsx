import { memo } from 'react';
import { useCombatStore, getPlayerStatusEffects } from '../../store/combatStore';
import { HealthBar } from './HealthBar';
import { StatusEffects } from './StatusEffects';
import { AbilityMeter } from './AbilityMeter';
import { ConsumableSlots } from './ConsumableSlots';

/**
 * PlayerPanel: left-side player area during combat.
 * Shows: HP bar, status effects, ability meter, consumable slots.
 * Positioned absolutely on the left of the screen.
 */
export const PlayerPanel = memo(function PlayerPanel() {
  const health = useCombatStore((s) => s.playerHealth);
  const maxHealth = useCombatStore((s) => s.playerMaxHealth);
  const store = useCombatStore();
  const effects = getPlayerStatusEffects(store);

  return (
    <div className="flex flex-col items-start">
      {/* Player sprite placeholder area (64x64 in Phaser) */}

      {/* HP bar */}
      <HealthBar current={health} max={maxHealth} label="HP" />

      {/* Status effects row */}
      <StatusEffects effects={effects} />

      {/* Ability meter */}
      <AbilityMeter />

      {/* Consumable slots */}
      <div className="mt-2">
        <ConsumableSlots />
      </div>
    </div>
  );
});
