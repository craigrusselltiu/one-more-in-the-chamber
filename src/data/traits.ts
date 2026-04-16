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
    description: 'The law is heavier than it looks.',
    breakpoints: [
      { threshold: 2, description: 'Double the first time you gain block each combat.' },
      { threshold: 4, description: 'At the start of combat, gain 4 Sturdy.' },
      { threshold: 6, description: 'Block reflects 100% of absorbed damage back to attacker.' },
    ],
  },
  {
    id: 'outlaw',
    name: 'Outlaw',
    description: 'Wanted: Alive. Preferably not.',
    breakpoints: [
      { threshold: 2, description: 'Killing an enemy grants 3 Rageful.' },
      { threshold: 5, description: 'At the start of Boss encounters, gain 5 Rageful and apply 3 Vulnerable to all enemies.' },
    ],
  },
  {
    id: 'prospector',
    name: 'Prospector',
    description: "There's gold in them hills. And in that match.",
    breakpoints: [
      { threshold: 2, description: 'On any match, 25% chance to generate 7 gold.' },
      { threshold: 4, description: 'Whenever you gain gold during combat, deal 2 damage to a random enemy.' },
      { threshold: 6, description: 'Deal 5% of your current gold as extra damage.' },
    ],
  },
  {
    id: 'gunslinger',
    name: 'Gunslinger',
    description: 'Fastest hand in the west. And the luckiest.',
    breakpoints: [
      { threshold: 2, description: 'Bullet-type tiles deal 1 extra damage per tile.' },
      { threshold: 4, description: 'Gain 1 Lucky for every bullet-type tile matched.' },
      { threshold: 6, description: 'Lucky deals 2x damage instead of 1.5x.' },
    ],
  },
  {
    id: 'saloon_keeper',
    name: 'Saloon Keeper',
    description: 'On the house.',
    breakpoints: [
      { threshold: 2, description: 'Consumables heal 5 HP on use (any consumable).' },
      { threshold: 5, description: 'At the start of combat, gain a random consumable.' },
    ],
  },
  {
    id: 'sapper',
    name: 'Sapper',
    description: 'Fire in the hole.',
    breakpoints: [
      { threshold: 2, description: 'Enemy bomb timers are increased by 2.' },
      { threshold: 4, description: 'Increase the radius of explosive tiles by 1.' },
    ],
  },
  {
    id: 'sniper',
    name: 'Sniper',
    description: "Sniper? I barely know her!",
    breakpoints: [
      { threshold: 3, description: 'On 5-match, gain 1 swap for that turn.' },
      { threshold: 5, description: 'On 6+ match, if the targeted enemy is not a boss, kill it.' },
    ],
  },
  {
    id: 'dead_man_walking',
    name: 'Dead Man Walking',
    description: "I didn't hear no bell.",
    breakpoints: [
      { threshold: 3, description: 'Whenever you would take damage, take 1 less damage.' },
      { threshold: 5, description: 'When at or below 20% HP, all damage is doubled.' },
      { threshold: 7, description: 'Once per combat when taking lethal damage, prevent it and heal 20% HP.' },
    ],
  },
  {
    id: 'mustang',
    name: 'Mustang',
    description: "Can't fence what won't be fenced.",
    breakpoints: [
      { threshold: 4, description: '+1 swap per turn.' },
    ],
  },
  {
    id: 'tracker',
    name: 'Tracker',
    description: "Read the tracks. See what's hidden.",
    breakpoints: [
      { threshold: 1, description: 'Buried tiles get revealed at the end of your turn automatically.' },
      { threshold: 3, description: 'Gain 1 Rageful whenever a Buried tile gets revealed.' },
    ],
  },
  {
    id: 'preacher',
    name: 'Preacher',
    description: "The sermon ain't over yet.",
    breakpoints: [
      { threshold: 2, description: "Whenever you don't deal damage in a turn, heal 5." },
      { threshold: 4, description: 'Take 20% less damage from enemies with lower HP than you.' },
      { threshold: 6, description: 'At the start of combat, gain 2 Grace.' },
    ],
  },
  {
    id: 'antivenom',
    name: 'Antivenom',
    description: "Don't step on anything that hisses.",
    breakpoints: [
      { threshold: 3, description: 'Matching next to a Poison tile clears it.' },
    ],
  },
  {
    id: 'undertaker',
    name: 'Undertaker',
    description: 'Business is booming.',
    breakpoints: [
      { threshold: 3, description: 'Deal 50% more damage to summoned enemies.' },
      { threshold: 6, description: 'On enemy death, gain 1 Ready.' },
    ],
  },
  {
    id: 'desperado',
    name: 'Desperado',
    description: 'Go big or go home.',
    breakpoints: [
      { threshold: 2, description: 'Desperado-tagged artifacts are more common.' },
      { threshold: 5, description: 'At the start of every turn, gain 4 Ace.' },
    ],
  },
  {
    id: 'rattlesnake',
    name: 'Rattlesnake',
    description: "I'm a slithery snake.",
    breakpoints: [
      { threshold: 2, description: 'Clearing or matching Poison tiles applies Poison to target instead.' },
      { threshold: 4, description: 'When you would apply Poison, apply it to ALL enemies.' },
    ],
  },
  {
    id: 'corrupt',
    name: 'Corrupt',
    description: 'Something rotten, clinging close.',
    breakpoints: [
      { threshold: 2, description: 'At the start of combat, add Shadow to 2 random tiles for each Corrupt artifact you own.' },
    ],
  },
];
