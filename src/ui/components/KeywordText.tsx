import { memo, type ReactNode } from 'react';
import { KEYWORDS } from '../../data/keywords';

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
    <div className="whitespace-nowrap" style={{ fontSize: '8px', lineHeight: 1.3 }}>
      <span style={{ color, fontWeight: 'bold' }}>{name}</span>
      <span className="text-stone-400"> - {description}</span>
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
