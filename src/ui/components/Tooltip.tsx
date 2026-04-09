import { memo, useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

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
  /** Gap in pixels between trigger and tooltip. Default 8 (top) or 30 (bottom). */
  gap?: number;
  /** Horizontal alignment. Default 'center'. */
  align?: 'center' | 'left';
}

/**
 * Tooltip: wrap any element to show a styled tooltip on hover.
 * Renders via portal to escape stacking contexts (transform, z-index).
 */
export const Tooltip = memo(function Tooltip({ text, content, secondContent, children, position = 'top', gap, align = 'center' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  const tooltipBody = content ?? text;

  // Position the portal tooltip relative to the trigger element
  useEffect(() => {
    if (!visible || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    // Find the scaled viewport container to compute offset
    const viewport = wrapperRef.current.closest('.overflow-hidden') as HTMLElement | null;
    const vRect = viewport?.getBoundingClientRect();
    const scale = vRect ? vRect.width / 960 : 1;

    const x = align === 'left'
      ? (rect.left - (vRect?.left ?? 0)) / scale
      : (rect.left + rect.width / 2 - (vRect?.left ?? 0)) / scale;
    if (position === 'top') {
      const y = (rect.top - (vRect?.top ?? 0)) / scale;
      setPos({ left: x, top: y });
    } else {
      const y = (rect.bottom - (vRect?.top ?? 0)) / scale;
      setPos({ left: x, top: y });
    }
  }, [visible, position]);

  // Clamp tooltip to viewport bounds
  useEffect(() => {
    if (!visible || !tooltipRef.current || !wrapperRef.current) return;
    const tip = tooltipRef.current;
    const viewport = wrapperRef.current.closest('.overflow-hidden') as HTMLElement | null;
    if (!viewport) return;

    const vRect = viewport.getBoundingClientRect();
    const tRect = tip.getBoundingClientRect();
    const scale = vRect.width / 960;

    if (tRect.left < vRect.left) {
      const offset = (vRect.left - tRect.left) / scale;
      tip.style.transform = `translateX(calc(-50% + ${offset}px))`;
    } else if (tRect.right > vRect.right) {
      const offset = (tRect.right - vRect.right) / scale;
      tip.style.transform = `translateX(calc(-50% - ${offset}px))`;
    }
  }, [visible, pos]);

  // Find the portal target (the scaled viewport container)
  const getPortalTarget = (): HTMLElement | null => {
    if (!wrapperRef.current) return null;
    return wrapperRef.current.closest('.overflow-hidden') as HTMLElement | null;
  };

  const portalTarget = visible ? getPortalTarget() : null;

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (tooltipBody || secondContent) && pos && portalTarget && createPortal(
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none flex flex-col items-start gap-1"
          style={{
            zIndex: 9999,
            left: pos.left,
            ...(position === 'top'
              ? { top: pos.top, transform: align === 'left' ? 'translateY(-100%)' : 'translate(-50%, -100%)', marginTop: -4 }
              : { top: pos.top, transform: align === 'left' ? 'none' : 'translateX(-50%)', marginTop: gap ?? 8 }),
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
        </div>,
        portalTarget,
      )}
    </div>
  );
});
