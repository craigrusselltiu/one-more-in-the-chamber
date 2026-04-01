import { memo, useCallback, useRef, useEffect, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { getReachableNodes } from '../../game/map/MapGenerator';
import { TopBar } from '../hud/TopBar';
import { ArtifactBar } from '../hud/ArtifactBar';
import type { MapNode, MapNodeType } from '../../types/game';
import type { Screen } from '../../App';

/** Color and symbol per node type. */
const NODE_STYLES: Record<MapNodeType, { color: string; symbol: string; label: string }> = {
  combat: { color: '#D04040', symbol: '\u2694', label: 'Combat' },
  elite: { color: '#E0A020', symbol: '\u2606', label: 'Elite' },
  shop: { color: '#40A0D0', symbol: '\u0024', label: 'Shop' },
  rest: { color: '#60C060', symbol: '\u2618', label: 'Rest' },
  event: { color: '#C070D0', symbol: '\u003F', label: 'Event' },
  treasure: { color: '#FFD700', symbol: '\u2666', label: 'Treasure' },
  boss: { color: '#FF4040', symbol: '\u2620', label: 'Boss' },
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
  const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);

  const mapState = run?.mapState;
  const nodes = mapState?.nodes ?? [];
  const reachable = mapState ? getReachableNodes(mapState) : [];

  // 13 floors horizontal, 7 paths vertical
  const canvasWidth = PADDING_LEFT + 12 * FLOOR_SPACING + 40;
  const canvasHeight = PADDING_TOP + 6 * PATH_SPACING + 24;

  // Draw map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapState) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
        // Curved line for visual interest
        const midX = (from.x + to.x) / 2;
        ctx.bezierCurveTo(midX, from.y, midX, to.y, to.x, to.y);
        ctx.stroke();
      }
    }

    // Draw nodes
    for (const node of nodes) {
      const pos = getNodePos(node);
      const style = NODE_STYLES[node.type];
      const isReachable = reachable.includes(node.id);
      const isCurrent = node.id === mapState.currentNodeId;

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, NODE_RADIUS, 0, Math.PI * 2);

      if (isCurrent) {
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (node.visited) {
        ctx.fillStyle = '#374151';
        ctx.fill();
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (isReachable) {
        ctx.fillStyle = style.color;
        ctx.fill();
        // Pulsing border for reachable
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = style.color + '60';
        ctx.fill();
        ctx.strokeStyle = style.color + '80';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Node symbol
      ctx.fillStyle = isCurrent ? '#1a1a2e' : node.visited ? '#6b7280' : '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.symbol, pos.x, pos.y + 1);
    }
  }, [nodes, mapState, reachable]);

  // Scroll to current node on mount
  useEffect(() => {
    if (!containerRef.current || !mapState?.currentNodeId) return;
    const node = nodes.find((n) => n.id === mapState.currentNodeId);
    if (node) {
      const pos = getNodePos(node);
      containerRef.current.scrollLeft = Math.max(0, pos.x - 200);
    }
  }, [mapState?.currentNodeId, nodes]);

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

  const handleCanvasMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!mapState) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      let found: MapNode | null = null;
      for (const node of nodes) {
        const pos = getNodePos(node);
        const dx = mx - pos.x;
        const dy = my - pos.y;
        if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS * 1.5) {
          found = node;
          break;
        }
      }
      setHoveredNode(found);
    },
    [mapState, nodes],
  );

  if (!run || !mapState) {
    return (
      <div className="flex flex-col items-center justify-center bg-[#1a1a2e]" style={{ width: 960, height: 540 }}>
        <p className="text-stone-400 font-mono text-sm">No active run</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e]/95">
      {/* Shared top bar */}
      <TopBar />
      <ArtifactBar />

      {/* Map area -- horizontal scroll, centered */}
      <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onClick={readonly ? undefined : handleCanvasClick}
          onMouseMove={handleCanvasMove}
          className={readonly ? 'shrink-0' : 'cursor-pointer shrink-0'}
        />
      </div>

      {/* Close button for readonly overlay */}
      {readonly && onClose && (
        <div className="flex justify-center py-1 border-t border-stone-700">
          <button
            onClick={onClose}
            className="px-4 py-0.5 bg-stone-800 text-stone-300 font-mono text-xs border border-stone-600 hover:bg-stone-700"
          >
            Close
          </button>
        </div>
      )}

      {/* Tooltip / node info */}
      <div className="h-8 flex items-center justify-center border-t border-stone-700 px-4">
        {hoveredNode ? (
          <div className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: NODE_STYLES[hoveredNode.type].color }}
            />
            <span className="text-stone-300 font-mono text-sm">
              {NODE_STYLES[hoveredNode.type].label}
              {hoveredNode.visited && ' (visited)'}
              {reachable.includes(hoveredNode.id) && !hoveredNode.visited && ' -- click to travel'}
            </span>
          </div>
        ) : (
          <span className="text-stone-500 font-mono text-xs">
            Choose your path. Hover over nodes for details.
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 py-1.5 border-t border-stone-700/50">
        {(['combat', 'elite', 'shop', 'rest', 'event', 'treasure', 'boss'] as const).map((type) => (
          <div key={type} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: NODE_STYLES[type].color }}
            />
            <span className="text-stone-500 font-mono" style={{ fontSize: '10px' }}>
              {NODE_STYLES[type].label}
            </span>
          </div>
        ))}
      </div>
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
