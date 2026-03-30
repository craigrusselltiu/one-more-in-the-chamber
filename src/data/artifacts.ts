import type { TraitId } from '../types/game';

export interface ArtifactDefinition {
  id: string;
  name: string;
  description: string;
  tags: TraitId[];
  effect: string;
}

/** Sample artifacts from SPEC (~20 for MVP). */
export const ARTIFACTS: ArtifactDefinition[] = [
  {
    id: 'stolen_badge',
    name: 'Stolen Badge',
    description: 'Wanted fugitive. Merchants charge extra.',
    tags: ['sheriff', 'outlaw'],
    effect: '+2 block/turn, shops +10%.',
  },
  {
    id: 'worn_lasso',
    name: 'Worn Lasso',
    description: 'Fraying rope. One use before it snaps.',
    tags: ['mustang'],
    effect: 'Once/fight non-adjacent swap.',
  },
  {
    id: 'rattlesnake_fang_necklace',
    name: 'Rattlesnake Fang Necklace',
    description: 'Pulled the fang. Bites for you now.',
    tags: ['rattlesnake'],
    effect: '3 damage on poison match.',
  },
  {
    id: 'stick_of_dynamite',
    name: 'Stick of Dynamite',
    description: 'Light the fuse, clear the path.',
    tags: ['sapper'],
    effect: 'Once/fight clear entire row.',
  },
  {
    id: 'bandits_bandana',
    name: "Bandit's Bandana",
    description: 'Big moves, big payouts.',
    tags: ['outlaw'],
    effect: '4+ matches: 25% for 1 gold.',
  },
  {
    id: 'wanted_poster',
    name: 'Wanted Poster',
    description: 'Studied their tricks.',
    tags: ['sheriff'],
    effect: 'Disable random enemy board ability 3 turns.',
  },
  {
    id: 'snakeskin_boots',
    name: 'Snakeskin Boots',
    description: 'Venom slides right off.',
    tags: ['rattlesnake'],
    effect: 'First poison tile/turn auto-cleansed.',
  },
  {
    id: 'gold_tooth',
    name: 'Gold Tooth',
    description: 'Every shot shakes loose a coin.',
    tags: ['outlaw', 'prospector'],
    effect: 'Bullet matches: 15% for 1 gold.',
  },
  {
    id: 'saddlebag',
    name: 'Saddlebag',
    description: 'More room, more tricks.',
    tags: ['mustang'],
    effect: '+1 consumable slot (4 total).',
  },
  {
    id: 'rusty_deputy_badge',
    name: 'Rusty Deputy Badge',
    description: 'Tarnished but tough. Like you.',
    tags: ['sheriff'],
    effect: '+3 block per iron match.',
  },
  {
    id: 'twin_revolvers',
    name: 'Twin Revolvers',
    description: 'Two barrels, two chances.',
    tags: ['outlaw'],
    effect: 'Bullets hit 2x at 60% each (120%).',
  },
  {
    id: 'fools_gold_detector',
    name: "Fool's Gold Detector",
    description: 'Burned before. Never again.',
    tags: ['prospector'],
    effect: "Immune to fool's gold tiles.",
  },
  {
    id: 'cactus_spine_vest',
    name: 'Cactus Spine Vest',
    description: 'They hit you, they get pricked.',
    tags: ['rattlesnake'],
    effect: 'Enemy attacks poison 1 tile.',
  },
  {
    id: 'lit_fuse',
    name: 'Lit Fuse',
    description: 'Chain reaction never stops.',
    tags: ['sapper'],
    effect: 'Defused bombs: 50% to spawn new bomb.',
  },
  {
    id: 'horseshoe_charm',
    name: 'Horseshoe Charm',
    description: 'Lucky start.',
    tags: [],
    effect: '+5 max HP. First match/fight: 2x resources.',
  },
  {
    id: 'quickdraw_holster',
    name: 'Quickdraw Holster',
    description: 'Draw first, ask questions never.',
    tags: ['mustang', 'outlaw'],
    effect: 'First swap/turn resolves early. Kill = refund swaps.',
  },
  {
    id: 'dynamite_vest',
    name: 'Dynamite Vest',
    description: 'Explosives on your chest. Crazy but effective.',
    tags: ['sapper'],
    effect: 'Bomb detonation: 50% damage reflected.',
  },
  {
    id: 'lucky_bullet',
    name: 'Lucky Bullet',
    description: 'Only need to be lucky once.',
    tags: ['gunslinger'],
    effect: '+10% crit chance at fight start.',
  },
  {
    id: 'dead_mans_hand',
    name: "Dead Man's Hand",
    description: 'A poker hand so cursed it kills.',
    tags: ['gunslinger'],
    effect: 'Crits apply 1 Vulnerable.',
  },
  {
    id: 'fully_loaded',
    name: 'Fully Loaded',
    description: 'Six chambers. All loaded. The title.',
    tags: [],
    effect: 'Red panda only. Deadeye: 3 shots become 6.',
  },
];
