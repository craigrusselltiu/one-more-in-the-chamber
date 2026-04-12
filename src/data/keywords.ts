/**
 * Buff/debuff keyword config.
 * Colors and descriptions for status effect keywords shown in tooltips.
 */

export interface KeywordDefinition {
  color: string;
  description: string;
}

export const KEYWORDS: Record<string, KeywordDefinition> = {
  Ace: {
    color: '#E0C880',
    description: 'Add x0.25 multiplier per stack to the next non-Ace non-cascade match.',
  },
  Lucky: {
    color: '#C8A040',
    description: '1% chance per stack to deal 1.5x damage. (max 50)',
  },
  Barricade: {
    color: '#8B7355',
    description: 'At the end of the turn, retain block and decrease stacks by 1. (max 1)',
  },
  Vulnerable: {
    color: '#C070D0',
    description: 'Take 25% extra damage from attacks. Decrease stacks by 1 at the end of the turn.',
  },
  Rageful: {
    color: '#D04040',
    description: 'Deal 1 extra damage per stack. Decrease stacks by 1 at the end of the turn.',
  },
  Sturdy: {
    color: '#6888A0',
    description: 'Gain 1 extra block per stack. Decrease stacks by 1 at the end of the turn.',
  },
  Grace: {
    color: '#A0C8FF',
    description: 'Negate the next instance of damage taken. Does not prevent Poison.',
  },
  Poison: {
    color: '#40ff40',
    description: 'At the start of the turn, take damage equal to the number of stacks and decrease stacks by 1.',
  },
  Bounty: {
    color: '#C04040',
    description: 'When applying this or taking damage, if HP is lower than Bounty stacks, die.\nWhen this kills a non-summoned enemy, gain 10 gold.',
  },
  Shadow: {
    color: '#6b2fa0',
    description: 'When matched, fires a shadow bolt dealing 4 damage to a random enemy.',
  },
  Chain: {
    color: '#A08040',
    description: 'Your Chain tiles gain 1 extra damage per stack.',
  },
  Ready: {
    color: '#D4A030',
    description: 'Your next non-cascade attack deals 50% more damage. (max 1)',
  },
  Terrified: {
    color: '#8B4789',
    description: 'Deal 50% less damage. Decrease stacks by 1 at the end of the turn.',
  },
  Blinded: {
    color: '#A0A0A0',
    description: 'Attacks deal no damage. Decrease stacks by 1 at the end of the turn.',
  },
  'Dead Man Walking': {
    color: '#C8B060',
    description: 'Immune to debuffs.',
  },
  Protected: {
    color: '#F9E27D',
    description: 'Immune to tile hazards. Decrease stacks by 1 at the end of the turn.',
  },
};
