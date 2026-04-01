import { memo } from 'react';

interface BlockBadgeProps {
  value: number;
}

/**
 * BlockBadge: small blue-gray badge showing BLK value.
 * Displayed to the left of health bars via absolute positioning.
 */
export const BlockBadge = memo(function BlockBadge({ value }: BlockBadgeProps) {
  return (
    <div
      className="flex flex-col items-center justify-center border"
      style={{
        minWidth: 18,
        height: 14,
        backgroundColor: '#6888A0',
        borderColor: '#6888A0',
        padding: '0 1px',
      }}
      title={`BLK: ${value}`}
    >
      <span className="text-[5px] text-white/80 leading-none">BLK</span>
      <span className="text-[6px] text-white font-bold leading-none">{value}</span>
    </div>
  );
});
