export interface ConsumableDefinition {
  id: string;
  name: string;
  category: 'offensive' | 'defensive' | 'utility';
  description: string;
  effect: string;
  /** Base merchant price. Shops roll actual price at +/-5. */
  cost: number;
  canUseInMap?: boolean;
}

/** All 12 consumables from SPEC. */
export const CONSUMABLES: ConsumableDefinition[] = [
  // Offensive
  {
    id: 'stick_of_tnt',
    name: 'Stick of TNT',
    category: 'offensive',
    description: 'Light the fuse.',
    effect: 'Clear entire row. Tiles generate resources; damage goes to targeted enemy.',
    cost: 35,
  },
  {
    id: 'wanted_flyer',
    name: 'Wanted Flyer',
    category: 'offensive',
    description: 'Price on their head.',
    effect: 'Apply 2 Vulnerable to target enemy.',
    cost: 40,
  },
  {
    id: 'pocket_watch',
    name: 'Pocket Watch',
    category: 'offensive',
    description: 'Bought a little more time.',
    effect: '+1 swap this turn.',
    cost: 100,
  },
  {
    id: 'strong_coffee',
    name: 'Strong Coffee',
    category: 'offensive',
    description: 'Eyes sharp, hands steady.',
    effect: 'Double next match resources.',
    cost: 70,
  },
  // Defensive
  {
    id: 'tonic',
    name: 'Strong Whiskey',
    category: 'defensive',
    description: 'Burns going down, patches you up.',
    effect: 'Heal 20 HP.',
    cost: 60,
    canUseInMap: true,
  },
  {
    id: 'bandage',
    name: 'Bandage',
    category: 'defensive',
    description: 'Patch wounds, suck out poison.',
    effect: 'Heal 10 HP, cleanse all poison tiles on board.',
    cost: 40,
    canUseInMap: true,
  },
  // Utility
  {
    id: 'skeleton_key',
    name: 'Skeleton Key',
    category: 'utility',
    description: 'Every lock has a key.',
    effect: 'Unlock all locked tiles.',
    cost: 30,
  },
  {
    id: 'tumbleweed',
    name: 'Tumbleweed',
    category: 'utility',
    description: 'Wind rearranges everything.',
    effect: 'Reshuffle entire board.',
    cost: 50,
  },
  {
    id: 'signal_flare',
    name: 'Signal Flare',
    category: 'utility',
    description: 'Nothing stays hidden.',
    effect: 'Reveal all buried tiles.',
    cost: 30,
  },
  {
    id: 'snake_oil',
    name: 'Snake Oil',
    category: 'utility',
    description: 'Who knows what\'s in the bottle.',
    effect: 'Random effect (heal/damage/poison/gold).',
    cost: 88,
    canUseInMap: true,
  },
  {
    id: 'lasso',
    name: 'Lasso',
    category: 'utility',
    description: 'Reach across the board.',
    effect: 'Your next swap can target non-adjacent tiles.',
    cost: 100,
  },
  {
    id: 'panacea',
    name: 'Panacea',
    category: 'utility',
    description: 'Cures what ails the land itself.',
    effect: 'Clear all tile hazards.',
    cost: 100,
  },
];
