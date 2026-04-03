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

/**
 * TraitDisplay: shows trait tag counts from artifacts below the player panel.
 * Only appears if the player has at least 1 artifact.
 * Greyed-out traits haven't reached their first breakpoint.
 */
export const TraitDisplay = memo(function TraitDisplay() {
  const artifacts = useRunStore((s) => s.run?.artifacts ?? []);
  const traitCounts = useRunStore((s) => s.run?.traitCounts ?? {});

  if (artifacts.length === 0) return null;

  // Only show traits that have at least 1 point
  const activeTraits = Object.entries(traitCounts)
    .filter(([, count]) => count && count > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0)) as [TraitId, number][];

  if (activeTraits.length === 0) return null;

  return (
    <div className="flex gap-1 flex-wrap justify-center mt-1">
      {activeTraits.map(([traitId, count]) => {
        const breakpoints = TRAIT_BREAKPOINTS[traitId] ?? [];
        const firstBreakpoint = breakpoints[0] ?? 1;
        const isActive = count >= firstBreakpoint;
        // Find which breakpoints are reached
        const reachedCount = breakpoints.filter((bp) => count >= bp).length;
        const nextBreakpoint = breakpoints.find((bp) => count < bp);
        const tooltipText = `${TRAIT_LABELS[traitId]} (${count}${nextBreakpoint ? `/${nextBreakpoint}` : ''}) — ${reachedCount}/${breakpoints.length} active`;

        return (
          <Tooltip key={traitId} text={tooltipText} position="bottom">
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
      })}
    </div>
  );
});
