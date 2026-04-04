import { memo } from 'react';
import { useRunStore } from '../../store/runStore';
import { ARTIFACTS } from '../../data/artifacts';
import { Tooltip } from '../components/Tooltip';
import type { TraitId } from '../../types/game';

/** Primary color for each trait tag. */
const TRAIT_COLORS: Record<TraitId, string> = {
  outlaw: '#D04040',
  sheriff: '#6888A0',
  rattlesnake: '#60A040',
  prospector: '#E0C880',
  sapper: '#D4A030',
  mustang: '#70B0D0',
  gunslinger: '#D06080',
};

const DEFAULT_COLOR = '#808080';

/**
 * ArtifactBar: left-aligned row of small 14x14 colored squares.
 * Color = first trait tag. Tooltip shows name + effect.
 * Directly under the top bar per SPEC layout.
 */
export const ArtifactBar = memo(function ArtifactBar() {
  const artifacts = useRunStore((s) => s.run?.artifacts ?? []);

  if (artifacts.length === 0) return null;

  return (
    <div className="relative z-10 flex gap-1 px-2 py-px mt-0.5 pointer-events-auto">
      {artifacts.map((inst, i) => {
        const def = ARTIFACTS.find((a) => a.id === inst.id);
        const color =
          inst.tags.length > 0
            ? TRAIT_COLORS[inst.tags[0]] ?? DEFAULT_COLOR
            : DEFAULT_COLOR;

        return (
          <Tooltip key={`${inst.id}-${i}`} position="bottom" content={def ? (
            <div className="flex flex-col gap-0.5">
              <div className="font-bold text-amber-400" style={{ fontSize: '10px' }}>
                {def.name}
                {inst.tags.length > 0 && (
                  <span className="text-stone-400 font-normal ml-1">({inst.tags.join(', ')})</span>
                )}
              </div>
              <div className="text-stone-200 whitespace-nowrap" style={{ fontSize: '9px' }}>{def.effect}</div>
              {def.description && (
                <div className="text-stone-500 italic whitespace-nowrap" style={{ fontSize: '8px' }}>"{def.description}"</div>
              )}
            </div>
          ) : undefined} text={def ? undefined : inst.id}>
            <div
              className="flex items-center justify-center text-[6px] text-white font-bold"
              style={{
                width: 18,
                height: 18,
                backgroundColor: color,
                border: `1px solid ${color}`,
              }}
            >
              {(def?.name ?? inst.id).charAt(0).toUpperCase()}
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
});
