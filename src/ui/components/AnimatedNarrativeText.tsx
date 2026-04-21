import type { ReactNode } from 'react';

function renderNarrativeParagraph(text: string, baseKey: number): ReactNode[] {
  const pattern = /\{\{(green|red|blue|yellow):([^}]+)\}\}/g;
  const parts: ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = baseKey;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
    const color = match[1] as 'green' | 'red' | 'blue' | 'yellow';
    const content = match[2];

    if (color === 'green' || color === 'yellow') {
      const colorClass = color === 'green' ? 'text-green-400' : 'text-yellow-400';
      parts.push(
        <span key={key++} className={`event-wiggle ${colorClass}`}>{content}</span>,
      );
    } else if (color === 'blue') {
      parts.push(
        <span key={key++} className="event-breathe text-sky-400">{content}</span>,
      );
    } else {
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

      parts.push(
        <span key={key++} className="text-red-400">
          {tokens}
        </span>,
      );
    }

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
