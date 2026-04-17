import { useRef, useEffect, memo } from 'react';

const FRAME_SIZE = 16;
const SHEET_COLS = 36;

let sheetImageCache: HTMLImageElement | null = null;
let sheetLoadPromise: Promise<HTMLImageElement> | null = null;

function loadSheet(): Promise<HTMLImageElement> {
  if (sheetImageCache) return Promise.resolve(sheetImageCache);
  if (sheetLoadPromise) return sheetLoadPromise;

  sheetLoadPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      sheetImageCache = img;
      resolve(img);
    };
    img.onerror = reject;
    img.src = import.meta.env.BASE_URL + 'assets/sprites/items_sheet.png';
  });
  return sheetLoadPromise;
}

interface SpriteIconProps {
  frame: number;
  scale?: number;
  className?: string;
  title?: string;
  /** Hex color string (e.g. '#D04040') to tint-fill over the sprite. */
  tint?: string;
  /** Alpha for the tint overlay (0-1). Default 0.3. */
  tintAlpha?: number;
  /** Hex color for an outline that follows the sprite shape. */
  outline?: string;
  /** Outline thickness in pixels (default 1). */
  outlineWidth?: number;
}

/**
 * Renders a single 16x16 frame from the sprite sheet onto a canvas element.
 * Always draws at an integer scale internally, then CSS-sizes to the desired
 * display size. This keeps pixel art crisp at any fractional scale.
 */
export const SpriteIcon = memo(function SpriteIcon({
  frame,
  scale = 1,
  className,
  title,
  tint,
  tintAlpha = 0.3,
  outline,
  outlineWidth = 1,
}: SpriteIconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Internal canvas uses the next integer scale up for crisp pixel art
  const intScale = Math.max(1, Math.ceil(scale));
  const displaySize = FRAME_SIZE * scale;
  const canvasSize = FRAME_SIZE * intScale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    loadSheet().then((img) => {
      const col = frame % SHEET_COLS;
      const row = Math.floor(frame / SHEET_COLS);
      const sx = col * FRAME_SIZE;
      const sy = row * FRAME_SIZE;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Outline: draw sprite shifted, color-fill, then draw original on top.
      //   width 1   -> 4 cardinal offsets at d=1 (thin)
      //   width 1.5 -> 8 neighbors at d=1 (cardinal + diagonal; fills diagonal gaps)
      //   width >=2 -> full square ring out to that Chebyshev radius
      if (outline) {
        const w = Math.max(1, outlineWidth);
        let offsets: [number, number][];
        if (w <= 1) {
          offsets = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        } else if (w < 2) {
          offsets = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1],
          ];
        } else {
          offsets = [];
          const r = Math.floor(w);
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              if (dx === 0 && dy === 0) continue;
              offsets.push([dx, dy]);
            }
          }
        }
        for (const [dx, dy] of offsets) {
          ctx.drawImage(img, sx, sy, FRAME_SIZE, FRAME_SIZE, dx, dy, canvasSize, canvasSize);
        }
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = outline;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.drawImage(img, sx, sy, FRAME_SIZE, FRAME_SIZE, 0, 0, canvasSize, canvasSize);

      // Tint overlay: fill color only on non-transparent pixels
      if (tint) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = tintAlpha;
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    });
  }, [frame, intScale, canvasSize, tint, tintAlpha, outline, outlineWidth]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize}
      height={canvasSize}
      className={className}
      title={title}
      style={{
        width: displaySize,
        height: displaySize,
        imageRendering: 'pixelated',
      }}
    />
  );
});
