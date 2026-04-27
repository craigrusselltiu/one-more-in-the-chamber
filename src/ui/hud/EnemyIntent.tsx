import { memo } from 'react';
import type { EnemyIntent as EnemyIntentType, MoveAction } from '../../types/combat';
import { SpriteIcon } from '../components/SpriteIcon';
import { INTENT_FRAMES, INTENT_COLORS, STATUS_FRAMES, HAZARD_FRAMES, TRAIT_FRAMES, TILE_FRAMES } from '../../data/spriteConfig';
import { useCombatStore } from '../../store/combatStore';
import { Tooltip } from '../components/Tooltip';

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
  gain_dead_man_walking: TRAIT_FRAMES.dead_man_walking,
  gain_barricade: TILE_FRAMES.barricade,
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

const ACTION_NAMES: Record<string, string> = {
  attack: 'Attack',
  multi_attack: 'Attack',
  block: 'Block',
  lock: 'Lock',
  lock_row: 'Lock Row',
  lock_column: 'Lock Column',
  poison_tiles: 'Poison',
  apply_poison: 'Apply Poison',
  bomb: 'Bombs',
  bury: 'Bury',
  suppress: 'Suppress',
  fools_gold: "Fool's Gold",
  summon: 'Summon',
  heal: 'Heal',
  gain_rageful: 'Gain Rageful',
  apply_terrified: 'Apply Terrified',
  gain_thorns: 'Gain Thorns',
  gain_cloak: 'Gain Cloak',
  gain_hardened: 'Gain Hardened',
  gain_grace: 'Gain Grace',
  gain_dead_man_walking: 'Gain Dead Man Walking',
  gain_barricade: 'Gain Barricade',
  gain_invulnerable: 'Gain Invulnerable',
  apply_vulnerable: 'Apply Vulnerable',
  apply_vulnerable_self: 'Vulnerable (Self)',
  heal_ally: 'Heal Ally',
  shuffle_rows: 'Shuffle Rows',
  gravity_shift: 'Gravity Shift',
  transform_tumbleweed: 'Transform Tumbleweed',
  gain_scavenger: 'Gain Scavenger',
};

function describeAction(action: MoveAction, rageful: number): string {
  switch (action.kind) {
    case 'attack':
      return `Deal ${action.value + rageful} damage.`;
    case 'multi_attack':
      return action.hits
        ? `Deal ${action.value + rageful} damage ${action.hits} times.`
        : `Deal ${action.value + rageful} damage multiple times.`;
    case 'block':
      return `Gain ${action.value} block.`;
    case 'lock':
      return `Lock ${action.value} tiles.`;
    case 'lock_row':
      return 'Lock a random row.';
    case 'lock_column':
      return 'Lock a random column.';
    case 'poison_tiles':
      return `Poison ${action.value} tiles.`;
    case 'apply_poison':
      return `Apply ${action.value} Poison.`;
    case 'bomb':
      return `Place ${action.value} bombs.`;
    case 'bury':
      return `Bury ${action.value} tiles.`;
    case 'suppress':
      return `Suppress ${action.value} tiles.`;
    case 'fools_gold':
      return `Place ${action.value} Fool's Gold tiles.`;
    case 'summon':
      return action.summonType ? `Summon ${action.summonType}.` : 'Summon an enemy.';
    case 'heal':
      return `Heal ${action.value} HP.`;
    case 'gain_rageful':
      return `Gain ${action.value} Rageful.`;
    case 'apply_terrified':
      return `Apply ${action.value} Terrified.`;
    case 'gain_thorns':
      return `Gain ${action.value} Thorns.`;
    case 'gain_cloak':
      return `Gain ${action.value} Cloak.`;
    case 'gain_hardened':
      return `Gain ${action.value} Hardened.`;
    case 'gain_grace':
      return `Gain ${action.value} Grace.`;
    case 'gain_dead_man_walking':
      return `Gain ${action.value} Dead Man Walking.`;
    case 'gain_barricade':
      return `Gain ${action.value} Barricade.`;
    case 'gain_invulnerable':
      return `Gain ${action.value} Invulnerable.`;
    case 'apply_vulnerable':
      return `Apply ${action.value} Vulnerable.`;
    case 'apply_vulnerable_self':
      return `Gain ${action.value} Vulnerable.`;
    case 'heal_ally':
      return `Heal an ally for ${action.value} HP.`;
    case 'shuffle_rows':
      return `Shuffle ${action.value} rows.`;
    case 'gravity_shift':
      return 'Shift gravity.';
    case 'transform_tumbleweed':
      return `Transform ${action.value} Tumbleweed tiles.`;
    case 'gain_scavenger':
      return `Gain ${action.value} Scavenger.`;
    default:
      return action.value != null ? `${action.kind} (${action.value})` : action.kind;
  }
}

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
  const intentsHidden = useCombatStore((s) => s.intentsHidden);

  // Tinnitus: show "?" badge when intents are hidden (turn 1).
  if (intentsHidden) {
    return (
      <div
        className="flex items-center justify-center px-1 py-px"
        style={{
          width: 16,
          height: 16,
          color: '#8B3A9B',
          fontWeight: 'bold',
          fontSize: '14px',
          lineHeight: 1,
          WebkitTextStroke: '2px #000',
          paintOrder: 'stroke fill',
        }}
      >
        ?
      </div>
    );
  }

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
        const frame =
          action.kind === 'transform_tumbleweed'
            ? TILE_FRAMES.tumbleweed
            : (INTENT_FRAMES[action.kind] ?? INTENT_STATUS_FRAMES[action.kind]);
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
        const name = ACTION_NAMES[action.kind] ?? action.kind;
        const desc = describeAction(action, rageful);

        return (
          <Tooltip
            key={i}
            content={
              <span className="whitespace-nowrap">
                <span style={{ color: vfxColor, fontWeight: 'bold' }}>{name}</span>
                {' - '}
                {desc}
              </span>
            }
            position="bottom"
          >
            <div
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
          </Tooltip>
        );
      })}
    </div>
  );
});
