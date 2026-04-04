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
    description: 'Add x0.25 multiplier to the next non-Ace match.',
  },
  Lucky: {
    color: '#C8A040',
    description: '1% crit chance per stack, removed when crit occurs.',
  },
  Barricade: {
    color: '#8B7355',
    description: 'At the end of the turn, if you did not take damage, retain block and decrease stacks by 1.',
  },
  Vulnerable: {
    color: '#C070D0',
    description: 'Take 50% extra damage from attacks, decrease stacks by 1 at the end of the turn.',
  },
  Venom: {
    color: '#60A040',
    description: 'At the start of the turn, take damage equal to the number of stacks and decrease stacks by 1.',
  },
  Bounty: {
    color: '#C04040',
    description: 'When applying this or taking damage, if HP is lower than Bounty stacks, die.',
  },
};
