import { memo } from 'react';
import { useRunStore } from '../../store/runStore';
import { ARTIFACTS } from '../../data/artifacts';
import { ARTIFACT_FRAMES } from '../../data/spriteConfig';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { ArtifactTooltipContent } from '../components/ArtifactTooltipContent';
import type { ArtifactInstance, TraitId } from '../../types/game';

const EMPTY_ARTIFACTS: ArtifactInstance[] = [];

/** Primary color for each trait tag. */
const TRAIT_COLORS: Record<TraitId, string> = {
  outlaw: '#D04040',
  sheriff: '#6888A0',
  prospector: '#E0C880',
  sapper: '#D4A030',
  mustang: '#70B0D0',
  gunslinger: '#D06080',
  saloon_keeper: '#D4A870',
  desperado: '#B060D0',
  sniper: '#7090B8',
  dead_man_walking: '#808080',
  tracker: '#C8A040',
  preacher: '#A0C8FF',
  antivenom: '#60A040',
  undertaker: '#606060',
  rattlesnake: '#80C040',
  corrupt: '#8B3A9B',
};

const DEFAULT_COLOR = '#808080';

/**
 * ArtifactBar: left-aligned row of small 14x14 colored squares.
 * Color = first trait tag. Tooltip shows name + effect.
 * Directly under the top bar per SPEC layout.
 */
export const ArtifactBar = memo(function ArtifactBar() {
  const artifacts = useRunStore((s) => s.run?.artifacts ?? EMPTY_ARTIFACTS);

  if (artifacts.length === 0) return null;

  return (
    <div className="absolute z-10 left-0 flex flex-wrap gap-0.5 px-2 py-px pointer-events-auto" style={{ top: 30, maxWidth: '48%' }}>
      {artifacts.map((inst, i) => {
        const def = ARTIFACTS.find((a) => a.id === inst.id);
        const color =
          inst.tags.length > 0
            ? TRAIT_COLORS[inst.tags[0]] ?? DEFAULT_COLOR
            : DEFAULT_COLOR;

        return (
          <Tooltip key={`${inst.id}-${i}`} position="bottom" content={def ? <ArtifactTooltipContent artifact={def} tags={inst.tags} /> : undefined} text={def ? undefined : inst.id}>
            <div style={inst.used ? { filter: 'grayscale(1) brightness(0.55)' } : undefined}>
              {ARTIFACT_FRAMES[inst.id] != null ? (
                <div className="relative" style={{ width: 16, height: 16 }}>
                  <SpriteIcon frame={ARTIFACT_FRAMES[inst.id]} scale={1} />
                  {/* Duplicate rendered through the rarity filter: only the dilated ring is visible. */}
                  <div
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{ filter: `url(#artifact-outline-${def?.rarity ?? 'common'})` }}
                  >
                    <SpriteIcon frame={ARTIFACT_FRAMES[inst.id]} scale={1} />
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
});
