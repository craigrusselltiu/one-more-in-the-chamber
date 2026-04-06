export type ShopCategory = 'artifact' | 'event' | 'loadout' | 'cosmetic' | 'character';

export interface ShopItemDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: ShopCategory;
  /** The ID added to the corresponding metaStore unlock array on purchase. */
  unlockId: string;
}

/**
 * Reputation Shop items. Costs are tuning knobs -- adjust via playtesting.
 *
 * Artifacts: gated behind reputation so they don't appear in run pools until purchased.
 * Events: unlock additional narrative encounters for future runs.
 * Loadouts: starting bonuses applied at run start.
 * Cosmetics: visual-only, no gameplay effect.
 * Characters: future playable characters.
 */
export const SHOP_ITEMS: ShopItemDefinition[] = [
  // --- Artifacts (unlock into the run artifact pool) ---
  {
    id: 'shop_rusts_cylinder',
    name: "Rust's Cylinder",
    description: 'Six in the chamber. No reloads.',
    cost: 500,
    category: 'artifact',
    unlockId: 'rusts_cylinder',
  },
  {
    id: 'shop_twin_revolvers',
    name: 'Twin Revolvers',
    description: 'Two barrels, two chances.',
    cost: 300,
    category: 'artifact',
    unlockId: 'twin_revolvers',
  },
  {
    id: 'shop_shed_skin',
    name: 'Shed Skin',
    description: 'Shed one life. Start another.',
    cost: 400,
    category: 'artifact',
    unlockId: 'shed_skin',
  },
  {
    id: 'shop_quickdraw_holster',
    name: 'Quickdraw Holster',
    description: 'Draw first, ask questions never.',
    cost: 350,
    category: 'artifact',
    unlockId: 'quickdraw_holster',
  },
  {
    id: 'shop_moonshine_still',
    name: 'Moonshine Still',
    description: 'Liquid courage. Burns both ways.',
    cost: 250,
    category: 'artifact',
    unlockId: 'moonshine_still',
  },
  {
    id: 'shop_demolition_expert',
    name: 'Demolition Expert',
    description: 'Shaped charges. Precision destruction.',
    cost: 300,
    category: 'artifact',
    unlockId: 'demolition_expert',
  },
  {
    id: 'shop_ivory_handled_revolver',
    name: 'Ivory-Handled Revolver',
    description: 'Pretty to look at. Prettier when it fires.',
    cost: 350,
    category: 'artifact',
    unlockId: 'ivory_handled_revolver',
  },
  {
    id: 'shop_motherlode_map',
    name: 'Motherlode Map',
    description: 'X marks the fortune.',
    cost: 250,
    category: 'artifact',
    unlockId: 'motherlode_map',
  },
  {
    id: 'shop_iron_will',
    name: 'Iron Will',
    description: 'Bent but never broken.',
    cost: 200,
    category: 'artifact',
    unlockId: 'iron_will',
  },
  {
    id: 'shop_double_or_nothing',
    name: 'Double or Nothing',
    description: 'All in. Every time.',
    cost: 150,
    category: 'artifact',
    unlockId: 'double_or_nothing',
  },
  {
    id: 'shop_bullet_proof_bible',
    name: 'Bullet-Proof Bible',
    description: 'The Lord works in mysterious ways.',
    cost: 300,
    category: 'artifact',
    unlockId: 'bullet_proof_bible',
  },
  {
    id: 'shop_dead_mans_hand',
    name: "Dead Man's Hand",
    description: 'A poker hand so cursed it kills.',
    cost: 250,
    category: 'artifact',
    unlockId: 'dead_mans_hand',
  },

  // --- Events (unlock into the run event pool) ---
  {
    id: 'shop_traveling_preacher',
    name: 'The Traveling Preacher',
    description: 'A man of the cloth with a quick draw.',
    cost: 100,
    category: 'event',
    unlockId: 'traveling_preacher',
  },
  {
    id: 'shop_ghost_town_saloon',
    name: 'The Ghost Town Saloon',
    description: 'Empty bar. Piano plays itself.',
    cost: 100,
    category: 'event',
    unlockId: 'ghost_town_saloon',
  },
  {
    id: 'shop_train_wreck',
    name: 'The Train Wreck',
    description: 'Derailed locomotive. Cargo for the taking.',
    cost: 150,
    category: 'event',
    unlockId: 'train_wreck',
  },
  {
    id: 'shop_medicine_wagon',
    name: 'The Medicine Wagon',
    description: 'Strange tonics from a stranger seller.',
    cost: 100,
    category: 'event',
    unlockId: 'medicine_wagon',
  },
  {
    id: 'shop_rigged_bridge',
    name: 'The Rigged Bridge',
    description: 'Dynamite on the supports. Your call.',
    cost: 125,
    category: 'event',
    unlockId: 'rigged_bridge',
  },

  // --- Loadouts (starting bonuses for runs) ---
  {
    id: 'shop_loadout_outlaws_stash',
    name: "Outlaw's Stash",
    description: 'Start each run with 15 bonus gold.',
    cost: 200,
    category: 'loadout',
    unlockId: 'outlaws_stash',
  },
  {
    id: 'shop_loadout_healers_kit',
    name: "Healer's Kit",
    description: 'Start each run with a Tonic.',
    cost: 150,
    category: 'loadout',
    unlockId: 'healers_kit',
  },
  {
    id: 'shop_loadout_demolitions_kit',
    name: 'Demolitions Kit',
    description: 'Start each run with 2 Sticks of TNT.',
    cost: 250,
    category: 'loadout',
    unlockId: 'demolitions_kit',
  },
  {
    id: 'shop_loadout_lucky_start',
    name: 'Lucky Start',
    description: 'Start each run with a Horseshoe Charm.',
    cost: 300,
    category: 'loadout',
    unlockId: 'lucky_start',
  },
  {
    id: 'shop_loadout_scouts_pack',
    name: "Scout's Pack",
    description: 'Start each run with a Smoke Bomb and a Signal Flare.',
    cost: 175,
    category: 'loadout',
    unlockId: 'scouts_pack',
  },

  // --- Cosmetics (visual only) ---
  {
    id: 'shop_cosmetic_golden_tiles',
    name: 'Golden Tiles',
    description: 'All tiles shimmer with a gold tint.',
    cost: 200,
    category: 'cosmetic',
    unlockId: 'golden_tiles',
  },
  {
    id: 'shop_cosmetic_night_board',
    name: 'Midnight Board',
    description: 'Board backdrop shifts to a moonlit canyon.',
    cost: 150,
    category: 'cosmetic',
    unlockId: 'night_board',
  },
  {
    id: 'shop_cosmetic_wanted_frame',
    name: 'Wanted Frame',
    description: 'Score screen framed like a wanted poster.',
    cost: 100,
    category: 'cosmetic',
    unlockId: 'wanted_frame',
  },

  // --- Characters (future playable characters) ---
  {
    id: 'shop_character_coyote',
    name: 'Coyote Drifter',
    description: 'Lone wanderer. Poisons the land behind him.',
    cost: 750,
    category: 'character',
    unlockId: 'coyote',
  },
  {
    id: 'shop_character_armadillo',
    name: 'Armadillo Marshal',
    description: 'Walking fortress. Slow but unbreakable.',
    cost: 750,
    category: 'character',
    unlockId: 'armadillo',
  },
];
