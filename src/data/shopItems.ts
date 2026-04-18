export type ShopCategory =
  | 'artifact'
  | 'event'
  | 'loadout'
  | 'cosmetic'
  | 'character'
  | 'skin'
  | 'nameplate'
  | 'colour'
  | 'title';

export interface ShopItemDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: ShopCategory;
  /** The ID added to the corresponding metaStore unlock array on purchase. */
  unlockId: string;
  /** When true, surfaces on the Featured tab of the Reputation Shop. */
  featured?: boolean;
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
  // --- Nameplates (leaderboard row background) ---
  {
    id: 'shop_nameplate_rust',
    name: 'Rust',
    description: '',
    cost: 15000,
    category: 'nameplate',
    unlockId: 'nameplate_rust',
  },
  {
    id: 'shop_nameplate_reno',
    name: 'Reno',
    description: '',
    cost: 15000,
    category: 'nameplate',
    unlockId: 'nameplate_reno',
  },
  {
    id: 'shop_nameplate_wanted',
    name: 'Wanted',
    description: '',
    cost: 20000,
    category: 'nameplate',
    unlockId: 'nameplate_wanted',
  },
  {
    id: 'shop_nameplate_train',
    name: 'Train',
    description: '',
    cost: 12000,
    category: 'nameplate',
    unlockId: 'nameplate_train',
  },

  // --- Colours (shimmering name tint on the leaderboard) ---
  {
    id: 'shop_colour_rainbow',
    name: 'Rainbow',
    description: 'Every colour of the spectrum, shimmering.',
    cost: 999999,
    category: 'colour',
    unlockId: 'colour_rainbow',
  },
  {
    id: 'shop_colour_red',
    name: 'Red',
    description: 'A deep red shimmer.',
    cost: 20000,
    category: 'colour',
    unlockId: 'colour_red',
  },
  {
    id: 'shop_colour_gold',
    name: 'Gold',
    description: 'A rich golden shimmer.',
    cost: 10000,
    category: 'colour',
    unlockId: 'colour_gold',
  },
  {
    id: 'shop_colour_blue',
    name: 'Blue',
    description: 'A cool sapphire shimmer.',
    cost: 5000,
    category: 'colour',
    unlockId: 'colour_blue',
  },
  {
    id: 'shop_colour_poison',
    name: 'Poison',
    description: 'A toxic green shimmer.',
    cost: 25000,
    category: 'colour',
    unlockId: 'colour_poison',
  },
  {
    id: 'shop_colour_shadow',
    name: 'Shadow',
    description: 'A deep violet shimmer.',
    cost: 30000,
    category: 'colour',
    unlockId: 'colour_shadow',
  },
  {
    id: 'shop_colour_bubblegum',
    name: 'Bubblegum',
    description: 'A sweet pink shimmer.',
    cost: 30000,
    category: 'colour',
    unlockId: 'colour_bubblegum',
  },

  // --- Titles (subtitle under your leaderboard name) ---
  {
    id: 'shop_title_rust_main',
    name: 'Rust Main',
    description: '"Rust Main" appears beneath your name.',
    cost: 3000,
    category: 'title',
    unlockId: 'title_rust_main',
  },
  {
    id: 'shop_title_reno_main',
    name: 'Reno Main',
    description: '"Reno Main" appears beneath your name.',
    cost: 3000,
    category: 'title',
    unlockId: 'title_reno_main',
  },
  {
    id: 'shop_title_john_chamber',
    name: 'John Chamber',
    description: '"John Chamber" appears beneath your name.',
    cost: 66666,
    category: 'title',
    unlockId: 'title_john_chamber',
  },
];
