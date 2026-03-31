import type { ReactNode } from 'react';

interface TooltipProps {
  name: string;
  description: string;
  children: ReactNode;
}

/**
 * Tooltip: wraps any element and shows a styled name + description tooltip on hover.
 * Uses CSS group-hover so there are no re-renders.
 */
export function Tooltip({ name, description, children }: TooltipProps) {
  return (
    <div className="group relative">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 pointer-events-none hidden group-hover:block">
        <div
          className="border border-stone-600 px-1.5 py-1 text-left whitespace-nowrap"
          style={{ backgroundColor: '#111' }}
        >
          <div className="text-stone-200 font-mono font-bold text-[8px]">{name}</div>
          <div className="text-stone-400 font-mono text-[7px]">{description}</div>
        </div>
      </div>
    </div>
  );
}
