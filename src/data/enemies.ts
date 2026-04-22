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
const summon = (type: string, fullHp = false): MoveAction => ({ kind: 'summon', value: 1, summonType: type, summonFullHp: fullHp });
const heal = (value: number): MoveAction => ({ kind: 'heal', value });
const gainRageful = (stacks: number): MoveAction => ({ kind: 'gain_rageful', value: stacks });
const applyTerrified = (stacks: number): MoveAction => ({ kind: 'apply_terrified', value: stacks });
const gainThorns = (stacks: number): MoveAction => ({ kind: 'gain_thorns', value: stacks });
const gainCloak = (stacks: number): MoveAction => ({ kind: 'gain_cloak', value: stacks });
const gainHardened = (stacks: number): MoveAction => ({ kind: 'gain_hardened', value: stacks });
const gainGrace = (stacks: number): MoveAction => ({ kind: 'gain_grace', value: stacks });
const gainDeadManWalking = (stacks: number): MoveAction => ({ kind: 'gain_dead_man_walking', value: stacks });
// @ts-ignore -- available for enemy definitions
const gainBarricade = (stacks: number): MoveAction => ({ kind: 'gain_barricade', value: stacks });
const gainInvulnerable = (stacks: number): MoveAction => ({ kind: 'gain_invulnerable', value: stacks });
const applyVulnerable = (stacks: number): MoveAction => ({ kind: 'apply_vulnerable', value: stacks });
const applyVulnerableSelf = (stacks: number): MoveAction => ({ kind: 'apply_vulnerable_self', value: stacks });
// @ts-ignore -- available for enemy definitions
const healAlly = (value: number): MoveAction => ({ kind: 'heal_ally', value });
const shuffleRows = (rows: number): MoveAction => ({ kind: 'shuffle_rows', value: rows });
const gravityShift = (): MoveAction => ({ kind: 'gravity_shift', value: 1 });
const transformTumbleweed = (count: number): MoveAction => ({ kind: 'transform_tumbleweed', value: count });
const gainScavenger = (stacks: number): MoveAction => ({ kind: 'gain_scavenger', value: stacks });
const m = (...actions: MoveAction[]): EnemyMove => ({ actions });

// ---------------------------------------------------------------------------
// Act 1 -- The Dusty Trail
// ---------------------------------------------------------------------------

export const ACT1_NORMAL: Record<string, EnemyDefinition> = {
  bandit: {
    type: 'bandit',
    name: 'Bandit',
    health: 44,
    minDamage: 6, maxDamage: 12,
    abilities: ['lock', 'block'],
    moves: [
      { actions: [atk(12), lock(3)], weight: 2 },
      { actions: [multiAtk(6, 2)], weight: 2 },
      { actions: [atk(6), block(12)], weight: 1, lowHpWeight: 4, lowHpThreshold: 0.5 },
      { actions: [gainRageful(2)], weight: 1 },
    ],
  },
  coyote: {
    type: 'coyote',
    name: 'Coyote',
    health: 35,
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
    health: 41,
    minDamage: 5, maxDamage: 11,
    abilities: ['poison', 'block'],
    startOfFight: [poisonTiles(3)],
    moves: [
      m(atk(11), applyPoison(2)),
      m(atk(5), poisonTiles(2)),
      m(atk(6), block(8)),
      m(poisonTiles(4)),
    ],
  },
  vulture: {
    type: 'vulture',
    name: 'Vulture',
    health: 28,
    minDamage: 2, maxDamage: 8,
    abilities: ['bury'],
    startOfFight: [gainScavenger(1)],
    moves: [
      m(atk(8), applyTerrified(1)),
      m(multiAtk(2, 3), bury(3)),
      m(atk(4), block(6)),
    ],
  },
  pack_mule: {
    type: 'pack_mule',
    name: 'Pack Mule',
    health: 60,
    minDamage: 4, maxDamage: 12,
    abilities: ['bomb', 'bury'],
    moves: [
      m(atk(12)),
      m(multiAtk(4, 2), block(8)),
      m(atk(5), bomb(1), bury(3)),
      m(heal(6)),
    ],
  },
};

export const ACT1_ELITE: Record<string, EnemyDefinition> = {
  tumbleweed_golem: {
    type: 'tumbleweed_golem',
    name: 'Tumbleweed Golem',
    health: 100,
    minDamage: 13, maxDamage: 16,
    abilities: ['lock', 'summon'],
    startOfFight: [lockRow(), lockCol(), gainCloak(1)],
    moves: [
      m(atk(13), lockRow()),
      m(multiAtk(4, 4), lock(4)),
      m(block(8), gainThorns(2), transformTumbleweed(4)),
      m(block(14), summon('coyote')),
    ],
  },
  dust_devil: {
    type: 'dust_devil',
    name: 'Dust Devil',
    health: 86,
    minDamage: 4, maxDamage: 14,
    abilities: ['bury', 'suppress'],
    startOfFight: [bury(8)],
    hpTriggers: [{
      threshold: 50,
      actions: [gainRageful(2)],
      once: true,
      forceNextMove: [multiAtk(1, 6)],
    }],
    moves: [
      m(atk(13), bury(3)),
      m(atk(6), suppress(1), bury(3)),
      m(atk(10), bury(5), shuffleRows(67)),   // bottom 2 rows (6,7)
      m(multiAtk(3, 3), shuffleRows(1)),  // top 2 rows (0,1)
    ],
  },
};

export const DUSTY_DAN: EnemyDefinition = {
  type: 'dusty_dan',
  name: '"Dusty" Dan McGraw',
  health: 207,
  minDamage: 9, maxDamage: 17,
  abilities: ['lock', 'summon', 'gravity_shift'],
  firstMove: m(summon('vulture', true), summon('vulture', true)),
  moves: [
    m(gravityShift(), atk(12), block(12)),
    m(gravityShift(), multiAtk(3, 5), lockRow()),
    m(gravityShift(), atk(16), lockCol()),
    m(gravityShift(), block(16), lock(3), suppress(2)),
    m(gainRageful(3), summon('vulture', true), summon('vulture', true)),
  ],
};

// Legacy combined record for backward compat
export const ACT1_ENEMIES: Record<string, EnemyDefinition> = { ...ACT1_NORMAL, ...ACT1_ELITE };

// Early/Late encounter presets (enemy type keys)
export const ACT1_EARLY_ENCOUNTERS: string[][] = [
  ['coyote'],
  ['bandit'],
  ['vulture:rsummoned', 'vulture:rsummoned'],
];

export const ACT1_LATE_ENCOUNTERS: string[][] = [
  ['coyote', 'coyote', 'coyote:summoned'],
  ['vulture:rsummoned', 'vulture:rsummoned', 'vulture:rsummoned'],
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
    health: 62,
    minDamage: 3, maxDamage: 15,
    abilities: ['bomb', 'bury'],
    startOfFight: [bomb(1)],
    moves: [
      m(atk(11), bomb(2)),
      m(multiAtk(3, 3)),
      m(bomb(3)),
      m(atk(8), bomb(1), bury(3)),
    ],
  },
  mining_canary: {
    type: 'mining_canary',
    name: 'Mining Canary',
    health: 49,
    minDamage: 3, maxDamage: 12,
    abilities: ['lock', 'bury'],
    moves: [
      m(atk(9), lock(2)),
      m(multiAtk(2, 3), bury(4)),
      m(atk(3), lock(5)),
    ],
  },
  tunnel_rat: {
    type: 'tunnel_rat',
    name: 'Tunnel Rat',
    health: 84,
    minDamage: 12, maxDamage: 14,
    abilities: ['bury', 'summon'],
    startOfFight: [bury(3)],
    firstMove: m(atk(14), bury(2)),
    moves: [
      m(atk(14), bury(2)),
      m(atk(11), heal(7)),
      m(block(12), bury(5)),
      m(summon('tunnel_rat')),
    ],
  },
  prospector_gone_mad: {
    type: 'prospector_gone_mad',
    name: 'Prospector Gone Mad',
    health: 104,
    minDamage: 12, maxDamage: 23,
    abilities: ['bomb'],
    startOfFight: [gainRageful(5)],
    moves: [
      m(atk(16), bomb(2)),
      m(bomb(3), gainRageful(3)),
      m(atk(12), block(10), bomb(2)),
      m(atk(19)),
    ],
  },
};

export const ACT2_ELITE: Record<string, EnemyDefinition> = {
  mine_foreman: {
    type: 'mine_foreman',
    name: 'Mine Foreman',
    health: 147,
    minDamage: 6, maxDamage: 24,
    abilities: ['lock', 'suppress', 'block', 'bury'],
    moves: [
      m(atk(18), lock(5), bury(5)),
      m(atk(12), suppress(1), block(12)),
      m(multiAtk(7, 3), suppress(1)),
      m(block(22), lockRow()),
    ],
  },
  ore_golem: {
    type: 'ore_golem',
    name: 'Ore Golem',
    health: 174,
    minDamage: 6, maxDamage: 28,
    abilities: ['block', 'summon'],
    startOfFight: [gainHardened(21)],
    firstMove: m(summon('prospector_gone_mad')),
    moves: [
      m(atk(22)),
      m(block(25)),
      m(multiAtk(6, 3)),
      m(atk(12), gainRageful(3)),
      m(atk(6), summon('prospector_gone_mad')),
    ],
  },
  mine_cart: {
    type: 'mine_cart',
    name: 'Mine Cart',
    health: 232,
    minDamage: 0, maxDamage: 0,
    abilities: ['hazard'],
    initialFuse: 5,
    fuseDamage: 50,
    sequential: true,
    moves: [
      m(bomb(3), lock(4)),
      m(bomb(5), lock(2)),
      m(bomb(7)),
      m(block(20), bomb(2), lockRow()),
    ],
  },
};

export const COPPERHEAD_CASSIDY: EnemyDefinition = {
  type: 'copperhead_cassidy',
  name: '"Copperhead" Cassidy',
  health: 287,
  minDamage: 4, maxDamage: 24,
  abilities: ['poison', 'block', 'fools_gold'],
  // Phase transition at 50% HP handled by BossController (clear statuses, lock edges)
  moves: [
    m(atk(24), poisonTiles(4)),
    m(atk(16), block(16), applyPoison(3)),
    m(multiAtk(4, 3)),  // hits = poison tiles on board (handled by boss controller)
    m(atk(12), poisonTiles(2), foolsGold(8)),
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
    health: 111,
    minDamage: 5, maxDamage: 20,
    abilities: ['lock', 'block'],
    startOfFight: [lockCol()],
    firstMove: m(block(25), lockRow()),
    moves: [
      m(atk(14), lockRow()),
      m(multiAtk(4, 4), lock(4)),
      m(atk(7), block(16)),
      m(block(25), lockRow()),
    ],
  },
  guard_dog: {
    type: 'guard_dog',
    name: 'Guard Dog',
    health: 58,
    minDamage: 4, maxDamage: 12,
    abilities: [],
    moves: [
      m(atk(12)),
      m(multiAtk(4, 2)),
      m(atk(8), applyVulnerable(1)),
      m(atk(6), gainRageful(2)),
    ],
  },
  hellfire_preacher: {
    type: 'hellfire_preacher',
    name: 'Hellfire Preacher',
    health: 97,
    minDamage: 4, maxDamage: 16,
    abilities: ['block', 'bomb', 'heal'],
    startOfFight: [gainGrace(3)],
    moves: [
      m(multiAtk(4, 2), block(16)),
      m(atk(12), heal(18)),
      m(atk(9), bomb(6)),
      m(block(26), applyTerrified(1)),
    ],
  },
  hangman: {
    type: 'hangman',
    name: 'Hangman',
    health: 159,
    minDamage: 18, maxDamage: 34,
    abilities: ['lock', 'suppress'],
    sequential: true,
    startOfFight: [applyTerrified(4)],
    moves: [
      m(lock(7), suppress(2)),
      m(atk(18), applyVulnerable(3)),
      m(block(18), gainRageful(8), bury(8)),
      m(atk(34), applyVulnerableSelf(2)),
    ],
  },
  corrupt_deputy: {
    type: 'corrupt_deputy',
    name: 'Corrupt Deputy',
    health: 138,
    minDamage: 6, maxDamage: 18,
    abilities: ['lock', 'suppress', 'block', 'summon'],
    moves: [
      m(atk(18), lock(5)),
      m(atk(16), suppress(1)),
      m(multiAtk(7, 3), lock(1)),
      m(block(14), lock(5)),
      m(summon('bandit', true), summon('bandit', true)),
    ],
  },
};

export const ACT3_ELITE: Record<string, EnemyDefinition> = {
  saloon_brawler: {
    type: 'saloon_brawler',
    name: 'Saloon Brawler',
    health: 263,
    minDamage: 2, maxDamage: 20,
    abilities: [],
    firstMove: m(multiAtk(4, 2), gainRageful(3)),
    moves: [
      m(multiAtk(11, 2)),
      m(multiAtk(4, 2), gainRageful(3)),
      m(atk(24)),
      m(multiAtk(6, 2)),  // also clears own statuses (handled by CombatManager)
    ],
  },
  sheriffs_shadow: {
    type: 'sheriffs_shadow',
    name: "Sheriff's Shadow",
    health: 255,
    minDamage: 12, maxDamage: 18,
    abilities: ['block', 'suppress'],
    startOfFight: [block(30), gainDeadManWalking(3)],
    moves: [
      m(atk(12), block(12), suppress(1)),
      m(atk(25), suppress(2)),
      m(suppress(3), poisonTiles(3), applyTerrified(1)),
      m(block(28), poisonTiles(5)),
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
  health: 169,
  minDamage: 5, maxDamage: 22,
  abilities: ['block'],
  startOfFight: [applyTerrified(2), gainCloak(1), gainDeadManWalking(99)],
  moves: [
    m(atk(19), block(12)),
    m(multiAtk(5, 3), gainRageful(2)),
    m(block(23), gainCloak(1)),
    m(atk(22)),
  ],
};

export const OUTLAW_KING_ACT2: EnemyDefinition = {
  type: 'outlaw_king_act2',
  name: 'Outlaw King',
  health: 235,
  minDamage: 6, maxDamage: 31,
  abilities: ['block'],
  startOfFight: [applyTerrified(3), gainCloak(1), gainDeadManWalking(99)],
  moves: [
    m(atk(24), block(18)),
    m(multiAtk(6, 3), gainRageful(2)),
    m(block(34), gainCloak(1)),
    m(atk(31)),
  ],
};

export const OUTLAW_KING_ACT3: EnemyDefinition = {
  type: 'outlaw_king',
  name: 'Outlaw King',
  health: 321,
  minDamage: 9, maxDamage: 35,
  abilities: ['block'],
  startOfFight: [applyTerrified(4), gainCloak(2), gainDeadManWalking(99)],
  moves: [
    m(atk(28), block(22)),
    m(multiAtk(9, 3), gainRageful(5)),
    m(block(40), gainCloak(1)),
    m(atk(35)),
  ],
};

export const IRON_EYE_ISABELLA: EnemyDefinition = {
  type: 'iron_eye_isabella',
  name: '"Iron Eye" Isabella',
  health: 354,
  minDamage: 15, maxDamage: 28,
  abilities: ['lock', 'suppress'],
  startOfFight: [lockRow(), lockRow()],
  hpTriggers: [{
    threshold: 50,
    once: true,
    actions: [
      gainRageful(5),
      gainInvulnerable(1),
      applyTerrified(1),
      applyVulnerable(1),
    ],
  }],
  moves: [
    m(atk(15), lockRow(), lockCol()),
    m(atk(22), suppress(2)),
    m(atk(28)),
    m(suppress(4)),
  ],
};

export const ACT3_ENEMIES: Record<string, EnemyDefinition> = { ...ACT3_NORMAL, ...ACT3_ELITE };

export const ACT3_EARLY_ENCOUNTERS: string[][] = [
  ['train_guard', 'guard_dog'],
  ['hellfire_preacher', 'bandit'],
];

export const ACT3_LATE_ENCOUNTERS: string[][] = [
  ['train_guard', 'guard_dog', 'guard_dog'],
  ['corrupt_deputy', 'coyote', 'bandit'],
  ['hangman'],
  ['guard_dog', 'guard_dog', 'guard_dog'],
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

// One bag per encounter pool so draws don't repeat. Stored on globalThis with
// stable string keys so the bag state survives Vite HMR reloads (otherwise
// every code edit during dev resets the bag, defeating the no-repeat guarantee).
const encounterBags: Map<string, EncounterBag> = (() => {
  const g = globalThis as { __encounterBags?: Map<string, EncounterBag> };
  if (!g.__encounterBags) g.__encounterBags = new Map();
  return g.__encounterBags;
})();

function getBag(key: string, size: number): EncounterBag {
  // Include size in the cache key so a pool whose size changes (e.g. an enemy
  // added in a future update) won't accidentally reuse a stale bag.
  const fullKey = `${key}:${size}`;
  let bag = encounterBags.get(fullKey);
  if (!bag) {
    bag = new EncounterBag(size);
    encounterBags.set(fullKey, bag);
  }
  return bag;
}

/** Per-node chance (late-normal/elite) to roll Outlaw King in each act. Once per run.
 *  Act 1 stays rare; chance ramps up through later acts so players don't reach
 *  Act 3 having never seen him. */
export const OUTLAW_KING_ENCOUNTER_CHANCE_BY_ACT: Record<1 | 2 | 3, number> = {
  1: 0.002,
  2: 0.004,
  3: 0.006,
};

/** Build an Outlaw King encounter scaled to the given act, including his companions. */
export function buildOutlawKingEncounter(act: 1 | 2 | 3): EnemyDefinition[] {
  let king: EnemyDefinition;
  let companionType: string;
  let companionCount: number;
  let companionAtFullHp: boolean;
  switch (act) {
    case 1:
      king = OUTLAW_KING_ACT1;
      companionType = 'coyote';
      companionCount = 2;
      companionAtFullHp = false;
      break;
    case 2:
      king = OUTLAW_KING_ACT2;
      companionType = 'coyote';
      companionCount = 2;
      companionAtFullHp = true;
      break;
    case 3:
      king = OUTLAW_KING_ACT3;
      companionType = 'bandit';
      companionCount = 2;
      companionAtFullHp = true;
      break;
  }
  const result: EnemyDefinition[] = [{ ...king }];
  const companion = ACT1_NORMAL[companionType];
  for (let i = 0; i < companionCount; i++) {
    const c = { ...companion, _summoned: true } as EnemyDefinition;
    if (!companionAtFullHp) c.health = Math.max(1, Math.round(companion.health / 3));
    result.push(c);
  }
  return result;
}

/** True if any enemy in the encounter is an Outlaw King variant. */
export function encounterContainsOutlawKing(enemies: EnemyDefinition[]): boolean {
  return enemies.some((e) => e.type === 'outlaw_king' || e.type.startsWith('outlaw_king_'));
}

/** Pick a preset encounter from a bag (no repeats until pool exhausted).
 *  Suffix conventions on each preset entry:
 *    `type`              -- normal enemy
 *    `type:summoned`     -- always spawned as a summoned variant (1/3 HP)
 *    `type:rsummoned`    -- candidate for "exactly one of these is summoned";
 *                           one matching index is picked at random per roll. */
function rollPresetEncounter(
  presets: string[][],
  normalPool: Record<string, EnemyDefinition>,
  rand: () => number,
  bagKey: string,
): EnemyDefinition[] {
  const bag = getBag(bagKey, presets.length);
  const preset = presets[bag.draw(rand)];

  // Randomized summoning: pick exactly one `:rsummoned` candidate per encounter.
  const rsIndices = preset
    .map((k, i) => (k.endsWith(':rsummoned') ? i : -1))
    .filter((i) => i >= 0);
  const chosenRsIndex = rsIndices.length > 0
    ? rsIndices[Math.floor(rand() * rsIndices.length)]
    : -1;

  return preset.map((key, idx) => {
    const isSummoned = key.endsWith(':summoned')
      || (key.endsWith(':rsummoned') && idx === chosenRsIndex);
    const type = key.replace(':rsummoned', '').replace(':summoned', '');
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
  earlyBagKey: string,
  lateBagKey: string,
  noDuplicateTypes: string[] = [],
): EnemyDefinition[] {
  const r = rand();
  if (r < 0.25 && early.length > 0) return rollPresetEncounter(early, normals, rand, earlyBagKey);
  if (r < 0.75 && late.length > 0) return rollPresetEncounter(late, normals, rand, lateBagKey);
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
  okChanceMult = 1,
): EnemyDefinition[] {
  const isEarly = nodeIndex < 3;
  if (isEarly) {
    return rollPresetEncounter(ACT1_EARLY_ENCOUNTERS, ACT1_NORMAL, rand, 'act1-early');
  }
  if (outlawKingAvailable && nodeIndex > 6 && rand() < OUTLAW_KING_ENCOUNTER_CHANCE_BY_ACT[1] * okChanceMult) {
    return buildOutlawKingEncounter(1);
  }
  return rollLateEncounter(
    ACT1_EARLY_ENCOUNTERS, ACT1_LATE_ENCOUNTERS, ACT1_NORMAL, ['pack_mule'], rand,
    'act1-early', 'act1-late',
  );
}

export function rollAct1EliteEncounter(
  rand: () => number = Math.random,
  outlawKingAvailable = false,
  nodeIndex = 99,
  okChanceMult = 1,
): EnemyDefinition[] {
  if (outlawKingAvailable && nodeIndex > 6 && rand() < OUTLAW_KING_ENCOUNTER_CHANCE_BY_ACT[1] * okChanceMult) {
    return buildOutlawKingEncounter(1);
  }
  const pool = Object.values(ACT1_ELITE);
  const bag = getBag('act1-elite', pool.length);
  return [{ ...pool[bag.draw(rand)] }];
}

// --- Act 2 ---

export function rollAct2Encounter(
  rand: () => number = Math.random,
  nodeIndex = 99,
  outlawKingAvailable = false,
  okChanceMult = 1,
): EnemyDefinition[] {
  const isEarly = nodeIndex < 3;
  if (isEarly) {
    return rollPresetEncounter(ACT2_EARLY_ENCOUNTERS, ACT2_NORMAL, rand, 'act2-early');
  }
  if (outlawKingAvailable && rand() < OUTLAW_KING_ENCOUNTER_CHANCE_BY_ACT[2] * okChanceMult) {
    return buildOutlawKingEncounter(2);
  }
  return rollLateEncounter(
    ACT2_EARLY_ENCOUNTERS, ACT2_LATE_ENCOUNTERS, ACT2_NORMAL,
    ['mining_canary'], rand,
    'act2-early', 'act2-late',
    ['prospector_gone_mad'],
  );
}

export function rollAct2EliteEncounter(
  rand: () => number = Math.random,
  outlawKingAvailable = false,
  _nodeIndex = 99,
  okChanceMult = 1,
): EnemyDefinition[] {
  if (outlawKingAvailable && rand() < OUTLAW_KING_ENCOUNTER_CHANCE_BY_ACT[2] * okChanceMult) {
    return buildOutlawKingEncounter(2);
  }
  const pool = Object.values(ACT2_ELITE);
  const bag = getBag('act2-elite', pool.length);
  return [{ ...pool[bag.draw(rand)] }];
}

// --- Act 3 ---

export function rollAct3Encounter(
  rand: () => number = Math.random,
  nodeIndex = 99,
  outlawKingAvailable = false,
  okChanceMult = 1,
): EnemyDefinition[] {
  const isEarly = nodeIndex < 3;
  if (isEarly) {
    return rollPresetEncounter(ACT3_EARLY_ENCOUNTERS, ACT3_NORMAL, rand, 'act3-early');
  }
  if (outlawKingAvailable && rand() < OUTLAW_KING_ENCOUNTER_CHANCE_BY_ACT[3] * okChanceMult) {
    return buildOutlawKingEncounter(3);
  }
  // Act 3 has no dynamic "any 2" encounter -- 25% early preset, 75% late preset
  if (rand() < 0.25) return rollPresetEncounter(ACT3_EARLY_ENCOUNTERS, ACT3_NORMAL, rand, 'act3-early');
  return rollPresetEncounter(ACT3_LATE_ENCOUNTERS, ACT3_NORMAL, rand, 'act3-late');
}

export function rollAct3EliteEncounter(
  rand: () => number = Math.random,
  outlawKingAvailable = false,
  _nodeIndex = 99,
  okChanceMult = 1,
): EnemyDefinition[] {
  if (outlawKingAvailable && rand() < OUTLAW_KING_ENCOUNTER_CHANCE_BY_ACT[3] * okChanceMult) {
    return buildOutlawKingEncounter(3);
  }
  const pool = Object.values(ACT3_ELITE);
  const bag = getBag('act3-elite', pool.length);
  return [{ ...pool[bag.draw(rand)] }];
}
