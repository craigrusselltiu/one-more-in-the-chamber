import type { TraitId } from '../../types/game';
import type { ArtifactDefinition } from '../../data/artifacts';
import { RARITY_BREATHE_CLASS } from '../../data/artifacts';
import { colorizeKeywords } from './KeywordText';
import { KEYWORDS } from '../../data/keywords';

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

const TRAIT_NAMES: Record<TraitId, string> = {
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
  corrupt: 'Corrupt',
};

const KEYWORD_NAMES = Object.keys(KEYWORDS);
const KEYWORD_REGEX = new RegExp(`\\b(${KEYWORD_NAMES.join('|')})\\b`, 'g');

function extractKeywords(text: string): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(KEYWORD_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) found.add(match[1]);
  return [...found];
}

export function ArtifactTooltipContent({
  artifact,
  tags = artifact.tags,
  locked = false,
}: {
  artifact: ArtifactDefinition;
  tags?: TraitId[];
  locked?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="whitespace-nowrap" style={{ fontSize: '10px' }}>
        <span className={RARITY_BREATHE_CLASS[artifact.rarity ?? 'common']}>{artifact.name}</span>
        {tags.length > 0 && (
          <span className="font-normal ml-1">
            ({tags.map((tag, index) => (
              <span key={tag}>
                {index > 0 && <span className="text-stone-500">, </span>}
                <span style={{ color: TRAIT_COLORS[tag] ?? '#a8a29e' }}>{TRAIT_NAMES[tag] ?? tag}</span>
              </span>
            ))})
          </span>
        )}
      </div>
      <div className="text-stone-200 whitespace-nowrap" style={{ fontSize: '9px' }}>
        {colorizeKeywords(artifact.effect)}
      </div>
      {artifact.description && (
        <div className="text-stone-500 italic whitespace-nowrap" style={{ fontSize: '8px' }}>
          "{artifact.description}"
        </div>
      )}
      {locked && (
        <div className="whitespace-nowrap text-amber-400" style={{ fontSize: '8px', fontWeight: 'bold' }}>
          Locked -- unlock in the Reputation Shop
        </div>
      )}
      {(() => {
        const keywords = extractKeywords(artifact.effect);
        if (keywords.length === 0) return null;
        return (
          <div className="flex flex-col gap-px mt-0.5 pt-0.5" style={{ borderTop: '1px solid #44403c' }}>
            {keywords.map((keyword) => (
              <div key={keyword} className="whitespace-nowrap" style={{ fontSize: '8px' }}>
                <span style={{ color: KEYWORDS[keyword].color, fontWeight: 'bold' }}>{keyword}</span>
                <span className="text-stone-400"> - {KEYWORDS[keyword].description}</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
