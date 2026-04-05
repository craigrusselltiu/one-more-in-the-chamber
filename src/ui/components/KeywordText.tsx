import { memo, type ReactNode } from 'react';
import { KEYWORDS } from '../../data/keywords';
import { TILE_DEFINITIONS } from '../../data/tiles';
import type { TileType } from '../../types/game';

const KEYWORD_NAMES = Object.keys(KEYWORDS);
const KEYWORD_REGEX = new RegExp(`\\b(${KEYWORD_NAMES.join('|')})\\b`, 'g');

/**
 * Render text with buff/debuff keywords colored.
 * Returns an array of ReactNodes (strings and colored spans).
 */
export function colorizeKeywords(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(KEYWORD_REGEX.source, 'g');

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const keyword = match[1];
    const kw = KEYWORDS[keyword];
    parts.push(
      <span key={match.index} style={{ color: kw.color, fontWeight: 'bold' }}>
        {keyword}
      </span>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * Get keyword sub-tooltips for any keywords found in the text.
 * Returns unique keyword entries referenced in the description.
 */
export function getReferencedKeywords(text: string): { name: string; color: string; description: string }[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(KEYWORD_REGEX.source, 'g');

  while ((match = regex.exec(text)) !== null) {
    found.add(match[1]);
  }

  return Array.from(found).map((name) => ({
    name,
    color: KEYWORDS[name].color,
    description: KEYWORDS[name].description,
  }));
}

/**
 * KeywordText: renders text with colored buff/debuff keywords.
 */
export const KeywordText = memo(function KeywordText({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={className} style={style}>
      {colorizeKeywords(text)}
    </span>
  );
});

/**
 * Render a single keyword line: colored name + description.
 * Used by both KeywordSubTooltips and StatusEffects.
 */
export function KeywordLine({ name, color, description }: { name: string; color: string; description: string }) {
  return (
    <div style={{ fontSize: '8px', lineHeight: 1.3 }}>
      {description.includes('\n') ? (
        <>
          <span style={{ color, fontWeight: 'bold' }}>{name}</span>
          {description.split('\n').map((line, i) => (
            <div key={i} className="text-stone-400 whitespace-nowrap">{i === 0 ? ` - ${line}` : line}</div>
          ))}
        </>
      ) : (
        <span className="whitespace-nowrap">
          <span style={{ color, fontWeight: 'bold' }}>{name}</span>
          <span className="text-stone-400"> - {description}</span>
        </span>
      )}
    </div>
  );
}

/**
 * KeywordSubTooltips: renders sub-tooltip entries for referenced keywords.
 */
export const KeywordSubTooltips = memo(function KeywordSubTooltips({
  text,
}: {
  text: string;
}) {
  const keywords = getReferencedKeywords(text);
  if (keywords.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5">
      {keywords.map((kw) => (
        <KeywordLine key={kw.name} name={kw.name} color={kw.color} description={kw.description} />
      ))}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Dynamic tile descriptions with green-highlighted upgrade values
// ---------------------------------------------------------------------------

const G = ({ children }: { children: ReactNode }) => (
  <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{children}</span>
);

/** Helper: colorize a text segment, wrapping it in green if upgraded. */
function seg(text: string, green: boolean): ReactNode[] {
  const nodes = colorizeKeywords(text);
  if (!green) return nodes;
  return [<G key="g">{nodes}</G>];
}

/** Flat upgrade: appends " plus X" in green when upgraded. */
function flatBonus(upgradeLevel: number, upgradeValue: number): ReactNode[] {
  if (upgradeLevel <= 0) return [];
  return seg(` plus ${upgradeLevel * upgradeValue}`, true);
}

/**
 * Build a tile's description with upgrade values highlighted in green.
 * Returns ReactNode[] suitable for rendering in a tooltip.
 */
export function buildTileDescription(type: TileType, upgradeLevel: number): ReactNode[] {
  const def = TILE_DEFINITIONS[type];
  if (!def) return [];
  const uv = def.upgradeValue;
  const bonus = upgradeLevel * uv;
  const upgraded = upgradeLevel > 0;

  switch (type) {
    // --- Per-tile upgrade: base value in description changes ---
    case 'buckshot': {
      const v = def.baseValue + bonus;
      return [
        ...seg('Each tile deals ', false),
        ...seg(`${v}`, upgraded),
        ...seg(' damage to a random enemy.', false),
      ];
    }
    case 'fifty_cal': {
      const v = def.baseValue + bonus;
      return [
        ...seg('Deal ', false),
        ...seg(`${v}`, upgraded),
        ...seg(' damage per tile. 5-match deals double damage.', false),
      ];
    }
    case 'barricade': {
      const v = def.baseValue + bonus;
      return [
        ...seg('Gain ', false),
        ...seg(`${v}`, upgraded),
        ...seg(' block per tile and 1 Barricade.', false),
      ];
    }
    case 'chip': {
      const v = def.baseValue + bonus;
      return [
        ...seg('50% chance to deal ', false),
        ...seg(`${v}`, upgraded),
        ...seg(' damage per tile; 50% chance to deal 0.', false),
      ];
    }

    // --- Ricochet: upgrade changes destroyed tile count ---
    case 'ricochet': {
      const v = 1 + upgradeLevel;
      return [
        ...seg('Deal 1 damage and destroy ', false),
        ...seg(`${v}`, upgraded),
        ...seg(' random other tile per Ricochet tile.', false),
      ];
    }

    // --- Rattler: upgrade splits between damage and venom ---
    case 'rattler':
      return [
        ...seg('Deal 2 damage per tile', false),
        ...flatBonus(upgradeLevel, uv),
        ...seg(' and apply 1 Venom', false),
        ...flatBonus(upgradeLevel, uv),
        ...seg('. Pierces block.', false),
      ];

    // --- Flat upgrade tiles: "plus X" appended ---
    case 'bullet':
      return [...seg('Deal 2 damage per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];
    case 'iron':
      return [...seg('Gain 2 block per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];
    case 'gold':
      return [...seg('Earn 2 gold per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];
    case 'bounty':
      return [...seg('Apply 2 Bounty stacks per 3-match', false), ...flatBonus(upgradeLevel, uv), ...seg(', plus 1 per extra tile.', false)];
    case 'stampede':
      return [...seg('Deal 1 damage to ALL enemies per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];
    case 'battery':
      return [...seg('Gain 1 ability charge per 3-match', false), ...flatBonus(upgradeLevel, uv), ...seg(', plus 1 per extra tile.', false)];
    case 'venom':
      return [...seg('Apply 1 Venom per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];
    case 'prairie_fire':
      return [...seg('Deal 2 damage per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('. 50% chance to convert 1 adjacent tile to Ember.', false)];
    case 'chain':
      return [...seg('Deal 1 damage per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('. Each Chain match adds +1 damage to ALL Chain tiles for this combat.', false)];
    case 'whiskey':
      return [...seg('Heals 1 HP per 3-match', false), ...flatBonus(upgradeLevel, uv), ...seg(', plus 1 per extra tile.', false)];
    case 'ace':
      return [...seg('Gain 1 stack of Ace per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];
    case 'horseshoe':
      return [...seg('Gain 1 stack of Lucky per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];
    case 'tombstone':
      return [...seg('Deal 2 damage per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('. Deals double damage when target is below 30% HP.', false)];
    case 'saloon':
      return [...seg('Heal 1 HP per 3-match', false), ...flatBonus(upgradeLevel, uv), ...seg(', plus 1 per extra tile. Generate the resources of adjacent tiles.', false)];
    case 'shank':
      return [...seg('Deal 1 damage per tile', false), ...flatBonus(upgradeLevel, uv), ...seg(' and apply 1 Vulnerable.', false)];
    case 'cavalry':
      return [...seg('1 damage per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('. If 4+ matched, +1 swap this turn (max 1 per turn).', false)];
    case 'duel':
      return [...seg('Deal 4 damage per tile', false), ...flatBonus(upgradeLevel, uv), ...seg(' but ONLY if exactly 4 matched. 3 or 5+ matches deal no damage.', false)];
    case 'boulder':
      return [...seg('Deal 1 damage per block', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];

    // --- No upgrade / special ---
    default:
      return colorizeKeywords(def.description);
  }
}
