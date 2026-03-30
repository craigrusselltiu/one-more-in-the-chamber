import type { EnemyDefinition } from '../game/combat/Enemy';

/** Act 1 enemy definitions from SPEC. */
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

/** Act 1 boss. */
export const DUSTY_DAN: EnemyDefinition = {
  type: 'dusty_dan',
  name: '"Dusty" Dan McGraw',
  health: 150,
  minDamage: 10,
  maxDamage: 20,
  abilities: ['lock', 'summon', 'barricade', 'bomb', 'gravity_shift'],
};
