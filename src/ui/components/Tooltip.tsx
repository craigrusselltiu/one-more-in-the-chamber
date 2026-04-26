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

  // Effective position can flip from the requested one when the tooltip would
  // overflow the viewport vertically. Reset to the prop value whenever the
  // tooltip hides so the next show starts fresh.
  const [effectivePosition, setEffectivePosition] = useState<'top' | 'bottom'>(position);
  const show = useCallback(() => {
    setEffectivePosition(position);
    setVisible(true);
  }, [position]);
  const hide = useCallback(() => setVisible(false), []);

  const tooltipBody = content ?? text;

  const getPortalTarget = useCallback((): HTMLElement | null => {
    if (!wrapperRef.current) return null;
    return (wrapperRef.current.closest('[data-tooltip-root]') as HTMLElement | null)
      ?? (wrapperRef.current.closest('.overflow-hidden') as HTMLElement | null);
  }, []);

  // Position the portal tooltip and clamp to viewport bounds
  useEffect(() => {
    if (!visible || !wrapperRef.current) return;
    const viewport = getPortalTarget();
    if (!viewport) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const vRect = viewport?.getBoundingClientRect();
    // Actual scale = painted-CSS-width / unscaled-DOM-width. Works regardless
    // of the host container's design width (was hardcoded to 960 before).
    const scale = vRect && viewport.offsetWidth > 0
      ? vRect.width / viewport.offsetWidth
      : 1;

    const x = align === 'left'
      ? (rect.left - (vRect?.left ?? 0)) / scale
      : (rect.left + rect.width / 2 - (vRect?.left ?? 0)) / scale;
    const y = effectivePosition === 'top'
      ? (rect.top - (vRect?.top ?? 0)) / scale
      : (rect.bottom - (vRect?.top ?? 0)) / scale;
    setPos({ left: x, top: y });

    // Defer clamp to next frame so the tooltip has rendered at the new position
    requestAnimationFrame(() => {
      if (!tooltipRef.current || !viewport) return;
      const tip = tooltipRef.current;
      // Reset any previous clamp overrides
      tip.style.right = '';

      const vr = viewport.getBoundingClientRect();
      const tr = tip.getBoundingClientRect();
      const margin = 6;

      if (tr.left < vr.left) {
        tip.style.left = `${margin}px`;
        tip.style.transform = effectivePosition === 'top' ? 'translateY(-100%)' : 'none';
      } else if (tr.right > vr.right) {
        tip.style.left = 'auto';
        tip.style.right = `${margin}px`;
        tip.style.transform = effectivePosition === 'top' ? 'translateY(-100%)' : 'none';
      }

      // Vertical auto-flip: check against the actual window, not the host
      // container. A short positioning container (e.g. the viewport-wide top
      // bar) would otherwise oscillate -- tooltip overflows container bottom,
      // flips up, then overflows container top, flips back down, repeat.
      const winBottom = window.innerHeight;
      const overflowsBottom = tr.bottom > winBottom;
      const overflowsTop = tr.top < 0;
      if (effectivePosition === 'bottom' && overflowsBottom && !overflowsTop) {
        setEffectivePosition('top');
      } else if (effectivePosition === 'top' && overflowsTop && !overflowsBottom) {
        setEffectivePosition('bottom');
      }
    });
  }, [visible, effectivePosition, align, getPortalTarget]);

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
            ...(effectivePosition === 'top'
              ? { top: pos.top, transform: align === 'left' ? 'translateY(-100%)' : 'translate(-50%, -100%)', marginTop: -4 }
              : { top: pos.top, transform: align === 'left' ? 'none' : 'translateX(-50%)', marginTop: gap ?? 8 }),
          }}
        >
          {tooltipBody && (
            <div
              className={`bg-stone-900/95 px-1.5 py-0.5 text-stone-200 ${content ? '' : 'whitespace-nowrap'}`}
              style={{ fontSize: '9px' }}
            >
              {tooltipBody}
            </div>
          )}
          {secondContent && (
            <div
              className="bg-stone-900/95 px-1.5 py-0.5 text-stone-200 whitespace-nowrap"
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
