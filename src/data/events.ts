export interface EventChoice {
  label: string;
  description: string;
  effect: string;
}

export interface EventDefinition {
  id: string;
  title: string;
  flavourText: string;
  choices: EventChoice[];
}

/** MVP events (~4-6 from SPEC). */
export const EVENTS: EventDefinition[] = [
  {
    id: 'card_game',
    title: 'The Card Game',
    flavourText: "Raccoon in a top hat. Three cards face down. 'Ten gold a card, friend.'",
    choices: [
      {
        label: 'Play',
        description: '-10 gold, pick a card.',
        effect: 'Artifact, consumable, tile type, or nothing.',
      },
    ],
  },
  {
    id: 'wanted_board',
    title: 'The Wanted Board',
    flavourText: 'Your face on a poster. Pretty good likeness.',
    choices: [
      {
        label: 'Tear down',
        description: 'Normalise shop prices.',
        effect: 'shop_normalize',
      },
      {
        label: 'Leave up',
        description: '+30 gold, next elite +20% HP.',
        effect: 'gold_30_elite_buff',
      },
    ],
  },
  {
    id: 'snake_charmer',
    title: 'The Snake Charmer',
    flavourText: 'Hooded figure, swaying snakes. Offers to let one bite you.',
    choices: [
      {
        label: 'Bite',
        description: '-10 HP, gain Rattlesnake-tagged artifact.',
        effect: 'lose_hp_gain_artifact',
      },
      {
        label: 'Decline',
        description: '+10 gold.',
        effect: 'gold_10',
      },
    ],
  },
  {
    id: 'abandoned_mine',
    title: 'The Abandoned Mine',
    flavourText: "Sign reads 'KEEP OUT.' Naturally, you go in.",
    choices: [
      {
        label: 'Go deeper',
        description: 'Risk HP for artifact chance.',
        effect: 'mine_delve',
      },
      {
        label: 'Leave',
        description: 'Keep what you have.',
        effect: 'none',
      },
    ],
  },
  {
    id: 'broken_cart',
    title: 'The Broken Cart',
    flavourText: "Merchant's cart, busted wheel, goods scattered.",
    choices: [
      {
        label: 'Help',
        description: '-1 consumable, shops stock +1 item.',
        effect: 'help_merchant',
      },
      {
        label: 'Rob',
        description: '+2 consumables, +15 gold, next shop +20%.',
        effect: 'rob_merchant',
      },
    ],
  },
  {
    id: 'old_well',
    title: 'The Old Well',
    flavourText: 'Deep well. Something jingling below.',
    choices: [
      {
        label: 'Climb',
        description: '-10 HP, +30 gold + random consumable.',
        effect: 'climb_well',
      },
      {
        label: 'Bucket',
        description: '+15 gold.',
        effect: 'gold_15',
      },
    ],
  },
];
