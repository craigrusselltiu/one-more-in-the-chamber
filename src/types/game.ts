/** Core game types shared across systems. */

export interface RunState {
  id: string;
  character: CharacterId;
  seed: string;
  wantedLevel: number;
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
  /** Cumulative combat nodes cleared across all acts (not derived from mapState, which resets). */
  combatsCleared: number;
  /** Cumulative elite nodes cleared across all acts. */
  elitesCleared: number;
  /** Total gold obtained over the run (sum of positive gold gains), not current balance. Excludes starting gold. */
  goldObtained: number;
  /** Number of artifacts obtained during the run. Excludes starting artifacts (loadout + character default). */
  artifactsObtained: number;
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
  /** Shuffle bag of event IDs remaining for this cycle. Refills from the current act's pool when empty. */
  eventBag?: string[];
  /** When set, the next combat uses these enemy type IDs instead of rolling a normal encounter. Cleared on combat start. */
  forcedCombatEnemies?: string[];
  /** One-shot discount (0-1, e.g. 0.25 = 25% off) applied to the next merchant's prices. Cleared after the merchant snapshot is taken. */
  nextMerchantDiscount?: number;
  /** When set, the next ArtifactScreen visit is an event-driven choice of this many artifacts. Cleared after pick/skip. */
  pendingEventArtifactChoiceCount?: number;
  /** Additive HP multiplier applied to the current act's boss (e.g. 0.1 = +10% max HP). Cleared after the boss encounter rolls. */
  pendingActBossHpBonus?: number;
  /** Grace stacks to grant the player at the start of the next combat (e.g. Travelling Preacher). Cleared on consume. */
  pendingNextFightGrace?: number;
  /** Extra swaps per turn granted at the start of the next combat (e.g. Campfire Stranger "Keep walking"). Cleared on consume. */
  pendingNextFightSwapBonus?: number;
  /** Total number of merchant "Upgrade" cards purchased so far this run. Each purchase raises the upgrade price in future shops by 50 gold. */
  merchantUpgradesPurchased?: number;
  /** Additive surcharge (fraction, e.g. 0.2 = +20%) applied to merchant prices for the rest of the current act (Medicine Wagon "Threaten him"). Cleared on advanceAct. */
  actMerchantSurcharge?: number;
  /** What killed the player on defeat -- enemy name, event title, or a generic tag like "Poison". Populated when endRun(false) is called; null/undefined for victories. */
  deathCause?: string;
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
  | 'axe'
  | 'mace'
  | 'cactus'
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
  | 'loot'
  | 'hourglass'
  | 'chainsaw'
  | 'sacrificial_blade'
  | 'jackhammer'
  | 'nunchucks'
  | 'milk'
  // Special
  | 'showdown'
  | 'tumbleweed'
  | 'fools_gold'
  | 'charcoal'
  | 'obsidian'
  | 'cheese';

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
  | 'rattlesnake'
  | 'corrupt';

export interface ArtifactInstance {
  id: string;
  tags: TraitId[];
  /** True once the artifact's one-shot effect has been spent (e.g. Shed Skin triggered, Gold Tooth picked up). */
  used?: boolean;
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
  wantedLevelMultiplier: number;
  timeBonus: number;
  finalScore: number;
  runDurationSeconds: number;
  nodesCleared: number;
  bossesDefeated: number;
  runCompleted: boolean;
}
