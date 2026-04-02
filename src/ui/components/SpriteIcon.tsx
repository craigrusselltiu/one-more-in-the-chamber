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
    // Vite serves files from public/ at the base path
    img.src = new URL('/assets/sprites/items_sheet.png', import.meta.url).href;
  });
  return sheetLoadPromise;
}

interface SpriteIconProps {
  frame: number;
  scale?: number;
  className?: string;
  title?: string;
}

/**
 * Renders a single 16x16 frame from the sprite sheet onto a canvas element.
 */
export const SpriteIcon = memo(function SpriteIcon({
  frame,
  scale = 1,
  className,
  title,
}: SpriteIconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    loadSheet().then((img) => {
      const col = frame % SHEET_COLS;
      const row = Math.floor(frame / SHEET_COLS);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        col * FRAME_SIZE, row * FRAME_SIZE, FRAME_SIZE, FRAME_SIZE,
        0, 0, FRAME_SIZE * scale, FRAME_SIZE * scale,
      );
    });
  }, [frame, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={FRAME_SIZE * scale}
      height={FRAME_SIZE * scale}
      className={className}
      title={title}
      style={{ imageRendering: 'pixelated' }}
    />
  );
});
