import { memo } from 'react';
import { SpriteIcon } from '../components/SpriteIcon';
import { STATUS_FRAMES } from '../../data/spriteConfig';

interface BlockBadgeProps {
  value: number;
}

const OUTLINE_STYLE: React.CSSProperties = {
  WebkitTextStroke: '2px #000',
  paintOrder: 'stroke fill',
};

/**
 * BlockBadge: sprite icon with block value overlaid in the bottom-right corner.
 * No tooltip - block is self-explanatory from the sprite + number.
 */
export const BlockBadge = memo(function BlockBadge({ value }: BlockBadgeProps) {
  return (
    <div className="relative" style={{ width: 16, height: 16 }}>
      <SpriteIcon frame={STATUS_FRAMES.block} scale={1} outline="#000" outlineWidth={1} />
      <span
        className="absolute font-bold"
        style={{
          bottom: -2,
          right: -2,
          fontSize: '7px',
          color: '#fff',
          lineHeight: 1,
          ...OUTLINE_STYLE,
        }}
      >
        {value}
      </span>
    </div>
  );
});
