import { memo, useState, useRef, type ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
  /** Position relative to the element. Default 'top'. */
  position?: 'top' | 'bottom';
}

/**
 * Tooltip: wrap any element to show a styled tooltip on hover.
 *
 * Usage:
 *   <Tooltip text="Block: 5">
 *     <BlockBadge value={5} />
 *   </Tooltip>
 */
export const Tooltip = memo(function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), 250);
  };

  const hide = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div
          className="absolute left-1/2 z-50 pointer-events-none whitespace-nowrap bg-stone-900/95 border border-stone-600 px-1.5 py-0.5 font-mono text-stone-200"
          style={{
            fontSize: '9px',
            transform: 'translateX(-50%)',
            ...(position === 'top'
              ? { bottom: '100%', marginBottom: 4 }
              : { top: '100%', marginTop: 4 }),
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
});
