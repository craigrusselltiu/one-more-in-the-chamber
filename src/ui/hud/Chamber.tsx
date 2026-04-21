import { memo } from 'react';

const SRC = `${import.meta.env.BASE_URL}assets/chamber.png`;
const FRAME = 128;
const SHEET_W = FRAME * 3;
const SHEET_H = FRAME;
const HOLE = 32;

// Flat-top hexagon, six holes at 60 deg intervals around (64, 64). Radius ~38.
// Tune values if visuals drift from the sprite.
const CX = 64;
const CY = 64;
const R = 38;
const ANGLES_DEG = [90, 30, -30, -90, -150, 150];
const HOLE_POSITIONS: [number, number][] = ANGLES_DEG.map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return [CX + R * Math.cos(rad), CY - R * Math.sin(rad)];
});

type HoleState = 'filled' | 'empty' | 'blocked';

interface Props {
  charge: number;
  threshold: number;
  ready: boolean;
  size?: number;
}

export const Chamber = memo(function Chamber({ charge, threshold, ready, size = 80 }: Props) {
  const blocked = Math.max(0, 6 - threshold);
  const usable = 6 - blocked;
  const filled = Math.min(charge, usable);
  const empty = Math.max(0, usable - filled);

  const holes: HoleState[] = [];
  for (let i = 0; i < filled; i++) holes.push('filled');
  for (let i = 0; i < empty; i++) holes.push('empty');
  for (let i = 0; i < blocked; i++) holes.push('blocked');

  const scale = size / FRAME;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
      }}
    >
      <div
        style={{
          width: FRAME,
          height: FRAME,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          style={{
            width: FRAME,
            height: FRAME,
            position: 'relative',
            transformOrigin: 'center',
            transform: `rotate(${-charge * 60}deg)`,
            transition: 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            imageRendering: 'pixelated',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${SRC})`,
              backgroundSize: `${SHEET_W}px ${SHEET_H}px`,
              backgroundPosition: '0 0',
              backgroundRepeat: 'no-repeat',
              imageRendering: 'pixelated',
            }}
          />
          {ready && (
            <div
              className="chamber-ready"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${SRC})`,
                backgroundSize: `${SHEET_W}px ${SHEET_H}px`,
                backgroundPosition: '0 0',
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated',
                filter: 'url(#chamber-ready-outline)',
              }}
            />
          )}
          {HOLE_POSITIONS.map(([x, y], i) => {
            const state = holes[i];
            if (!state || state === 'empty') return null;
            const frameOffset = state === 'blocked' ? FRAME : FRAME * 2;
            const bgX = -(x - HOLE / 2 + frameOffset);
            const bgY = -(y - HOLE / 2);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x - HOLE / 2,
                  top: y - HOLE / 2,
                  width: HOLE,
                  height: HOLE,
                  backgroundImage: `url(${SRC})`,
                  backgroundSize: `${SHEET_W}px ${SHEET_H}px`,
                  backgroundPosition: `${bgX}px ${bgY}px`,
                  backgroundRepeat: 'no-repeat',
                  imageRendering: 'pixelated',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});
