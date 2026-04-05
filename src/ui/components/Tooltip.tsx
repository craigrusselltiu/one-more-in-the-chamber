import { memo, useState, useRef, useEffect, type ReactNode } from 'react';

interface TooltipProps {
  /** Simple string tooltip text. */
  text?: string;
  /** Rich tooltip content (ReactNode). Takes precedence over text. */
  content?: ReactNode;
  /** Second tooltip rendered below the first (only when position='bottom'). */
  secondContent?: ReactNode;
  children: ReactNode;
  /** Position relative to the element. Default 'top'. */
  position?: 'top' | 'bottom';
}

/**
 * Tooltip: wrap any element to show a styled tooltip on hover.
 * Supports both simple text and rich ReactNode content.
 *
 * Usage:
 *   <Tooltip text="Block: 5"><BlockBadge /></Tooltip>
 *   <Tooltip content={<div>Rich <b>content</b></div>}><Icon /></Tooltip>
 */
export const Tooltip = memo(function Tooltip({ text, content, secondContent, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const show = () => {
    clearTimeout(timeoutRef.current);
    setVisible(true);
  };

  const hide = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const tooltipBody = content ?? text;

  // Clamp tooltip position to stay within the scaled viewport (960x540)
  useEffect(() => {
    if (!visible || !tooltipRef.current || !wrapperRef.current) return;
    const tip = tooltipRef.current;
    const wrapper = wrapperRef.current;

    const viewport = wrapper.closest('.overflow-hidden') as HTMLElement | null;
    if (!viewport) return;

    const vRect = viewport.getBoundingClientRect();
    const tRect = tip.getBoundingClientRect();

    if (tRect.left < vRect.left) {
      tip.style.left = '0';
      tip.style.transform = 'none';
    } else if (tRect.right > vRect.right) {
      tip.style.left = 'auto';
      tip.style.right = '0';
      tip.style.transform = 'none';
    }
  }, [visible, text, content, secondContent]);

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (tooltipBody || secondContent) && (
        <div
          ref={tooltipRef}
          className="absolute left-1/2 z-50 pointer-events-none flex flex-col items-start gap-1"
          style={{
            transform: 'translateX(-50%)',
            ...(position === 'top'
              ? { bottom: '100%', marginBottom: 4 }
              : { top: '100%', marginTop: 4 }),
          }}
        >
          {tooltipBody && (
            <div
              className={`bg-stone-900/95 border border-stone-600 px-1.5 py-0.5 text-stone-200 ${content ? '' : 'whitespace-nowrap'}`}
              style={{ fontSize: '9px' }}
            >
              {tooltipBody}
            </div>
          )}
          {secondContent && (
            <div
              className="bg-stone-900/95 border border-stone-600 px-1.5 py-0.5 text-stone-200 whitespace-nowrap"
              style={{ fontSize: '9px' }}
            >
              {secondContent}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
