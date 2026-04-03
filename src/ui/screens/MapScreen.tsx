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
  shop: 'Shop',
  rest: 'Rest',
  event: 'Event',
  treasure: 'Treasure',
  boss: 'Boss',
};

const NODE_RADIUS = 14;
/** Horizontal spacing between floors (row -> x). */
const FLOOR_SPACING = 52;
/** Vertical spacing between path branches (col -> y). */
const PATH_SPACING = 42;
const PADDING_LEFT = 40;
const PADDING_TOP = 24;

function getNodePos(node: MapNode): { x: number; y: number } {
  return {
    x: PADDING_LEFT + node.row * FLOOR_SPACING,
    y: PADDING_TOP + node.col * PATH_SPACING,
  };
}

export const MapScreen = memo(function MapScreen({ readonly, onClose }: { readonly?: boolean; onClose?: () => void } = {}) {
  const run = useRunStore((s) => s.run);
  const markNodeVisited = useRunStore((s) => s.markNodeVisited);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const mapState = run?.mapState;
  const nodes = mapState?.nodes ?? [];
  const reachable = mapState ? getReachableNodes(mapState) : [];

  // 13 floors horizontal, 7 paths vertical
  const canvasWidth = PADDING_LEFT + 12 * FLOOR_SPACING + 40;
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

    function drawSpriteFrame(ctx: CanvasRenderingContext2D, frame: number, x: number, y: number, size: number) {
      const img = spriteRef.current;
      if (!img) return;
      const col = frame % SPRITE_SHEET_COLS;
      const row = Math.floor(frame / SPRITE_SHEET_COLS);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        img,
        col * SPRITE_FRAME_SIZE, row * SPRITE_FRAME_SIZE,
        SPRITE_FRAME_SIZE, SPRITE_FRAME_SIZE,
        x - size / 2, y - size / 2,
        size, size,
      );
    }

    function draw() {
      const ctx = ctxInit!;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      // Breathing scale: oscillate between 1.0 and 1.08 over ~1.5s
      const breathScale = hasReachable
        ? 1.0 + 0.08 * (0.5 + 0.5 * Math.sin((performance.now() / 750) * Math.PI))
        : 1.0;

      // Draw connections
      for (const node of nodes) {
        const from = getNodePos(node);
        for (const connId of node.connections) {
          const target = nodes.find((n) => n.id === connId);
          if (!target) continue;
          const to = getNodePos(target);

          ctx.strokeStyle = node.visited ? '#6b7280' : '#374151';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          const midX = (from.x + to.x) / 2;
          ctx.bezierCurveTo(midX, from.y, midX, to.y, to.x, to.y);
          ctx.stroke();
        }
      }

      // Draw nodes as sprite icons (no circles)
      for (const node of nodes) {
        const pos = getNodePos(node);
        const isReachable = reachable.includes(node.id);
        const isCurrent = node.id === mapState!.currentNodeId;

        const frame = NODE_FRAMES[node.type];
        if (frame == null) continue;

        // Breathing scale for reachable nodes
        const spriteSize = isReachable && !isCurrent ? Math.round(24 * breathScale) : 24;

        // Dim visited nodes, full opacity for current/reachable
        if (node.visited && !isCurrent) ctx.globalAlpha = 0.4;
        else if (!isReachable && !isCurrent) ctx.globalAlpha = 0.5;

        drawSpriteFrame(ctx, frame, pos.x, pos.y, spriteSize);
        ctx.globalAlpha = 1.0;

        // Gold glow for current node (no box outline)
        if (isCurrent) {
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8;
          drawSpriteFrame(ctx, frame, pos.x, pos.y, spriteSize);
          ctx.shadowBlur = 0;
        }
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

      // Position tooltip using canvas-internal coordinates (already in virtual space).
      // The canvas element's offset within its scroll container gives us the base.
      const scrollLeft = containerRef.current?.scrollLeft ?? 0;

      for (const node of nodes) {
        const pos = getNodePos(node);
        const dx = mx - pos.x;
        const dy = my - pos.y;
        if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS * 2) {
          setTooltip({ text: NODE_LABELS[node.type], x: pos.x - scrollLeft, y: pos.y });
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
          if (reachable.includes(node.id)) {
            markNodeVisited(node.id);
            navigateToNode(node);
          }
          return;
        }
      }
    },
    [mapState, nodes, reachable, markNodeVisited],
  );

  if (!run || !mapState) {
    return (
      <div className="flex flex-col items-center justify-center bg-[#1a1a2e]" style={{ width: 960, height: 540 }}>
        <p className="text-stone-400 font-mono text-sm">No active run</p>
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
        />
      </div>

      {/* Tooltip - positioned using canvas-internal coords (virtual pixels) */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-stone-900/95 border border-stone-600 px-2 py-0.5 text-stone-200 font-mono text-[9px] z-10"
          style={{ left: tooltip.x, top: tooltip.y - 16, transform: 'translateX(-50%)' }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Close button for readonly overlay - top right */}
      {readonly && onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-stone-800/80 text-red-400 font-mono text-sm font-bold border border-red-900/50 hover:bg-red-900/40"
          title="Close"
        >
          X
        </button>
      )}

    </div>
  );
});

function navigateToNode(node: MapNode) {
  const screenMap: Record<MapNodeType, Screen> = {
    combat: 'combat',
    elite: 'combat',
    shop: 'shop',
    rest: 'rest-site',
    event: 'event',
    treasure: 'treasure',
    boss: 'combat',
  };

  // Small delay so the map visually updates before transition
  setTimeout(() => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, screenMap[node.type]);
  }, 150);
}
