import type { TutorialSequence } from '../store/tutorialStore';

// Tutorials that are referenced by `nextTutorial` must be defined before the
// tutorial that chains to them, so declarations are bottom-up within each chain.

// --- Character Select (chained from Intro) ---

export const TUTORIAL_CHAR_SELECT: TutorialSequence = {
  id: 'char-select',
  steps: [
    {
      text: 'Select your character here. Each character has unique starting tiles, abilities, and stats.',
      spotlight: { x: -10, y: 190, width: 180, height: 160 },
      tooltipPosition: 'right',
    },
    {
      text: 'Some characters are locked. You can unlock them by spending Reputation in the Reputation Shop from the main menu.',
      spotlight: { x: -10, y: 270, width: 160, height: 70 },
      tooltipPosition: 'right',
    },
    {
      text: 'This shows your character\'s health, ability, and starting equipment.',
      spotlight: { x: 300, y: 340, width: 360, height: 140 },
      tooltipPosition: 'top',
    },
    {
      text: 'Select Rust and press Confirm to begin your journey!',
    },
  ],
};

// --- 1. Intro ---

export const TUTORIAL_INTRO: TutorialSequence = {
  id: 'intro',
  steps: [
    { text: 'Welcome, Challenger! Tutorials will guide you through the basics as you play. You can turn them off anytime in Settings. Would you like to continue with tutorials?', showSkip: true },
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
      tooltipPosition: 'right',
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
      tooltipPosition: 'bottom',
    },
    {
      text: 'These are your consumable slots. Use items here during combat for powerful effects.',
      spotlight: { x: 100, y: 0, width: 70, height: 28 },
      tooltipPosition: 'bottom',
    },
    {
      text: 'Your health and gold are displayed here. Keep an eye on both -- running out of health ends the run.',
      spotlight: { x: 785, y: 0, width: 105, height: 28 },
      tooltipPosition: 'bottom',
    },
    {
      text: 'Use these buttons to view your tiles, open the map, or access settings.',
      spotlight: { x: 880, y: 0, width: 80, height: 28 },
      tooltipPosition: 'bottom',
    },
    {
      text: 'Artifacts you collect appear here. Hover over them to see their effects.',
      spotlight: { x: 0, y: 28, width: 460, height: 24 },
      tooltipPosition: 'bottom',
    },
    {
      text: 'Your active traits are shown here. Obtaining artifacts levels up traits for powerful bonuses.',
      spotlight: { x: 500, y: 28, width: 460, height: 24 },
      tooltipPosition: 'bottom',
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
