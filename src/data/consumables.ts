export interface ConsumableDefinition {
  id: string;
  name: string;
  category: 'offensive' | 'defensive' | 'utility';
  description: string;
  effect: string;
}

/** All 13 consumables from SPEC. */
export const CONSUMABLES: ConsumableDefinition[] = [
  // Offensive
  {
    id: 'stick_of_tnt',
    name: 'Stick of TNT',
    category: 'offensive',
    description: 'Light the fuse.',
    effect: 'Clear entire row. Tiles generate resources; damage goes to targeted enemy.',
  },
  {
    id: 'moonshine',
    name: 'Moonshine',
    category: 'offensive',
    description: 'Fighting drunk.',
    effect: '2x next match resources, take 5 damage.',
  },
  {
    id: 'wanted_flyer',
    name: 'Wanted Flyer',
    category: 'offensive',
    description: 'Price on their head.',
    effect: 'Targeted enemy +50% damage taken, 2 turns.',
  },
  {
    id: 'pocket_watch',
    name: 'Pocket Watch',
    category: 'offensive',
    description: 'Bought a little more time.',
    effect: '+1 swap this turn.',
  },
  {
    id: 'strong_coffee',
    name: 'Strong Coffee',
    category: 'offensive',
    description: 'Eyes sharp, hands steady.',
    effect: '1.5x next match resources.',
  },
  // Defensive
  {
    id: 'tonic',
    name: 'Tonic',
    category: 'defensive',
    description: 'Burns going down, patches you up.',
    effect: 'Heal 20 HP.',
  },
  {
    id: 'barbed_wire',
    name: 'Barbed Wire',
    category: 'defensive',
    description: 'They ran right into it.',
    effect: 'Gain thorns: reflect 100% of next enemy attack back. Consumed on trigger.',
  },
  {
    id: 'bandage',
    name: 'Bandage',
    category: 'defensive',
    description: 'Patch wounds, suck out venom.',
    effect: 'Heal 10 HP, cleanse all poison tiles on board.',
  },
  // Utility
  {
    id: 'skeleton_key',
    name: 'Skeleton Key',
    category: 'utility',
    description: 'Every lock has a key.',
    effect: 'Unlock all locked tiles.',
  },
  {
    id: 'smoke_bomb',
    name: 'Smoke Bomb',
    category: 'utility',
    description: 'Swinging at air.',
    effect: 'Targeted enemy skips next action.',
  },
  {
    id: 'tumbleweed',
    name: 'Tumbleweed',
    category: 'utility',
    description: 'Wind rearranges everything.',
    effect: 'Reshuffle entire board.',
  },
  {
    id: 'signal_flare',
    name: 'Signal Flare',
    category: 'utility',
    description: 'Nothing stays hidden.',
    effect: 'Reveal all buried tiles.',
  },
  {
    id: 'snake_oil',
    name: 'Snake Oil',
    category: 'utility',
    description: 'Who knows what\'s in the bottle.',
    effect: 'Random effect (heal/damage/poison/gold).',
  },
];
