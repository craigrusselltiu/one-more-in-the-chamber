import { memo, useMemo } from 'react';
import { useCombatStore, getPlayerStatusEffects } from '../../store/combatStore';
import { HealthBar } from './HealthBar';
import { BlockBadge } from './BlockBadge';
import { StatusEffects } from './StatusEffects';
import { TraitDisplay } from './TraitDisplay';

/**
 * PlayerPanel: left-side player area during combat.
 * Shows: sprite placeholder, HP bar, status effects.
 * Ability meter is rendered under the board in CombatHUD.
 */
const CHARACTER_SPRITES: Record<string, string> = {
  red_panda: 'rust.png',
  reno: 'reno.png',
};

export const PlayerPanel = memo(function PlayerPanel() {
  const character = useCombatStore((s) => s.character);
  const health = useCombatStore((s) => s.playerHealth);
  const maxHealth = useCombatStore((s) => s.playerMaxHealth);
  const block = useCombatStore((s) => s.playerBlock);
  const store = useCombatStore();
  const effects = getPlayerStatusEffects(store);
  const nonBlockEffects = useMemo(() => effects.filter((e) => e.type !== 'block'), [effects]);

  const spriteFile = CHARACTER_SPRITES[character] ?? 'rust.png';

  return (
    <div className="flex flex-col items-center">
      {/* Character sprite */}
      <img
        src={`${import.meta.env.BASE_URL}assets/sprites/${spriteFile}`}
        alt="Player"
        className="mb-1"
        style={{ width: 96, height: 96, imageRendering: 'pixelated', objectFit: 'cover' }}
      />

      {/* HP bar centered, block badge overlaid to the left */}
      <div className="relative">
        <div className="absolute right-full top-0 mr-1.5 flex items-center" style={{ height: '100%' }}>
          {block > 0 && <BlockBadge value={block} />}
        </div>
        <HealthBar current={health} max={maxHealth} width={80} />
      </div>

      {/* Status effects (excl block) - fixed height section */}
      <div style={{ minHeight: 24 }}>
        <StatusEffects effects={nonBlockEffects} />
      </div>

      {/* Trait contributions from artifacts */}
      <TraitDisplay />
    </div>
  );
});
