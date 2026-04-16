import { memo } from 'react';
import { useRunStore } from '../../store/runStore';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { colorizeKeywords, getReferencedKeywords, KeywordLine } from '../components/KeywordText';
import { TRAIT_FRAMES, TRAIT_BREAKPOINTS } from '../../data/spriteConfig';
import type { TraitId } from '../../types/game';

const OUTLINE_STYLE: React.CSSProperties = {
  WebkitTextStroke: '2px #000',
  paintOrder: 'stroke fill',
};

const TRAIT_LABELS: Record<TraitId, string> = {
  outlaw: 'Outlaw', sheriff: 'Sheriff', prospector: 'Prospector', sapper: 'Sapper',
  mustang: 'Mustang', gunslinger: 'Gunslinger', saloon_keeper: 'Saloon Keeper',
  desperado: 'Desperado', sniper: 'Sniper', dead_man_walking: 'Dead Man Walking',
  tracker: 'Tracker', preacher: 'Preacher', antivenom: 'Antivenom', undertaker: 'Undertaker',
  rattlesnake: 'Rattlesnake', corrupt: 'Corrupt',
};

const TRAIT_DESCRIPTIONS: Record<string, Record<number, string>> = {
  sheriff: {
    2: 'Double the first time you gain block each combat.',
    4: 'At the start of combat, gain 4 Sturdy.',
    6: 'Block reflects 100% of absorbed damage back to attacker.',
  },
  outlaw: {
    2: 'Killing an enemy grants 3 Rageful.',
    5: 'At the start of boss encounters, gain 5 Rageful and apply 3 Vulnerable to all enemies.',
  },
  prospector: {
    2: 'On any match, 25% chance to generate 7 gold.',
    4: 'Whenever you gain gold during combat, deal 2 damage to a random enemy.',
    6: 'Deal 5% of your current gold as extra damage.',
  },
  gunslinger: {
    2: 'Bullet-type tiles deal 1 extra damage per tile.',
    4: 'Gain 1 Lucky for every bullet-type tile matched.',
    6: 'Lucky deals 2x damage instead of 1.5x.',
  },
  saloon_keeper: {
    2: 'Consumables heal 5 HP on use (any consumable).',
    5: 'At the start of combat, gain a random consumable.',
  },
  sapper: {
    2: 'Enemy bomb timers are increased by 2.',
    4: 'Increase the radius of explosive tiles by 1.',
  },
  sniper: {
    3: 'On 5-match, gain 1 swap for that turn.',
    5: 'On 6+ match, if the targeted enemy is not a boss, kill it.',
  },
  dead_man_walking: {
    3: 'Whenever you would take damage, take 1 less damage.',
    5: 'When at or below 20% HP, all damage is doubled.',
    7: 'Once per combat when taking lethal damage, prevent it and heal 20% HP.',
  },
  mustang: {
    4: '+1 swap per turn.',
  },
  tracker: {
    1: 'Buried tiles get revealed at the end of your turn automatically.',
    3: 'Gain 1 Rageful whenever a Buried tile gets revealed.',
  },
  preacher: {
    2: "Whenever you don't deal damage in a turn, heal 5.",
    4: 'Take 20% less damage from enemies with lower HP than you.',
    6: 'At the start of combat, gain 2 Grace.',
  },
  antivenom: {
    3: 'Matching next to a Poison tile clears it.',
  },
  undertaker: {
    3: 'Deal 50% more damage to summoned enemies.',
    6: 'On enemy death, gain 1 Ready.',
  },
  desperado: {
    2: 'Desperado-tagged artifacts are more common.',
    5: 'At the start of every turn, gain 4 Ace.',
  },
  rattlesnake: {
    2: 'Clearing or matching Poison tiles applies Poison to target instead.',
    4: 'When you would apply Poison, apply it to ALL enemies.',
  },
  corrupt: {
    2: 'At the start of combat, add Shadow to 2 random tiles for each Corrupt artifact you own.',
  },
};

/**
 * TraitRow: right-aligned row in the top bar area showing active traits.
 * Mirrors ArtifactBar positioning but on the right side.
 */
export const TraitRow = memo(function TraitRow() {
  const artifacts = useRunStore((s) => s.run?.artifacts ?? []);
  const traitCounts = useRunStore((s) => s.run?.traitCounts ?? {});

  if (artifacts.length === 0) return null;

  const activeTraits = (Object.entries(traitCounts)
    .filter(([, count]) => count && count > 0) as [TraitId, number][])
    .sort(([idA, a], [idB, b]) => {
      const aActive = a >= (TRAIT_BREAKPOINTS[idA]?.[0] ?? 1) ? 1 : 0;
      const bActive = b >= (TRAIT_BREAKPOINTS[idB]?.[0] ?? 1) ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive;
      return b - a;
    });

  if (activeTraits.length === 0) return null;

  return (
    <div
      className="absolute z-10 right-0 flex flex-wrap justify-end gap-1 px-2 py-px pointer-events-auto"
      style={{ top: 30, maxWidth: '48%' }}
    >
      {activeTraits.map(([traitId, count]) => {
        const breakpoints = TRAIT_BREAKPOINTS[traitId] ?? [];
        const firstBreakpoint = breakpoints[0] ?? 1;
        const isActive = count >= firstBreakpoint;
        const descriptions = TRAIT_DESCRIPTIONS[traitId] ?? {};

        const tooltipLines = breakpoints.map((bp) => ({
          threshold: bp,
          text: descriptions[bp] ?? `Breakpoint ${bp}`,
          reached: count >= bp,
        }));

        const allText = tooltipLines.map((l) => l.text).join(' ');
        const referencedKeywords = getReferencedKeywords(allText);

        const tooltipContent = (
          <div className="flex flex-col gap-0.5">
            <div className="font-bold text-amber-400" style={{ fontSize: '10px' }}>
              {TRAIT_LABELS[traitId]}
            </div>
            {tooltipLines.map(({ threshold, text, reached }) => (
              <div
                key={threshold}
                className="whitespace-nowrap"
                style={{ fontSize: '9px', color: reached ? '#e5e5e5' : '#666', lineHeight: 1.4 }}
              >
                <span className="font-bold">{threshold}</span> - {colorizeKeywords(text)}
              </div>
            ))}
            {referencedKeywords.length > 0 && (
              <div className="flex flex-col gap-px mt-0.5 pt-0.5" style={{ borderTop: '1px solid #44403c' }}>
                {referencedKeywords.map((kw) => (
                  <KeywordLine key={kw.name} name={kw.name} color={kw.color} description={kw.description} />
                ))}
              </div>
            )}
          </div>
        );

        return (
          <Tooltip key={traitId} content={tooltipContent} position="bottom">
            <div
              className="relative"
              style={{
                width: 16,
                height: 16,
                opacity: isActive ? 1 : 0.4,
                filter: isActive ? 'none' : 'grayscale(1) brightness(0.6)',
              }}
            >
              <SpriteIcon frame={TRAIT_FRAMES[traitId] ?? 0} scale={1} />
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
      })}
    </div>
  );
});
