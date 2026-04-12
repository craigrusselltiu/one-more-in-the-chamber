import { memo } from 'react';
import type { EnemyIntent as EnemyIntentType } from '../../types/combat';
import { SpriteIcon } from '../components/SpriteIcon';
import { INTENT_FRAMES, INTENT_COLORS, STATUS_FRAMES, HAZARD_FRAMES } from '../../data/spriteConfig';

/** Intent kinds that use an existing status/hazard icon. */
const INTENT_STATUS_FRAMES: Record<string, number | undefined> = {
  lock: HAZARD_FRAMES.lock,
  lock_row: HAZARD_FRAMES.lock,
  lock_column: HAZARD_FRAMES.lock,
  poison_tiles: HAZARD_FRAMES.poison,
  bury: HAZARD_FRAMES.sand,
  apply_poison: STATUS_FRAMES.poison,
  gain_rageful: STATUS_FRAMES.rageful,
  apply_terrified: STATUS_FRAMES.terrified,
  gain_thorns: STATUS_FRAMES.thorns,
  gain_cloak: STATUS_FRAMES.cloak,
  gain_hardened: STATUS_FRAMES.hardened,
  gain_grace: STATUS_FRAMES.grace,
  gain_dead_man_walking: STATUS_FRAMES.dead_man_walking,
  gain_barricade: STATUS_FRAMES.barricade,
  gain_invulnerable: STATUS_FRAMES.invulnerable,
  apply_vulnerable: STATUS_FRAMES.vulnerable,
  apply_vulnerable_self: STATUS_FRAMES.vulnerable,
  heal_ally: STATUS_FRAMES.block,
};

/** VFX tint color per intent kind, matching the tile overlay the status causes. */
const INTENT_VFX_COLORS: Record<string, string> = {
  attack: '#D04040',
  multi_attack: '#D04040',
  block: '#6888A0',
  bomb: '#ff2020',
  poison_tiles: '#40ff40',
  apply_poison: '#40ff40',
  lock: '#D4A030',
  lock_row: '#D4A030',
  lock_column: '#D4A030',
  bury: '#e8c170',
  suppress: '#808080',
  fools_gold: '#E0C880',
  heal: '#40D840',
  summon: '#E0C880',
  gain_rageful: '#D04040',
  apply_terrified: '#8B4789',
  gain_thorns: '#C04040',
  gain_cloak: '#808080',
  gain_hardened: '#8B7355',
  gain_grace: '#A0C8FF',
  gain_dead_man_walking: '#C8B060',
  gain_barricade: '#8B7355',
  gain_invulnerable: '#FFD700',
  apply_vulnerable: '#C070D0',
  apply_vulnerable_self: '#C070D0',
  heal_ally: '#40D840',
};

/** Default VFX color (attack red) for intents not in the map. */
const DEFAULT_VFX_COLOR = '#D04040';

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface EnemyIntentProps {
  intent: EnemyIntentType;
  /** Enemy's current rageful stacks — boosts attack badges for display. */
  rageful?: number;
}

/**
 * EnemyIntent: shows what the enemy will do next as icon badges.
 * Icons pop in with a scale animation when the intent changes.
 */
export const EnemyIntent = memo(function EnemyIntent({ intent, rageful = 0 }: EnemyIntentProps) {
  const actions = intent.actions;

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
    <div
      // Re-key on description + rageful change to trigger remount + animation
      key={`${intent.description}-r${rageful}`}
      className="flex items-center justify-center gap-1 px-1 py-px"
    >
      {actions.map((action, i) => {
        const frame = INTENT_FRAMES[action.kind] ?? INTENT_STATUS_FRAMES[action.kind];
        const color = INTENT_COLORS[action.kind] ?? '#808080';

        let badge = '';
        if (action.kind === 'multi_attack' && action.hits) {
          badge = `${action.value + rageful}x${action.hits}`;
        } else if (action.kind === 'attack') {
          if (action.value > 0) badge = String(action.value + rageful);
        } else if (action.kind === 'block' || action.kind === 'heal') {
          if (action.value > 0) badge = String(action.value);
        }

        const vfxColor = INTENT_VFX_COLORS[action.kind] ?? DEFAULT_VFX_COLOR;

        return (
          <div
            key={i}
            className="relative intent-pop-in intent-vfx"
            style={{
              width: 16,
              height: 16,
              animationDelay: `${i * 50}ms`,
              '--vfx-dim': hexToRgba(vfxColor, 0.3),
              '--vfx-bright': hexToRgba(vfxColor, 0.8),
            } as React.CSSProperties}
          >
            {frame != null ? (
              <SpriteIcon frame={frame} scale={1} tint={vfxColor} tintAlpha={0.35} />
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
                  bottom: 0,
                  right: 0,
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
  );
});
