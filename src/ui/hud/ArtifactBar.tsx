import { memo } from 'react';
import { useRunStore } from '../../store/runStore';
import { ARTIFACTS, RARITY_BREATHE_CLASS } from '../../data/artifacts';
import { ARTIFACT_FRAMES } from '../../data/spriteConfig';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { colorizeKeywords } from '../components/KeywordText';
import type { TraitId } from '../../types/game';

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
};

const TRAIT_NAMES: Record<string, string> = {
  outlaw: 'Outlaw',
  sheriff: 'Sheriff',
  prospector: 'Prospector',
  sapper: 'Sapper',
  mustang: 'Mustang',
  gunslinger: 'Gunslinger',
  saloon_keeper: 'Saloon Keeper',
  desperado: 'Desperado',
  sniper: 'Sniper',
  dead_man_walking: 'Dead Man Walking',
  tracker: 'Tracker',
  preacher: 'Preacher',
  antivenom: 'Antivenom',
  undertaker: 'Undertaker',
  rattlesnake: 'Rattlesnake',
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
    <div className="absolute z-10 left-0 flex flex-wrap gap-1 px-2 py-px pointer-events-auto" style={{ top: 30, maxWidth: '48%' }}>
      {artifacts.map((inst, i) => {
        const def = ARTIFACTS.find((a) => a.id === inst.id);
        const color =
          inst.tags.length > 0
            ? TRAIT_COLORS[inst.tags[0]] ?? DEFAULT_COLOR
            : DEFAULT_COLOR;

        return (
          <Tooltip key={`${inst.id}-${i}`} position="bottom" content={def ? (
            <div className="flex flex-col gap-0.5">
              <div className="whitespace-nowrap" style={{ fontSize: '10px' }}>
                <span className={RARITY_BREATHE_CLASS[def.rarity ?? 'common']}>{def.name}</span>
                {inst.tags.length > 0 && (
                  <span className="font-normal ml-1">
                    ({inst.tags.map((t, ti) => (
                      <span key={t}>
                        {ti > 0 && <span className="text-stone-500">, </span>}
                        <span style={{ color: TRAIT_COLORS[t] ?? '#a8a29e' }}>{TRAIT_NAMES[t] ?? t}</span>
                      </span>
                    ))})
                  </span>
                )}
              </div>
              <div className="text-stone-200 whitespace-nowrap" style={{ fontSize: '9px' }}>{colorizeKeywords(def.effect)}</div>
              {def.description && (
                <div className="text-stone-500 italic whitespace-nowrap" style={{ fontSize: '8px' }}>"{def.description}"</div>
              )}
            </div>
          ) : undefined} text={def ? undefined : inst.id}>
            {ARTIFACT_FRAMES[inst.id] != null ? (
              <SpriteIcon frame={ARTIFACT_FRAMES[inst.id]} scale={1} />
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
          </Tooltip>
        );
      })}
    </div>
  );
});
