import type { TutorialSequence } from '../store/tutorialStore';

// --- Tile hazards & powerup tiles (spotlighted on the actual tile) ---
//
// These tutorials are built dynamically at runtime so the spotlight can
// target the specific board cell that just had the hazard placed (or the
// powerup tile that just appeared). Trigger via `buildTileTutorial`.

export interface TileTutorialEntry {
  /** Stable id used for tutorial-completion tracking. */
  id: string;
  /** Body copy shown in the dialog. */
  text: string;
}

/** Hazard placed on existing tiles by enemies. */
export const TILE_HAZARD_TUTORIALS: Record<string, TileTutorialEntry> = {
  lock:        { id: 'tile-hazard-lock',        text: 'A locked tile cannot be moved. Each match it touches removes one lock charge -- match it enough times to free it.' },
  poison:      { id: 'tile-hazard-poison',      text: 'A poisoned tile applies Poison to you when matched. Match it (or clear it with consumables) before it hurts you.' },
  bomb:        { id: 'tile-hazard-bomb',        text: 'A bomb tile counts down each turn. When it hits zero, it explodes and damages you. Match it or clear it before then.' },
  sand:        { id: 'tile-hazard-sand',        text: 'A buried tile is locked under sand. It cannot move until you clear the sand by matching adjacent tiles.' },
  suppress:    { id: 'tile-hazard-suppress',    text: 'A suppressed tile generates no resources when matched. Avoid matching it unless you have to.' },
  fools_gold:  { id: 'tile-hazard-fools_gold',  text: "A Fool's Gold tile looks like a gold tile but counts as fake. Matches that include it pay out less gold." },
};

/** Special player-side tile states ("powerups") the player should learn about
 *  the first time they appear on the board. */
export const TILE_POWERUP_TUTORIALS: Record<string, TileTutorialEntry> = {
  shadow:     { id: 'tile-powerup-shadow',     text: 'A shadow tile fires a shadow bolt for extra damage to your target when it is destroyed -- match it to fire the bolt.' },
  explosive:  { id: 'tile-powerup-explosive',  text: 'An explosive tile! When matched, it detonates a 3x3 area, destroying all tiles around it and triggering their effects.' },
};

/** Build a tutorial sequence with a spotlight rectangle around a specific
 *  board tile. Coordinates are 960x540 virtual pixels (the same coordinate
 *  space the rest of the tutorial system uses). */
export function buildTileTutorial(
  entry: TileTutorialEntry,
  spotlight: { x: number; y: number; width: number; height: number },
): TutorialSequence {
  return {
    id: entry.id,
    steps: [{ text: entry.text, spotlight }],
  };
}

// Tutorials that are referenced by `nextTutorial` must be defined before the
// tutorial that chains to them, so declarations are bottom-up within each chain.

// --- Character Select (chained from Intro) ---

export const TUTORIAL_CHAR_SELECT: TutorialSequence = {
  id: 'char-select',
  steps: [
    {
      text: 'Select your character here. Each character has unique starting tiles, abilities, and stats.',
      viewportSpotlight: { left: -10, vCenter: true, top: 0, width: 180, height: 160, applyScale: true },
      tooltipPosition: 'center',
    },
    {
      text: 'Some characters are locked. You can unlock them by spending Reputation in the Reputation Shop from the main menu.',
      viewportSpotlight: { left: -10, vCenter: true, top: 35, width: 160, height: 70, applyScale: true },
      tooltipPosition: 'center',
    },
    {
      text: 'This shows your character\'s health, ability, and starting equipment.',
      spotlight: { x: 300, y: 340, width: 360, height: 140 },
      tooltipPosition: 'center',
    },
    {
      text: 'Select Rust and press Confirm to begin your journey!',
      tooltipPosition: 'center',
    },
  ],
};

// --- 1. Intro ---

export const TUTORIAL_INTRO: TutorialSequence = {
  id: 'intro',
  steps: [
    {
      text: 'Welcome, Challenger! Tutorials will guide you through the basics as you play. You can turn them off anytime in Settings. Would you like to continue with tutorials?',
      showSkip: true,
      tooltipPosition: 'center',
    },
  ],
  nextTutorial: TUTORIAL_CHAR_SELECT,
};

// --- 2. Tile Select ---

export const TUTORIAL_TILE_SELECT: TutorialSequence = {
  id: 'tile-select',
  steps: [
    {
      text: 'Before your first battle, choose a new tile to add to your deck. Each tile grants different resources when matched.',
      spotlight: { x: 260, y: 180, width: 440, height: 170 },
      tooltipPosition: 'top',
    },
    {
      text: 'Pick a tile that complements your character\'s strengths. You can hover over each tile to see what it does.',
      spotlight: { x: 260, y: 180, width: 440, height: 170 },
      tooltipPosition: 'top',
    },
  ],
};

// --- Click Node (chained from Top Bar) ---

export const TUTORIAL_CLICK_NODE: TutorialSequence = {
  id: 'click-node',
  steps: [
    {
      text: 'Click on one of the starting nodes to begin your first combat!',
      spotlight: { x: 60, y: 160, width: 70, height: 250 },
      tooltipPosition: 'center',
    },
  ],
};

// --- Top Bar (chained from Map) ---

export const TUTORIAL_TOP_BAR: TutorialSequence = {
  id: 'top-bar',
  steps: [
    {
      text: 'This is the top bar. Look here for information about your run, including which act you\'re on, your consumables, artifacts, traits, health, and gold.',
      spotlight: { x: 0, y: 0, width: 960, height: 60 },
      tooltipPosition: 'center',
    },
    {
      text: 'These are your consumable slots. Use items here during combat for powerful effects.',
      spotlight: { x: 100, y: 0, width: 70, height: 28 },
      tooltipPosition: 'center',
    },
    {
      text: 'Your health and gold are displayed here. Keep an eye on both -- running out of health ends the run.',
      spotlight: { x: 785, y: 0, width: 105, height: 28 },
      tooltipPosition: 'center',
    },
    {
      text: 'Use these buttons to view your tiles, open the map, or access settings.',
      spotlight: { x: 880, y: 0, width: 80, height: 28 },
      tooltipPosition: 'center',
    },
    {
      text: 'Artifacts you collect appear here. Hover over them to see their effects.',
      spotlight: { x: 0, y: 28, width: 460, height: 24 },
      tooltipPosition: 'center',
    },
    {
      text: 'Your active traits are shown here. Obtaining artifacts levels up traits for powerful bonuses.',
      spotlight: { x: 500, y: 28, width: 460, height: 24 },
      tooltipPosition: 'center',
    },
  ],
  nextTutorial: TUTORIAL_CLICK_NODE,
};

// --- 3. Map ---

export const TUTORIAL_MAP: TutorialSequence = {
  id: 'map',
  steps: [
    {
      text: 'This is the Map. Choose a path through the nodes to reach the boss at the end of each act.',
      spotlight: { x: 30, y: 120, width: 900, height: 350 },
      tooltipPosition: 'top',
    },
    {
      text: 'Each node type offers something different: Combat for fights, Merchants for upgrades, Campfires to heal, and Events for surprises.',
      spotlight: { x: 30, y: 120, width: 900, height: 350 },
      tooltipPosition: 'top',
    },
    {
      text: 'Plan your route carefully. Elite nodes are tougher but give better rewards.',
      spotlight: { x: 30, y: 120, width: 900, height: 350 },
      tooltipPosition: 'top',
    },
  ],
  nextTutorial: TUTORIAL_TOP_BAR,
};
