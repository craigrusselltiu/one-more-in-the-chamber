import { memo } from 'react';
import { useRunStore } from '../../store/runStore';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { colorizeKeywords, getReferencedKeywords, KeywordLine } from '../components/KeywordText';
import { TRAIT_FRAMES, TRAIT_BREAKPOINTS } from '../../data/spriteConfig';
import { TRAITS } from '../../data/traits';
import type { ArtifactInstance, TraitId } from '../../types/game';

// Stable empty fallbacks: a fresh literal from a zustand selector triggers an
// infinite useSyncExternalStore re-render when run is null.
const EMPTY_ARTIFACTS: ArtifactInstance[] = [];
const EMPTY_TRAIT_COUNTS: Partial<Record<TraitId, number>> = {};

const OUTLINE_STYLE: React.CSSProperties = {
  WebkitTextStroke: '2px #000',
  paintOrder: 'stroke fill',
};

export const TRAIT_LABELS: Record<TraitId, string> = Object.fromEntries(
  TRAITS.map((trait) => [trait.id, trait.name]),
) as Record<TraitId, string>;

export function TraitTooltipContent({
  traitId,
  count,
  forceAllReached = false,
}: {
  traitId: TraitId;
  count: number;
  forceAllReached?: boolean;
}) {
  const trait = TRAITS.find((entry) => entry.id === traitId);
  const breakpoints = trait?.breakpoints ?? [];
  const tooltipLines = breakpoints.map((bp) => ({
    threshold: bp.threshold,
    text: bp.description,
    reached: forceAllReached || count >= bp.threshold,
  }));

  const allText = tooltipLines.map((l) => l.text).join(' ');
  const referencedKeywords = getReferencedKeywords(allText);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-bold text-amber-400" style={{ fontSize: '10px' }}>
        {trait?.name ?? TRAIT_LABELS[traitId]}
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
}

/**
 * TraitRow: right-aligned row in the top bar area showing active traits.
 * Mirrors ArtifactBar positioning but on the right side.
 */
export const TraitRow = memo(function TraitRow() {
  const artifacts = useRunStore((s) => s.run?.artifacts ?? EMPTY_ARTIFACTS);
  const traitCounts = useRunStore((s) => s.run?.traitCounts ?? EMPTY_TRAIT_COUNTS);

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

        return (
          <Tooltip key={traitId} content={<TraitTooltipContent traitId={traitId} count={count} />} position="bottom">
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
