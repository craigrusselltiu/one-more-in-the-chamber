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
  mapState: MapState | null;
  status: 'active' | 'completed' | 'abandoned';
}

export type CharacterId = 'red_panda';

export type Act = 1 | 2 | 3;

export type TileType =
  | 'bullet'
  | 'iron'
  | 'gold'
  | 'ricochet'
  | 'smoke'
  | 'dynamite'
  | 'stampede'
  | 'whiskey'
  | 'buckshot'
  | 'ace'
  | 'venom'
  | 'ember'
  | 'horseshoe'
  | 'fifty_cal';

export type TraitId =
  | 'outlaw'
  | 'sheriff'
  | 'rattlesnake'
  | 'prospector'
  | 'sapper'
  | 'mustang'
  | 'gunslinger';

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
  | 'shop'
  | 'rest'
  | 'event'
  | 'treasure'
  | 'boss';

export interface MapNode {
  id: string;
  type: MapNodeType;
  row: number;
  col: number;
  connections: string[];
  visited: boolean;
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
