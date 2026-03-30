import type { EnemyDefinition } from '../types/combat';

// ---------------------------------------------------------------------------
// Act 1 -- The Dusty Trail (5-15 damage)
// ---------------------------------------------------------------------------

export const ACT1_ENEMIES: Record<string, EnemyDefinition> = {
  coyote: {
    type: 'coyote',
    name: 'Coyote',
    health: 20,
    minDamage: 5,
    maxDamage: 10,
    abilities: ['howl'],
  },
  rattlesnake: {
    type: 'rattlesnake',
    name: 'Rattlesnake',
    health: 40,
    minDamage: 8,
    maxDamage: 15,
    abilities: ['poison', 'block'],
  },
  bandit: {
    type: 'bandit',
    name: 'Bandit',
    health: 45,
    minDamage: 8,
    maxDamage: 15,
    abilities: ['lock', 'block'],
  },
  vulture: {
    type: 'vulture',
    name: 'Vulture',
    health: 25,
    minDamage: 5,
    maxDamage: 8,
    abilities: ['bury'],
  },
};

export const DUSTY_DAN: EnemyDefinition = {
  type: 'dusty_dan',
  name: '"Dusty" Dan McGraw',
  health: 150,
  minDamage: 10,
  maxDamage: 20,
  abilities: ['lock', 'summon', 'barricade', 'bomb', 'gravity_shift'],
};

// ---------------------------------------------------------------------------
// Act 2 -- The Canyon (12-25 damage)
// ---------------------------------------------------------------------------

export const ACT2_ENEMIES: Record<string, EnemyDefinition> = {
  prospector_gone_mad: {
    type: 'prospector_gone_mad',
    name: 'Prospector Gone Mad',
    health: 55,
    minDamage: 12,
    maxDamage: 18,
    abilities: ['bomb'],
  },
  dynamite_outlaw: {
    type: 'dynamite_outlaw',
    name: 'Dynamite Outlaw',
    health: 80,
    minDamage: 15,
    maxDamage: 22,
    abilities: ['barricade', 'block'],
  },
  cave_bat: {
    type: 'cave_bat',
    name: 'Cave Bat',
    health: 15,
    minDamage: 5,
    maxDamage: 8,
    abilities: ['bury'],
  },
  mine_cart: {
    type: 'mine_cart',
    name: 'Mine Cart',
    health: 0,
    minDamage: 50,
    maxDamage: 50,
    abilities: ['hazard'],
  },
};

export const COPPERHEAD_CASSIDY: EnemyDefinition = {
  type: 'copperhead_cassidy',
  name: '"Copperhead" Cassidy',
  health: 200,
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
    health: 65,
    minDamage: 18,
    maxDamage: 25,
    abilities: ['lock', 'suppress', 'block'],
  },
  saloon_brawler: {
    type: 'saloon_brawler',
    name: 'Saloon Brawler',
    health: 100,
    minDamage: 22,
    maxDamage: 30,
    abilities: [],
  },
  train_guard: {
    type: 'train_guard',
    name: 'Train Guard',
    health: 75,
    minDamage: 15,
    maxDamage: 20,
    abilities: ['barricade', 'bomb'],
  },
};

export const IRON_EYE_ISABELLA: EnemyDefinition = {
  type: 'iron_eye_isabella',
  name: '"Iron Eye" Isabella',
  health: 250,
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
