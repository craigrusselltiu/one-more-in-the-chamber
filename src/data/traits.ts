import type { TraitId } from '../types/game';

export interface TraitBreakpoint {
  threshold: number;
  description: string;
}

export interface TraitDefinition {
  id: TraitId;
  name: string;
  description: string;
  breakpoints: TraitBreakpoint[];
}

/** All 7 traits from SPEC. */
export const TRAITS: TraitDefinition[] = [
  {
    id: 'outlaw',
    name: 'Outlaw',
    description: 'The 4+ match trait.',
    breakpoints: [
      { threshold: 2, description: '4+ matches deal 30% bonus damage.' },
      { threshold: 4, description: '4+ matches apply 1 Vulnerable to targeted enemy.' },
      { threshold: 6, description: 'Tiles from 4+ match cascades trigger resource effects twice.' },
    ],
  },
  {
    id: 'sheriff',
    name: 'Sheriff',
    description: 'The block trait.',
    breakpoints: [
      { threshold: 2, description: '+2 block at turn start. Iron matches +30% block.' },
      { threshold: 5, description: 'Block reflects 100% of absorbed damage back to attacker.' },
    ],
  },
  {
    id: 'rattlesnake',
    name: 'Rattlesnake',
    description: 'The poison tile trait.',
    breakpoints: [
      { threshold: 1, description: 'Immune to poison tile damage/debuffs.' },
      { threshold: 3, description: 'Matching poison tiles deals 2x Bullet damage + applies venom stacks.' },
    ],
  },
  {
    id: 'prospector',
    name: 'Prospector',
    description: 'The gold trait.',
    breakpoints: [
      { threshold: 2, description: 'Non-gold matches: 15% chance to generate 1 gold.' },
      { threshold: 4, description: 'Gold matches: double gold + 2 block.' },
      { threshold: 6, description: 'End-of-turn bonus damage equal to 50% gold earned this fight.' },
    ],
  },
  {
    id: 'sapper',
    name: 'Sapper',
    description: 'The bomb tile trait.',
    breakpoints: [
      { threshold: 1, description: 'Bomb countdowns +2 turns.' },
      { threshold: 2, description: 'Defusing a bomb deals its damage to targeted enemy.' },
      { threshold: 3, description: 'Defused bombs clear adjacent tiles. Every 4th match spawns a player bomb.' },
    ],
  },
  {
    id: 'mustang',
    name: 'Mustang',
    description: 'The extra swap trait.',
    breakpoints: [
      { threshold: 4, description: '+1 swap/turn. One non-adjacent swap per turn. 5+ lasso matches +50% damage.' },
    ],
  },
  {
    id: 'gunslinger',
    name: 'Gunslinger',
    description: 'The crit trait.',
    breakpoints: [
      { threshold: 2, description: 'Start fights with 15% crit. Crits deal 3 bonus flat damage.' },
      { threshold: 4, description: 'Crit multiplier 3x. Crit chance halves on trigger instead of resetting.' },
    ],
  },
  {
    id: 'saloon_keeper',
    name: 'Saloon Keeper',
    description: 'On the house.',
    breakpoints: [
      { threshold: 2, description: 'Consumables heal 5 HP on use.' },
      { threshold: 4, description: 'At the start of combat, gain a random consumable.' },
    ],
  },
];
