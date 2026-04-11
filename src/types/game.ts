/** Core game types shared across systems. */

export interface RunState {
  id: string;
  character: CharacterId;
  seed: string;
  ascensionLevel: number;
  currentAct: Act;
  currentNodeId: string | null;
  health: number;
  maxHealth: number;
  gold: number;
  activeTileTypes: TileType[];
  tileUpgrades: Partial<Record<TileType, number>>;
  artifacts: ArtifactInstance[];
  traitCounts: Partial<Record<TraitId, number>>;
  consumables: ConsumableInstance[];
  abilityCharge: number;
  totalDamageDealt: number;
  runStartedAt: number;
  /** Accumulated play time in seconds (only ticks during active gameplay). */
  playTimeSeconds: number;
  longestCascade: number;
  flawlessFights: number;
  bossesDefeated: number;
  mapState: MapState | null;
  /** Tracks purchased item IDs per merchant node to persist across remounts. */
  merchantPurchases?: Record<string, string[]>;
  /** Snapshot of owned artifact IDs + active tile types at first merchant visit, keyed by nodeId. */
  merchantSnapshots?: Record<string, { ownedArtifactIds: string[]; activeTileTypes: TileType[] }>;
  /** True after boss treasure is taken/skipped but before act advances. */
  bossRewardTaken?: boolean;
  /** True after elite treasure is taken/skipped. */
  eliteRewardTaken?: boolean;
  /** True after the once-per-run Outlaw King encounter has been rolled. */
  outlawKingEncountered?: boolean;
  /** Transient: if true, the next ArtifactScreen visit forces a legendary-rarity pick. */
  pendingLegendaryReward?: boolean;
  status: 'active' | 'completed' | 'abandoned';
}

export type CharacterId = 'red_panda' | 'reno';

export type Act = 1 | 2 | 3;

export type TileType =
  // Core
  | 'bullet'
  | 'iron'
  | 'gold'
  | 'bounty'
  | 'chip'
  // Starter
  | 'ricochet'
  | 'stampede'
  | 'buckshot'
  | 'battery'
  | 'waste'
  | 'prairie_fire'
  // Additional
  | 'chain'
  | 'whiskey'
  | 'ace'
  | 'horseshoe'
  | 'fifty_cal'
  | 'tombstone'
  | 'saloon'
  | 'shank'
  | 'rattler'
  | 'barricade'
  | 'cavalry'
  | 'duel'
  | 'mirage'
  | 'boulder'
  // Special
  | 'showdown'
  | 'tumbleweed'
  | 'fools_gold'
  | 'charcoal';

export type TraitId =
  | 'outlaw'
  | 'sheriff'
  | 'prospector'
  | 'sapper'
  | 'mustang'
  | 'gunslinger'
  | 'saloon_keeper'
  | 'desperado'
  | 'sniper'
  | 'dead_man_walking'
  | 'tracker'
  | 'preacher'
  | 'antivenom'
  | 'undertaker'
  | 'rattlesnake';

export interface ArtifactInstance {
  id: string;
  tags: TraitId[];
}

export interface ConsumableInstance {
  id: string;
}

export type MapNodeType =
  | 'combat'
  | 'elite'
  | 'merchant'
  | 'campfire'
  | 'event'
  | 'artifact'
  | 'boss';

export interface MapNode {
  id: string;
  type: MapNodeType;
  row: number;
  col: number;
  connections: string[];
  visited: boolean;
  /** Whether the node was completed (combat won, event resolved, etc). */
  completed?: boolean;
}

export interface MapState {
  act: Act;
  nodes: MapNode[];
  currentNodeId: string | null;
}

export interface ScoreData {
  baseScore: number;
  bonusPoints: number;
  ascensionMultiplier: number;
  timeBonus: number;
  finalScore: number;
  runDurationSeconds: number;
  nodesCleared: number;
  bossesDefeated: number;
  runCompleted: boolean;
}
