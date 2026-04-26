import { type ReactNode, type CSSProperties, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useGameScale } from '../hooks/useGameScale';

interface Props {
  /** Tailwind class for the dark backdrop, e.g. "bg-black/65". */
  backdropClass?: string;
  /** Backdrop click handler (typically closes the overlay). */
  onBackdropClick?: () => void;
  /** Stack layer; higher values render above other overlays. */
  zIndex?: number;
  /** Inline styles to merge onto the backdrop. */
  style?: CSSProperties;
  /** Optional translucent dim layer between the backdrop and the children
   *  (useful when the backdrop is an opaque background image and you want
   *  to darken just the bg without dimming the popup content). */
  dimAlpha?: number;
  /** Content rendered centered and scaled to match the game UI. */
  children: ReactNode;
}

/**
 * Renders a viewport-filling dark overlay via a portal to document.body.
 * Children are wrapped in a `transform: scale(uiScale)` container so that
 * popup content designed for the 960x540 scaled UI keeps its visual size.
 */
export function FullScreenOverlay({
  backdropClass = 'bg-black/40',
  onBackdropClick,
  zIndex = 100,
  style,
  dimAlpha,
  children,
}: Props) {
  const { scale } = useGameScale();
  if (typeof document === 'undefined') return null;

  const handleClick = onBackdropClick
    ? (e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onBackdropClick();
      }
    : undefined;

  return createPortal(
    <div
      className={`fixed inset-0 ${backdropClass} flex items-center justify-center pointer-events-auto`}
      style={{ zIndex, ...style }}
      onClick={handleClick}
    >
      {dimAlpha !== undefined && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: `rgba(0,0,0,${dimAlpha})` }}
        />
      )}
      <div
        data-tooltip-root
        style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
