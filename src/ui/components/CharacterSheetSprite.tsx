import { memo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { CharacterId } from '../../types/game';

const SHEET_FRAME_SIZE = 64;
const IDLE_FRAME_COLS = 4;
const ATTACK_FRAME = { col: 0, row: 1 } as const;
const HIT_FRAME = { col: 1, row: 1 } as const;
const RUST_DEADEYE_FRAME = { col: 2, row: 1 } as const;
const RENO_SHUFFLE_FRAME = { col: 2, row: 1 } as const;

const sheetImageCache: Partial<Record<CharacterId, HTMLImageElement>> = {};
const sheetLoadPromises: Partial<Record<CharacterId, Promise<HTMLImageElement>>> = {};

function getSheetFilename(character: CharacterId): string {
  return character === 'reno' ? 'reno_sheet.png' : 'rust_sheet.png';
}

function loadCharacterSheet(character: CharacterId): Promise<HTMLImageElement> {
  const cached = sheetImageCache[character];
  if (cached) return Promise.resolve(cached);

  const pending = sheetLoadPromises[character];
  if (pending) return pending;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      sheetImageCache[character] = image;
      resolve(image);
    };
    image.onerror = reject;
    image.src = `${import.meta.env.BASE_URL}assets/sprites/${getSheetFilename(character)}`;
  });

  sheetLoadPromises[character] = promise;
  return promise;
}

export const CharacterSheetSprite = memo(function CharacterSheetSprite({
  character,
  size,
  attacking = false,
  hit = false,
  abilityActive = false,
  idleFrame = 0,
  playerSprite = false,
  className,
  style,
  alt,
}: {
  character: CharacterId;
  size: number;
  attacking?: boolean;
  hit?: boolean;
  abilityActive?: boolean;
  idleFrame?: number;
  playerSprite?: boolean;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const intScale = Math.max(1, Math.ceil(size / SHEET_FRAME_SIZE));
  const canvasSize = SHEET_FRAME_SIZE * intScale;
  const frame = hit
    ? HIT_FRAME
    : attacking
      ? ATTACK_FRAME
      : character === 'red_panda' && abilityActive
        ? RUST_DEADEYE_FRAME
      : character === 'reno' && abilityActive
        ? RENO_SHUFFLE_FRAME
      : { col: Math.max(0, idleFrame % IDLE_FRAME_COLS), row: 0 };

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.imageSmoothingEnabled = false;

    loadCharacterSheet(character)
      .then((image) => {
        if (cancelled) return;

        const sx = frame.col * SHEET_FRAME_SIZE;
        const sy = frame.row * SHEET_FRAME_SIZE;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(
          image,
          sx,
          sy,
          SHEET_FRAME_SIZE,
          SHEET_FRAME_SIZE,
          0,
          0,
          canvasSize,
          canvasSize,
        );
      })
      .catch(() => {
        if (!cancelled) context.clearRect(0, 0, canvas.width, canvas.height);
      });

    return () => {
      cancelled = true;
    };
  }, [canvasSize, character, frame.col, frame.row]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize}
      height={canvasSize}
      role="img"
      aria-label={alt}
      data-player-sprite={playerSprite ? 'true' : undefined}
      className={className}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  );
});
