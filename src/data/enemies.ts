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
const applyTerrified = (stacks: number): MoveAction => ({ kind: 'apply_terrified', value: stacks });
const gainThorns = (stacks: number): MoveAction => ({ kind: 'gain_thorns', value: stacks });
const gainCloak = (stacks: number): MoveAction => ({ kind: 'gain_cloak', value: stacks });
const gainHardened = (stacks: number): MoveAction => ({ kind: 'gain_hardened', value: stacks });
const gainGrace = (stacks: number): MoveAction => ({ kind: 'gain_grace', value: stacks });
const gainDeadManWalking = (stacks: number): MoveAction => ({ kind: 'gain_dead_man_walking', value: stacks });
const gainBarricade = (stacks: number): MoveAction => ({ kind: 'gain_barricade', value: stacks });
const applyVulnerable = (stacks: number): MoveAction => ({ kind: 'apply_vulnerable', value: stacks });
const applyVulnerableSelf = (stacks: number): MoveAction => ({ kind: 'apply_vulnerable_self', value: stacks });
const healAlly = (value: number): MoveAction => ({ kind: 'heal_ally', value });
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
    health: 42,
    minDamage: 6, maxDamage: 12,
    abilities: ['lock', 'block'],
    moves: [
      { actions: [atk(12), lock(3)], weight: 2 },
      { actions: [multiAtk(6, 2)], weight: 2 },
      { actions: [atk(6), block(12)], weight: 1, lowHpWeight: 4, lowHpThreshold: 0.5 },
      { actions: [gainRageful(2)], weight: 1 },
      { actions: [summon('bandit')], weight: 1 },
    ],
  },
  coyote: {
    type: 'coyote',
    name: 'Coyote',
    health: 32,
    minDamage: 5, maxDamage: 7,
    abilities: ['howl'],
    moves: [
      { actions: [atk(7)], weight: 2 },
      { actions: [atk(5), gainRageful(2)], weight: 2 },
      { actions: [block(7), bury(2)], weight: 1 },
      { actions: [summon('coyote')], weight: 1 },
    ],
  },
  rattlesnake: {
    type: 'rattlesnake',
    name: 'Rattlesnake',
    health: 37,
    minDamage: 5, maxDamage: 11,
    abilities: ['poison', 'block'],
    startOfFight: [poisonTiles(3)],
    moves: [
      m(atk(11), applyPoison(2)),
      m(atk(5), poisonTiles(3)),
      m(block(8)),
      m(poisonTiles(5)),
    ],
  },
  vulture: {
    type: 'vulture',
    name: 'Vulture',
    health: 28,
    minDamage: 2, maxDamage: 8,
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
    health: 64,
    minDamage: 9, maxDamage: 12,
    abilities: ['bomb', 'bury'],
    moves: [
      m(atk(12)),
      m(atk(9), block(8)),
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
    minDamage: 12, maxDamage: 14,
    abilities: ['lock', 'summon'],
    startOfFight: [lockRow(), lockCol()],
    moves: [
      m(atk(14), lockRow()),
      m(multiAtk(4, 3), block(5), lock(3)),
      m(gainThorns(2), transformTumbleweed(5)),
      m(summon('coyote')),
    ],
  },
  dust_devil: {
    type: 'dust_devil',
    name: 'Dust Devil',
    health: 72,
    minDamage: 3, maxDamage: 13,
    abilities: ['bury', 'suppress'],
    startOfFight: [bury(8), gainCloak(1)],
    hpTriggers: [{
      threshold: 50,
      actions: [gainRageful(4)],
      once: true,
      forceNextMove: [multiAtk(2, 4)],
    }],
    moves: [
      m(atk(13), bury(3)),
      m(suppress(1), bury(3)),
      m(atk(10), shuffleRows(67)),   // bottom 2 rows (6,7)
      m(multiAtk(3, 3), shuffleRows(1)),  // top 2 rows (0,1)
    ],
  },
};

export const DUSTY_DAN: EnemyDefinition = {
  type: 'dusty_dan',
  name: '"Dusty" Dan McGraw',
  health: 188,
  minDamage: 14, maxDamage: 14,
  abilities: ['lock', 'summon', 'gravity_shift'],
  firstMove: m(summon('bandit'), summon('coyote')),
  moves: [
    m(gravityShift(), atk(14), block(12)),
    m(gravityShift(), summon('bandit')),
    m(gravityShift(), lockRow()),
    m(gravityShift(), lockCol()),
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
  powder_monkey: {
    type: 'powder_monkey',
    name: 'Powder Monkey',
    health: 53,
    minDamage: 3, maxDamage: 11,
    abilities: ['bomb', 'bury'],
    startOfFight: [bomb(1)],
    moves: [
      m(atk(11), bomb(1)),
      m(multiAtk(3, 3)),
      m(bomb(2)),
      m(bomb(1), bury(3)),
    ],
  },
  mining_canary: {
    type: 'mining_canary',
    name: 'Mining Canary',
    health: 37,
    minDamage: 2, maxDamage: 7,
    abilities: ['lock', 'bury'],
    moves: [
      m(atk(7), lock(2)),
      m(multiAtk(2, 3), bury(2)),
      m(lock(3)),
    ],
  },
  tunnel_rat: {
    type: 'tunnel_rat',
    name: 'Tunnel Rat',
    health: 68,
    minDamage: 8, maxDamage: 12,
    abilities: ['bury', 'summon'],
    startOfFight: [bury(3)],
    firstMove: m(block(8), bury(3)),
    moves: [
      m(atk(12), bury(2)),
      m(atk(8), heal(6)),
      m(block(8), bury(3)),
      m(summon('tunnel_rat')),
    ],
  },
  prospector_gone_mad: {
    type: 'prospector_gone_mad',
    name: 'Prospector Gone Mad',
    health: 73,
    minDamage: 4, maxDamage: 14,
    abilities: ['bomb'],
    moves: [
      m(atk(14), bomb(1)),
      m(gainRageful(5)),
      m(atk(12), bomb(2)),
      m(bomb(3), block(8)),
    ],
  },
};

export const ACT2_ELITE: Record<string, EnemyDefinition> = {
  mine_foreman: {
    type: 'mine_foreman',
    name: 'Mine Foreman',
    health: 123,
    minDamage: 3, maxDamage: 12,
    abilities: ['lock', 'suppress', 'block', 'bury'],
    moves: [
      m(atk(10), lock(5), bury(5)),
      m(atk(12), suppress(1), block(6)),
      m(multiAtk(3, 3), suppress(1)),
      m(block(11), lockRow()),
    ],
  },
  ore_golem: {
    type: 'ore_golem',
    name: 'Ore Golem',
    health: 145,
    minDamage: 5, maxDamage: 15,
    abilities: ['block', 'summon'],
    startOfFight: [gainHardened(15)],
    firstMove: m(summon('prospector_gone_mad')),
    moves: [
      m(atk(15)),
      m(block(20)),
      m(multiAtk(5, 3)),
      m(atk(5), gainRageful(3)),
      m(summon('prospector_gone_mad')),
    ],
  },
  mine_cart: {
    type: 'mine_cart',
    name: 'Mine Cart',
    health: 194,
    minDamage: 0, maxDamage: 0,
    abilities: ['hazard'],
    initialFuse: 5,
    moves: [
      m(bomb(1), lock(4)),
      m(bomb(2), lock(2)),
      m(bomb(3)),
      m(block(10), bomb(1), lock(2)),
    ],
  },
};

export const COPPERHEAD_CASSIDY: EnemyDefinition = {
  type: 'copperhead_cassidy',
  name: '"Copperhead" Cassidy',
  health: 260,
  minDamage: 3, maxDamage: 17,
  abilities: ['poison', 'block', 'fools_gold'],
  startOfFight: [poisonTiles(4)],
  // Phase transition at 50% HP handled by BossController (clear statuses, lock edges)
  moves: [
    m(atk(17), poisonTiles(4)),
    m(block(8), applyPoison(3)),
    m(multiAtk(3, 3)),  // hits = poison tiles on board (handled by boss controller)
    m(atk(12), poisonTiles(2), foolsGold(5)),
    m(heal(0)),  // clear poison tiles + heal 2% per tile (handled by boss controller)
  ],
};

export const ACT2_ENEMIES: Record<string, EnemyDefinition> = { ...ACT2_NORMAL, ...ACT2_ELITE };

export const ACT2_EARLY_ENCOUNTERS: string[][] = [
  ['prospector_gone_mad'],
  ['powder_monkey', 'powder_monkey'],
  ['tunnel_rat', 'tunnel_rat'],
  ['mining_canary', 'mining_canary', 'mining_canary'],
];

export const ACT2_LATE_ENCOUNTERS: string[][] = [
  ['prospector_gone_mad', 'mining_canary', 'mining_canary'],
  ['powder_monkey', 'powder_monkey', 'powder_monkey'],
  ['tunnel_rat', 'powder_monkey', 'mining_canary'],
];

// ---------------------------------------------------------------------------
// Act 3 -- The Town
// ---------------------------------------------------------------------------

export const ACT3_NORMAL: Record<string, EnemyDefinition> = {
  train_guard: {
    type: 'train_guard',
    name: 'Train Guard',
    health: 88,
    minDamage: 4, maxDamage: 16,
    abilities: ['lock', 'block'],
    startOfFight: [lockCol()],
    moves: [
      m(atk(16), lock(2)),
      m(multiAtk(4, 4), lock(4)),
      m(atk(4), block(6), applyVulnerable(2)),
      m(lockRow(), block(10)),
    ],
  },
  hellfire_preacher: {
    type: 'hellfire_preacher',
    name: 'Hellfire Preacher',
    health: 76,
    minDamage: 3, maxDamage: 16,
    abilities: ['block', 'bomb', 'heal'],
    startOfFight: [gainGrace(3)],
    moves: [
      m(multiAtk(3, 2), block(6), applyTerrified(1)),
      m(atk(16), heal(6)),
      m(heal(14), bomb(2)),
      m(bomb(6)),
      m(healAlly(12)),
    ],
  },
  hangman: {
    type: 'hangman',
    name: 'Hangman',
    health: 138,
    minDamage: 8, maxDamage: 20,
    abilities: ['lock', 'suppress'],
    sequential: true,
    startOfFight: [applyTerrified(1)],
    moves: [
      m(lock(2), suppress(2)),
      m(atk(8), applyVulnerable(3)),
      m(block(18), gainRageful(2)),
      m(atk(20), applyVulnerableSelf(2)),
    ],
  },
  corrupt_deputy: {
    type: 'corrupt_deputy',
    name: 'Corrupt Deputy',
    health: 120,
    minDamage: 6, maxDamage: 13,
    abilities: ['lock', 'suppress', 'block', 'summon'],
    moves: [
      m(atk(13), lock(5)),
      m(atk(11), suppress(1)),
      m(multiAtk(6, 3), lock(1)),
      m(block(14), lock(5)),
      m(summon('bandit'), summon('bandit')),
    ],
  },
};

export const ACT3_ELITE: Record<string, EnemyDefinition> = {
  saloon_brawler: {
    type: 'saloon_brawler',
    name: 'Saloon Brawler',
    health: 220,
    minDamage: 2, maxDamage: 20,
    abilities: [],
    moves: [
      m(multiAtk(2, 6)),
      m(multiAtk(4, 2), gainRageful(2)),
      m(atk(20)),
      m(multiAtk(5, 3)),
    ],
  },
  sheriffs_shadow: {
    type: 'sheriffs_shadow',
    name: "Sheriff's Shadow",
    health: 213,
    minDamage: 12, maxDamage: 18,
    abilities: ['block', 'suppress'],
    startOfFight: [block(30)],
    moves: [
      m(atk(12), block(12), suppress(1)),
      m(atk(18), suppress(2)),
      m(suppress(3)),
      m(block(24)),
    ],
  },
};

// ---------------------------------------------------------------------------
// Outlaw King -- one act-scaled version. Spawned via 1% chance in late normal
// and elite encounters (any act). Once per run.
// ---------------------------------------------------------------------------

export const OUTLAW_KING_ACT1: EnemyDefinition = {
  type: 'outlaw_king_act1',
  name: 'Outlaw King',
  health: 126,
  minDamage: 5, maxDamage: 18,
  abilities: ['block'],
  startOfFight: [applyTerrified(2), gainCloak(1), gainDeadManWalking(1)],
  moves: [
    m(atk(10), block(8)),
    m(multiAtk(5, 3), gainRageful(2)),
    m(block(12)),
    m(atk(18)),
  ],
};

export const OUTLAW_KING_ACT2: EnemyDefinition = {
  type: 'outlaw_king_act2',
  name: 'Outlaw King',
  health: 196,
  minDamage: 6, maxDamage: 20,
  abilities: ['block'],
  startOfFight: [applyTerrified(2), gainCloak(1), gainDeadManWalking(1)],
  moves: [
    m(atk(12), block(8)),
    m(multiAtk(6, 3), gainRageful(2)),
    m(block(14)),
    m(atk(20)),
  ],
};

export const OUTLAW_KING_ACT3: EnemyDefinition = {
  type: 'outlaw_king',
  name: 'Outlaw King',
  health: 288,
  minDamage: 8, maxDamage: 24,
  abilities: ['block'],
  startOfFight: [applyTerrified(2), gainCloak(1), gainDeadManWalking(1)],
  moves: [
    m(atk(15), block(8)),
    m(multiAtk(7, 3), gainRageful(2)),
    m(block(16)),
    m(atk(24)),
  ],
};

export const IRON_EYE_ISABELLA: EnemyDefinition = {
  type: 'iron_eye_isabella',
  name: '"Iron Eye" Isabella',
  health: 320,
  minDamage: 15, maxDamage: 28,
  abilities: ['lock', 'suppress'],
  startOfFight: [lockRow(), lockRow()],
  hpTriggers: [{
    threshold: 50,
    once: true,
    actions: [
      gainRageful(5),
      block(30),
      gainBarricade(1),
      gainCloak(1),
      gainGrace(1),
      applyTerrified(3),
    ],
  }],
  moves: [
    m(atk(15), lockRow(), lockCol()),
    m(atk(22), suppress(2)),
    m(atk(28)),
    m(suppress(5)),
  ],
};

export const ACT3_ENEMIES: Record<string, EnemyDefinition> = { ...ACT3_NORMAL, ...ACT3_ELITE };

export const ACT3_EARLY_ENCOUNTERS: string[][] = [
  ['train_guard'],
  ['hellfire_preacher'],
  ['corrupt_deputy'],
];

export const ACT3_LATE_ENCOUNTERS: string[][] = [
  ['hangman'],
  ['corrupt_deputy', 'coyote'],
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
  // Outlaw King variants (spawned via 1% encounter chance, not boss/elite pools)
  outlaw_king: OUTLAW_KING_ACT3,
  outlaw_king_act1: OUTLAW_KING_ACT1,
  outlaw_king_act2: OUTLAW_KING_ACT2,
};

export const BOSSES: Record<number, EnemyDefinition> = {
  1: DUSTY_DAN,
  2: COPPERHEAD_CASSIDY,
  3: IRON_EYE_ISABELLA,
};

/** Non-summoned companions that start alongside the boss. */
export const BOSS_COMPANIONS: Record<number, string[]> = {
  1: [],
  2: ['rattlesnake'],
  3: [],
};

// ---------------------------------------------------------------------------
// Encounter generation (bag system — no repeats until pool exhausted)
// ---------------------------------------------------------------------------

/** Bag that draws without replacement, refilling when empty. */
class EncounterBag {
  private remaining: number[] = [];
  constructor(private size: number) {}

  draw(rand: () => number): number {
    if (this.remaining.length === 0) {
      this.remaining = Array.from({ length: this.size }, (_, i) => i);
    }
    const idx = Math.floor(rand() * this.remaining.length);
    return this.remaining.splice(idx, 1)[0];
  }
}

// One bag per encounter pool so draws don't repeat
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const encounterBags = new Map<any, EncounterBag>();

function getBag(key: unknown, size: number): EncounterBag {
  let bag = encounterBags.get(key);
  if (!bag) {
    bag = new EncounterBag(size);
    encounterBags.set(key, bag);
  }
  return bag;
}

/** Chance per late-normal/elite encounter to roll Outlaw King (once per run). */
const OUTLAW_KING_ENCOUNTER_CHANCE = 0.01;

/** Build an Outlaw King encounter scaled to the given act, including his Coyote companions. */
export function buildOutlawKingEncounter(act: 1 | 2 | 3): EnemyDefinition[] {
  let king: EnemyDefinition;
  let coyoteCount: number;
  let coyoteAtFullHp: boolean;
  switch (act) {
    case 1:
      king = OUTLAW_KING_ACT1;
      coyoteCount = 1;
      coyoteAtFullHp = false;
      break;
    case 2:
      king = OUTLAW_KING_ACT2;
      coyoteCount = 2;
      coyoteAtFullHp = false;
      break;
    case 3:
      king = OUTLAW_KING_ACT3;
      coyoteCount = 2;
      coyoteAtFullHp = true;
      break;
  }
  const result: EnemyDefinition[] = [{ ...king }];
  const coyote = ACT1_NORMAL.coyote;
  for (let i = 0; i < coyoteCount; i++) {
    const c = { ...coyote, _summoned: true } as EnemyDefinition;
    if (!coyoteAtFullHp) c.health = Math.max(1, Math.round(coyote.health / 3));
    result.push(c);
  }
  return result;
}

/** True if any enemy in the encounter is an Outlaw King variant. */
export function encounterContainsOutlawKing(enemies: EnemyDefinition[]): boolean {
  return enemies.some((e) => e.type === 'outlaw_king' || e.type.startsWith('outlaw_king_'));
}

/** Pick a preset encounter from a bag (no repeats until pool exhausted). */
function rollPresetEncounter(
  presets: string[][],
  normalPool: Record<string, EnemyDefinition>,
  rand: () => number,
): EnemyDefinition[] {
  const bag = getBag(presets, presets.length);
  const preset = presets[bag.draw(rand)];
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

/** Late encounter: 25% early preset, 50% late preset, 25% dynamic. */
function rollLateEncounter(
  early: string[][], late: string[][],
  normals: Record<string, EnemyDefinition>, exclude: string[],
  rand: () => number,
  noDuplicateTypes: string[] = [],
): EnemyDefinition[] {
  const r = rand();
  if (r < 0.25 && early.length > 0) return rollPresetEncounter(early, normals, rand);
  if (r < 0.75 && late.length > 0) return rollPresetEncounter(late, normals, rand);
  return rollDynamicEncounter(normals, 2, exclude, rand, noDuplicateTypes);
}

/** Pick N random enemies from the normal pool, excluding certain types.
 *  Types listed in `noDuplicateTypes` may appear at most once in the result. */
function rollDynamicEncounter(
  normalPool: Record<string, EnemyDefinition>,
  count: number,
  exclude: string[],
  rand: () => number,
  noDuplicateTypes: string[] = [],
): EnemyDefinition[] {
  const pool = Object.values(normalPool).filter((e) => !exclude.includes(e.type));
  if (pool.length === 0) return [];
  const picks: EnemyDefinition[] = [];
  for (let i = 0; i < count; i++) {
    const forbidden = picks
      .map((p) => p.type)
      .filter((t) => noDuplicateTypes.includes(t));
    const candidates = forbidden.length > 0
      ? pool.filter((e) => !forbidden.includes(e.type))
      : pool;
    const effective = candidates.length > 0 ? candidates : pool;
    picks.push({ ...effective[Math.floor(rand() * effective.length)] });
  }
  return picks;
}

// --- Act 1 ---

export function rollAct1Encounter(
  rand: () => number = Math.random,
  nodeIndex = 99,
  outlawKingAvailable = false,
): EnemyDefinition[] {
  const isEarly = nodeIndex < 3;
  if (isEarly) {
    return rollPresetEncounter(ACT1_EARLY_ENCOUNTERS, ACT1_NORMAL, rand);
  }
  if (outlawKingAvailable && rand() < OUTLAW_KING_ENCOUNTER_CHANCE) {
    return buildOutlawKingEncounter(1);
  }
  return rollLateEncounter(ACT1_EARLY_ENCOUNTERS, ACT1_LATE_ENCOUNTERS, ACT1_NORMAL, ['pack_mule'], rand);
}

export function rollAct1EliteEncounter(
  rand: () => number = Math.random,
  outlawKingAvailable = false,
): EnemyDefinition[] {
  if (outlawKingAvailable && rand() < OUTLAW_KING_ENCOUNTER_CHANCE) {
    return buildOutlawKingEncounter(1);
  }
  const pool = Object.values(ACT1_ELITE);
  const bag = getBag(ACT1_ELITE, pool.length);
  return [{ ...pool[bag.draw(rand)] }];
}

// --- Act 2 ---

export function rollAct2Encounter(
  rand: () => number = Math.random,
  nodeIndex = 99,
  outlawKingAvailable = false,
): EnemyDefinition[] {
  const isEarly = nodeIndex < 3;
  if (isEarly) {
    return rollPresetEncounter(ACT2_EARLY_ENCOUNTERS, ACT2_NORMAL, rand);
  }
  if (outlawKingAvailable && rand() < OUTLAW_KING_ENCOUNTER_CHANCE) {
    return buildOutlawKingEncounter(2);
  }
  return rollLateEncounter(
    ACT2_EARLY_ENCOUNTERS, ACT2_LATE_ENCOUNTERS, ACT2_NORMAL,
    ['mining_canary'], rand, ['prospector_gone_mad'],
  );
}

export function rollAct2EliteEncounter(
  rand: () => number = Math.random,
  outlawKingAvailable = false,
): EnemyDefinition[] {
  if (outlawKingAvailable && rand() < OUTLAW_KING_ENCOUNTER_CHANCE) {
    return buildOutlawKingEncounter(2);
  }
  const pool = Object.values(ACT2_ELITE);
  const bag = getBag(ACT2_ELITE, pool.length);
  return [{ ...pool[bag.draw(rand)] }];
}

// --- Act 3 ---

export function rollAct3Encounter(
  rand: () => number = Math.random,
  nodeIndex = 99,
  outlawKingAvailable = false,
): EnemyDefinition[] {
  const isEarly = nodeIndex < 3;
  if (isEarly) {
    return rollPresetEncounter(ACT3_EARLY_ENCOUNTERS, ACT3_NORMAL, rand);
  }
  if (outlawKingAvailable && rand() < OUTLAW_KING_ENCOUNTER_CHANCE) {
    return buildOutlawKingEncounter(3);
  }
  return rollLateEncounter(ACT3_EARLY_ENCOUNTERS, ACT3_LATE_ENCOUNTERS, ACT3_NORMAL, ['hangman', 'corrupt_deputy'], rand);
}

export function rollAct3EliteEncounter(
  rand: () => number = Math.random,
  outlawKingAvailable = false,
): EnemyDefinition[] {
  if (outlawKingAvailable && rand() < OUTLAW_KING_ENCOUNTER_CHANCE) {
    return buildOutlawKingEncounter(3);
  }
  const pool = Object.values(ACT3_ELITE);
  const bag = getBag(ACT3_ELITE, pool.length);
  return [{ ...pool[bag.draw(rand)] }];
}
