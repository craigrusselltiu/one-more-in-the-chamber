import type { Act, MapNode, MapNodeType, MapState } from '../../types/game';

/** Seeded PRNG (mulberry32). Deterministic map layout per run seed. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

const ACT_NAMES: Record<Act, string> = {
  1: 'The Dusty Trail',
  2: 'The Canyon',
  3: 'The Town',
};

const ROWS_PER_ACT = 15;
const COLS = 7;

/**
 * Assign node types to a grid of pre-placed nodes.
 *
 * Fixed rows:
 *   Row 0 = combat, Row 6 (midpoint) = treasure,
 *   Row 11 (pre-boss) = rest, Row 12 = boss.
 *
 * Target counts (excluding fixed rows):
 *   campfire: 3-4, elite: 3-4, merchant: 2-3, event: 3-6
 *   Remainder = combat.
 *
 * Constraints:
 *   - No elite/merchant/campfire in rows 1-2 (first 2 rows after start).
 *   - No consecutive (same row or adjacent rows) elite, merchant, or campfire.
 */
function assignNodeTypes(
  nodes: MapNode[],
  totalRows: number,
  rng: () => number,
): void {
  const treasureRow = 6; // 7th node (0-indexed)
  const fixedRows = new Set([0, treasureRow, totalRows - 2, totalRows - 1]);

  // 1. Set fixed rows
  for (const node of nodes) {
    if (node.row === 0) node.type = 'combat';
    else if (node.row === treasureRow) node.type = 'treasure';
    else if (node.row === totalRows - 2) node.type = 'campfire';
    else if (node.row === totalRows - 1) node.type = 'boss';
    else node.type = 'combat'; // default, will be overwritten
  }

  // 2. Collect assignable nodes (not in fixed rows)
  const assignable = nodes.filter((n) => !fixedRows.has(n.row));
  // Shuffle so placement is random
  for (let i = assignable.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [assignable[i], assignable[j]] = [assignable[j], assignable[i]];
  }

  // 3. Determine target counts
  const pick = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
  const targets: { type: MapNodeType; count: number }[] = [
    { type: 'elite', count: pick(3, 4) },
    { type: 'merchant', count: pick(2, 3) },
    { type: 'campfire', count: pick(2, 3) },
    { type: 'event', count: pick(3, 6) },
  ];

  // 4. Check if placing a type at a node violates constraints
  const NO_CONSECUTIVE: Set<MapNodeType> = new Set(['campfire', 'merchant', 'elite']);
  const canPlace = (node: MapNode, type: MapNodeType): boolean => {
    // Row restriction: no elite/campfire in first 2 rows (merchants allowed)
    if ((type === 'elite' || type === 'campfire') && node.row <= 2) return false;
    // No consecutive: check same row, prev row, next row
    if (NO_CONSECUTIVE.has(type)) {
      for (const other of nodes) {
        if (other === node || other.type !== type) continue;
        if (other.row === node.row) return false;           // same row
        if (other.row === node.row - 1) return false;       // prev row
        if (other.row === node.row + 1) return false;       // next row
      }
    }
    return true;
  };

  // 5. Place each type greedily
  for (const { type, count } of targets) {
    let placed = 0;
    for (const node of assignable) {
      if (placed >= count) break;
      if (node.type !== 'combat') continue; // already assigned
      if (!canPlace(node, type)) continue;
      node.type = type;
      placed++;
    }
  }
  // Remaining assignable nodes stay as 'combat'
}

export function generateMap(seed: string, act: Act): MapState {
  const rng = mulberry32(hashString(seed + ':act' + act));
  const nodes: MapNode[] = [];
  const totalRows = ROWS_PER_ACT;

  // Generate nodes per row (2-4 nodes per row, branching paths)
  const rowNodes: string[][] = [];

  for (let row = 0; row < totalRows; row++) {
    const isFirst = row === 0;
    const isLast = row === totalRows - 1;

    let count: number;
    if (isFirst) {
      count = 2 + Math.floor(rng() * 2); // 2-3
    } else if (isLast) {
      count = 1;
    } else if (row === totalRows - 2) {
      count = 2 + Math.floor(rng() * 2); // 2-3 pre-boss rest sites
    } else {
      count = 2 + Math.floor(rng() * 2); // 2-3
    }

    const ids: string[] = [];
    const positions = spreadColumns(count, COLS, rng);

    for (let i = 0; i < count; i++) {
      const col = positions[i];
      const id = `${act}-${row}-${col}`;
      nodes.push({
        id,
        type: 'combat', // placeholder, assigned below
        row,
        col,
        connections: [],
        visited: false,
      });
      ids.push(id);
    }
    rowNodes.push(ids);
  }

  // Assign types with strict constraint enforcement
  assignNodeTypes(nodes, totalRows, rng);

  // Build connections: each node connects to 1-2 nodes in the next row
  for (let row = 0; row < totalRows - 1; row++) {
    const currentIds = rowNodes[row];
    const nextIds = rowNodes[row + 1];

    // Each current node connects to at least 1 next node
    for (const id of currentIds) {
      const node = nodes.find((n) => n.id === id)!;
      const nodeCol = node.col;

      // Find closest next-row nodes
      const sorted = [...nextIds]
        .map((nid) => {
          const n = nodes.find((nn) => nn.id === nid)!;
          return { id: nid, dist: Math.abs(n.col - nodeCol) };
        })
        .sort((a, b) => a.dist - b.dist);

      // Always connect to closest
      node.connections.push(sorted[0].id);

      // 50% chance to also connect to second-closest (if available)
      if (sorted.length > 1 && rng() < 0.5) {
        node.connections.push(sorted[1].id);
      }
    }

    // Ensure every next-row node has at least one parent
    for (const nextId of nextIds) {
      const hasParent = currentIds.some((cid) => {
        const n = nodes.find((nn) => nn.id === cid)!;
        return n.connections.includes(nextId);
      });
      if (!hasParent) {
        // Connect closest current-row node to this orphan
        const nextNode = nodes.find((n) => n.id === nextId)!;
        let closestId = currentIds[0];
        let closestDist = Infinity;
        for (const cid of currentIds) {
          const cn = nodes.find((n) => n.id === cid)!;
          const d = Math.abs(cn.col - nextNode.col);
          if (d < closestDist) {
            closestDist = d;
            closestId = cid;
          }
        }
        const parent = nodes.find((n) => n.id === closestId)!;
        if (!parent.connections.includes(nextId)) {
          parent.connections.push(nextId);
        }
      }
    }
  }

  // Uncross paths: for each row pair, sort edges by parent col and
  // bubble-sort target cols so no two edges cross.
  for (let row = 0; row < totalRows - 1; row++) {
    // Collect all edges for this row pair
    const edges: { parent: MapNode; childId: string; childCol: number }[] = [];
    for (const id of rowNodes[row]) {
      const parent = nodes.find((n) => n.id === id)!;
      for (const cid of parent.connections) {
        const child = nodes.find((n) => n.id === cid)!;
        edges.push({ parent, childId: cid, childCol: child.col });
      }
    }

    // Sort by parent column (stable)
    edges.sort((a, b) => a.parent.col - b.parent.col);

    // Bubble-sort child columns to remove crossings
    let swapped = true;
    while (swapped) {
      swapped = false;
      for (let i = 0; i < edges.length - 1; i++) {
        if (edges[i].childCol > edges[i + 1].childCol) {
          // Swap targets between the two edges
          const tmpId = edges[i].childId;
          const tmpCol = edges[i].childCol;
          edges[i].childId = edges[i + 1].childId;
          edges[i].childCol = edges[i + 1].childCol;
          edges[i + 1].childId = tmpId;
          edges[i + 1].childCol = tmpCol;
          swapped = true;
        }
      }
    }

    // Write back: rebuild each parent's connections for this row pair
    for (const id of rowNodes[row]) {
      const parent = nodes.find((n) => n.id === id)!;
      // Keep connections to rows other than row+1, replace row+1 connections
      const otherConns = parent.connections.filter((cid) => {
        const c = nodes.find((n) => n.id === cid)!;
        return c.row !== row + 1;
      });
      const newConns = edges
        .filter((e) => e.parent.id === id)
        .map((e) => e.childId);
      parent.connections = [...otherConns, ...newConns];
    }
  }

  return {
    act,
    nodes,
    currentNodeId: null,
  };
}

/** Spread `count` items across `cols` columns with some jitter. */
function spreadColumns(count: number, cols: number, rng: () => number): number[] {
  if (count === 1) return [Math.floor(cols / 2)];

  const spacing = cols / (count + 1);
  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    const base = Math.round(spacing * (i + 1));
    const jitter = Math.floor(rng() * 2) - 1; // -1, 0
    positions.push(Math.max(0, Math.min(cols - 1, base + jitter)));
  }

  // Deduplicate: shift collisions
  const used = new Set<number>();
  return positions.map((p) => {
    while (used.has(p)) p = (p + 1) % cols;
    used.add(p);
    return p;
  });
}

export function getActName(act: Act): string {
  return ACT_NAMES[act];
}

/** Get reachable node IDs from current position (or start nodes if no position). */
export function getReachableNodes(map: MapState): string[] {
  if (!map.currentNodeId) {
    // Return all row-0 nodes as starting choices
    return map.nodes.filter((n) => n.row === 0).map((n) => n.id);
  }

  const current = map.nodes.find((n) => n.id === map.currentNodeId);
  if (!current) return [];

  // If current node is not completed, allow retrying it
  if (!current.completed) {
    return [current.id];
  }

  return current.connections;
}
