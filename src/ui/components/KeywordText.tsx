import { memo, type ReactNode } from 'react';
import { KEYWORDS } from '../../data/keywords';
import { TILE_DEFINITIONS } from '../../data/tiles';
import { Tooltip } from './Tooltip';
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
      <Tooltip key={match.index} content={
        <KeywordLine name={keyword} color={kw.color} description={kw.description} />
      } position="top">
        <span style={{ color: kw.color, fontWeight: 'bold' }}>
          {keyword}
        </span>
      </Tooltip>,
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
    <div style={{ fontSize: '8px', lineHeight: 1.3, textAlign: 'left' }}>
      {description.includes('\n') ? (
        <>
          {description.split('\n').map((line, i) => (
            <div key={i} className="whitespace-nowrap">
              {i === 0 && <span style={{ color, fontWeight: 'bold' }}>{name}</span>}
              <span className="text-stone-400">{i === 0 ? ` - ${line}` : line}</span>
            </div>
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

const O = ({ children }: { children: ReactNode }) => (
  <span className="upgrade-breathe" style={{ fontWeight: 'bold' }}>{children}</span>
);

/** Show "oldVal → newVal" with arrow and new value in orange. */
function arrowUpgrade(oldVal: number, newVal: number): ReactNode[] {
  return [<span key="arrow">{oldVal} <O>{'\u2192'} {newVal}</O></span>];
}

/** Flat upgrade preview: show "plus X → X+Y" transition in orange. */
function flatBonusPreview(currentLevel: number, upgradeValue: number): ReactNode[] {
  const oldBonus = currentLevel * upgradeValue;
  const newBonus = (currentLevel + 1) * upgradeValue;
  if (currentLevel <= 0) {
    // Going from no bonus to first bonus
    return [<O key="fb"> plus {newBonus}</O>];
  }
  return [<span key="fb"> plus {oldBonus} <O>{'\u2192'} {newBonus}</O></span>];
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
      const destroyCount = 1 + upgradeLevel * 1;
      const tileWord = destroyCount > 1 ? 'tiles' : 'tile';
      return [...seg('Deal 1 damage per tile. Destroy ', false), ...seg(`${destroyCount}`, upgraded), ...seg(` random other ${tileWord} per 3-match, plus 1 per extra tile.`, false)];
    }

    // --- Rattler: upgrade splits between damage and venom ---
    case 'rattler':
      return [
        ...seg('Deal 2 damage per tile', false),
        ...flatBonus(upgradeLevel, uv),
        ...seg(' and apply 1 Poison', false),
        ...flatBonus(upgradeLevel, uv),
        ...seg('. Pierces block.', false),
      ];

    // --- Flat upgrade tiles: "plus X" appended ---
    case 'bullet':
      return [...seg('Deal 2 damage per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];
    case 'iron':
      return [...seg('Gain 2 block per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];
    case 'gold':
      return [...seg('Earn 1 gold per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];
    case 'bounty': {
      const bv = 1 + upgradeLevel;
      return [
        ...seg('Apply ', false),
        ...seg(`${bv}`, upgradeLevel > 0),
        ...seg(' Bounty stack per tile.', false),
      ];
    }
    case 'stampede':
      return [...seg('Deal 1 damage to ALL enemies per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];
    case 'battery': {
      const bv = 1 + upgradeLevel * uv;
      return [...seg('Gain ', false), ...seg(`${bv}`, upgraded), ...seg(' ability charge per 3-match, plus 1 per extra tile.', false)];
    }
    case 'waste':
      return [...seg('Apply 1 Poison per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];
    case 'prairie_fire':
      return [...seg('Deal 2 damage per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('. After each turn, each tile has a 1 in 4 chance to convert 1 adjacent or diagonal tile to Prairie Fire.', false)];
    case 'chain':
      return [...seg('Deal 1 damage per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('. Each Chain match adds +1 damage to ALL Chain tiles for this combat.', false)];
    case 'whiskey': {
      const bv = 2 + upgradeLevel * uv;
      return [...seg('Heals ', false), ...seg(`${bv}`, upgraded), ...seg(' HP per 3-match, plus 1 per extra tile.', false)];
    }
    case 'ace':
      return [...seg('Gain 1 stack of Ace per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];
    case 'horseshoe':
      return [...seg('Gain 1 stack of Lucky per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('.', false)];
    case 'tombstone':
      return [...seg('Deal 2 damage per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('. Deals double damage when target is below 30% HP.', false)];
    case 'saloon': {
      const bv = 1 + upgradeLevel * uv;
      return [...seg('Heal ', false), ...seg(`${bv}`, upgraded), ...seg(' HP per 3-match, plus 1 per extra tile. Generate the base resources of adjacent tiles.', false)];
    }
    case 'shank':
      return [...seg('Deal 1 damage per tile', false), ...flatBonus(upgradeLevel, uv), ...seg(' and apply 1 Vulnerable.', false)];
    case 'cavalry':
      return [...seg('1 damage per tile', false), ...flatBonus(upgradeLevel, uv), ...seg('. If 4+ matched, +1 swap this turn (max 1 per turn).', false)];
    case 'duel':
      return [...seg('Deal 4 damage per tile. On exactly 4-match, deal the damage twice.', false)];
    case 'mirage': {
      const baseText = "At the start of combat, transforms into a random tile you don't own for the rest of combat.";
      if (upgradeLevel <= 0) return [...seg(baseText, false)];
      const levelWord = upgradeLevel === 1 ? 'level' : 'levels';
      return [
        ...seg(baseText + ' Transformed tile gains ', false),
        ...seg(`+${upgradeLevel}`, true),
        ...seg(` ${levelWord}.`, false),
      ];
    }
    case 'boulder': {
      const v = def.baseValue + bonus;
      return [
        ...seg('Deal ', false),
        ...seg(`${v}`, upgraded),
        ...seg(' damage per tile, plus 1 damage per block.', false),
      ];
    }

    // --- No upgrade / special ---
    default:
      return colorizeKeywords(def.description);
  }
}

/**
 * Build a tile upgrade preview: shows the description at the next level
 * with orange highlights on what changes (arrow transitions or new bonuses).
 */
export function buildUpgradePreview(type: TileType, currentLevel: number): ReactNode[] {
  const def = TILE_DEFINITIONS[type];
  if (!def) return [];
  const uv = def.upgradeValue;
  const oldVal = def.baseValue + currentLevel * uv;
  const newVal = def.baseValue + (currentLevel + 1) * uv;

  switch (type) {
    // --- Per-tile upgrade: show value arrow ---
    case 'buckshot':
      return [...seg('Each tile deals ', false), ...arrowUpgrade(oldVal, newVal), ...seg(' damage to a random enemy.', false)];
    case 'fifty_cal':
      return [...seg('Deal ', false), ...arrowUpgrade(oldVal, newVal), ...seg(' damage per tile. 5-match deals double damage.', false)];
    case 'barricade':
      return [...seg('Gain ', false), ...arrowUpgrade(oldVal, newVal), ...seg(' block per tile and 1 Barricade.', false)];
    case 'chip':
      return [...seg('50% chance to deal ', false), ...arrowUpgrade(oldVal, newVal), ...seg(' damage per tile; 50% chance to deal 0.', false)];
    case 'ricochet': {
      const oldDestroy = 1 + currentLevel;
      const newDestroy = 1 + currentLevel + 1;
      return [...seg('Deal 1 damage per tile. Destroy ', false), ...arrowUpgrade(oldDestroy, newDestroy), ...seg(' random other tiles per 3-match, plus 1 per extra tile.', false)];
    }
    case 'boulder':
      return [...seg('Deal ', false), ...arrowUpgrade(oldVal, newVal), ...seg(' damage per tile, plus 1 damage per block.', false)];

    // --- Rattler: splits between damage and venom ---
    case 'rattler':
      return [
        ...seg('Deal 2 damage per tile', false),
        ...flatBonusPreview(currentLevel, uv),
        ...seg(' and apply 1 Poison', false),
        ...flatBonusPreview(currentLevel, uv),
        ...seg('. Pierces block.', false),
      ];

    // --- Flat upgrade tiles: show plus bonus transition ---
    case 'bullet':
      return [...seg('Deal 2 damage per tile', false), ...flatBonusPreview(currentLevel, uv), ...seg('.', false)];
    case 'iron':
      return [...seg('Gain 2 block per tile', false), ...flatBonusPreview(currentLevel, uv), ...seg('.', false)];
    case 'gold':
      return [...seg('Earn 1 gold per tile', false), ...flatBonusPreview(currentLevel, uv), ...seg('.', false)];
    case 'bounty': {
      const oldBv = 1 + currentLevel;
      const newBv = 1 + currentLevel + 1;
      return [...seg('Apply ', false), ...arrowUpgrade(oldBv, newBv), ...seg(' Bounty stack per tile.', false)];
    }
    case 'stampede':
      return [...seg('Deal 1 damage to ALL enemies per tile', false), ...flatBonusPreview(currentLevel, uv), ...seg('.', false)];
    case 'battery': {
      const oldBv = 1 + currentLevel * uv;
      const newBv = 1 + (currentLevel + 1) * uv;
      return [...seg('Gain ', false), ...arrowUpgrade(oldBv, newBv), ...seg(' ability charge per 3-match, plus 1 per extra tile.', false)];
    }
    case 'waste':
      return [...seg('Apply 1 Poison per tile', false), ...flatBonusPreview(currentLevel, uv), ...seg('.', false)];
    case 'prairie_fire':
      return [...seg('Deal 2 damage per tile', false), ...flatBonusPreview(currentLevel, uv), ...seg('. After each turn, each tile has a 1 in 4 chance to convert 1 adjacent or diagonal tile to Prairie Fire.', false)];
    case 'chain':
      return [...seg('Deal 1 damage per tile', false), ...flatBonusPreview(currentLevel, uv), ...seg('. Each Chain match adds +1 damage to ALL Chain tiles for this combat.', false)];
    case 'whiskey': {
      const oldBv = 2 + currentLevel * uv;
      const newBv = 2 + (currentLevel + 1) * uv;
      return [...seg('Heals ', false), ...arrowUpgrade(oldBv, newBv), ...seg(' HP per 3-match, plus 1 per extra tile.', false)];
    }
    case 'ace':
      return [...seg('Gain 1 stack of Ace per tile', false), ...flatBonusPreview(currentLevel, uv), ...seg('.', false)];
    case 'horseshoe':
      return [...seg('Gain 1 stack of Lucky per tile', false), ...flatBonusPreview(currentLevel, uv), ...seg('.', false)];
    case 'tombstone':
      return [...seg('Deal 2 damage per tile', false), ...flatBonusPreview(currentLevel, uv), ...seg('. Deals double damage when target is below 30% HP.', false)];
    case 'saloon': {
      const oldBv = 1 + currentLevel * uv;
      const newBv = 1 + (currentLevel + 1) * uv;
      return [...seg('Heal ', false), ...arrowUpgrade(oldBv, newBv), ...seg(' HP per 3-match, plus 1 per extra tile. Generate the base resources of adjacent tiles.', false)];
    }
    case 'shank':
      return [...seg('Deal 1 damage per tile', false), ...flatBonusPreview(currentLevel, uv), ...seg(' and apply 1 Vulnerable.', false)];
    case 'cavalry':
      return [...seg('1 damage per tile', false), ...flatBonusPreview(currentLevel, uv), ...seg('. If 4+ matched, +1 swap this turn (max 1 per turn).', false)];
    case 'duel':
      return [...seg('Deal 4 damage per tile', false), ...flatBonusPreview(currentLevel, uv), ...seg(' but ONLY if exactly 4 matched. 3 or 5+ matches deal no damage.', false)];
    case 'mirage':
      return [
        ...seg("At the start of combat, transforms into a random tile you don't own for the rest of combat. Transformed tile gains ", false),
        ...arrowUpgrade(currentLevel, currentLevel + 1),
        ...seg(' levels.', false),
      ];

    default:
      return colorizeKeywords(def.description);
  }
}
