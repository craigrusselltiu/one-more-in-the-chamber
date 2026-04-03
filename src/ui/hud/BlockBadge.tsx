import { memo } from 'react';
import { SpriteIcon } from '../components/SpriteIcon';
import { STATUS_FRAMES } from '../../data/spriteConfig';

interface BlockBadgeProps {
  value: number;
}

const OUTLINE = '-1px 0 0 #000, 1px 0 0 #000, 0 -1px 0 #000, 0 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, -2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000';

/**
 * BlockBadge: sprite icon with block value overlaid in the bottom-right corner.
 * No tooltip - block is self-explanatory from the sprite + number.
 */
export const BlockBadge = memo(function BlockBadge({ value }: BlockBadgeProps) {
  return (
    <div className="relative" style={{ width: 16, height: 16 }}>
      <SpriteIcon frame={STATUS_FRAMES.block} scale={1} />
      <span
        className="absolute font-bold font-mono"
        style={{
          bottom: -2,
          right: -2,
          fontSize: '7px',
          color: '#fff',
          lineHeight: 1,
          textShadow: OUTLINE,
        }}
      >
        {value}
      </span>
    </div>
  );
});
