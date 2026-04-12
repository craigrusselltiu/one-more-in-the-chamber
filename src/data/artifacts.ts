import type { TraitId, CharacterId } from '../types/game';

export type ArtifactRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export const RARITY_COLORS: Record<ArtifactRarity, string> = {
  common: '#e8e8e8',
  uncommon: '#6ee76e',
  rare: '#5b9bf5',
  legendary: '#f5d442',
};

export const RARITY_COLORS_DIM: Record<ArtifactRarity, string> = {
  common: '#9a9a9a',
  uncommon: '#4a9a4a',
  rare: '#4070b0',
  legendary: '#b09830',
};

export const RARITY_BREATHE_CLASS: Record<ArtifactRarity, string> = {
  common: 'rarity-common-breathe',
  uncommon: 'rarity-uncommon-breathe',
  rare: 'rarity-rare-breathe',
  legendary: 'rarity-legendary-breathe',
};

export const RARITY_LABELS: Record<ArtifactRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
};

export interface ArtifactDefinition {
  id: string;
  name: string;
  description: string;
  tags: TraitId[];
  effect: string;
  /** If set, only offered when playing this character. */
  exclusive?: CharacterId;
  /** Rarity tier affecting drop weight. Defaults to 'common'. */
  rarity?: ArtifactRarity;
}

export const ARTIFACTS: ArtifactDefinition[] = [
  // ======================= Exclusive =======================

  {
    id: 'bamboo_canteen',
    name: 'Bamboo Canteen',
    description: "Bamboo doesn't rust.",
    tags: ['saloon_keeper'],
    effect: 'After completing combat, restore 6 HP.',
    exclusive: 'red_panda',
    rarity: 'rare',
  },
  {
    id: 'rusts_cylinder',
    name: "Rust's Cylinder",
    description: 'Six in the chamber. No reloads.',
    tags: ['gunslinger', 'outlaw'],
    effect: 'Increase Deadeye shots to 6. The last shot can now be used on an enemy, dealing 7 damage plus 1 damage per stack of Bounty.',
    exclusive: 'red_panda',
    rarity: 'legendary',
  },
  {
    id: 'rigged_deck',
    name: 'Rigged Deck',
    description: 'Bad luck is still luck.',
    tags: ['prospector'],
    effect: 'Chip hits have a 50% chance to hit another enemy. Chip misses generate 2 gold.',
    exclusive: 'reno',
    rarity: 'rare',
  },
  {
    id: 'renos_coin',
    name: "Reno's Coin",
    description: 'Double or nothing. Emphasis on nothing.',
    tags: ['desperado'],
    effect: 'Chip damage is doubled and hit chance is increased to 75%. On miss, lose 1 HP.',
    exclusive: 'reno',
    rarity: 'legendary',
  },

  // ======================= Outlaw =======================

  {
    id: 'outlaws_spurs',
    name: "Outlaw's Spurs",
    description: 'Kick the door in. Ask questions later.',
    tags: ['outlaw', 'mustang'],
    effect: 'At the start of combat, gain 1 Ready.',
    rarity: 'common',
  },
  {
    id: 'twin_revolvers',
    name: 'Twin Revolvers',
    description: 'Two guns. Twice the fun.',
    tags: ['outlaw'],
    effect: 'Bullets deal 50% more damage, but has a 10% chance to miss.',
    rarity: 'uncommon',
  },
  {
    id: 'stolen_badge',
    name: 'Stolen Badge',
    description: 'Wanted fugitive. Merchants charge extra.',
    tags: ['sheriff', 'outlaw'],
    effect: 'At the start of combat, gain 20 block. Merchants cost 10% more.',
    rarity: 'rare',
  },

  // ======================= Sheriff =======================

  {
    id: 'rusty_deputy_badge',
    name: 'Rusty Deputy Badge',
    description: 'Tarnished but still standing.',
    tags: ['sheriff'],
    effect: 'At the start of the second turn each combat, gain 13 block.',
    rarity: 'common',
  },
  {
    id: 'bounty_board',
    name: 'Bounty Board',
    description: 'Every menace has a price.',
    tags: ['sheriff'],
    effect: 'Whenever an enemy is summoned, gain 1 Rageful.',
    rarity: 'common',
  },
  {
    id: 'jail_cell_keys',
    name: 'Jail Cell Keys',
    description: 'Justice unlocked.',
    tags: ['sheriff'],
    effect: 'Whenever you clear a locked tile, gain 4 block.',
    rarity: 'uncommon',
  },
  {
    id: 'reinforced_duster',
    name: 'Reinforced Duster',
    description: 'Lined with steel plates.',
    tags: ['sheriff'],
    effect: 'Start each fight with 3 Sturdy.',
    rarity: 'rare',
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: 'Bent but never broken.',
    tags: ['sheriff', 'dead_man_walking'],
    effect: 'At the end of your turn, when you are at or below 20% HP, gain 4 block.',
    rarity: 'rare',
  },

  // ======================= Antipoison =======================

  {
    id: 'snakeskin_boots',
    name: 'Snakeskin Boots',
    description: 'Walk through the poison.',
    tags: ['antivenom'],
    effect: 'First poison tile per turn is auto-cleansed.',
    rarity: 'uncommon',
  },
  {
    id: 'bone_charm',
    name: 'Bone Charm',
    description: 'Carved from something that refused to stay dead.',
    tags: ['antivenom'],
    effect: 'Poison damage you take is halved.',
    rarity: 'rare',
  },
  {
    id: 'shed_skin',
    name: 'Shed Skin',
    description: 'Left the old self behind.',
    tags: ['antivenom', 'dead_man_walking'],
    effect: 'When taking lethal damage, prevent it and heal 50% HP, then destroy this artifact.',
    rarity: 'legendary',
  },

  // ======================= Rattlesnake =======================

  {
    id: 'sidewinder_belt',
    name: 'Sidewinder Belt',
    description: 'They were poisoned before they knew you arrived.',
    tags: ['rattlesnake'],
    effect: 'At the start of combat, apply 2 Poison to ALL enemies.',
    rarity: 'common',
  },
  {
    id: 'envenomed_ammo',
    name: 'Envenomed Ammo',
    description: 'Dipped in something nasty. Every shot bites.',
    tags: ['rattlesnake', 'gunslinger'],
    effect: 'Bullet-type tile matches apply 1 Poison to target.',
    rarity: 'uncommon',
  },
  {
    id: 'cactus_spine_vest',
    name: 'Cactus Spine Vest',
    description: "Touch me and you'll regret it.",
    tags: ['rattlesnake'],
    effect: 'Whenever an enemy damages you, apply 3 Poison stacks to them.',
    rarity: 'rare',
  },
  {
    id: 'rattlesnake_fang_necklace',
    name: 'Rattlesnake Fang Necklace',
    description: 'Trophy from the first one that bit you.',
    tags: ['rattlesnake'],
    effect: 'Whenever you would apply Poison, apply 1 more.',
    rarity: 'legendary',
  },

  // ======================= Prospector =======================

  {
    id: 'gold_tooth',
    name: 'Gold Tooth',
    description: 'Smiles and profits.',
    tags: ['prospector'],
    effect: 'Upon pickup, gain 333 gold.',
    rarity: 'rare',
  },

  // ======================= Sapper =======================

  {
    id: 'blasting_pan',
    name: 'Blasting Pan',
    description: "One man's bomb is another man's payday.",
    tags: ['sapper', 'prospector'],
    effect: 'Defusing bombs grants 8 gold.',
    rarity: 'common',
  },
  {
    id: 'black_powder_cache',
    name: 'Black Powder Cache',
    description: 'Surplus inventory.',
    tags: ['sapper'],
    effect: 'At the start of combat, make 3 tiles explosive.',
    rarity: 'rare',
  },
  {
    id: 'tinkers_wrench',
    name: "Tinker's Wrench",
    description: 'Every match is an explosion waiting to happen.',
    tags: ['sapper'],
    effect: 'Explosive tiles also spawn from the first non-cascade 3-match each turn.',
    rarity: 'legendary',
  },

  // ======================= Mustang =======================

  {
    id: 'saddlebag',
    name: 'Saddlebag',
    description: 'Room for two more.',
    tags: ['mustang'],
    effect: 'Upon pickup, gain 2 consumable slots.',
    rarity: 'common',
  },
  {
    id: 'trailblazers_compass',
    name: "Trailblazer's Compass",
    description: 'Every path not taken is a bullet saved.',
    tags: ['mustang', 'tracker'],
    effect: 'Unused swaps at turn end deal 3 damage each to targeted enemy.',
    rarity: 'common',
  },
  {
    id: 'dust_devil_boots',
    name: 'Dust Devil Boots',
    description: 'Kick up dust.',
    tags: ['mustang'],
    effect: 'After using all swaps in a turn, shuffle the bottom 2 rows.',
    rarity: 'rare',
  },
  {
    id: 'dans_feather',
    name: "Dan's Feather",
    description: 'I am speed.',
    tags: ['mustang'],
    effect: 'Increase swaps per turn by 1 for the rest of the run.',
    rarity: 'legendary',
  },

  // ======================= Gunslinger =======================

  {
    id: 'lucky_bullet',
    name: 'Lucky Bullet',
    description: 'One lucky round. Make it count.',
    tags: ['gunslinger'],
    effect: 'At the start of combat, gain 1 Lucky.',
    rarity: 'common',
  },
  {
    id: 'dead_mans_hand',
    name: "Dead Man's Hand",
    description: 'Aces and eights. Bad luck for them.',
    tags: ['gunslinger', 'dead_man_walking'],
    effect: 'Lucky triggers apply 1 Vulnerable.',
    rarity: 'uncommon',
  },
  {
    id: 'silver_bullet',
    name: 'Silver Bullet',
    description: 'Saved for the big one.',
    tags: ['gunslinger', 'sheriff'],
    effect: 'Whenever a boss gains block, gain 1 Ready.',
    rarity: 'rare',
  },

  // ======================= Saloon Keeper =======================

  {
    id: 'barkeeps_shotgun',
    name: "Barkeep's Shotgun",
    description: 'And stay out.',
    tags: ['saloon_keeper', 'gunslinger'],
    effect: 'Using a consumable deals 5 damage to a random enemy.',
    rarity: 'common',
  },
  {
    id: 'top_shelf_reserve',
    name: 'Top-Shelf Reserve',
    description: 'Dutch courage in a glass.',
    tags: ['saloon_keeper'],
    effect: 'Using a consumable grants 6 block.',
    rarity: 'uncommon',
  },
  {
    id: 'last_call_bell',
    name: 'Last Call Bell',
    description: 'Ring the bell. One for the road.',
    tags: ['saloon_keeper'],
    effect: 'Consumables trigger twice.',
    rarity: 'rare',
  },

  // ======================= Sniper =======================

  {
    id: 'gillie_suit',
    name: 'Gillie Suit',
    description: 'They never saw you coming.',
    tags: ['sniper'],
    effect: 'First 5+ match each combat grants 1 Grace.',
    rarity: 'rare',
  },
  {
    id: 'kill_confirmed',
    name: 'Kill Confirmed',
    description: 'Target down. Moving to next.',
    tags: ['sniper', 'outlaw'],
    effect: 'Whenever you kill an enemy with .50 Cal or a 5+ match, gain 1 swap.',
    rarity: 'rare',
  },

  // ======================= Dead Man Walking =======================

  {
    id: 'deaths_pocket_watch',
    name: "Death's Pocket Watch",
    description: 'Time stops for the dying.',
    tags: ['dead_man_walking'],
    effect: 'Once per combat, when HP drops below 20%, gain 20 block.',
    rarity: 'rare',
  },

  // ======================= Preacher =======================

  {
    id: 'preachers_bible',
    name: "Preacher's Bible",
    description: 'Scripture is armor.',
    tags: ['preacher'],
    effect: 'Take 1 less damage from enemy attacks.',
    rarity: 'common',
  },
  {
    id: 'offering_plate',
    name: 'Offering Plate',
    description: 'Generosity is rewarded.',
    tags: ['preacher', 'prospector'],
    effect: 'Healing grants gold equal to HP healed.',
    rarity: 'uncommon',
  },

  // ======================= Tracker =======================

  {
    id: 'trappers_snare',
    name: "Trapper's Snare",
    description: 'Step on the trap. Suffer the consequence.',
    tags: ['tracker'],
    effect: 'Revealing a Buried tile applies 1 Vulnerable to a random enemy.',
    rarity: 'common',
  },

  // ======================= Undertaker =======================

  {
    id: 'gravediggers_shovel',
    name: "Gravedigger's Shovel",
    description: 'Every grave dug is a job done.',
    tags: ['undertaker', 'tracker'],
    effect: 'Buried tiles that you uncover deal 3 damage to a random enemy.',
    rarity: 'common',
  },
  {
    id: 'corpse_explosion',
    name: 'Corpse Explosion',
    description: 'Burn the remains. Scorch the rest.',
    tags: ['undertaker'],
    effect: "When a summoned enemy dies, deal damage equal to that enemy's max HP to ALL enemies.",
    rarity: 'uncommon',
  },
  {
    id: 'reapers_scythe',
    name: "Reaper's Scythe",
    description: "Death reclaims what's owed.",
    tags: ['undertaker', 'outlaw'],
    effect: 'Killing an enemy applies Shadow to 5 tiles on your board.',
    rarity: 'legendary',
  },

  // ======================= Desperado =======================

  {
    id: 'sheriffs_domino',
    name: "Sheriff's Domino",
    description: 'Try, uh... seven?',
    tags: ['desperado', 'sheriff'],
    effect: 'When blocking all enemy attacks in a turn, gain 7 block at the start of your next turn.',
    rarity: 'common',
  },
  {
    id: 'loaded_dice',
    name: 'Loaded Dice',
    description: 'The house always wins.',
    tags: ['desperado'],
    effect: 'Cascade matches trigger 1 level higher.',
    rarity: 'uncommon',
  },

  // ======================= New Additions =======================

  {
    id: 'holy_water',
    name: 'Holy Water',
    description: 'The river heals those who stop running.',
    tags: ['preacher', 'mustang'],
    effect: 'Unused swaps at turn end heal you for 3 HP each.',
    rarity: 'rare',
  },
  {
    id: 'resurrecting_nails',
    name: 'Resurrecting Nails',
    description: 'On the third day, he rose.',
    tags: ['dead_man_walking', 'preacher'],
    effect: 'On the 3rd turn during boss combat, restore 30% HP.',
    rarity: 'legendary',
  },
  {
    id: 'dead_mans_bones',
    name: "Dead Man's Bones",
    description: 'Nothing left to lose. Everything left to prove.',
    tags: ['dead_man_walking', 'desperado'],
    effect: 'When at or below 20% HP, gain 4 Ace at the start of each turn.',
    rarity: 'uncommon',
  },
  {
    id: 'absolution_rounds',
    name: 'Absolution Rounds',
    description: 'Forgiveness comes in lead.',
    tags: ['preacher', 'gunslinger'],
    effect: 'Healing deals damage to the target enemy equal to the HP healed.',
    rarity: 'legendary',
  },
  {
    id: 'last_breath_tonic',
    name: 'Last Breath Tonic',
    description: 'One more for the road.',
    tags: ['dead_man_walking', 'saloon_keeper'],
    effect: 'Once per combat, when HP drops below 20%, gain a random consumable.',
    rarity: 'rare',
  },
  {
    id: 'temperance_flask',
    name: 'Temperance Flask',
    description: 'Discipline makes the medicine stronger.',
    tags: ['preacher', 'saloon_keeper'],
    effect: 'Healing consumables restore 50% more HP.',
    rarity: 'uncommon',
  },
  {
    id: 'scope_lens',
    name: 'Scope Lens',
    description: 'See farther. Hit harder.',
    tags: ['sniper'],
    effect: '5+ matches generate double resources.',
    rarity: 'legendary',
  },
  {
    id: 'detonator',
    name: 'Detonator',
    description: 'Rig the remains. Waste nothing.',
    tags: ['sapper', 'undertaker'],
    effect: 'When an enemy dies, make 1 random tile explosive.',
    rarity: 'uncommon',
  },
  {
    id: 'snake_eye',
    name: 'Snake Eye',
    description: 'Bad roll. Worse bite.',
    tags: ['desperado', 'rattlesnake'],
    effect: 'Cascade matches have a 50% chance to apply 1 Poison to all enemies.',
    rarity: 'uncommon',
  },
  {
    id: 'golden_shovel',
    name: 'Golden Shovel',
    description: 'X marks the payday.',
    tags: ['prospector', 'tracker'],
    effect: 'Whenever you reveal a Buried tile, gain 7 gold.',
    rarity: 'uncommon',
  },
  {
    id: 'high_vis_jacket',
    name: 'High Vis Jacket',
    description: "They can see you coming. Doesn't matter.",
    tags: ['antivenom', 'sapper', 'tracker'],
    effect: 'At the start of combat, gain 1 Protected.',
    rarity: 'rare',
  },
  {
    id: 'golden_scarab',
    name: 'Golden Scarab',
    description: 'Everything it touches turns to gold.',
    tags: ['prospector'],
    effect: 'All gold gain is increased by 30%.',
    rarity: 'legendary',
  },
  {
    id: 'burial_rites',
    name: 'Burial Rites',
    description: 'Rest now. Your fight is done.',
    tags: ['preacher', 'undertaker'],
    effect: 'When a summoned enemy dies, heal 5 HP.',
    rarity: 'uncommon',
  },
  {
    id: 'snipers_eye',
    name: "Sniper's Eye",
    description: 'One shot. Every target.',
    tags: ['sniper', 'outlaw'],
    effect: '5-match attacks deal damage to ALL enemies.',
    rarity: 'rare',
  },
  {
    id: 'heliograph_shard',
    name: 'Heliograph Shard',
    description: 'A flash of light. Then nothing.',
    tags: ['sniper'],
    effect: 'Once per combat, on 5-match, apply 1 Blinded to a random enemy.',
    rarity: 'uncommon',
  },
  {
    id: 'deaths_glare',
    name: "Death's Glare",
    description: 'They saw what was coming.',
    tags: ['undertaker', 'dead_man_walking'],
    effect: 'On combat start, apply 1 Vulnerable and 1 Terrified to ALL enemies.',
    rarity: 'legendary',
  },
  {
    id: 'strong_liver',
    name: 'Strong Liver',
    description: 'Shove the whole stack in. No looking back.',
    tags: ['desperado', 'prospector'],
    effect: 'At the start of each turn, lose 1 gold and gain 1 random buff.',
    rarity: 'rare',
  },
  {
    id: 'golden_pickaxe',
    name: 'Golden Pickaxe',
    description: 'This makes no sense.',
    tags: ['prospector'],
    effect: 'All gold gain is increased by 10%.',
    rarity: 'uncommon',
  },
];
