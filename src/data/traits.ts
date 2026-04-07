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

export const TRAITS: TraitDefinition[] = [
  {
    id: 'sheriff',
    name: 'Sheriff',
    description: 'The block trait.',
    breakpoints: [
      { threshold: 2, description: 'Double the first time you gain block each turn.' },
      { threshold: 4, description: 'At the start of combat, gain 5 Sturdy.' },
      { threshold: 6, description: 'Block reflects 100% of absorbed damage back to attacker.' },
    ],
  },
  {
    id: 'outlaw',
    name: 'Outlaw',
    description: 'The kill trait.',
    breakpoints: [
      { threshold: 2, description: 'Killing an enemy grants 1 Rageful.' },
      { threshold: 5, description: 'At the start of Boss encounters, gain 3 Rageful and apply 2 Vulnerable to all enemies.' },
    ],
  },
  {
    id: 'prospector',
    name: 'Prospector',
    description: 'The gold trait.',
    breakpoints: [
      { threshold: 2, description: 'On any match, 20% chance to generate 1 gold.' },
      { threshold: 4, description: 'Whenever you gain gold during combat, deal 1 damage to a random enemy.' },
      { threshold: 6, description: 'Deal 10% of your current gold as extra damage.' },
    ],
  },
  {
    id: 'gunslinger',
    name: 'Gunslinger',
    description: 'The gun tile trait.',
    breakpoints: [
      { threshold: 2, description: 'Bullet, .50 Cal, Buckshot, and Ricochet tiles deal 1 extra damage per tile.' },
      { threshold: 4, description: 'Gain 1 Lucky stack for every Bullet, .50 Cal, Buckshot, or Ricochet matched.' },
    ],
  },
  {
    id: 'saloon_keeper',
    name: 'Saloon Keeper',
    description: 'On the house.',
    breakpoints: [
      { threshold: 2, description: 'Consumables heal 5 HP on use.' },
      { threshold: 5, description: 'At the start of combat, gain a random consumable.' },
    ],
  },
  {
    id: 'sapper',
    name: 'Sapper',
    description: 'The bomb tile trait.',
    breakpoints: [
      { threshold: 1, description: 'Enemy bomb timers are increased by 2.' },
      { threshold: 5, description: 'Explosive tile radius is increased by 1.' },
    ],
  },
  {
    id: 'sniper',
    name: 'Sniper',
    description: 'The 5-match trait.',
    breakpoints: [
      { threshold: 4, description: 'On 5-match, gain 1 swap for that turn.' },
    ],
  },
  {
    id: 'dead_man_walking',
    name: 'Dead Man Walking',
    description: 'The low HP trait.',
    breakpoints: [
      { threshold: 3, description: 'Whenever you would take damage, take 1 less damage.' },
      { threshold: 5, description: 'If HP is below 20%, all damage is doubled.' },
      { threshold: 7, description: 'Once per fight, taking lethal damage instead sets HP to 10 and grants 20 block.' },
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
    id: 'mustang',
    name: 'Mustang',
    description: 'The extra swap trait.',
    breakpoints: [
      { threshold: 4, description: '+1 swap/turn. One non-adjacent swap per turn. 5+ lasso matches +50% damage.' },
    ],
  },
  {
    id: 'desperado',
    name: 'Desperado',
    description: 'The gamble trait.',
    breakpoints: [],
  },
  {
    id: 'high_roller',
    name: 'High Roller',
    description: 'The high-stakes trait.',
    breakpoints: [],
  },
];
