# Content Reference

All game data in one place.

## Tiles

| Tile | Pool | Base Value | Upgrade Value | Description |
|------|------|-----------|---------------|-------------|
| Bullet | Core | 2 | +1/level | Primary single-target offence. |
| Iron | Core | 1 | +1/level | Absorbs damage this turn. |
| Gold | Core | 1 | +1/level | Currency for shops. |
| Ricochet | Starter | 1 | +1/level | 1 damage + destroys 1 random tile. |
| Dynamite | Starter | 1 | +1/level | 1 charge per 3-match; +1 per extra tile. |
| Stampede | Starter | 1 | +1/level | 1 damage to all enemies per tile. |
| Whiskey | Additional | 1 | +1/level | Heals player. |
| Buckshot | Additional | 1 | +1/level | 1 damage per tile; upgrades add 1 damage per tile. |
| Ace | Additional | 0.25 | +0.25/level | +0.25x multiplier on next non-Ace match. |
| Venom | Additional | 1 | +1/level | 1 venom stack per tile. |
| Ember | Additional | 4 | +1/level | 4 damage, 25% to convert adjacent tile. |
| Horseshoe | Additional | 5 | +5/level | +5% crit chance per tile. |
| .50 Cal | Additional | 5 | +1/level | 5 damage per tile; upgrades add 1 damage per tile. |
| Showdown | Special | 0 | -- | Swap with any tile to destroy all tiles of that type. |
| Tumbleweed | Special | 0 | -- | Does nothing when matched. |

## Traits

Trait level = number of artifacts held with that tag. Effects activate at breakpoints.

### Outlaw

| Breakpoint | Effect |
|-----------|--------|
| 2 | 4+ matches deal 30% bonus damage. |
| 4 | 4+ matches apply 1 Vulnerable to targeted enemy. |
| 6 | Tiles from 4+ match cascades trigger resource effects twice. |

### Sheriff

| Breakpoint | Effect |
|-----------|--------|
| 2 | Iron matches +30% block. +2 block per turn. |
| 5 | Block reflects 100% of absorbed damage back to attacker. |

### Rattlesnake

| Breakpoint | Effect |
|-----------|--------|
| 1 | Immune to poison tile damage and debuffs. |
| 3 | Matching poison tiles deals damage + applies venom. |

### Prospector

| Breakpoint | Effect |
|-----------|--------|
| 2 | Non-gold matches: 15% chance to generate 1 gold. |
| 4 | Gold matches: double gold + 2 block. |
| 6 | Turn end: deal 50% of gold earned this fight as damage. |

### Sapper

| Breakpoint | Effect |
|-----------|--------|
| 1 | Bombs deal +2 bonus damage when detonated. |
| 2 | Bomb countdowns start 1 turn higher. |
| 3 | Every 4th match spawns a player-side bomb tile. |

### Mustang

| Breakpoint | Effect |
|-----------|--------|
| 4 | +1 swap per turn. Non-adjacent swaps allowed. 5+ lasso matches: +50% damage. |

### Gunslinger

| Breakpoint | Effect |
|-----------|--------|
| 2 | Start each fight with 15% crit. Crits deal 3 bonus flat damage. |
| 4 | Crit multiplier 3x. Crit chance halves instead of resetting. |

## Artifacts

| Name | Tags | Effect |
|------|------|--------|
| Stolen Badge | Sheriff, Outlaw | +2 block/turn, shops +10%. |
| Worn Lasso | Mustang | Once/fight non-adjacent swap. |
| Rattlesnake Fang Necklace | Rattlesnake | 3 damage on poison match. |
| Stick of Dynamite | Sapper | Once/fight clear entire row. |
| Bandit's Bandana | Outlaw | 4+ matches: 25% for 1 gold. |
| Wanted Poster | Sheriff | Disable random enemy board ability 3 turns. |
| Snakeskin Boots | Rattlesnake | First poison tile/turn auto-cleansed. |
| Gold Tooth | Outlaw, Prospector | Bullet matches: 15% for 1 gold. |
| Saddlebag | Mustang | +1 consumable slot (4 total). |
| Rusty Deputy Badge | Sheriff | +3 block per iron match. |
| Twin Revolvers | Outlaw | Bullets hit 2x at 60% each (120%). |
| Fool's Gold Detector | Prospector | Immune to fool's gold tiles. |
| Cactus Spine Vest | Rattlesnake | Enemy attacks poison 1 tile. |
| Lit Fuse | Sapper | Defused bombs: 50% to spawn new bomb. |
| Horseshoe Charm | -- | +5 max HP. First match/fight: 2x resources. |
| Quickdraw Holster | Mustang, Outlaw | First swap/turn resolves early. Kill = refund swaps. |
| Dynamite Vest | Sapper | Bomb detonation: 50% damage reflected. |
| Prospector's Pickaxe | Prospector | Sand tiles revealed on any adjacent match. |
| Loaded Dice | Prospector | Fight start: 3 tiles replaced with gold. |
| Bounty Board | Sheriff | +15% damage vs enemies with board abilities. |
| Coyote Pelt | Outlaw, Rattlesnake | Summoned enemies take 5 damage immediately. |
| Iron Horse Shoes | Mustang, Sheriff | Iron matches: 20% for 1 ability charge. |
| Lucky Bullet | Gunslinger | +10% crit chance at fight start. |
| Dead Man's Hand | Gunslinger | Crits apply 1 Vulnerable. |
| Rigged Deck | Gunslinger, Prospector | Crits give 5 gold. |
| Sharpshooter's Eye | Gunslinger, Outlaw | +5% crit per swap used this turn. Resets at turn end. |
| Silver Bullet | Gunslinger, Sheriff | +20% crit vs bosses only. |
| Fully Loaded | -- | Red panda only. Deadeye: 3 shots become 6. |
| Train Heist Map | Outlaw | 4+ matches: +2 flat bonus damage per tile above 3. |
| Outlaw's Spurs | Outlaw, Mustang | First 4+ match each turn: +50% damage. |
| Moonshine Still | Outlaw | +20% all damage dealt. Take 2 damage at turn start. |
| Marked Cards | Outlaw, Gunslinger | 4+ matches grant +10% crit chance. |
| Crooked Deal | Outlaw, Prospector | 4+ gold matches: triple gold generated. |
| Rustler's Brand | Outlaw | Kill with a 4+ match: heal 5 HP. |
| Double or Nothing | Outlaw | 4+ matches: 50% double resources, 50% half. |
| Tin Star | Sheriff | +1 block/turn per enemy on the field. |
| Jail Cell Keys | Sheriff | Freeing a locked tile grants 3 block. |
| Reinforced Duster | Sheriff | Start each fight with 8 block. |
| Lawman's Oath | Sheriff, Gunslinger | While you have block, +10% crit chance. |
| Frontier Justice | Sheriff | Fully blocked attacks deal 5 damage back to attacker. |
| Patrol Route | Sheriff, Mustang | Unused swaps at turn end: +3 block each. |
| Iron Will | Sheriff | Below 50% HP: +4 block per turn. |
| Gold Pan | Prospector | Non-gold matches: 20% to spawn 1 gold tile on board. |
| Assayer's Lens | Prospector | Gold matches: +1 gold per tile matched. |
| Mining Canary | Prospector, Rattlesnake | Poison tiles adjacent to gold: auto-cleansed, yield 1 gold each. |
| Greed's Burden | Prospector | +1 damage per 15 gold held. |
| Claim Jumper's Pick | Prospector, Outlaw | First gold match each fight: deal bonus damage equal to gold earned. |
| Motherlode Map | Prospector | Once/fight: 4+ gold match converts adjacent tiles into gold. |
| Trailblazer's Compass | Mustang | Unused swaps at turn end deal 3 damage each to targeted enemy. |
| Bronco's Fury | Mustang | Last swap each turn: +75% damage from resulting matches. |
| Dust Devil Boots | Mustang | After using all swaps in a turn: shuffle the bottom 2 rows. |
| Ivory-Handled Revolver | Gunslinger | Crit chance persists between fights (no reset). |
| Notched Barrel | Gunslinger | +5% crit chance per enemy killed this fight. |
| Snake Eyes | Gunslinger | Crits grant +1 swap this turn. |
| Hair Trigger Saddle | Mustang, Gunslinger | Non-adjacent swaps: +30% crit chance on resulting match. |
| Sidewinder's Reins | Mustang, Rattlesnake | Swaps that move a poison tile: cleanse it and deal 4 damage. |
| Prospector's Mule | Mustang, Prospector | Gold matches grant +1 swap this turn. Once per turn. |
| Fuse Runner's Spurs | Mustang, Sapper | Non-adjacent swaps: place a player bomb (3-turn fuse) at swap origin. |
| Venom-Tipped Round | Gunslinger, Rattlesnake | Crits apply 2 venom stacks to targeted enemy. |
| Hair-Trigger Detonator | Gunslinger, Sapper | Crits on tiles adjacent to bombs: detonate the bomb immediately. |
| Serpent's Shield | Sheriff, Rattlesnake | Matching poison tiles: +3 block per poison tile matched. |
| Black Powder Cache | Sapper, Outlaw | 4+ matches: 30% to spawn a player bomb on the board. |
| Blasting Pan | Sapper, Prospector | Defusing bombs yields 3 gold. |
| Envenomed Ammo | Rattlesnake | Bullet matches apply 1 venom stack to target. |
| Sidewinder Belt | Rattlesnake | Fight start: apply 2 venom to all enemies. |
| Rattler's Warning | Rattlesnake | Enemies with 3+ venom deal 25% less damage. |
| Serpent's Coil | Rattlesnake, Outlaw | Venom ticks deal +1 bonus damage. |
| Shed Skin | Rattlesnake | Once/fight: survive lethal damage with 1 HP. |
| Pit Viper Eyes | Rattlesnake, Prospector | Reveal all buried/sand tiles at fight start. |
| Diamondback Scale | Rattlesnake, Sheriff | +2 block per venom tile matched. |
| Blasting Caps | Sapper | Bomb explosions deal +50% damage. |
| Powder Keg | Sapper | Every 3rd dynamite match spawns a friendly bomb (3-turn fuse). |
| Miner's Lantern | Sapper, Prospector | Tiles adjacent to bombs immune to enemy manipulation. |
| Demolition Expert | Sapper | Bomb explosions clear a + pattern (5 tiles) instead of 1. |
| Nitro Flask | Sapper | Dynamite matches splash 2 damage to non-targeted enemies. |
| Short Fuse | Sapper | Your bombs -1 turn fuse. Enemy bombs +1 turn fuse. |
| Blast Shield | Sapper, Sheriff | Gain 5 block when any bomb detonates. |
| Dusty Canteen | -- | Heal 3 HP after each combat. |
| Bullet-Proof Bible | -- | Once/fight: negate all damage from one attack. |
| Gambler's Coin | -- | 50% chance first match each fight deals double damage; otherwise half. |
| Vulture's Patience | -- | +20% gold from all sources. |
| Rusty Harmonica | -- | Every 3rd turn in combat: heal 1 HP. |
| Trail Rations | -- | Start each fight with 3 block. |

## Consumables

### Offensive

| Name | Effect |
|------|--------|
| Stick of TNT | Clear entire row. Tiles generate resources; damage goes to targeted enemy. |
| Moonshine | 2x next match resources, take 5 damage. |
| Wanted Flyer | Targeted enemy +50% damage taken, 2 turns. |
| Pocket Watch | +1 swap this turn. |
| Strong Coffee | 1.5x next match resources. |

### Defensive

| Name | Effect |
|------|--------|
| Tonic | Heal 20 HP. |
| Barbed Wire | Gain thorns: reflect 100% of next enemy attack back. Consumed on trigger. |
| Bandage | Heal 10 HP, cleanse all poison tiles on board. |

### Utility

| Name | Effect |
|------|--------|
| Skeleton Key | Unlock all locked tiles. |
| Smoke Bomb | Targeted enemy skips next action. |
| Tumbleweed | Reshuffle entire board. |
| Signal Flare | Reveal all buried tiles. |
| Snake Oil | Random effect (heal/damage/poison/gold). |

## Enemies

### Act 1 -- The Dusty Trail

| Name | HP | Damage | Abilities |
|------|----|--------|-----------|
| Coyote | 20 | 5-10 | Howl |
| Rattlesnake | 40 | 8-15 | Poison, Block |
| Bandit | 45 | 8-15 | Lock, Block |
| Vulture | 25 | 5-8 | Bury |

**Boss: "Dusty" Dan McGraw** -- 150 HP, 10-20 damage. Abilities: Lock, Summon, Bomb, Gravity Shift.

### Act 2 -- The Canyon

| Name | HP | Damage | Abilities |
|------|----|--------|-----------|
| Prospector Gone Mad | 55 | 12-18 | Bomb |
| Dynamite Outlaw | 80 | 15-22 | Lock, Block |
| Cave Bat | 15 | 5-8 | Bury |
| Mine Cart | 100 | 0 | Hazard |

**Boss: "Copperhead" Cassidy** -- 200 HP, 15-25 damage. Abilities: Poison, Block, Fool's Gold.

### Act 3 -- The Town

| Name | HP | Damage | Abilities |
|------|----|--------|-----------|
| Corrupt Deputy | 65 | 18-25 | Lock, Suppress, Block |
| Saloon Brawler | 100 | 22-30 | None |
| Train Guard | 75 | 15-20 | Lock, Bomb |

**Boss: "Iron Eye" Isabella** -- 250 HP, 20-35 damage. Abilities: Lock, Suppress, Poison.

### Elite Encounters

Elites are single enemies drawn from the act's regular pool with buffed stats: 1.5x HP, +2 min damage, +3 max damage. Excluded from elite pool: Vulture (Act 1), Cave Bat and Mine Cart (Act 2).
