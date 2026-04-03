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

---

## Proposed New Content

### New Tiles (15)

| Tile | Pool | Base Value | Upgrade Value | Description | Sauce |
|------|------|-----------|---------------|-------------|-------|
| Lariat | Starter | 1 | +1/level | Pulls 1 random tile adjacent to the match, destroying it and dealing 1 damage. | Rope 'em in. What you catch is what you get. |
| Smoke | Starter | 0 | -- | +1% dodge per tile (caps 50%). Resets between fights. | Disappear into the haze. They can't hit what they can't see. |
| Tombstone | Additional | 3 | +1/level | 3 damage. If it kills the target, heal 2 HP. | Dead men pay debts. |
| Saloon | Additional | 0 | +1/level | Heal 1 HP per tile + draw 1 random consumable if 5+ matched. | Belly up to the bar. Drinks are on the house. |
| Wanted | Additional | 2 | +1/level | 2 damage. Applies 1 Vulnerable per tile. | Every hit paints a bigger target. |
| Tequila | Additional | 0.5 | +0.25/level | +0.5x multiplier to the CURRENT match (not next). Stacks within a match. | Liquid courage. Makes everything hit harder — including you. |
| Barricade | Additional | 2 | +1/level | 2 block. Adjacent tiles gain +1 block each. | Flip the table. Take cover. |
| Rattler | Additional | 2 | +1/level | 2 damage + 1 venom. Combines Bullet and Venom in one tile. | Fangs out. Bite first, ask questions never. |
| Fool's Gold | Additional | 0 | -- | Looks like Gold but generates nothing. Can be cleansed by matching 4+. | All that glitters. |
| Bounty | Additional | 3 | +1/level | 3 damage to the enemy with the highest current HP. Ignores targeting. | There's a price on every head. |
| Cavalry | Additional | 1 | +1/level | 1 damage per tile. If 4+ matched, +1 swap this turn. | Reinforcements have arrived. |
| Prairie Fire | Additional | 3 | +1/level | 3 damage. Spreads to 1 random adjacent tile (converts it to Prairie Fire). 15% spread chance. | Wildfire don't care about property lines. |
| Duel | Additional | 6 | +2/level | 6 damage but ONLY if exactly 3 matched. 4+ match = 0 damage. | High noon rules. Three paces, one shot. |
| Chain | Additional | 1 | +1/level | 1 damage per tile. Each Chain tile in the match adds +1 damage to ALL Chain tiles in that match. | Links in the chain. More you match, harder they hit. |
| Mirage | Additional | 0 | -- | Changes type every 3 turns. Matches as whatever type it currently shows. | Now you see it. Now you don't. Now it's something else. |

### New Traits (7)

#### Preacher
Artifacts with holy/redemption themes.

| Breakpoint | Effect | Sauce |
|-----------|--------|-------|
| 2 | Healing from any source +50%. | The congregation donates generously. |
| 4 | Once per fight: survive lethal damage with 1 HP. | The sermon ain't over yet. |
| 6 | Enemies that die while you're above 75% HP drop 5 bonus gold. | Blessed are the prosperous. |

#### Desperado
Artifacts about risk-taking and gambling.

| Breakpoint | Effect | Sauce |
|-----------|--------|-------|
| 2 | First match each turn: 50% chance for double damage, 50% chance for half. | All in or all out. |
| 4 | Below 25% HP: all damage +100%. | Nothing left to lose. |
| 6 | Killing an enemy fully heals you. | Dead man walking... the other way. |

#### Tracker
Artifacts about hunting and board vision.

| Breakpoint | Effect | Sauce |
|-----------|--------|-------|
| 1 | Buried (sand) tiles are always visible. | Read the tracks. See what's hidden. |
| 3 | First match each turn reveals all hazards on the board for that turn. | Every trail tells a story. |
| 5 | Matches adjacent to hazards deal +25% damage. | Close to danger. Close to the kill. |

#### Undertaker
Artifacts about death and enemy kills.

| Breakpoint | Effect | Sauce |
|-----------|--------|-------|
| 2 | Enemy death: heal 3 HP. | Business is booming. |
| 4 | Enemy death: +2 block and +5% crit for the rest of the fight. Stacks. | Another notch on the coffin. |
| 6 | Enemy death: next match deals 2x damage. | Death begets death. |

#### Saloon Keeper
Artifacts about sustain and consumables.

| Breakpoint | Effect | Sauce |
|-----------|--------|-------|
| 2 | Consumables heal 5 HP on use (any consumable). | The bartender patches you up. |
| 4 | Start each fight with a random consumable (temporary, doesn't take a slot). | On the house. |

#### Tinker
Artifacts about special tiles and board manipulation.

| Breakpoint | Effect | Sauce |
|-----------|--------|-------|
| 2 | Explosive tiles have +1 blast radius (5x5 cross instead of 3x3). | Bigger boom. Better engineering. |
| 4 | Showdown tiles clear 2 random types instead of 1. | Why choose when you can have both? |

#### Drifter
Artifacts about movement, cascades, and combos.

| Breakpoint | Effect | Sauce |
|-----------|--------|-------|
| 2 | Cascade combo multiplier +0.05x per step (instead of +0.1x per 2 steps). | Momentum builds. The wind's at your back. |
| 4 | 5+ cascade combo: gain +1 swap this turn. | Rolling thunder. Can't stop now. |
| 6 | 8+ cascade combo: all remaining matches this cascade deal 2x damage. | The avalanche. |

### New Artifacts (20)

| Name | Tags | Effect | Sauce |
|------|------|--------|-------|
| Preacher's Bible | Preacher | Healing +30%. Take 1 less damage from all sources. | Scripture is armor. |
| Confession Booth | Preacher, Sheriff | Freeing locked tiles heals 2 HP each. | Absolution comes with keys. |
| Gambler's Derringer | Desperado, Gunslinger | 25% chance any match crits (ignoring crit chance). | A hidden ace. |
| Snake-Eye Dice | Desperado | Miss (dodge/block fully absorbs): deal 5 damage back. | You blinked. I didn't. |
| Tracker's Spyglass | Tracker | See enemy intents 2 turns ahead instead of 1. | Know their moves before they do. |
| Wolf Pelt Cloak | Tracker, Rattlesnake | First match each fight against poisoned enemies: +100% damage. | The predator smells blood. |
| Gravedigger's Shovel | Undertaker | Buried tiles that you uncover deal 3 damage to a random enemy. | Every grave dug is a job done. |
| Coffin Nails | Undertaker, Sapper | Bomb detonations that kill: heal 5 HP. | Built different. |
| Bartender's Apron | Saloon Keeper | Whiskey tile matches heal +2 bonus HP. | The good stuff. Top shelf. |
| Last Call Bell | Saloon Keeper, Desperado | Below 30% HP: all consumable effects doubled. | Ring the bell. One for the road. |
| Tinker's Wrench | Tinker | Explosive tiles spawn from 3-matches (not just 4-matches). | Every match is a bomb waiting to happen. |
| Clockwork Detonator | Tinker, Sapper | Your bombs tick down 2 per swap instead of 1. | Precision timing. Twice as fast. |
| Tumbleweed Charm | Drifter | After a 3+ cascade: reshuffle the bottom row. | The wind rearranges everything. |
| Dusty Trail Map | Drifter, Mustang | Cascades from non-adjacent swaps: +25% damage. | The long way round hits different. |
| Hangman's Noose | Undertaker, Outlaw | Killing blow with a 4+ match: apply 3 venom to all remaining enemies. | A message to the rest. |
| Gold Rush Fever | Desperado, Prospector | Gold matches: 20% chance to triple, 20% chance to zero. | Feast or famine. That's the life. |
| Sunset Serenade | Preacher, Drifter | Cascades of 4+: heal 1 HP per cascade step. | The melody heals as it builds. |
| Deputy's Dilemma | Sheriff, Desperado | Block has 50% chance to double, 50% chance to halve. | The law is a coin flip out here. |
| Coyote Tooth Necklace | Tracker, Outlaw | Enemies with board abilities: first match against them each turn ignores their block. | Know the enemy. Strike the gap. |
| Powder Monkey's Hat | Tinker, Outlaw | 4+ matches have 30% chance to spawn an explosive tile on a random empty position. | Chaos engineering at its finest. |

### New Consumables (8)

| Name | Category | Effect | Sauce |
|------|----------|--------|-------|
| Chili Pepper | Offensive | +3 damage to next match. Apply 1 venom to targeted enemy. | Hot enough to burn twice. |
| Shotgun Shell | Offensive | Deal 8 damage to targeted enemy. Ignores block. | Point blank. No questions. |
| Snake Antidote | Defensive | Cleanse all venom from yourself. Heal 5 HP. | The rattler's bane. |
| Dust Cover | Defensive | All tiles immune to enemy manipulation for 2 turns. | Batten down the hatches. |
| Lucky Horseshoe | Utility | +25% crit chance for 2 turns. | Found it in the road. It's a sign. |
| Prospector's Compass | Utility | Convert 3 random tiles to Gold. | X marks the spot. Three times over. |
| Bounty Poster | Offensive | Targeted enemy takes +50% damage for 1 turn. | Dead or alive. Preferably dead. |
| Trail Mix | Defensive | Heal 3 HP per turn for 3 turns. | Slow and steady keeps you standing. |

### New Enemies (10)

#### Act 1

| Name | HP | Damage | Abilities | Sauce |
|------|----|--------|-----------|-------|
| Tumbleweed Golem | 30 | 6-12 | Bury, Summon | A ball of dust, teeth, and bad intentions. Buries tiles and splits into smaller tumbleweeds. |
| Card Shark | 35 | 7-12 | Lock, Suppress | Cheats at everything. Locks your best tiles and suppresses your strongest type. |

#### Act 2

| Name | HP | Damage | Abilities | Sauce |
|------|----|--------|-----------|-------|
| Powder Monkey | 25 | 8-14 | Bomb | Tiny, fast, and loves explosions. Throws 2 bombs per turn. Dies easy but the bombs don't care. |
| Mine Foreman | 70 | 12-20 | Lock, Block, Suppress | The boss underground. Locks tiles, blocks big, and shuts down your operation. |
| Canary Swarm | 10 | 3-5 | Bury | 3 spawn together. Each buries 1 tile. Annoying as a cloud of feathers. |

#### Act 3

| Name | HP | Damage | Abilities | Sauce |
|------|----|--------|-----------|-------|
| Hangman | 90 | 20-28 | Lock, Poison | Locks your tiles like a noose. Poisons what he can't lock. Countdown to the drop. |
| Outlaw King | 120 | 25-35 | Block, Summon | The biggest bounty in the west. Summons lackeys, hides behind block, hits like a freight train. |
| Phantom Rider | 60 | 15-22 | Suppress, Bury | You hear hooves but see nothing. Suppresses tile types and buries the rest. |
| Dynamite Duchess | 80 | 18-25 | Bomb, Lock | Royalty in the demolition business. 2 bombs per turn. Locks the tiles around them. |
| Sheriff's Shadow | 100 | 20-30 | Block, Lock, Suppress | Everything the Sheriff is, but darker. Mirrors your block, locks your iron, suppresses your damage. |
