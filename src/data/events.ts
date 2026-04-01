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
  {
    id: 'dynamite_stash',
    title: 'The Dynamite Stash',
    flavourText: 'Crate of unstable dynamite.',
    choices: [
      {
        label: 'Take carefully',
        description: '+2 Stick of TNT.',
        effect: 'gain_tnt',
      },
      {
        label: 'Blow it up',
        description: 'Skip next node, -15 HP.',
        effect: 'skip_node_lose_hp',
      },
    ],
  },

  // --- Batch 2: Expanded event pool ---

  {
    id: 'traveling_preacher',
    title: 'The Traveling Preacher',
    flavourText:
      "Man in black at a crossroads. Bible in one hand, revolver in the other. 'Confess your sins, child.'",
    choices: [
      {
        label: 'Confess',
        description: 'Lose your highest-tier artifact, heal to full HP.',
        effect: 'lose_artifact_full_heal',
      },
      {
        label: 'Draw',
        description: '-15 HP. Gain random Gunslinger-tagged artifact.',
        effect: 'lose_hp_gain_gunslinger_artifact',
      },
      {
        label: 'Walk away',
        description: '+5 block for next fight.',
        effect: 'block_5_next_fight',
      },
    ],
  },
  {
    id: 'dust_devil',
    title: 'The Dust Devil',
    flavourText:
      'Swirling column of sand barreling toward you. Something glints inside it.',
    choices: [
      {
        label: 'Ride it out',
        description: '-10 HP. Board starts shuffled next fight.',
        effect: 'lose_hp_shuffle_board',
      },
      {
        label: 'Reach in',
        description: '-20 HP. Gain artifact + random consumable.',
        effect: 'lose_hp_gain_artifact_consumable',
      },
      {
        label: 'Take cover',
        description: 'No effect.',
        effect: 'none',
      },
    ],
  },
  {
    id: 'ghost_town_saloon',
    title: 'The Ghost Town Saloon',
    flavourText:
      "Swinging doors on an empty bar. Dusty piano plays itself. Full bottle of whiskey on the counter.",
    choices: [
      {
        label: 'Drink',
        description: 'Heal 20 HP. Next fight: -1 swap.',
        effect: 'heal_20_lose_swap',
      },
      {
        label: 'Search the back',
        description: '50% chance: random artifact. 50% chance: ambush, -15 HP.',
        effect: 'search_saloon',
      },
      {
        label: 'Move on',
        description: '+5 gold from the tip jar.',
        effect: 'gold_5',
      },
    ],
  },
  {
    id: 'stranded_prospector',
    title: 'The Stranded Prospector',
    flavourText:
      "Old-timer half-buried in a collapsed mineshaft. 'Get me outta here and I'll make it worth your while.'",
    choices: [
      {
        label: 'Dig him out',
        description: '-5 HP from exertion. +25 gold, upgrade a random tile.',
        effect: 'lose_hp_gold_upgrade_tile',
      },
      {
        label: 'Take his gear',
        description: '+2 random consumables. Shops cost +10% this act.',
        effect: 'gain_consumables_shop_penalty',
      },
    ],
  },
  {
    id: 'campfire_stranger',
    title: 'The Campfire Stranger',
    flavourText:
      "Figure by a fire. Hat pulled low. 'Sit a spell. Trade stories?'",
    choices: [
      {
        label: 'Sit down',
        description: 'Heal 15 HP. Gain intel: see enemy intents next fight.',
        effect: 'heal_and_intel',
      },
      {
        label: 'Trade',
        description: 'Give 1 consumable, receive 2 random consumables.',
        effect: 'trade_consumables',
      },
      {
        label: 'Keep walking',
        description: '+1 swap next fight.',
        effect: 'bonus_swap_next_fight',
      },
    ],
  },
  {
    id: 'train_wreck',
    title: 'The Train Wreck',
    flavourText:
      'Derailed locomotive, smoke still rising. Cargo scattered across the gulch.',
    choices: [
      {
        label: 'Loot the cargo',
        description: '+20 gold, +1 random consumable.',
        effect: 'loot_train',
      },
      {
        label: 'Search the engine',
        description: '-10 HP from debris. Pick 1 of 3 artifacts.',
        effect: 'search_engine_artifact',
      },
      {
        label: 'Check for survivors',
        description: 'Next shop: all items -25%.',
        effect: 'shop_discount',
      },
    ],
  },
  {
    id: 'vulture_circle',
    title: 'The Vulture Circle',
    flavourText:
      "Vultures circling something in the brush. It's a dead bounty hunter. Still has his gear.",
    choices: [
      {
        label: 'Take the gear',
        description: 'Gain random artifact. Next elite gains +1 ability.',
        effect: 'gain_artifact_buff_elite',
      },
      {
        label: 'Bury him',
        description: 'Heal 10 HP, +10 gold from his pockets.',
        effect: 'bury_heal_gold',
      },
    ],
  },
  {
    id: 'rigged_bridge',
    title: 'The Rigged Bridge',
    flavourText:
      'Rope bridge over a canyon. Fraying cables. Dynamite wired to the supports.',
    choices: [
      {
        label: 'Defuse and cross',
        description: '+2 Stick of TNT. -10 HP if you fail (50% chance).',
        effect: 'defuse_bridge',
      },
      {
        label: 'Blow it and climb down',
        description: '-20 HP. Skip next combat node.',
        effect: 'blow_bridge_skip',
      },
      {
        label: 'Find another way',
        description: 'No risk. +5 gold found on the detour.',
        effect: 'gold_5',
      },
    ],
  },
  {
    id: 'medicine_wagon',
    title: 'The Medicine Wagon',
    flavourText:
      "Painted wagon, jars of strange liquids. The seller's grin has too many teeth.",
    choices: [
      {
        label: 'Buy tonic (-15 gold)',
        description: 'Heal 30 HP.',
        effect: 'buy_tonic',
      },
      {
        label: 'Buy mystery vial (-10 gold)',
        description: 'Random: heal 20 HP, gain 1 Moonshine, or take 10 poison damage.',
        effect: 'buy_mystery_vial',
      },
      {
        label: 'Threaten him',
        description: '+1 Tonic, +1 Bandage. Shops cost +15% this act.',
        effect: 'threaten_merchant',
      },
    ],
  },
  {
    id: 'coyote_den',
    title: 'The Coyote Den',
    flavourText:
      'Howling from a rocky overhang. Fresh tracks leading into a narrow cave.',
    choices: [
      {
        label: 'Smoke them out',
        description: '-1 consumable. +20 gold from cached loot inside.',
        effect: 'smoke_out_den',
      },
      {
        label: 'Sneak past',
        description: 'No cost. +1 Smoke Bomb.',
        effect: 'gain_smoke_bomb',
      },
    ],
  },
];
