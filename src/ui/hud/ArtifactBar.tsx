import { memo } from 'react';
import { useRunStore } from '../../store/runStore';
import { ARTIFACTS } from '../../data/artifacts';
import { Tooltip } from './Tooltip';
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
    <div className="flex gap-px px-2 py-px">
      {artifacts.map((inst, i) => {
        const def = ARTIFACTS.find((a) => a.id === inst.id);
        const color =
          inst.tags.length > 0
            ? TRAIT_COLORS[inst.tags[0]] ?? DEFAULT_COLOR
            : DEFAULT_COLOR;

        const label = def?.name ?? inst.id;
        const square = (
          <div
            className="flex items-center justify-center text-[5px] text-white font-bold"
            style={{
              width: 14,
              height: 14,
              backgroundColor: color,
              border: `1px solid ${color}`,
            }}
          >
            {label.charAt(0).toUpperCase()}
          </div>
        );

        return def ? (
          <Tooltip key={`${inst.id}-${i}`} name={def.name} description={def.effect}>
            {square}
          </Tooltip>
        ) : (
          <div key={`${inst.id}-${i}`}>{square}</div>
        );
      })}
    </div>
  );
});
