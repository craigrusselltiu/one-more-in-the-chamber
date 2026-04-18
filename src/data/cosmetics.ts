import type { CharacterId } from '../types/game';

/** Nameplate: background treatment applied to a leaderboard row. */
export interface NameplateDef {
  id: string;
  name: string;
  /** Path (relative to Vite's BASE_URL) of the nameplate image. Rendered as
   *  the leaderboard row background and as the preview in shop/customize. */
  imagePath?: string;
  /** Optional CSS fallback for CSS-only nameplates (gradients etc). */
  cssBackground?: string;
}

/** Colour: applies a visual treatment to the player name on leaderboard rows.
 *  Either a solid hex or an animated shimmer gradient via a CSS class. */
export interface ColourDef {
  id: string;
  name: string;
  /** Short blurb shown on the Customize card under the preview. */
  description?: string;
  /** Solid hex tint. Ignored if shimmerClass is set. */
  hex?: string;
  /** CSS class applying a gradient + background-clip: text animation. When
   *  set, the leaderboard wraps the player name in this class and skips hex. */
  shimmerClass?: string;
}

/** Title: short flavour text shown under the player name on leaderboard rows. */
export interface TitleDef {
  id: string;
  name: string;
  text: string;
  /** When true, the title is hidden from the Rep Shop and only appears on
   *  the Customize screen for creator/dev accounts (auth.isDev === true).
   *  Equippable without going through the normal unlock flow. */
  devOnly?: boolean;
}

/** Skin: swap a character's appearance. Wired but no content yet. */
export interface SkinDef {
  id: string;
  name: string;
  characterId: CharacterId;
}

export const NAMEPLATES: NameplateDef[] = [
  {
    id: 'nameplate_rust',
    name: 'Rust',
    imagePath: 'assets/nameplates/rust.png',
  },
  {
    id: 'nameplate_reno',
    name: 'Reno',
    imagePath: 'assets/nameplates/reno.png',
  },
  {
    id: 'nameplate_wanted',
    name: 'Wanted',
    imagePath: 'assets/nameplates/wanted.png',
  },
  {
    id: 'nameplate_train',
    name: 'Train',
    imagePath: 'assets/nameplates/train.png',
  },
  {
    id: 'nameplate_cherry',
    name: 'Cherry Blossom',
    imagePath: 'assets/nameplates/cherry.png',
  },
  {
    id: 'nameplate_blood_moon',
    name: 'Blood Moon',
    imagePath: 'assets/nameplates/blood_moon.png',
  },
  {
    id: 'nameplate_bubble_tea',
    name: 'Bubble Tea',
    imagePath: 'assets/nameplates/bubble_tea.png',
  },
  {
    id: 'nameplate_golden_laurels',
    name: 'Golden Laurels',
    imagePath: 'assets/nameplates/golden_laurels.png',
  },
  {
    id: 'nameplate_graveyard',
    name: 'Graveyard',
    imagePath: 'assets/nameplates/graveyard.png',
  },
  {
    id: 'nameplate_void',
    name: 'Void',
    imagePath: 'assets/nameplates/void.png',
  },
];

export const COLOURS: ColourDef[] = [
  {
    id: 'colour_rainbow',
    name: 'Rainbow',
    description: 'Every colour of the spectrum, shimmering.',
    shimmerClass: 'name-shimmer-rainbow',
  },
  {
    id: 'colour_red',
    name: 'Red',
    description: 'A deep red shimmer.',
    shimmerClass: 'name-shimmer-red',
  },
  {
    id: 'colour_gold',
    name: 'Gold',
    description: 'A rich golden shimmer.',
    shimmerClass: 'name-shimmer-gold',
  },
  {
    id: 'colour_blue',
    name: 'Blue',
    description: 'A cool sapphire shimmer.',
    shimmerClass: 'name-shimmer-blue',
  },
  {
    id: 'colour_poison',
    name: 'Poison',
    description: 'A toxic green shimmer.',
    shimmerClass: 'name-shimmer-poison',
  },
  {
    id: 'colour_shadow',
    name: 'Shadow',
    description: 'A deep violet shimmer.',
    shimmerClass: 'name-shimmer-shadow',
  },
  {
    id: 'colour_bubblegum',
    name: 'Bubblegum',
    description: 'A sweet pink shimmer.',
    shimmerClass: 'name-shimmer-bubblegum',
  },
];

export const TITLES: TitleDef[] = [
  { id: 'title_rust_main',     name: 'Rust Main',     text: 'Rust Main' },
  { id: 'title_reno_main',     name: 'Reno Main',     text: 'Reno Main' },
  { id: 'title_john_chamber',  name: 'John Chamber',  text: 'John Chamber' },

  // Trait-themed (3,000 each).
  { id: 'title_outlaw',            name: 'Outlaw',            text: 'Outlaw' },
  { id: 'title_sheriff',           name: 'Sheriff',           text: 'Sheriff' },
  { id: 'title_prospector',        name: 'Prospector',        text: 'Prospector' },
  { id: 'title_sapper',            name: 'Sapper',            text: 'Sapper' },
  { id: 'title_mustang',           name: 'Mustang',           text: 'Mustang' },
  { id: 'title_gunslinger',        name: 'Gunslinger',        text: 'Gunslinger' },
  { id: 'title_saloon_keeper',     name: 'Saloon Keeper',     text: 'Saloon Keeper' },
  { id: 'title_desperado',         name: 'Desperado',         text: 'Desperado' },
  { id: 'title_sniper',            name: 'Sniper',            text: 'Sniper' },
  { id: 'title_dead_man_walking',  name: 'Dead Man Walking',  text: 'Dead Man Walking' },
  { id: 'title_tracker',           name: 'Tracker',           text: 'Tracker' },
  { id: 'title_preacher',          name: 'Preacher',          text: 'Preacher' },
  { id: 'title_antivenom',         name: 'Antivenom',         text: 'Antivenom' },
  { id: 'title_undertaker',        name: 'Undertaker',        text: 'Undertaker' },
  { id: 'title_rattlesnake',       name: 'Rattlesnake',       text: 'Rattlesnake' },
  { id: 'title_corrupt',           name: 'Corrupt',           text: 'Corrupt' },

  // Ominous / flavour (5,000 each).
  { id: 'title_six_feet_under',           name: 'Six Feet Under',           text: 'Six Feet Under' },
  { id: 'title_dead_or_alive',            name: 'Dead Or Alive',            text: 'Dead Or Alive' },
  { id: 'title_nine_lives',               name: 'Nine Lives',               text: 'Nine Lives' },
  { id: 'title_wanted_in_three_counties', name: 'Wanted In Three Counties', text: 'Wanted In Three Counties' },

  // Prestige (10,000 each).
  { id: 'title_legend_of_the_west', name: 'Legend Of The West', text: 'Legend Of The West' },
  { id: 'title_the_one_they_fear',  name: 'The One They Fear',  text: 'The One They Fear' },
  { id: 'title_still_kicking',      name: 'Still Kicking',      text: 'Still Kicking' },
  { id: 'title_not_guilty',         name: 'Not Guilty',         text: 'Not Guilty' },
  { id: 'title_fuck_it_we_ball',    name: 'Fuck It We Ball',    text: 'Fuck It We Ball' },

  // Creator-only. Not in the shop; surfaces on Customize for the dev account
  // regardless of unlocked_titles state.
  { id: 'title_one_above_all', name: 'One Above All', text: 'One Above All', devOnly: true },
];

export const SKINS: SkinDef[] = [
  // Empty: schema + UI ready, no content yet.
];

export const NAMEPLATE_BY_ID: Record<string, NameplateDef> = Object.fromEntries(
  NAMEPLATES.map((n) => [n.id, n]),
);
export const COLOUR_BY_ID: Record<string, ColourDef> = Object.fromEntries(
  COLOURS.map((c) => [c.id, c]),
);
export const TITLE_BY_ID: Record<string, TitleDef> = Object.fromEntries(
  TITLES.map((t) => [t.id, t]),
);
export const SKIN_BY_ID: Record<string, SkinDef> = Object.fromEntries(
  SKINS.map((s) => [s.id, s]),
);
