import type { EnemyDefinition, EnemyMove, MoveAction } from '../types/combat';

// Helper to build moves concisely
const atk = (value: number): MoveAction => ({ kind: 'attack', value });
const multiAtk = (value: number, hits: number): MoveAction => ({ kind: 'multi_attack', value, hits });
const block = (value: number): MoveAction => ({ kind: 'block', value });
const lock = (value: number): MoveAction => ({ kind: 'lock', value });
const lockRow = (): MoveAction => ({ kind: 'lock_row', value: 1 });
const lockCol = (): MoveAction => ({ kind: 'lock_column', value: 1 });
const poisonTiles = (count: number): MoveAction => ({ kind: 'poison_tiles', value: count });
const applyPoison = (stacks: number): MoveAction => ({ kind: 'apply_poison', value: stacks });
const bomb = (count: number): MoveAction => ({ kind: 'bomb', value: count });
const bury = (count: number): MoveAction => ({ kind: 'bury', value: count });
const suppress = (count: number): MoveAction => ({ kind: 'suppress', value: count });
const foolsGold = (count: number): MoveAction => ({ kind: 'fools_gold', value: count });
const summon = (type: string): MoveAction => ({ kind: 'summon', value: 1, summonType: type });
const heal = (value: number): MoveAction => ({ kind: 'heal', value });
const gainRageful = (stacks: number): MoveAction => ({ kind: 'gain_rageful', value: stacks });
const applyTerrified = (stacks: number): MoveAction => ({ kind: 'gain_terrified', value: stacks });
const shuffleRows = (rows: number): MoveAction => ({ kind: 'shuffle_rows', value: rows });
const gravityShift = (): MoveAction => ({ kind: 'gravity_shift', value: 1 });
const transformTumbleweed = (count: number): MoveAction => ({ kind: 'transform_tumbleweed', value: count });
const m = (...actions: MoveAction[]): EnemyMove => ({ actions });

// ---------------------------------------------------------------------------
// Act 1 -- The Dusty Trail
// ---------------------------------------------------------------------------

export const ACT1_NORMAL: Record<string, EnemyDefinition> = {
  bandit: {
    type: 'bandit',
    name: 'Bandit',
    health: 45,
    minDamage: 6, maxDamage: 12,
    abilities: ['lock', 'block'],
    moves: [
      m(atk(12), lock(3)),
      m(multiAtk(6, 2)),
      m(atk(6), block(12)),
      m(gainRageful(2)),
      m(summon('bandit')),
    ],
  },
  coyote: {
    type: 'coyote',
    name: 'Coyote',
    health: 32,
    minDamage: 5, maxDamage: 7,
    abilities: ['howl'],
    moves: [
      m(atk(7)),
      m(atk(5), gainRageful(2)),
      m(block(7), bury(2)),
      m(summon('coyote')),
    ],
  },
  rattlesnake: {
    type: 'rattlesnake',
    name: 'Rattlesnake',
    health: 40,
    minDamage: 5, maxDamage: 11,
    abilities: ['poison', 'block'],
    startOfFight: [poisonTiles(3)],
    moves: [
      m(atk(11), applyPoison(2)),
      m(atk(5), poisonTiles(3)),
      m(block(14)),
      m(poisonTiles(5)),
    ],
  },
  vulture: {
    type: 'vulture',
    name: 'Vulture',
    health: 29,
    minDamage: 4, maxDamage: 8,
    abilities: ['bury'],
    moves: [
      m(atk(8), applyTerrified(1)),
      m(multiAtk(2, 3), bury(3)),
      m(atk(4), block(6)),
      m(heal(6)),
    ],
  },
  pack_mule: {
    type: 'pack_mule',
    name: 'Pack Mule',
    health: 68,
    minDamage: 10, maxDamage: 13,
    abilities: ['bomb', 'bury'],
    moves: [
      m(atk(13)),
      m(atk(10), block(8)),
      m(bomb(1), bury(3)),
      m(heal(8)),
    ],
  },
};

export const ACT1_ELITE: Record<string, EnemyDefinition> = {
  tumbleweed_golem: {
    type: 'tumbleweed_golem',
    name: 'Tumbleweed Golem',
    health: 84,
    minDamage: 12, maxDamage: 16,
    abilities: ['lock', 'summon'],
    startOfFight: [lockRow(), lockCol()],
    moves: [
      m(atk(16), lockRow()),
      m(multiAtk(4, 3), block(9), lock(3)),
      m(block(18), transformTumbleweed(5)),
      m(summon('coyote')),
    ],
  },
  dust_devil: {
    type: 'dust_devil',
    name: 'Dust Devil',
    health: 72,
    minDamage: 11, maxDamage: 18,
    abilities: ['bury', 'suppress'],
    startOfFight: [bury(8)],
    hpTriggers: [{ threshold: 50, actions: [gainRageful(4)], once: true }],
    moves: [
      m(atk(18), bury(3)),
      m(suppress(2), bury(3)),
      m(atk(11), shuffleRows(67)),   // bottom 2 rows (6,7)
      m(multiAtk(4, 3), shuffleRows(1)),  // top 2 rows (0,1)
    ],
  },
};

export const DUSTY_DAN: EnemyDefinition = {
  type: 'dusty_dan',
  name: '"Dusty" Dan McGraw',
  health: 196,
  minDamage: 10, maxDamage: 14,
  abilities: ['lock', 'summon', 'bomb', 'gravity_shift'],
  moves: [
    m(gravityShift(), block(12)),
    m(gravityShift(), atk(14)),
    m(gravityShift(), lockRow()),
    m(gravityShift(), lockCol()),
    m(summon('coyote')),
    m(summon('bandit')),
  ],
};

// Legacy combined record for backward compat
export const ACT1_ENEMIES: Record<string, EnemyDefinition> = { ...ACT1_NORMAL, ...ACT1_ELITE };

// Early/Late encounter presets (enemy type keys)
export const ACT1_EARLY_ENCOUNTERS: string[][] = [
  ['coyote'],
  ['bandit'],
  ['vulture', 'vulture'],
];

export const ACT1_LATE_ENCOUNTERS: string[][] = [
  ['coyote', 'coyote:summoned', 'coyote:summoned'],
  ['vulture', 'vulture', 'vulture'],
  ['pack_mule'],
  // 'dynamic:2' = pick any 2 from normal pool (except pack_mule)
];

// ---------------------------------------------------------------------------
// Act 2 -- The Canyon
// ---------------------------------------------------------------------------

export const ACT2_NORMAL: Record<string, EnemyDefinition> = {
  prospector_gone_mad: {
    type: 'prospector_gone_mad',
    name: 'Prospector Gone Mad',
    health: 66,
    minDamage: 12, maxDamage: 15,
    abilities: ['bomb'],
    moves: [
      m(atk(15), bomb(1)),
      m(multiAtk(6, 3)),
      m(atk(12), bomb(2)),
      m(bomb(3), block(8)),
    ],
  },
  cave_bat: {
    type: 'cave_bat',
    name: 'Cave Bat',
    health: 18,
    minDamage: 4, maxDamage: 6,
    abilities: ['bury'],
    moves: [
      m(atk(6)),
      m(atk(4), bury(2)),
      m(bury(3)),
    ],
  },
  powder_monkey: {
    type: 'powder_monkey',
    name: 'Powder Monkey',
    health: 30,
    minDamage: 8, maxDamage: 11,
    abilities: ['bomb'],
    moves: [
      m(atk(11), bomb(1)),
      m(multiAtk(4, 3)),
      m(atk(8), bomb(2)),
      m(bomb(2), bury(2)),
    ],
  },
  canary_swarm: {
    type: 'canary_swarm',
    name: 'Canary Swarm',
    health: 12,
    minDamage: 3, maxDamage: 4,
    abilities: ['bury'],
    moves: [
      m(atk(4)),
      m(atk(3), bury(2)),
      m(bury(3)),
    ],
  },
};

export const ACT2_ELITE: Record<string, EnemyDefinition> = {
  dynamite_outlaw: {
    type: 'dynamite_outlaw',
    name: 'Dynamite Outlaw',
    health: 96,
    minDamage: 15, maxDamage: 18,
    abilities: ['lock', 'block'],
    moves: [
      m(atk(18), lock(2)),
      m(multiAtk(7, 3), lock(1)),
      m(block(16), lock(3)),
      m(atk(15), block(8)),
    ],
  },
  mine_foreman: {
    type: 'mine_foreman',
    name: 'Mine Foreman',
    health: 84,
    minDamage: 12, maxDamage: 16,
    abilities: ['lock', 'suppress', 'block'],
    moves: [
      m(atk(16), lock(2)),
      m(atk(12), suppress(2), block(6)),
      m(multiAtk(6, 3), suppress(2)),
      m(block(14), lockRow()),
    ],
  },
  mine_cart: {
    type: 'mine_cart',
    name: 'Mine Cart',
    health: 120,
    minDamage: 0, maxDamage: 0,
    abilities: ['hazard'],
    moves: [],
  },
};

export const COPPERHEAD_CASSIDY: EnemyDefinition = {
  type: 'copperhead_cassidy',
  name: '"Copperhead" Cassidy',
  health: 288,
  minDamage: 15, maxDamage: 20,
  abilities: ['poison', 'block', 'fools_gold'],
  startOfFight: [poisonTiles(4)],
  moves: [
    m(applyPoison(3), block(8)),
    m(atk(20)),  // + 2 x poison tiles on board (handled by boss controller)
    m(atk(18), poisonTiles(2), foolsGold(2)),
    m(block(12), poisonTiles(4)),
  ],
};

export const ACT2_ENEMIES: Record<string, EnemyDefinition> = { ...ACT2_NORMAL, ...ACT2_ELITE };

export const ACT2_EARLY_ENCOUNTERS: string[][] = [
  ['prospector_gone_mad'],
  ['powder_monkey'],
  ['cave_bat', 'cave_bat', 'cave_bat'],
  ['canary_swarm', 'canary_swarm', 'canary_swarm'],
];

export const ACT2_LATE_ENCOUNTERS: string[][] = [
  // 'dynamic:2' = pick any 2 from normal pool (except cave_bat and canary_swarm)
];

// ---------------------------------------------------------------------------
// Act 3 -- The Town
// ---------------------------------------------------------------------------

export const ACT3_NORMAL: Record<string, EnemyDefinition> = {
  card_shark: {
    type: 'card_shark',
    name: 'Card Shark',
    health: 77,
    minDamage: 12, maxDamage: 16,
    abilities: ['lock', 'suppress'],
    startOfFight: [lockRow(), lockCol()],
    moves: [
      m(atk(16), lockRow()),
      m(multiAtk(5, 3), block(9), lock(3)),
      m(block(18), transformTumbleweed(5)),
      m(summon('coyote')),
    ],
  },
  corrupt_deputy: {
    type: 'corrupt_deputy',
    name: 'Corrupt Deputy',
    health: 78,
    minDamage: 18, maxDamage: 21,
    abilities: ['lock', 'suppress', 'block'],
    moves: [
      m(atk(21), lock(2)),
      m(atk(18), suppress(2)),
      m(multiAtk(9, 3), lock(1)),
      m(block(14), lock(3)),
    ],
  },
  train_guard: {
    type: 'train_guard',
    name: 'Train Guard',
    health: 90,
    minDamage: 15, maxDamage: 17,
    abilities: ['lock', 'bomb'],
    moves: [
      m(atk(17), lock(2)),
      m(atk(15), bomb(1)),
      m(multiAtk(5, 4), lock(1)),
      m(bomb(2), lock(3)),
    ],
  },
  hangman: {
    type: 'hangman',
    name: 'Hangman',
    health: 108,
    minDamage: 20, maxDamage: 24,
    abilities: ['lock', 'poison'],
    moves: [
      m(atk(24), lock(2)),
      m(atk(20), applyPoison(2)),
      m(multiAtk(7, 4), poisonTiles(3)),
      m(lock(3), poisonTiles(4)),
    ],
  },
  phantom_rider: {
    type: 'phantom_rider',
    name: 'Phantom Rider',
    health: 72,
    minDamage: 15, maxDamage: 18,
    abilities: ['suppress', 'bury'],
    moves: [
      m(atk(18), suppress(2)),
      m(atk(15), bury(3)),
      m(multiAtk(5, 4), bury(2)),
      m(suppress(2), bury(3)),
    ],
  },
  dynamite_duchess: {
    type: 'dynamite_duchess',
    name: 'Dynamite Duchess',
    health: 96,
    minDamage: 18, maxDamage: 21,
    abilities: ['bomb', 'lock'],
    moves: [
      m(atk(21), bomb(1)),
      m(atk(18), lock(2), bomb(1)),
      m(multiAtk(6, 4), bomb(1)),
      m(bomb(3), lock(2)),
    ],
  },
};

export const ACT3_ELITE: Record<string, EnemyDefinition> = {
  saloon_brawler: {
    type: 'saloon_brawler',
    name: 'Saloon Brawler',
    health: 120,
    minDamage: 22, maxDamage: 30,
    abilities: [],
    moves: [
      m(atk(26)),
      m(multiAtk(11, 3)),
      m(atk(22), gainRageful(2)),
      m(atk(30)),
    ],
  },
  sheriffs_shadow: {
    type: 'sheriffs_shadow',
    name: "Sheriff's Shadow",
    health: 120,
    minDamage: 20, maxDamage: 25,
    abilities: ['block', 'lock', 'suppress'],
    moves: [
      m(atk(25), lock(2)),
      m(atk(20), suppress(2), block(8)),
      m(multiAtk(10, 3), lock(1)),
      m(block(20), lock(3), suppress(2)),
    ],
  },
  outlaw_king: {
    type: 'outlaw_king',
    name: 'Outlaw King',
    health: 108,
    minDamage: 22, maxDamage: 25,
    abilities: ['block', 'summon'],
    moves: [
      m(atk(25), block(8)),
      m(multiAtk(9, 3), gainRageful(2)),
      m(block(16), summon('bandit')),
      m(atk(22), summon('coyote')),
    ],
  },
};

export const IRON_EYE_ISABELLA: EnemyDefinition = {
  type: 'iron_eye_isabella',
  name: '"Iron Eye" Isabella',
  health: 360,
  minDamage: 15, maxDamage: 32,
  abilities: ['lock', 'suppress', 'poison'],
  startOfFight: [lockRow()],
  moves: [
    m(atk(15), lockRow()),
    m(atk(25), suppress(2)),
    m(atk(32)),
    m(lock(2), suppress(2), block(10)),
  ],
};

export const ACT3_ENEMIES: Record<string, EnemyDefinition> = { ...ACT3_NORMAL, ...ACT3_ELITE };

export const ACT3_EARLY_ENCOUNTERS: string[][] = [
  ['card_shark'],
  ['corrupt_deputy'],
  ['train_guard'],
  ['phantom_rider', 'phantom_rider'],
];

export const ACT3_LATE_ENCOUNTERS: string[][] = [
  ['hangman'],
  ['dynamite_duchess'],
  // 'dynamic:2' = pick any 2 from normal pool (except hangman and dynamite_duchess)
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export const ALL_ENEMIES: Record<string, EnemyDefinition> = {
  ...ACT1_ENEMIES,
  dusty_dan: DUSTY_DAN,
  ...ACT2_ENEMIES,
  copperhead_cassidy: COPPERHEAD_CASSIDY,
  ...ACT3_ENEMIES,
  iron_eye_isabella: IRON_EYE_ISABELLA,
};

export const BOSSES: Record<number, EnemyDefinition> = {
  1: DUSTY_DAN,
  2: COPPERHEAD_CASSIDY,
  3: IRON_EYE_ISABELLA,
};

// ---------------------------------------------------------------------------
// Encounter generation
// ---------------------------------------------------------------------------

/** Pick a random encounter from a preset bag. Supports summoned enemies (type:summoned). */
function rollPresetEncounter(
  presets: string[][],
  normalPool: Record<string, EnemyDefinition>,
  _dynamicExclude: string[],
  rand: () => number,
): EnemyDefinition[] {
  const preset = presets[Math.floor(rand() * presets.length)];
  return preset.map((key) => {
    const isSummoned = key.endsWith(':summoned');
    const type = isSummoned ? key.replace(':summoned', '') : key;
    const def = normalPool[type] ?? ALL_ENEMIES[type];
    if (!def) return { type, name: type, health: 20, minDamage: 5, maxDamage: 10, abilities: [] };
    const enemy = { ...def, _summoned: false };
    if (isSummoned) {
      enemy.health = Math.max(1, Math.round(def.health / 3));
      enemy._summoned = true;
    }
    return enemy;
  });
}

/** Pick N random enemies from the normal pool, excluding certain types. */
function rollDynamicEncounter(
  normalPool: Record<string, EnemyDefinition>,
  count: number,
  exclude: string[],
  rand: () => number,
): EnemyDefinition[] {
  const pool = Object.values(normalPool).filter((e) => !exclude.includes(e.type));
  if (pool.length === 0) return [];
  return Array.from({ length: count }, () => {
    const def = pool[Math.floor(rand() * pool.length)];
    return { ...def };
  });
}

// --- Act 1 ---

export function rollAct1Encounter(rand: () => number = Math.random, nodeIndex = 99): EnemyDefinition[] {
  const isEarly = nodeIndex < 3;
  if (isEarly) {
    return rollPresetEncounter(ACT1_EARLY_ENCOUNTERS, ACT1_NORMAL, [], rand);
  }
  // Late: 50% preset, 50% dynamic 2 (except pack_mule)
  if (ACT1_LATE_ENCOUNTERS.length > 0 && rand() < 0.5) {
    return rollPresetEncounter(ACT1_LATE_ENCOUNTERS, ACT1_NORMAL, ['pack_mule'], rand);
  }
  return rollDynamicEncounter(ACT1_NORMAL, 2, ['pack_mule'], rand);
}

export function rollAct1EliteEncounter(rand: () => number = Math.random): EnemyDefinition[] {
  const pool = Object.values(ACT1_ELITE);
  return [{ ...pool[Math.floor(rand() * pool.length)] }];
}

// --- Act 2 ---

export function rollAct2Encounter(rand: () => number = Math.random, nodeIndex = 99): EnemyDefinition[] {
  const isEarly = nodeIndex < 3;
  if (isEarly) {
    return rollPresetEncounter(ACT2_EARLY_ENCOUNTERS, ACT2_NORMAL, [], rand);
  }
  // Late: dynamic 2 (except cave_bat and canary_swarm)
  return rollDynamicEncounter(ACT2_NORMAL, 2, ['cave_bat', 'canary_swarm'], rand);
}

export function rollAct2EliteEncounter(rand: () => number = Math.random): EnemyDefinition[] {
  const pool = Object.values(ACT2_ELITE);
  return [{ ...pool[Math.floor(rand() * pool.length)] }];
}

// --- Act 3 ---

export function rollAct3Encounter(rand: () => number = Math.random, nodeIndex = 99): EnemyDefinition[] {
  const isEarly = nodeIndex < 3;
  if (isEarly) {
    return rollPresetEncounter(ACT3_EARLY_ENCOUNTERS, ACT3_NORMAL, [], rand);
  }
  // Late: 40% preset, 60% dynamic 2 (except hangman and dynamite_duchess)
  if (ACT3_LATE_ENCOUNTERS.length > 0 && rand() < 0.4) {
    return rollPresetEncounter(ACT3_LATE_ENCOUNTERS, ACT3_NORMAL, [], rand);
  }
  return rollDynamicEncounter(ACT3_NORMAL, 2, ['hangman', 'dynamite_duchess'], rand);
}

export function rollAct3EliteEncounter(rand: () => number = Math.random): EnemyDefinition[] {
  const pool = Object.values(ACT3_ELITE);
  return [{ ...pool[Math.floor(rand() * pool.length)] }];
}
