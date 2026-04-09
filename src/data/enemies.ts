import type { EnemyDefinition } from '../types/combat';

// ---------------------------------------------------------------------------
// Act 1 -- The Dusty Trail (5-15 damage)
// ---------------------------------------------------------------------------

export const ACT1_ENEMIES: Record<string, EnemyDefinition> = {
  coyote: {
    type: 'coyote',
    name: 'Coyote',
    health: 15,
    minDamage: 5,
    maxDamage: 10,
    abilities: ['howl'],
  },
  rattlesnake: {
    type: 'rattlesnake',
    name: 'Rattlesnake',
    health: 24,
    minDamage: 8,
    maxDamage: 15,
    abilities: ['poison', 'block'],
  },
  bandit: {
    type: 'bandit',
    name: 'Bandit',
    health: 27,
    minDamage: 8,
    maxDamage: 15,
    abilities: ['lock', 'block'],
  },
  vulture: {
    type: 'vulture',
    name: 'Vulture',
    health: 19,
    minDamage: 5,
    maxDamage: 8,
    abilities: ['bury'],
  },
  tumbleweed_golem: {
    type: 'tumbleweed_golem',
    name: 'Tumbleweed Golem',
    health: 46,
    minDamage: 6,
    maxDamage: 12,
    abilities: ['bury', 'summon'],
  },
  card_shark: {
    type: 'card_shark',
    name: 'Card Shark',
    health: 27,
    minDamage: 7,
    maxDamage: 12,
    abilities: ['lock', 'suppress'],
  },
};

export const DUSTY_DAN: EnemyDefinition = {
  type: 'dusty_dan',
  name: '"Dusty" Dan McGraw',
  health: 216,
  minDamage: 10,
  maxDamage: 20,
  abilities: ['lock', 'summon', 'bomb', 'gravity_shift'],
};

// ---------------------------------------------------------------------------
// Act 2 -- The Canyon (12-25 damage)
// ---------------------------------------------------------------------------

export const ACT2_ENEMIES: Record<string, EnemyDefinition> = {
  prospector_gone_mad: {
    type: 'prospector_gone_mad',
    name: 'Prospector Gone Mad',
    health: 66,
    minDamage: 12,
    maxDamage: 18,
    abilities: ['bomb'],
  },
  dynamite_outlaw: {
    type: 'dynamite_outlaw',
    name: 'Dynamite Outlaw',
    health: 96,
    minDamage: 15,
    maxDamage: 22,
    abilities: ['lock', 'block'],
  },
  cave_bat: {
    type: 'cave_bat',
    name: 'Cave Bat',
    health: 18,
    minDamage: 5,
    maxDamage: 8,
    abilities: ['bury'],
  },
  mine_cart: {
    type: 'mine_cart',
    name: 'Mine Cart',
    health: 120,
    minDamage: 0,
    maxDamage: 0,
    abilities: ['hazard'],
  },
  powder_monkey: {
    type: 'powder_monkey',
    name: 'Powder Monkey',
    health: 30,
    minDamage: 8,
    maxDamage: 14,
    abilities: ['bomb'],
  },
  mine_foreman: {
    type: 'mine_foreman',
    name: 'Mine Foreman',
    health: 84,
    minDamage: 12,
    maxDamage: 20,
    abilities: ['lock', 'block', 'suppress'],
  },
  canary_swarm: {
    type: 'canary_swarm',
    name: 'Canary Swarm',
    health: 12,
    minDamage: 3,
    maxDamage: 5,
    abilities: ['bury'],
  },
};

export const COPPERHEAD_CASSIDY: EnemyDefinition = {
  type: 'copperhead_cassidy',
  name: '"Copperhead" Cassidy',
  health: 288,
  minDamage: 15,
  maxDamage: 25,
  abilities: ['poison', 'block', 'fools_gold'],
};

// ---------------------------------------------------------------------------
// Act 3 -- The Town (18-35 damage)
// ---------------------------------------------------------------------------

export const ACT3_ENEMIES: Record<string, EnemyDefinition> = {
  corrupt_deputy: {
    type: 'corrupt_deputy',
    name: 'Corrupt Deputy',
    health: 78,
    minDamage: 18,
    maxDamage: 25,
    abilities: ['lock', 'suppress', 'block'],
  },
  saloon_brawler: {
    type: 'saloon_brawler',
    name: 'Saloon Brawler',
    health: 120,
    minDamage: 22,
    maxDamage: 30,
    abilities: [],
  },
  train_guard: {
    type: 'train_guard',
    name: 'Train Guard',
    health: 90,
    minDamage: 15,
    maxDamage: 20,
    abilities: ['lock', 'bomb'],
  },
  hangman: {
    type: 'hangman',
    name: 'Hangman',
    health: 108,
    minDamage: 20,
    maxDamage: 28,
    abilities: ['lock', 'poison'],
  },
  phantom_rider: {
    type: 'phantom_rider',
    name: 'Phantom Rider',
    health: 72,
    minDamage: 15,
    maxDamage: 22,
    abilities: ['suppress', 'bury'],
  },
  dynamite_duchess: {
    type: 'dynamite_duchess',
    name: 'Dynamite Duchess',
    health: 96,
    minDamage: 18,
    maxDamage: 25,
    abilities: ['bomb', 'lock'],
  },
  sheriffs_shadow: {
    type: 'sheriffs_shadow',
    name: "Sheriff's Shadow",
    health: 120,
    minDamage: 20,
    maxDamage: 30,
    abilities: ['block', 'lock', 'suppress'],
  },
  outlaw_king: {
    type: 'outlaw_king',
    name: 'Outlaw King',
    health: 108,
    minDamage: 20,
    maxDamage: 28,
    abilities: ['block', 'summon'],
  },
};

export const IRON_EYE_ISABELLA: EnemyDefinition = {
  type: 'iron_eye_isabella',
  name: '"Iron Eye" Isabella',
  health: 360,
  minDamage: 20,
  maxDamage: 35,
  abilities: ['lock', 'suppress', 'poison'],
};

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

/** Spawn counts per enemy type (from SPEC). */
interface EncounterTemplate {
  type: string;
  minCount: number;
  maxCount: number;
}

// --- Act 1 templates ---

const ACT1_ENCOUNTER_TEMPLATES: EncounterTemplate[] = [
  { type: 'coyote', minCount: 1, maxCount: 2 },
  { type: 'rattlesnake', minCount: 1, maxCount: 1 },
  { type: 'bandit', minCount: 1, maxCount: 2 },
  { type: 'vulture', minCount: 1, maxCount: 2 },
  { type: 'tumbleweed_golem', minCount: 1, maxCount: 1 },
  { type: 'card_shark', minCount: 1, maxCount: 1 },
];

// --- Act 2 templates ---

const ACT2_ENCOUNTER_TEMPLATES: EncounterTemplate[] = [
  { type: 'prospector_gone_mad', minCount: 1, maxCount: 1 },
  { type: 'dynamite_outlaw', minCount: 1, maxCount: 1 },
  { type: 'cave_bat', minCount: 3, maxCount: 3 },
  { type: 'mine_cart', minCount: 1, maxCount: 1 },
  { type: 'powder_monkey', minCount: 1, maxCount: 2 },
  { type: 'mine_foreman', minCount: 1, maxCount: 1 },
  { type: 'canary_swarm', minCount: 3, maxCount: 3 },
];

// --- Act 3 templates (Saloon Brawler + Outlaw King are elite-only) ---

const ACT3_ENCOUNTER_TEMPLATES: EncounterTemplate[] = [
  { type: 'corrupt_deputy', minCount: 1, maxCount: 2 },
  { type: 'train_guard', minCount: 1, maxCount: 1 },
  { type: 'hangman', minCount: 1, maxCount: 1 },
  { type: 'phantom_rider', minCount: 1, maxCount: 2 },
  { type: 'dynamite_duchess', minCount: 1, maxCount: 1 },
  { type: 'sheriffs_shadow', minCount: 1, maxCount: 1 },
];

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

function rollFromTemplates(
  templates: EncounterTemplate[],
  enemies: Record<string, EnemyDefinition>,
  rand: () => number = Math.random,
): EnemyDefinition[] {
  const template = templates[Math.floor(rand() * templates.length)];
  const count =
    template.minCount +
    Math.floor(rand() * (template.maxCount - template.minCount + 1));
  const def = enemies[template.type];
  return Array.from({ length: count }, () => ({ ...def }));
}

function rollEliteFrom(
  enemies: Record<string, EnemyDefinition>,
  excludeTypes: string[] = [],
  rand: () => number = Math.random,
): EnemyDefinition[] {
  const pool = Object.values(enemies).filter(
    (e) => !excludeTypes.includes(e.type),
  );
  const base = pool[Math.floor(rand() * pool.length)];
  return [
    {
      ...base,
      health: Math.round(base.health * 1.5),
      minDamage: base.minDamage + 2,
      maxDamage: base.maxDamage + 3,
    },
  ];
}

// ---------------------------------------------------------------------------
// Act 1
// ---------------------------------------------------------------------------

/** Roll a random Act 1 combat encounter. */
export function rollAct1Encounter(rand?: () => number): EnemyDefinition[] {
  return rollFromTemplates(ACT1_ENCOUNTER_TEMPLATES, ACT1_ENEMIES, rand);
}

/** Roll an Act 1 elite encounter (slightly tougher, always single enemy). */
export function rollAct1EliteEncounter(rand?: () => number): EnemyDefinition[] {
  return rollEliteFrom(ACT1_ENEMIES, ['vulture'], rand);
}

// ---------------------------------------------------------------------------
// Act 2
// ---------------------------------------------------------------------------

/** Roll a random Act 2 combat encounter. */
export function rollAct2Encounter(rand?: () => number): EnemyDefinition[] {
  return rollFromTemplates(ACT2_ENCOUNTER_TEMPLATES, ACT2_ENEMIES, rand);
}

/** Roll an Act 2 elite encounter. Excludes cave_bat and mine_cart. */
export function rollAct2EliteEncounter(rand?: () => number): EnemyDefinition[] {
  return rollEliteFrom(ACT2_ENEMIES, ['cave_bat', 'mine_cart'], rand);
}

// ---------------------------------------------------------------------------
// Act 3
// ---------------------------------------------------------------------------

/** Roll a random Act 3 combat encounter. */
export function rollAct3Encounter(rand?: () => number): EnemyDefinition[] {
  return rollFromTemplates(ACT3_ENCOUNTER_TEMPLATES, ACT3_ENEMIES, rand);
}

/** Roll an Act 3 elite encounter. Train Guard is included for elites. */
export function rollAct3EliteEncounter(rand?: () => number): EnemyDefinition[] {
  return rollEliteFrom(ACT3_ENEMIES, [], rand);
}
