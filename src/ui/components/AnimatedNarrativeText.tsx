import type { ReactNode } from 'react';

type NarrativeColor = 'green' | 'red' | 'blue' | 'yellow' | 'silver' | 'dark_grey' | 'teal' | 'brown' | 'orange' | 'dark_purple';
type NarrativeMotion = 'wiggle' | 'breathe' | 'jump' | 'shimmer';

const COLOR_STYLE: Record<NarrativeColor, string> = {
  green: '#4ade80',
  red: '#f87171',
  blue: '#38bdf8',
  yellow: '#facc15',
  silver: '#9a9a9a',
  dark_grey: '#555555',
  teal: '#2dd4bf',
  brown: '#a16207',
  orange: '#fb923c',
  dark_purple: '#7c3aed',
};

function normalizeColor(value: string): NarrativeColor {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized in COLOR_STYLE) return normalized as NarrativeColor;
  return 'yellow';
}

function defaultMotionForColor(color: NarrativeColor): NarrativeMotion {
  if (color === 'blue') return 'breathe';
  if (color === 'red') return 'jump';
  return 'wiggle';
}

function renderJumpText(content: string, color: NarrativeColor, key: number): ReactNode {
  const tokens: ReactNode[] = [];
  const segments = content.split(/(\s+)/);
  let charCounter = 0;

  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
    const segment = segments[segmentIndex];
    if (/^\s+$/.test(segment)) {
      tokens.push(segment);
      continue;
    }
    if (segment.length === 0) continue;
    const localStart = charCounter;
    const chars = segment.split('').map((character, index) => (
      <span
        key={`${segmentIndex}-${index}`}
        className="event-char-jump"
        style={{ animationDelay: `${(localStart + index) * 0.08}s` }}
      >
        {character}
      </span>
    ));
    charCounter += segment.length;
    tokens.push(
      <span key={`word-${segmentIndex}`} style={{ whiteSpace: 'nowrap' }}>
        {chars}
      </span>,
    );
  }

  return (
    <span key={key} style={{ color: COLOR_STYLE[color] }}>
      {tokens}
    </span>
  );
}

function renderEffectText(content: string, color: NarrativeColor, motion: NarrativeMotion, key: number): ReactNode {
  if (motion === 'jump') return renderJumpText(content, color, key);
  if (motion === 'shimmer') {
    return (
      <span key={key} className="event-shimmer-wrap">
        <span className="event-shimmer-outline" aria-hidden="true">{content}</span>
        <span className={`event-shimmer event-shimmer-${color}`}>{content}</span>
      </span>
    );
  }
  return (
    <span
      key={key}
      className={motion === 'breathe' ? 'event-breathe' : 'event-wiggle'}
      style={{ color: COLOR_STYLE[color] }}
    >
      {content}
    </span>
  );
}

function renderNarrativeParagraph(text: string, baseKey: number): ReactNode[] {
  const pattern = /\{\{([a-zA-Z_ ]+):(?:(wiggle|breathe|jump|shimmer):)?([^}]+)\}\}/g;
  const parts: ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = baseKey;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
    const color = normalizeColor(match[1]);
    const motion = (match[2] as NarrativeMotion | undefined) ?? defaultMotionForColor(color);
    const content = match[3];
    parts.push(renderEffectText(content, color, motion, key++));

    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

export function renderNarrativeText(text: string, paragraphSpacing = 16): ReactNode[] {
  const paragraphs = text.split('\n');
  return paragraphs.map((paragraph, index) => (
    <span
      key={index}
      style={{
        display: 'block',
        marginBottom: index < paragraphs.length - 1 ? paragraphSpacing : 0,
      }}
    >
      {renderNarrativeParagraph(paragraph, index * 1000)}
    </span>
  ));
}
