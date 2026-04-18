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
  {
    id: 'shop_nameplate_cherry',
    name: 'Cherry Blossom',
    description: '',
    cost: 5000,
    category: 'nameplate',
    unlockId: 'nameplate_cherry',
  },
  {
    id: 'shop_nameplate_blood_moon',
    name: 'Blood Moon',
    description: '',
    cost: 66666,
    category: 'nameplate',
    unlockId: 'nameplate_blood_moon',
  },
  {
    id: 'shop_nameplate_bubble_tea',
    name: 'Bubble Tea',
    description: '',
    cost: 15000,
    category: 'nameplate',
    unlockId: 'nameplate_bubble_tea',
  },
  {
    id: 'shop_nameplate_golden_laurels',
    name: 'Golden Laurels',
    description: '',
    cost: 7777,
    category: 'nameplate',
    unlockId: 'nameplate_golden_laurels',
  },
  {
    id: 'shop_nameplate_graveyard',
    name: 'Graveyard',
    description: '',
    cost: 15000,
    category: 'nameplate',
    unlockId: 'nameplate_graveyard',
  },
  {
    id: 'shop_nameplate_void',
    name: 'Void',
    description: '',
    cost: 25000,
    category: 'nameplate',
    unlockId: 'nameplate_void',
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

  // --- Trait-themed titles (3,000 each) ---
  { id: 'shop_title_outlaw',           name: 'Outlaw',           description: '"Outlaw" appears beneath your name.',           cost: 3000, category: 'title', unlockId: 'title_outlaw' },
  { id: 'shop_title_sheriff',          name: 'Sheriff',          description: '"Sheriff" appears beneath your name.',          cost: 3000, category: 'title', unlockId: 'title_sheriff' },
  { id: 'shop_title_prospector',       name: 'Prospector',       description: '"Prospector" appears beneath your name.',       cost: 3000, category: 'title', unlockId: 'title_prospector' },
  { id: 'shop_title_sapper',           name: 'Sapper',           description: '"Sapper" appears beneath your name.',           cost: 3000, category: 'title', unlockId: 'title_sapper' },
  { id: 'shop_title_mustang',          name: 'Mustang',          description: '"Mustang" appears beneath your name.',          cost: 3000, category: 'title', unlockId: 'title_mustang' },
  { id: 'shop_title_gunslinger',       name: 'Gunslinger',       description: '"Gunslinger" appears beneath your name.',       cost: 3000, category: 'title', unlockId: 'title_gunslinger' },
  { id: 'shop_title_saloon_keeper',    name: 'Saloon Keeper',    description: '"Saloon Keeper" appears beneath your name.',    cost: 3000, category: 'title', unlockId: 'title_saloon_keeper' },
  { id: 'shop_title_desperado',        name: 'Desperado',        description: '"Desperado" appears beneath your name.',        cost: 3000, category: 'title', unlockId: 'title_desperado' },
  { id: 'shop_title_sniper',           name: 'Sniper',           description: '"Sniper" appears beneath your name.',           cost: 3000, category: 'title', unlockId: 'title_sniper' },
  { id: 'shop_title_dead_man_walking', name: 'Dead Man Walking', description: '"Dead Man Walking" appears beneath your name.', cost: 3000, category: 'title', unlockId: 'title_dead_man_walking' },
  { id: 'shop_title_tracker',          name: 'Tracker',          description: '"Tracker" appears beneath your name.',          cost: 3000, category: 'title', unlockId: 'title_tracker' },
  { id: 'shop_title_preacher',         name: 'Preacher',         description: '"Preacher" appears beneath your name.',         cost: 3000, category: 'title', unlockId: 'title_preacher' },
  { id: 'shop_title_antivenom',        name: 'Antivenom',        description: '"Antivenom" appears beneath your name.',        cost: 3000, category: 'title', unlockId: 'title_antivenom' },
  { id: 'shop_title_undertaker',       name: 'Undertaker',       description: '"Undertaker" appears beneath your name.',       cost: 3000, category: 'title', unlockId: 'title_undertaker' },
  { id: 'shop_title_rattlesnake',      name: 'Rattlesnake',      description: '"Rattlesnake" appears beneath your name.',      cost: 3000, category: 'title', unlockId: 'title_rattlesnake' },
  { id: 'shop_title_corrupt',          name: 'Corrupt',          description: '"Corrupt" appears beneath your name.',          cost: 3000, category: 'title', unlockId: 'title_corrupt' },

  // --- Ominous / flavour titles (5,000 each) ---
  { id: 'shop_title_six_feet_under',           name: 'Six Feet Under',           description: '"Six Feet Under" appears beneath your name.',           cost: 5000, category: 'title', unlockId: 'title_six_feet_under' },
  { id: 'shop_title_dead_or_alive',            name: 'Dead Or Alive',            description: '"Dead Or Alive" appears beneath your name.',            cost: 5000, category: 'title', unlockId: 'title_dead_or_alive' },
  { id: 'shop_title_nine_lives',               name: 'Nine Lives',               description: '"Nine Lives" appears beneath your name.',               cost: 5000, category: 'title', unlockId: 'title_nine_lives' },
  { id: 'shop_title_wanted_in_three_counties', name: 'Wanted In Three Counties', description: '"Wanted In Three Counties" appears beneath your name.', cost: 5000, category: 'title', unlockId: 'title_wanted_in_three_counties' },

  // --- Prestige titles (10,000 each) ---
  { id: 'shop_title_legend_of_the_west', name: 'Legend Of The West', description: '"Legend Of The West" appears beneath your name.', cost: 10000, category: 'title', unlockId: 'title_legend_of_the_west' },
  { id: 'shop_title_the_one_they_fear',  name: 'The One They Fear',  description: '"The One They Fear" appears beneath your name.',  cost: 10000, category: 'title', unlockId: 'title_the_one_they_fear' },
  { id: 'shop_title_still_kicking',      name: 'Still Kicking',      description: '"Still Kicking" appears beneath your name.',      cost: 10000, category: 'title', unlockId: 'title_still_kicking' },
  { id: 'shop_title_not_guilty',         name: 'Not Guilty',         description: '"Not Guilty" appears beneath your name.',         cost: 10000, category: 'title', unlockId: 'title_not_guilty' },
  { id: 'shop_title_fuck_it_we_ball',    name: 'Fuck It We Ball',    description: '"Fuck It We Ball" appears beneath your name.',    cost: 10000, category: 'title', unlockId: 'title_fuck_it_we_ball' },
];
