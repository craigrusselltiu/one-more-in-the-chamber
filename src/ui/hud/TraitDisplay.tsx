import { memo } from 'react';
import { useRunStore } from '../../store/runStore';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { TRAIT_FRAMES, TRAIT_BREAKPOINTS } from '../../data/spriteConfig';
import type { TraitId } from '../../types/game';

const OUTLINE_STYLE: React.CSSProperties = {
  WebkitTextStroke: '2px #000',
  paintOrder: 'stroke fill',
};

const TRAIT_LABELS: Record<TraitId, string> = {
  outlaw: 'Outlaw',
  sheriff: 'Sheriff',
  rattlesnake: 'Rattlesnake',
  prospector: 'Prospector',
  sapper: 'Sapper',
  mustang: 'Mustang',
  gunslinger: 'Gunslinger',
  saloon_keeper: 'Saloon Keeper',
  desperado: 'Desperado',
  high_roller: 'High Roller',
  sniper: 'Sniper',
  dead_man_walking: 'Dead Man Walking',
};

/** Descriptions for each trait at each breakpoint threshold. */
const TRAIT_DESCRIPTIONS: Record<string, Record<number, string>> = {
  sheriff: {
    2: 'Double the first time you gain block each turn.',
    4: 'At the start of combat, gain 5 Sturdy.',
    6: 'Block reflects 100% of absorbed damage back to attacker.',
  },
  outlaw: {
    2: 'Killing an enemy grants 1 Rageful.',
    5: 'At the start of Boss encounters, gain 3 Rageful and apply 2 Vulnerable to all enemies.',
  },
  prospector: {
    2: 'On any match, 20% chance to generate 1 gold.',
    4: 'Whenever you gain gold during combat, deal 1 damage to a random enemy.',
    6: 'Deal 10% of your current gold as extra damage.',
  },
  gunslinger: {
    2: 'Bullet, .50 Cal, Buckshot, and Ricochet tiles deal 1 extra damage per tile.',
    4: 'Gain 1 Lucky for every Bullet, .50 Cal, Buckshot, or Ricochet matched.',
  },
  saloon_keeper: {
    2: 'Consumables heal 5 HP on use.',
    5: 'At the start of combat, gain a random consumable.',
  },
  sapper: {
    1: 'Enemy bomb timers are increased by 2.',
    5: 'Explosive tile radius is increased by 1.',
  },
  sniper: {
    4: 'On 5-match, gain 1 swap for that turn.',
  },
  dead_man_walking: {
    3: 'Whenever you would take damage, take 1 less damage.',
    5: 'If HP is below 20%, all damage is doubled.',
    7: 'Once per fight, taking lethal damage instead sets HP to 10 and grants 20 block.',
  },
  rattlesnake: {
    1: 'Immune to poison tile damage and debuffs.',
    3: 'Matching poison tiles deals damage + applies venom.',
  },
  mustang: {
    4: '+1 swap per turn. Non-adjacent swaps allowed. 5+ lasso matches: +50% damage.',
  },
};

/**
 * TraitDisplay: shows trait tag counts from artifacts below the player panel.
 * Only appears if the player has at least 1 artifact.
 */
export const TraitDisplay = memo(function TraitDisplay() {
  const artifacts = useRunStore((s) => s.run?.artifacts ?? []);
  const traitCounts = useRunStore((s) => s.run?.traitCounts ?? {});

  if (artifacts.length === 0) return null;

  const activeTraits = (Object.entries(traitCounts)
    .filter(([, count]) => count && count > 0) as [TraitId, number][])
    .sort(([idA, a], [idB, b]) => {
      const aActive = a >= (TRAIT_BREAKPOINTS[idA]?.[0] ?? 1) ? 1 : 0;
      const bActive = b >= (TRAIT_BREAKPOINTS[idB]?.[0] ?? 1) ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive; // activated first
      return b - a; // then by count descending
    });

  if (activeTraits.length === 0) return null;

  return (
    <div className="flex gap-1 flex-wrap justify-center mt-1">
      {activeTraits.map(([traitId, count]) => {
        const breakpoints = TRAIT_BREAKPOINTS[traitId] ?? [];
        const firstBreakpoint = breakpoints[0] ?? 1;
        const isActive = count >= firstBreakpoint;

        return (
          <TraitIcon
            key={traitId}
            traitId={traitId}
            count={count}
            breakpoints={breakpoints}
            isActive={isActive}
          />
        );
      })}
    </div>
  );
});

const TraitIcon = memo(function TraitIcon({
  traitId,
  count,
  breakpoints,
  isActive,
}: {
  traitId: TraitId;
  count: number;
  breakpoints: number[];
  isActive: boolean;
}) {
  const descriptions = TRAIT_DESCRIPTIONS[traitId] ?? {};

  // Build multi-line tooltip content
  const tooltipLines = breakpoints.map((bp) => ({
    threshold: bp,
    text: descriptions[bp] ?? `Breakpoint ${bp}`,
    reached: count >= bp,
  }));

  const tooltipContent = (
    <div className="flex flex-col gap-0.5">
      <div className="font-bold text-amber-400" style={{ fontSize: '10px' }}>
        {TRAIT_LABELS[traitId]}
      </div>
      {tooltipLines.map(({ threshold, text, reached }) => (
        <div
          key={threshold}
          className="whitespace-nowrap"
          style={{
            fontSize: '9px',
            color: reached ? '#e5e5e5' : '#666',
            lineHeight: 1.4,
          }}
        >
          <span className="font-bold">{threshold}</span> - {text}
        </div>
      ))}
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position="top">
      <div
        className="relative"
        style={{
          width: 20,
          height: 20,
          opacity: isActive ? 1 : 0.4,
          filter: isActive ? 'none' : 'grayscale(1) brightness(0.6)',
        }}
      >
        <SpriteIcon frame={TRAIT_FRAMES[traitId] ?? 0} scale={1.25} />
        <span
          className="absolute font-bold"
          style={{
            bottom: -2,
            right: -2,
            fontSize: '8px',
            color: isActive ? '#fbbf24' : '#888',
            lineHeight: 1,
            ...OUTLINE_STYLE,
          }}
        >
          {count}
        </span>
      </div>
    </Tooltip>
  );
});
