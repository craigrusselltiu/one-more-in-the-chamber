import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';

type HudEffectKey = 'ability' | 'coins';

interface HudSpriteEffectProps {
  effect: HudEffectKey;
  trigger: number;
  frameSize?: number;
  fps?: number;
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

const BASE = `${import.meta.env.BASE_URL}assets/effects/`;

/** Source frame size per effect sheet. */
const DEFAULT_FRAME_SIZE: Record<HudEffectKey, number> = {
  ability: 64,
  coins: 64,
};

export const HudSpriteEffect = memo(function HudSpriteEffect({
  effect,
  trigger,
  frameSize,
  fps = 18,
  scale = 3,
  className,
  style,
}: HudSpriteEffectProps) {
  const resolvedFrameSize = frameSize ?? DEFAULT_FRAME_SIZE[effect];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger <= 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let frameId = 0;
    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (cancelled) return;
      const cols = Math.max(1, Math.floor(image.naturalWidth / resolvedFrameSize));
      const rows = Math.max(1, Math.floor(image.naturalHeight / resolvedFrameSize));
      const frameCount = cols * rows;
      const frameMs = 1000 / fps;
      const start = performance.now();

      setVisible(true);
      ctx.imageSmoothingEnabled = false;

      const draw = (now: number) => {
        if (cancelled) return;
        const frame = Math.floor((now - start) / frameMs);
        if (frame >= frameCount) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setVisible(false);
          return;
        }

        const sx = (frame % cols) * resolvedFrameSize;
        const sy = Math.floor(frame / cols) * resolvedFrameSize;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, sx, sy, resolvedFrameSize, resolvedFrameSize, 0, 0, canvas.width, canvas.height);
        frameId = window.requestAnimationFrame(draw);
      };

      frameId = window.requestAnimationFrame(draw);
    };

    image.src = `${BASE}${effect}.png`;

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [effect, fps, resolvedFrameSize, scale, trigger]);

  return (
    <canvas
      ref={canvasRef}
      width={resolvedFrameSize * scale}
      height={resolvedFrameSize * scale}
      className={className}
      style={{
        width: resolvedFrameSize * scale,
        height: resolvedFrameSize * scale,
        imageRendering: 'pixelated',
        opacity: visible ? 1 : 0,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
});
