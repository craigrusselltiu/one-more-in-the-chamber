import { memo, useCallback, useRef, useEffect, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { getReachableNodes } from '../../game/map/MapGenerator';
import { NODE_FRAMES } from '../../data/spriteConfig';
import type { MapNode, MapNodeType } from '../../types/game';
import type { Screen } from '../../App';

const SPRITE_FRAME_SIZE = 16;
const SPRITE_SHEET_COLS = 36;

const NODE_LABELS: Record<MapNodeType, string> = {
  combat: 'Combat',
  elite: 'Elite',
  merchant: 'Merchant',
  campfire: 'Campfire',
  event: 'Event',
  treasure: 'Treasure',
  boss: 'Boss',
};

const NODE_RADIUS = 14;
/** Horizontal spacing between floors (row -> x). */
const FLOOR_SPACING = 52;
/** Vertical spacing between path branches (col -> y). */
const PATH_SPACING = 42;
const PADDING_LEFT = 28;
const PADDING_TOP = 24;

/** Simple hash for deterministic per-node jitter. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function getNodePos(node: MapNode): { x: number; y: number } {
  const h = hashStr(node.id);
  // Deterministic jitter: ±16px
  const jx = ((h & 0xff) / 255 - 0.5) * 32;
  const jy = (((h >> 8) & 0xff) / 255 - 0.5) * 32;
  // Boss node gets extra horizontal spacing from the campfire row
  const bossExtra = node.type === 'boss' ? 30 : 0;
  return {
    x: PADDING_LEFT + node.row * FLOOR_SPACING + jx + bossExtra,
    y: PADDING_TOP + node.col * PATH_SPACING + jy,
  };
}

export const MapScreen = memo(function MapScreen({ readonly }: { readonly?: boolean } = {}) {
  const run = useRunStore((s) => s.run);
  const markNodeVisited = useRunStore((s) => s.markNodeVisited);
  const setCurrentNode = useRunStore((s) => s.setCurrentNode);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const navigatingRef = useRef(false);

  const mapState = run?.mapState;
  const nodes = mapState?.nodes ?? [];
  const reachable = mapState ? getReachableNodes(mapState) : [];

  // 15 floors horizontal, 7 paths vertical
  const canvasWidth = PADDING_LEFT + 14 * FLOOR_SPACING + 40 + 30; // +30 for boss extra offset
  const canvasHeight = PADDING_TOP + 6 * PATH_SPACING + 24;

  // Load sprite sheet for node icons
  const spriteRef = useRef<HTMLImageElement | null>(null);
  const [spriteLoaded, setSpriteLoaded] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.src = import.meta.env.BASE_URL + 'assets/sprites/items_sheet.png';
    img.onload = () => { spriteRef.current = img; setSpriteLoaded(true); };
  }, []);

  // Draw map with breathing animation for reachable nodes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapState) return;

    const ctxInit = canvas.getContext('2d');
    if (!ctxInit) return;

    let animId: number;
    const hasReachable = reachable.length > 0;

    // Draw sprite at integer 2x into offscreen buffer, then scale to
    // display size on main canvas. With imageRendering: pixelated on the
    // canvas element, fractional sizes stay crisp.
    const INT_SIZE = SPRITE_FRAME_SIZE * 2;
    const buffer = document.createElement('canvas');
    buffer.width = INT_SIZE;
    buffer.height = INT_SIZE;
    const bufCtx = buffer.getContext('2d')!;
    bufCtx.imageSmoothingEnabled = false;

    function drawSpriteFrame(ctx: CanvasRenderingContext2D, frame: number, x: number, y: number, size: number) {
      const img = spriteRef.current;
      if (!img) return;
      const col = frame % SPRITE_SHEET_COLS;
      const row = Math.floor(frame / SPRITE_SHEET_COLS);
      // Draw source at crisp integer 2x into buffer
      bufCtx.clearRect(0, 0, INT_SIZE, INT_SIZE);
      bufCtx.drawImage(
        img,
        col * SPRITE_FRAME_SIZE, row * SPRITE_FRAME_SIZE,
        SPRITE_FRAME_SIZE, SPRITE_FRAME_SIZE,
        0, 0, INT_SIZE, INT_SIZE,
      );
      // Draw buffer to main canvas. Use nearest-neighbor for integer multiples
      // of INT_SIZE (e.g. boss at 64px = 2x buffer), smooth only for breathing.
      const isCleanMultiple = size % INT_SIZE === 0;
      ctx.imageSmoothingEnabled = !isCleanMultiple && size !== INT_SIZE;
      ctx.drawImage(buffer, x - size / 2, y - size / 2, size, size);
      ctx.imageSmoothingEnabled = false;
    }

    // Pre-render dimmed sprite buffer once (avoids per-frame ctx.filter)
    const dimBuffer = document.createElement('canvas');
    dimBuffer.width = INT_SIZE;
    dimBuffer.height = INT_SIZE;
    const dimCtx = dimBuffer.getContext('2d')!;
    dimCtx.imageSmoothingEnabled = false;

    // Build node lookup for O(1) connection resolution
    const nodeMap = new Map<string, MapNode>();
    for (const n of nodes) nodeMap.set(n.id, n);

    // Cache reachable set for O(1) lookup
    const reachableSet = new Set(reachable);

    function drawDimmedSprite(ctx: CanvasRenderingContext2D, frame: number, x: number, y: number, size: number) {
      const img = spriteRef.current;
      if (!img) return;
      const col = frame % SPRITE_SHEET_COLS;
      const row = Math.floor(frame / SPRITE_SHEET_COLS);
      dimCtx.clearRect(0, 0, INT_SIZE, INT_SIZE);
      dimCtx.drawImage(img, col * SPRITE_FRAME_SIZE, row * SPRITE_FRAME_SIZE, SPRITE_FRAME_SIZE, SPRITE_FRAME_SIZE, 0, 0, INT_SIZE, INT_SIZE);
      // Darken by drawing a semi-transparent black overlay
      dimCtx.globalCompositeOperation = 'source-atop';
      dimCtx.fillStyle = 'rgba(0,0,0,0.5)';
      dimCtx.fillRect(0, 0, INT_SIZE, INT_SIZE);
      dimCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(dimBuffer, x - size / 2, y - size / 2, size, size);
    }

    function draw() {
      const ctx = ctxInit!;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      // Breathing: size oscillation (32-38px) for reachable nodes
      const breathT = 0.5 + 0.5 * Math.sin((performance.now() / 750) * Math.PI);
      const breathSize = hasReachable ? 32 + 3 * breathT : 32;

      // Draw connections
      for (const node of nodes) {
        const from = getNodePos(node);
        for (const connId of node.connections) {
          const target = nodeMap.get(connId);
          if (!target) continue;
          const to = getNodePos(target);

          const onPath = node.visited && target.visited;
          ctx.strokeStyle = onPath ? '#ffffff' : '#374151';
          ctx.lineWidth = 2;
          ctx.globalAlpha = onPath ? 0.6 : 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      }

      // Draw nodes as sprite icons
      for (const node of nodes) {
        const pos = getNodePos(node);
        const isReachable = reachableSet.has(node.id);
        const isCurrent = node.id === mapState!.currentNodeId && node.completed;
        const frame = NODE_FRAMES[node.type];
        if (frame == null) continue;

        const isBoss = node.type === 'boss';
        const baseSize = isBoss ? 64 : 32;
        const spriteSize = isReachable && !isCurrent ? (isBoss ? breathSize * 2 : breathSize) : baseSize;

        const greyOut = !isReachable && !isCurrent && !node.visited;

        if (isCurrent) {
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8;
        }

        if (greyOut) {
          drawDimmedSprite(ctx, frame, pos.x, pos.y, spriteSize);
        } else {
          drawSpriteFrame(ctx, frame, pos.x, pos.y, spriteSize);
        }
        ctx.shadowBlur = 0;
      }

      if (hasReachable) {
        animId = requestAnimationFrame(draw);
      }
    }

    draw();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [nodes, mapState, reachable, spriteLoaded]);

  // Scroll to current node on mount
  useEffect(() => {
    if (!containerRef.current || !mapState?.currentNodeId) return;
    const node = nodes.find((n) => n.id === mapState.currentNodeId);
    if (node) {
      const pos = getNodePos(node);
      containerRef.current.scrollLeft = Math.max(0, pos.x - 200);
    }
  }, [mapState?.currentNodeId, nodes]);

  const handleCanvasHover = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !mapState) { setTooltip(null); return; }

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      // Position tooltip using the mouse position in the virtual (unscaled) coordinate space.
      // The CSS transform means clientX/Y are in screen space; we need to reverse-map to virtual.
      // Find the scaled overlay container to get the transform scale.
      const overlay = canvas.closest('[style*="transform"]') as HTMLElement | null;
      const scale = overlay
        ? parseFloat(overlay.style.transform.match(/scale\(([^)]+)\)/)?.[1] || '1')
        : 1;
      // Mouse position in virtual pixels relative to the outer map container
      const outerRect = containerRef.current?.parentElement?.getBoundingClientRect();
      const vx = outerRect ? (e.clientX - outerRect.left) / scale : e.clientX;
      const vy = outerRect ? (e.clientY - outerRect.top) / scale : e.clientY;

      for (const node of nodes) {
        const pos = getNodePos(node);
        const dx = mx - pos.x;
        const dy = my - pos.y;
        if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS * 2) {
          setTooltip({ text: NODE_LABELS[node.type], x: vx, y: vy });
          return;
        }
      }
      setTooltip(null);
    },
    [mapState, nodes],
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!mapState) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      for (const node of nodes) {
        const pos = getNodePos(node);
        const dx = mx - pos.x;
        const dy = my - pos.y;
        if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS * 1.5) {
          if (reachable.includes(node.id) && !navigatingRef.current) {
            navigatingRef.current = true;
            // Non-combat nodes: mark visited immediately (they load synchronously)
            // Combat nodes: only set currentNodeId now; mark visited once combat starts
            const isCombatNode = node.type === 'combat' || node.type === 'elite' || node.type === 'boss';
            if (isCombatNode) {
              setCurrentNode(node.id);
            } else {
              markNodeVisited(node.id);
            }
            navigateToNode(node);
          }
          return;
        }
      }
    },
    [mapState, nodes, reachable, markNodeVisited, setCurrentNode],
  );

  if (!run || !mapState) {
    return (
      <div className="flex flex-col items-center justify-center bg-[#1a1a2e]" style={{ width: 960, height: 540 }}>
        <p className="text-stone-400 text-sm">No active run</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-[#1a1a2e]/95">
      {/* Map area -- horizontal scroll, centered */}
      <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onClick={readonly ? undefined : handleCanvasClick}
          onMouseMove={handleCanvasHover}
          onMouseLeave={() => setTooltip(null)}
          className={readonly ? 'shrink-0' : 'cursor-pointer shrink-0'}
          style={{ imageRendering: 'auto' }}
        />
      </div>

      {/* Tooltip - positioned using canvas-internal coords (virtual pixels) */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-stone-900/95 border border-stone-600 px-2 py-0.5 text-stone-200 text-[9px] z-10"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          {tooltip.text}
        </div>
      )}

    </div>
  );
});

function navigateToNode(node: MapNode) {
  const screenMap: Record<MapNodeType, Screen> = {
    combat: 'combat',
    elite: 'combat',
    merchant: 'merchant',
    campfire: 'campfire',
    event: 'event',
    treasure: 'treasure',
    boss: 'combat',
  };

  // Small delay so the map visually updates before transition
  setTimeout(() => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, screenMap[node.type]);
  }, 150);
}
