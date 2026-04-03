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
};

/** Descriptions for each trait at each breakpoint threshold. */
const TRAIT_DESCRIPTIONS: Record<string, Record<number, string>> = {
  outlaw: {
    2: '4+ matches deal 30% bonus damage.',
    4: '4+ matches apply 1 Vulnerable to targeted enemy.',
    6: 'Tiles from 4+ match cascades trigger resource effects twice.',
  },
  sheriff: {
    2: 'Iron matches +30% block. +2 block per turn.',
    5: 'Block reflects 100% of absorbed damage back to attacker.',
  },
  rattlesnake: {
    1: 'Immune to poison tile damage and debuffs.',
    3: 'Matching poison tiles deals damage + applies venom.',
  },
  prospector: {
    2: 'Non-gold matches: 15% chance to generate 1 gold.',
    4: 'Gold matches: double gold + 2 block.',
    6: 'Turn end: deal 50% of gold earned this fight as damage.',
  },
  sapper: {
    1: 'Bombs deal +2 bonus damage when detonated.',
    2: 'Bomb countdowns start 1 turn higher.',
    3: 'Every 4th match spawns a player-side bomb tile.',
  },
  mustang: {
    4: '+1 swap per turn. Non-adjacent swaps allowed. 5+ lasso matches: +50% damage.',
  },
  gunslinger: {
    2: 'Start each fight with 15% crit. Crits deal 3 bonus flat damage.',
    4: 'Crit multiplier 3x. Crit chance halves instead of resetting.',
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
    <Tooltip content={tooltipContent} position="bottom">
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
