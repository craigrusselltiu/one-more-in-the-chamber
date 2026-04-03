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

const ROWS_PER_ACT = 13;
const COLS = 7;

/** Protected node types that should never be overwritten. */
const PROTECTED_TYPES: Set<MapNodeType> = new Set(['boss', 'treasure']);

/**
 * Ensure a minimum number of a given node type exists on the map.
 * Converts random combat nodes to the target type if needed.
 * Never touches row 0 (start), last row (boss), second-to-last (pre-boss rest),
 * or midpoint (treasure).
 */
function ensureMinCount(
  nodes: MapNode[],
  targetType: MapNodeType,
  min: number,
  max: number,
  rng: () => number,
  totalRows: number,
): void {
  const midRow = Math.floor(totalRows / 2);
  const protectedRows = new Set([0, totalRows - 1, totalRows - 2, midRow]);

  const current = nodes.filter((n) => n.type === targetType && !protectedRows.has(n.row)).length;
  const target = min + Math.floor(rng() * (max - min + 1));

  if (current >= target) return;

  // Find combat nodes we can convert (not in protected rows)
  const candidates = nodes.filter(
    (n) => n.type === 'combat' && !protectedRows.has(n.row) && !PROTECTED_TYPES.has(n.type),
  );

  // Shuffle candidates
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const needed = target - current;
  for (let i = 0; i < needed && i < candidates.length; i++) {
    candidates[i].type = targetType;
  }
}

/** Node type distribution weights per row position. */
function pickNodeType(
  row: number,
  totalRows: number,
  rng: () => number,
  prevRowTypes?: MapNodeType[],
): MapNodeType {
  // Row 0 is always start combat
  if (row === 0) return 'combat';
  // Last row is always boss
  if (row === totalRows - 1) return 'boss';
  // Second-to-last is always rest site (pre-boss campfire)
  if (row === totalRows - 2) return 'rest';
  // Halfway point is always treasure (guaranteed)
  const midRow = Math.floor(totalRows / 2);
  if (row === midRow) return 'treasure';

  // First 3 rows (1-3): no events or rest sites
  const earlyRow = row <= 3;
  // No consecutive rest sites
  const prevHadRest = prevRowTypes?.includes('rest') ?? false;

  let type: MapNodeType;
  do {
    const roll = rng();
    if (roll < 0.40) type = 'combat';
    else if (roll < 0.55) type = 'elite';
    else if (roll < 0.70) type = 'event';
    else if (roll < 0.80) type = 'shop';
    else if (roll < 0.90) type = 'rest';
    else type = 'combat';
  } while (
    (earlyRow && (type === 'event' || type === 'rest')) ||
    (prevHadRest && type === 'rest')
  );

  return type;
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

    // First row: 2-3 starting paths. Last row: 1 boss.
    let count: number;
    if (isFirst) {
      count = 2 + Math.floor(rng() * 2); // 2-3
    } else if (isLast) {
      count = 1;
    } else if (row === totalRows - 2) {
      count = 2; // pre-boss rest sites
    } else {
      count = 2 + Math.floor(rng() * 3); // 2-4
    }

    const ids: string[] = [];
    // Spread nodes across columns
    const positions = spreadColumns(count, COLS, rng);

    // Collect previous row's node types for consecutive-rest prevention
    const prevRowTypes = row > 0
      ? nodes.filter((n) => n.row === row - 1).map((n) => n.type)
      : [];

    for (let i = 0; i < count; i++) {
      const col = positions[i];
      const type = pickNodeType(row, totalRows, rng, prevRowTypes);

      const id = `${act}-${row}-${col}`;
      nodes.push({
        id,
        type,
        row,
        col,
        connections: [],
        visited: false,
      });
      ids.push(id);
    }
    rowNodes.push(ids);
  }

  // Post-generation: ensure minimum counts for shops, campfires, and elites.
  // Target: 2-3 shops, 3-4 rest sites (excl pre-boss), 3-4 elites.
  ensureMinCount(nodes, 'shop', 2, 3, rng, totalRows);
  ensureMinCount(nodes, 'rest', 3, 4, rng, totalRows);
  ensureMinCount(nodes, 'elite', 3, 4, rng, totalRows);

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

  return current.connections;
}
