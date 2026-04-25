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
    effect: 'Clear the bottom row of the board. Each destroyed tile generates its single-resolve resources. Explosive and showdown chains trigger normally.',
    cost: 35,
  },
  {
    id: 'wanted_flyer',
    name: 'Wanted Flyer',
    category: 'offensive',
    description: 'Price on their head.',
    effect: 'Apply 2 Vulnerable to the targeted enemy.',
    cost: 25,
  },
  {
    id: 'pocket_watch',
    name: 'Pocket Watch',
    category: 'offensive',
    description: 'Bought a little more time.',
    effect: '+1 swap this turn.',
    cost: 65,
  },
  {
    id: 'strong_coffee',
    name: 'Strong Coffee',
    category: 'offensive',
    description: 'Eyes sharp, hands steady.',
    effect: 'Double next match resources.',
    cost: 30,
  },
  // Defensive
  {
    id: 'strong_whiskey',
    name: 'Strong Whiskey',
    category: 'defensive',
    description: 'Burns going down, patches you up.',
    effect: 'Heal 20 HP.',
    cost: 30,
    canUseInMap: true,
  },
  {
    id: 'bandage',
    name: 'Bandage',
    category: 'defensive',
    description: 'Patch wounds, suck out poison.',
    effect: 'Heal 10 HP and cleanse all poison tiles on the board.',
    cost: 25,
    canUseInMap: true,
  },
  // Utility
  {
    id: 'skeleton_key',
    name: 'Skeleton Key',
    category: 'utility',
    description: 'Every lock has a key.',
    effect: 'Unlock all locked tiles on the board.',
    cost: 20,
  },
  {
    id: 'tumbleweed',
    name: 'Tumbleweed',
    category: 'utility',
    description: 'Wind rearranges everything.',
    effect: 'Reshuffle the entire board. Any resulting matches resolve as cascades.',
    cost: 30,
  },
  {
    id: 'signal_flare',
    name: 'Signal Flare',
    category: 'utility',
    description: 'Nothing stays hidden.',
    effect: 'Reveal all Buried tiles on the board.',
    cost: 20,
  },
  {
    id: 'snake_oil',
    name: 'Snake Oil',
    category: 'utility',
    description: 'Who knows what\'s in the bottle.',
    effect: 'Random effect (20% each): Heal 23 HP, gain 6 max HP, gain 100 gold, take 14 damage, or do nothing.',
    cost: 45,
    canUseInMap: true,
  },
  {
    id: 'lasso',
    name: 'Lasso',
    category: 'utility',
    description: 'Reach across the board.',
    effect: 'Your next swap can target non-adjacent tiles.',
    cost: 55,
  },
  {
    id: 'broom',
    name: 'Broom',
    category: 'utility',
    description: 'Less boom, more broom.',
    effect: 'Clear all tile hazards, Tumbleweed, and Fake Coin tiles. Any resulting matches resolve as cascades.',
    cost: 65,
  },
  {
    id: 'panacea',
    name: 'Panacea',
    category: 'utility',
    description: 'Cures what ails the land itself.',
    effect: 'Cure all debuffs.',
    cost: 60,
  },
];
