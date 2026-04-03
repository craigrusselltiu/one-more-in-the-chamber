import { memo } from 'react';
import { SpriteIcon } from '../components/SpriteIcon';
import { STATUS_FRAMES } from '../../data/spriteConfig';

interface BlockBadgeProps {
  value: number;
}

/** Text style with black outline. */
const outlinedText: React.CSSProperties = {
  fontSize: '7px',
  color: '#ffffff',
  fontWeight: 'bold',
  lineHeight: 1,
  textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
};

/**
 * BlockBadge: sprite icon with block value.
 * Always occupies fixed space to the left of the health bar.
 */
export const BlockBadge = memo(function BlockBadge({ value }: BlockBadgeProps) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ width: 20, height: 24 }}
      title={`Block: ${value}`}
    >
      <SpriteIcon frame={STATUS_FRAMES.block} scale={1} />
      <span style={outlinedText}>{value}</span>
    </div>
  );
});
