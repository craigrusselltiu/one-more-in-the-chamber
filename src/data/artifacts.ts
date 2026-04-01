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
    id: 'prospectors_pickaxe',
    name: "Prospector's Pickaxe",
    description: 'You know where to dig.',
    tags: ['prospector'],
    effect: 'Sand tiles revealed on any adjacent match.',
  },
  {
    id: 'loaded_dice',
    name: 'Loaded Dice',
    description: 'Rigged in your favour.',
    tags: ['prospector'],
    effect: 'Fight start: 3 tiles replaced with gold.',
  },
  {
    id: 'bounty_board',
    name: 'Bounty Board',
    description: 'Only hunt the dirty ones.',
    tags: ['sheriff'],
    effect: '+15% damage vs enemies with board abilities.',
  },
  {
    id: 'coyote_pelt',
    name: 'Coyote Pelt',
    description: 'Skinned the last one. Hint taken.',
    tags: ['outlaw', 'rattlesnake'],
    effect: 'Summoned enemies take 5 damage immediately.',
  },
  {
    id: 'iron_horse_shoes',
    name: 'Iron Horse Shoes',
    description: 'Armoured AND fast.',
    tags: ['mustang', 'sheriff'],
    effect: 'Iron matches: 20% for 1 ability charge.',
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
    id: 'rigged_deck',
    name: 'Rigged Deck',
    description: 'Lady luck pays well.',
    tags: ['gunslinger', 'prospector'],
    effect: 'Crits give 5 gold.',
  },
  {
    id: 'sharpshooters_eye',
    name: "Sharpshooter's Eye",
    description: 'More shots, sharper aim.',
    tags: ['gunslinger', 'outlaw'],
    effect: '+5% crit per swap used this turn. Resets at turn end.',
  },
  {
    id: 'silver_bullet',
    name: 'Silver Bullet',
    description: 'Save these for the big ones.',
    tags: ['gunslinger', 'sheriff'],
    effect: '+20% crit vs bosses only.',
  },
  {
    id: 'fully_loaded',
    name: 'Fully Loaded',
    description: 'Six chambers. All loaded. The title.',
    tags: [],
    effect: 'Red panda only. Deadeye: 3 shots become 6.',
  },

  // --- Batch 2: Outlaw / Sheriff / Prospector focus ---

  // Outlaw artifacts
  {
    id: 'train_heist_map',
    name: 'Train Heist Map',
    description: 'X marks the express.',
    tags: ['outlaw'],
    effect: '4+ matches: +2 flat bonus damage per tile above 3.',
  },
  {
    id: 'outlaws_spurs',
    name: "Outlaw's Spurs",
    description: 'Ride fast, ride reckless.',
    tags: ['outlaw', 'mustang'],
    effect: 'First 4+ match each turn: +50% damage.',
  },
  {
    id: 'moonshine_still',
    name: 'Moonshine Still',
    description: 'Liquid courage. Burns both ways.',
    tags: ['outlaw'],
    effect: '+20% all damage dealt. Take 2 damage at turn start.',
  },
  {
    id: 'marked_cards',
    name: 'Marked Cards',
    description: 'Nobody plays fair out here.',
    tags: ['outlaw', 'gunslinger'],
    effect: '4+ matches grant +10% crit chance.',
  },
  {
    id: 'crooked_deal',
    name: 'Crooked Deal',
    description: 'Shake hands. Count your fingers.',
    tags: ['outlaw', 'prospector'],
    effect: '4+ gold matches: triple gold generated.',
  },
  {
    id: 'rustlers_brand',
    name: "Rustler's Brand",
    description: "Took what wasn't yours. Made it yours.",
    tags: ['outlaw'],
    effect: 'Kill with a 4+ match: heal 5 HP.',
  },
  {
    id: 'double_or_nothing',
    name: 'Double or Nothing',
    description: 'All in. Every time.',
    tags: ['outlaw'],
    effect: '4+ matches: 50% double resources, 50% half.',
  },

  // Sheriff artifacts
  {
    id: 'tin_star',
    name: 'Tin Star',
    description: 'Small badge. Heavy burden.',
    tags: ['sheriff'],
    effect: '+1 block/turn per enemy on the field.',
  },
  {
    id: 'jail_cell_keys',
    name: 'Jail Cell Keys',
    description: 'Locked up and out of trouble.',
    tags: ['sheriff'],
    effect: 'Freeing a locked tile grants 3 block.',
  },
  {
    id: 'reinforced_duster',
    name: 'Reinforced Duster',
    description: 'Tailored for trouble.',
    tags: ['sheriff'],
    effect: 'Start each fight with 8 block.',
  },
  {
    id: 'lawmans_oath',
    name: "Lawman's Oath",
    description: 'Sworn duty. Steady hand.',
    tags: ['sheriff', 'gunslinger'],
    effect: 'While you have block, +10% crit chance.',
  },
  {
    id: 'frontier_justice',
    name: 'Frontier Justice',
    description: 'The verdict is guilty.',
    tags: ['sheriff'],
    effect: 'Fully blocked attacks deal 5 damage back to attacker.',
  },
  {
    id: 'patrol_route',
    name: 'Patrol Route',
    description: 'Walk the beat. Cover ground.',
    tags: ['sheriff', 'mustang'],
    effect: 'Unused swaps at turn end: +3 block each.',
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: 'Bent but never broken.',
    tags: ['sheriff'],
    effect: 'Below 50% HP: +4 block per turn.',
  },

  // Prospector artifacts
  {
    id: 'gold_pan',
    name: 'Gold Pan',
    description: 'Patience finds the gleam.',
    tags: ['prospector'],
    effect: 'Non-gold matches: 20% to spawn 1 gold tile on board.',
  },
  {
    id: 'assayers_lens',
    name: "Assayer's Lens",
    description: 'Every nugget appraised.',
    tags: ['prospector'],
    effect: 'Gold matches: +1 gold per tile matched.',
  },
  {
    id: 'mining_canary',
    name: 'Mining Canary',
    description: 'If it stops singing, run.',
    tags: ['prospector', 'rattlesnake'],
    effect: 'Poison tiles adjacent to gold: auto-cleansed, yield 1 gold each.',
  },
  {
    id: 'greeds_burden',
    name: "Greed's Burden",
    description: 'Heavy pockets. Heavier punches.',
    tags: ['prospector'],
    effect: '+1 damage per 15 gold held.',
  },
  {
    id: 'claim_jumpers_pick',
    name: "Claim Jumper's Pick",
    description: 'Finders keepers.',
    tags: ['prospector', 'outlaw'],
    effect: 'First gold match each fight: deal bonus damage equal to gold earned.',
  },
  {
    id: 'motherlode_map',
    name: 'Motherlode Map',
    description: 'X marks the fortune.',
    tags: ['prospector'],
    effect: 'Once/fight: 4+ gold match converts adjacent tiles into gold.',
  },

  // --- Batch 3: Mustang / Gunslinger / cross-trait focus ---

  // Mustang artifacts
  {
    id: 'trailblazers_compass',
    name: "Trailblazer's Compass",
    description: 'Never lost. Just taking the long way.',
    tags: ['mustang'],
    effect: 'Unused swaps at turn end deal 3 damage each to targeted enemy.',
  },
  {
    id: 'broncos_fury',
    name: "Bronco's Fury",
    description: 'Wild ride. Wilder finish.',
    tags: ['mustang'],
    effect: 'Last swap each turn: +75% damage from resulting matches.',
  },
  {
    id: 'dust_devil_boots',
    name: 'Dust Devil Boots',
    description: 'Kick up a storm.',
    tags: ['mustang'],
    effect: 'After using all swaps in a turn: shuffle the bottom 2 rows.',
  },

  // Gunslinger artifacts
  {
    id: 'ivory_handled_revolver',
    name: 'Ivory-Handled Revolver',
    description: 'Pretty to look at. Prettier when it fires.',
    tags: ['gunslinger'],
    effect: 'Crit chance persists between fights (no reset).',
  },
  {
    id: 'notched_barrel',
    name: 'Notched Barrel',
    description: 'One notch per kill. Running out of barrel.',
    tags: ['gunslinger'],
    effect: '+5% crit chance per enemy killed this fight.',
  },
  {
    id: 'snake_eyes',
    name: 'Snake Eyes',
    description: 'Roll the bones. Tempt fate.',
    tags: ['gunslinger'],
    effect: 'Crits grant +1 swap this turn.',
  },

  // Mustang cross-trait artifacts
  {
    id: 'hair_trigger_saddle',
    name: 'Hair Trigger Saddle',
    description: 'Shoot from the hip. From horseback.',
    tags: ['mustang', 'gunslinger'],
    effect: 'Non-adjacent swaps: +30% crit chance on resulting match.',
  },
  {
    id: 'sidewinders_reins',
    name: "Sidewinder's Reins",
    description: 'The snake rides with you.',
    tags: ['mustang', 'rattlesnake'],
    effect: 'Swaps that move a poison tile: cleanse it and deal 4 damage.',
  },
  {
    id: 'prospectors_mule',
    name: "Prospector's Mule",
    description: 'Stubborn but loaded.',
    tags: ['mustang', 'prospector'],
    effect: 'Gold matches grant +1 swap this turn. Once per turn.',
  },
  {
    id: 'fuse_runners_spurs',
    name: "Fuse Runner's Spurs",
    description: 'Light it and ride.',
    tags: ['mustang', 'sapper'],
    effect: 'Non-adjacent swaps: place a player bomb (3-turn fuse) at swap origin.',
  },

  // Gunslinger cross-trait artifacts
  {
    id: 'venom_tipped_round',
    name: 'Venom-Tipped Round',
    description: 'One shot. Slow death.',
    tags: ['gunslinger', 'rattlesnake'],
    effect: 'Crits apply 2 venom stacks to targeted enemy.',
  },
  {
    id: 'hair_trigger_detonator',
    name: 'Hair-Trigger Detonator',
    description: 'Precision demolition.',
    tags: ['gunslinger', 'sapper'],
    effect: 'Crits on tiles adjacent to bombs: detonate the bomb immediately.',
  },

  // Other cross-trait artifacts
  {
    id: 'serpents_shield',
    name: "Serpent's Shield",
    description: 'Law with a venomous bite.',
    tags: ['sheriff', 'rattlesnake'],
    effect: 'Matching poison tiles: +3 block per poison tile matched.',
  },
  {
    id: 'black_powder_cache',
    name: 'Black Powder Cache',
    description: 'Stolen from the armory.',
    tags: ['sapper', 'outlaw'],
    effect: '4+ matches: 30% to spawn a player bomb on the board.',
  },
  {
    id: 'blasting_pan',
    name: 'Blasting Pan',
    description: 'Found gold. Found dynamite. Same hole.',
    tags: ['sapper', 'prospector'],
    effect: 'Defusing bombs yields 3 gold.',
  },
];
