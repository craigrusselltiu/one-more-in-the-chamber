# One More In The Chamber

## Game Design Specification — v2.0

---

## Overview

| | |
|---|---|
| **Genre** | Roguelike match-3 with trait synergies |
| **Theme** | Western / cowboy |
| **Protagonist** | A red panda cowboy |
| **Platform** | Web app (PWA for mobile install) |
| **Art style** | Pixel art |
| **Audio** | Music provided by developer. SFX TBD. |
| **Monetisation** | None (passion project) |
| **Deploy cost** | $0 |

---

## Design Principles

### Sauce

Every mechanic, artifact, enemy, and flavour text should feel *thematically motivated*. Nothing exists purely as a number — it tells a micro-story.

**Good:** "Stolen Badge — +2 block/turn, but shop prices +10%." You stole it, you're wanted, merchants charge more. The mechanic *is* the narrative.

**Bad:** "Iron Ring — +2 block/turn." Same effect, no story, no personality.

The sauce test: *can the player tell a one-sentence story about why the effect works this way?*

### Tone

Comedic but cool. Spaghetti Western filtered through a Saturday morning cartoon. Boss encounters should feel stylish (cinematic intros, dramatic name reveals). Comedy comes from flavour text, events, and the protagonist's reactions — never from undercutting the action.

---

## Core Loop

1. **Choose a 4th tile** at run start (1 of 3 offered from the starter pool of 4).
2. Navigate a branching map, choosing encounters.
3. In combat: match tiles to generate resources. Enemy announces intent, player responds, enemy acts.
4. Collect gold + chance of consumable after fights.
5. Defeat the act boss, **choose a new tile** from the additional pool (1 of 3).
6. After 3 acts, the run ends. Earn Reputation. Start a new run.

**Tile progression:** 4 tiles (Act 1) > 5 (Act 2) > 6 (Act 3). Board dilution IS difficulty scaling.

---

## Main Menu

- **Continue** — resume active run (greyed out if none).
- **New Game** — if a saved run exists, prompts to confirm deletion. Leads to character selection screen (MVP: red panda only) with ascension level, then tile selection.
- **Reputation Shop** — spend Reputation to unlock artifacts in pool, starting loadouts, cosmetics, events, characters.
- **Settings** — audio, controls, account, display.

---

## Combat System

### The Board

- 8x8 grid of tiles.
- **Tile distribution is equal.** With 4 tile types, each tile has a 25% chance of spawning. With 6 types in Act 3, each has ~16.7%. This is the primary difficulty scaling mechanism — more tile types means harder to build specific matches.
- **3 swaps per turn** (default). Increased by artifacts/traits.
- Swaps create matches (3+). Tiles clear, new tiles fall, cascades resolve automatically.
- **End turn early** at any time.
- **No valid moves** (no adjacent swap produces a match of 3+) = turn ends, board reshuffles (guaranteed valid move after), enemy still acts.

### Turns and Swaps

Each player turn follows this exact sequence:

1. **Turn start.** Player gains per-turn effects (Sheriff block, ability charge, etc.).
2. **Consumable window.** Player may use consumables (before any swaps).
3. **Swap phase.** Player makes up to 2 swaps (default). Each swap resolves matches and cascades fully before the next swap. Player may switch target enemy between swaps.
4. **Turn end.** Player block expires. Enemy turn begins.

### Resource Generation

**When a tile is cleared by any means, it generates its own resource.** No exceptions. The trigger doesn't matter (match, explosion, Deadeye, Ricochet, bomb, Showdown); the tile type determines the resource.

### Multi-Enemy Combat

Up to **3 enemies** can be on the field simultaneously.

- Each enemy has a separate HP bar and status effects displayed independently.
- The player has a **targeted enemy** (highlighted). All single-target damage from matches goes to the targeted enemy. Switching target is a free action available at any time (tap/click an enemy).
- **AoE damage** (Stampede tile) hits all enemies simultaneously.
- Deadeye targets tiles on the board, not enemies. Damage from tiles destroyed by Deadeye goes to the targeted enemy (or all enemies for AoE tiles).
- Each enemy announces intent and acts independently during the enemy turn, resolving left to right.
- When an enemy dies, its slot empties. Combat ends when all enemies are dead.

### Match Bonuses

- **3-match:** 1.0x (base value).
- **4-match:** 1.5x + spawns an **explosive tile** (an explosive version of the matched tile type; must be matched to detonate; clears 3x3 area).
- **5-match:** 2.0x + spawns a **Showdown tile** (swap with any adjacent tile to destroy ALL tiles of that type on the board; the Showdown tile is destroyed). If a Showdown tile is matched in a cascade, hit by a cross clear, or caught in an explosive detonation, it triggers — clearing all tiles of a random type.
- **L / T / + match (Cross Clear):** clears all tiles in horizontal + vertical lines from the intersection. Each tile = 1.0x per tile.

**Chain reactions:** Explosive tiles hit by another explosive's detonation or a cross clear also detonate. Special tiles hit by AOE are always triggered, never silently cleared.

**Flash lines:** When a match deals damage, a colored line flashes from the match to the enemy area (0.5s fade). Ricochet also flashes a line to the destroyed tile. Line color matches the tile type color.

Match bonuses (1.5x, 2.0x) apply to: damage, block, gold, healing. Do NOT apply to: Ace multiplier, ability charges, Venom stacks, Smoke dodge, or Horseshoe crit chance.

### Crit System

Global mechanic. Every fight starts at 0% crit chance. Crit chance is gained from Horseshoe tiles (+5%/tile), Gunslinger trait, and artifacts. When a crit triggers on a match, that match generates **2x resources**, then crit chance resets to 0%. Crit chance resets between fights.

### Combat Numbers

Per-tile values x tile count x match bonus.

| Match | Multiplier | Example (Bullet 2/tile) |
|---|---|---|
| 3-match | 1.0x | 6 damage |
| 4-match | 1.5x | 12 damage |
| 5-match | 2.0x | 20 damage |
| Cross clear | 1.0x per tile | Varies |

**Starting HP: 100 / 100.**

### Board Manipulation

Enemy-placed hazard tiles on the board:

| Mechanic | Description |
|---|---|
| **Lock** | Can't swap. Match adjacent to free. |
| **Poison** | Hurts player or debuffs on match. |
| **Bomb** | Countdown timer. Detonates (damages player) if not matched before reaching 0. Matching it defuses it. |
| **Sand/Bury** | Hidden tile. Match adjacent to reveal. |

### Status Effects

Status effects are displayed as distinct icons with values, **spaced out in a horizontal row** under each character's health bar. No overlapping.

**Player status effects:**

| Status | Icon | Description |
|---|---|---|
| Block | Shield | Absorbs incoming damage. Expires at turn end. |
| Dodge | Mist | % chance to fully avoid an attack. Resets between fights. |
| Ace Multiplier | Card | Multiplier applied to next non-Ace match. Resets between fights. |
| Crit Chance | Crosshair | % chance next match generates 2x resources. Resets between fights. |
| Thorns | Barbs | Reflects damage back to attacker. Consumed on trigger. |

**Enemy status effects:**

| Status | Icon | Description |
|---|---|---|
| Block | Shield | Absorbs incoming damage. 5 block per block action. |
| Venom | Poison drop | Stacks. Each stack deals 1 damage at enemy turn start, then stacks decrease by 1. |
| Vulnerable | Cracked shield | +25% damage from next direct match hit. Consumed on trigger. Does NOT amplify DOTs or status damage. Can stack (each stack consumed by a separate hit). |

### Enemy Turn

After all player swaps resolve:

1. **Venom ticks.** Each enemy with venom stacks takes damage equal to their stack count, then stacks decrease by 1.
2. **Each enemy acts** (left to right). Intent was announced at the start of the player's turn.
3. Enemy actions: attack, block (+5 block), ability, board manipulation, or summon (+1 enemy, max 3 on field).

When an enemy is blocking, consider matching gold or setting up instead of wasting damage into block.

### Character Ability — "Deadeye"

**Charge:** +1 per player turn taken. Dynamite tiles add charges when cleared. Requires **10 charges** to activate. **Meter carries over between fights.**

**Activation:** Crosshair cursor appears. Select **3 tiles** anywhere on the board (6 with Fully Loaded). Each selected tile is destroyed and generates its resource. Gravity + cascades resolve after each shot.

**Deadeye + Showdown:** Shooting a Showdown tile clears all tiles of a **random** type on the board.

**Deadeye + Explosive:** Shooting an explosive tile detonates its 3x3 area.

**Deadeye + Bounty:** Each shot consumes Bounty stacks on the targeted enemy for bonus damage.

**"Fully Loaded"** — red panda-exclusive artifact. 3 shots become 6. Six chambers. The title of the game.

#### Ability Bar

The ability bar spans the full width of the board at the bottom, split into 10 segments (one per charge threshold).

- **Charging:** Filled segments are RED. Unfilled segments are dark gray.
- **Ready (10/10):** All segments turn YELLOW with a pulsing glow VFX.
- **Active Deadeye:** Shows shots remaining as gold indicator dots.

#### Shot VFX & SFX

Each Deadeye shot:
- Plays a gunshot sound effect
- Triggers an enhanced particle explosion (bigger and more particles than standard tile clears, mix of tile color + white)
- Leaves a bullet hole at the tile position that fades away after ~1 second
- Light screen shake on impact

### Character Animations

Priority (highest first): Death > Hit/Flinch > Ability > Attack > Block > Heal > Match > Idle.

One animation at a time. Effects apply mechanically regardless of animation state. Enemies need: idle, attack, block, ability, hit, death.

---

## Tile System

Two **separate pools**: the starter pool (run start) and the additional pool (between acts / shops).

### Core Tiles (always present, cannot be removed)

| Tile | Per-tile | Purpose |
|---|---|---|
| **Bullet** | 2 damage | Primary single-target offence. |
| **Iron** | 1 block | Absorbs damage this turn. Expires at turn end. |
| **Gold** | 1 gold | Currency for shops. Mid-fight greed play. |

### Starter Pool (choose 1 of 3 offered, from pool of 4)

Exclusive to run start. Cannot be gained from shops or between-act rewards. 3 of 4 are offered each run (random). Defines early-game identity.

| Tile | Per-tile | Mechanic | Sauce |
|---|---|---|---|
| **Ricochet** | 1 damage + destroys 1 random tile | Each tile cleared deals 1 damage AND destroys 1 random tile elsewhere on the board (which generates its own resource). A 3-match = 3 damage + 3 random tiles destroyed. Ricochet destruction resolves after each match step, before the next cascade step. | Bullets bounce. You never know what they'll hit. |
| **Smoke** | +1% dodge (caps at 50%) | Each tile cleared adds +1% dodge for the rest of the fight. When an enemy attacks, each hit is independently rolled against dodge chance. Resets between fights. Slow build, huge late-fight payoff. | Disappear into the haze. They can't hit what they can't see. |
| **Dynamite** | +1 ability charge per match tile above 2 | Match-size-based charging: a 3-match = 1 charge, 4-match = 2 charges, 5-match = 3 charges. Upgrades add flat bonus charges per match. Gets Deadeye online fast and often. | Volatile but useful. Light the fuse on your special move. |
| **Stampede** | 1 damage (all enemies) | Each tile cleared deals 1 damage to **every** enemy on the field. A 3-match = 3 damage to all. Less efficient than Bullet vs single targets, devastating against groups. | The ground shakes. So do they. |

### Additional Pool (gained between acts, swappable at shops)

After each act boss, choose **1 of 3**. **Already-chosen tiles cannot be offered.** Shops allow **swapping** a non-core, non-starter tile for a different one from this pool.

| Tile | Per-tile | Mechanic | Sauce |
|---|---|---|---|
| **Whiskey** | 1 HP | Heals player. Basic sustain. | The cowboy's medicine. |
| **Buckshot** | 1 damage | Single-target damage. Upgrades scale it past Bullet. Board dilution is the cost. | Spread shot. Hits harder, less precise. |
| **Ace** | +0.25x multiplier | Adds to a running multiplier (base 1.0x). 3-match = 1.75x. **Stacks across matches within a fight.** Consumed on next non-Ace match — the multiplier applies to that match's resources, then resets to 1.0x. **Resets between fights. No cap.** Not affected by match bonuses. Displayed as a player status effect. | An ace up your sleeve. |
| **Venom** | 1 venom stack | Applies venom to the targeted enemy. Venom stacks deal damage at the start of the enemy's turn equal to the current stack count, then decrease by 1. Stacks from all sources combine. A 3-match applies 3 stacks (enemy takes 3, then 2, then 1 = 6 total). | Snake venom. Slow death, certain death. |
| **Ember** | 4 damage | Each cleared Ember has 25% chance to convert one adjacent **non-Ember** tile into Ember. Conversion happens after cascade resolution — converted tiles can be matched on subsequent cascades. Fire eats your other tiles. | Playing with fire. Rewarding and dangerous. |
| **Horseshoe** | +5% crit chance | Each tile adds +5% crit (stacking). When a crit triggers, that match generates 2x resources, then crit chance resets to 0%. Resets between fights. | Feeling lucky, partner? |
| **Fifty Cal** | 5 damage | Raw single-target damage. High base value, no special mechanic — pure firepower at the cost of board dilution. | One round. One hole. |

### Tile Upgrades

Permanently upgraded at rest sites for the rest of the run.

| Tile | Base | Per upgrade |
|---|---|---|
| Bullet | 2 damage | +1 damage |
| Iron | 1 block | +1 block |
| Gold | 1 gold | +1 gold |
| Ricochet | 1 damage + 1 random clear | +1 damage |
| Smoke | +1% dodge/tile | +0.5% dodge/tile |
| Dynamite | 1 charge per 3-match (+1 per extra tile) | +1 flat bonus charge per match |
| Stampede | 1 damage/tile (all enemies) | +1 damage/tile |
| Whiskey | 1 HP | +1 HP |
| Buckshot | 1 damage | +1 damage |
| Ace | +0.25x/tile | +0.25x/tile |
| Venom | 1 stack/tile | +1 bonus damage per venom tick |
| Ember | 4 damage | +1 damage |
| Horseshoe | +5% crit/tile | +5% crit/tile |
| Fifty Cal | 5 damage | +1 damage |

---

## Traits

Traits are powered by **artifact tags**. Each artifact has 0-2 trait tags. Your trait level equals the number of artifacts you hold with that tag. When you reach a breakpoint, the effect activates automatically. Losing an artifact (if ever possible) can deactivate a breakpoint.

7 traits total. Breakpoints vary per trait.

### Outlaw — "The 4+ match trait" (2 / 4 / 6)

| 2 | 4+ matches deal 30% bonus damage. |
|---|---|
| 4 | 4+ matches apply 1 Vulnerable to the targeted enemy. |
| 6 | Tiles from 4+ match cascades trigger resource effects twice. |

### Sheriff — "The block trait" (2 / 5)

| 2 | +2 block at turn start. Iron matches +30% block. |
|---|---|
| 5 | Block reflects 100% of absorbed damage back to the attacking enemy. |

### Rattlesnake — "The poison tile trait" (1 / 3)

| 1 | Immune to poison tile damage/debuffs. |
|---|---|
| 3 | Matching poison tiles deals damage equal to 2x your Bullet per-tile value (per poison tile matched) + applies venom stacks equal to the number of poison tiles matched. |

### Prospector — "The gold trait" (2 / 4 / 6)

| 2 | Non-gold matches: 15% chance to generate 1 gold. |
|---|---|
| 4 | Gold matches: double gold + 2 block. |
| 6 | At the end of each player turn, deal bonus damage to the targeted enemy equal to 50% of total gold earned this fight. If this damage kills the enemy, double all gold earned from this fight. |

### Sapper — "The bomb tile trait" (1 / 2 / 3)

| 1 | Bomb countdowns +2 turns (more time to defuse). |
|---|---|
| 2 | Defusing a bomb deals the bomb's damage to the targeted enemy instead. |
| 3 | Defused bombs clear adjacent tiles (generating resources). Every 4th match spawns a player-side bomb (3-turn fuse, damages targeted enemy on detonation). |

### Mustang — "The extra swap trait" (4)

| 4 | +1 swap/turn (3 total). One swap per turn can be non-adjacent (lasso). 5+ tile lasso matches: +50% damage. |
|---|---|

### Gunslinger — "The crit trait" (2 / 4)

| 2 | Start each fight with 15% crit chance. Crits deal 3 bonus flat damage on top of 2x resources. |
|---|---|
| 4 | Crit multiplier becomes 3x (from 2x). Crit chance halves on trigger instead of resetting to 0%. Chain crits become possible. |

---

## Artifacts

Found at: **elite combat** (pick 1 of 3), **shops**, **treasure nodes**, **events**. Regular combat does NOT drop artifacts. Cannot be discarded or sold. ~10 expected per full run.

### Trait Tagging

Each artifact has 0-2 trait tags. Collecting artifacts with the same tag is how you hit trait breakpoints. Building around specific tags is a core strategic decision.

### Sample Artifacts

| Name | Effect | Tags | Sauce |
|---|---|---|---|
| Stolen Badge | +2 block/turn, shops +10%. | Sheriff, Outlaw | Wanted fugitive. Merchants charge extra. |
| Worn Lasso | Once/fight non-adjacent swap. | Mustang | Fraying rope. One use before it snaps. |
| Rattlesnake Fang Necklace | 3 damage on poison match. | Rattlesnake | Pulled the fang. Bites for you now. |
| Stick of Dynamite | Once/fight clear entire row. | Sapper | Light the fuse, clear the path. |
| Bandit's Bandana | 4+ matches: 25% for 1 gold. | Outlaw | Big moves, big payouts. |
| Wanted Poster | Disable random enemy board ability 3 turns. | Sheriff | Studied their tricks. |
| Snakeskin Boots | First poison tile/turn auto-cleansed. | Rattlesnake | Venom slides right off. |
| Gold Tooth | Bullet matches: 15% for 1 gold. | Outlaw, Prospector | Every shot shakes loose a coin. |
| Saddlebag | +1 consumable slot (4 total). | Mustang | More room, more tricks. |
| Rusty Deputy Badge | +3 block per iron match. | Sheriff | Tarnished but tough. Like you. |
| Twin Revolvers | Bullets hit 2x at 60% each (120%). | Outlaw | Two barrels, two chances. |
| Fool's Gold Detector | Immune to fool's gold tiles. | Prospector | Burned before. Never again. |
| Cactus Spine Vest | Enemy attacks poison 1 tile. | Rattlesnake | They hit you, they get pricked. |
| Lit Fuse | Defused bombs: 50% to spawn new bomb. | Sapper | Chain reaction never stops. |
| Horseshoe Charm | +5 max HP. First match/fight: 2x resources. | *(none)* | Lucky start. |
| Quickdraw Holster | First swap/turn resolves early. Kill = refund swaps. | Mustang, Outlaw | Draw first, ask questions never. |
| Dynamite Vest | Bomb detonation: 50% damage reflected. | Sapper | Explosives on your chest. Crazy but effective. |
| Prospector's Pickaxe | Sand tiles revealed on any adjacent match. | Prospector | You know where to dig. |
| Loaded Dice | Fight start: 3 tiles replaced with gold. | Prospector | Rigged in your favour. |
| Bounty Board | +15% damage vs enemies with board abilities. | Sheriff | Only hunt the dirty ones. |
| Coyote Pelt | Summoned enemies take 5 damage immediately when they enter. | Outlaw, Rattlesnake | Skinned the last one. Hint taken. |
| Iron Horse Shoes | Iron matches: 20% for 1 ability charge. | Mustang, Sheriff | Armoured AND fast. |
| Lucky Bullet | +10% crit chance at fight start. | Gunslinger | Only need to be lucky once. |
| Dead Man's Hand | Crits apply 1 Vulnerable. | Gunslinger | A poker hand so cursed it kills. |
| Rigged Deck | Crits give 5 gold. | Gunslinger, Prospector | Lady luck pays well. |
| Sharpshooter's Eye | +5% crit per swap used this turn. Resets at turn end. | Gunslinger, Outlaw | More shots, sharper aim. |
| Silver Bullet | +20% crit vs bosses only. | Gunslinger, Sheriff | Save these for the big ones. |
| **Fully Loaded** | **Red panda only.** Deadeye: 3 shots become 6. | *(none)* | Six chambers. All loaded. The title. |

Target: **60-80 artifacts** (full game), **~20** (MVP).

---

## Consumables

Max **3** held at a time (4 with Saddlebag). **25% drop rate** from all combat encounters. Consumables can **only** be used at the start of the player's turn, before any swaps. Multiple consumables can be used in the same window.

**Offensive:**

| Name | Effect | Sauce |
|---|---|---|
| Stick of TNT | Clear entire row. Tiles generate resources; damage goes to targeted enemy. | Light the fuse. |
| Moonshine | 2x next match resources, take 5 damage. | Fighting drunk. |
| Wanted Flyer | Targeted enemy +50% damage taken, 2 turns. | Price on their head. |
| Pocket Watch | +1 swap this turn. | Bought a little more time. |
| Strong Coffee | 1.5x next match resources. | Eyes sharp, hands steady. |

**Defensive:**

| Name | Effect | Sauce |
|---|---|---|
| Tonic | Heal 20 HP. | Burns going down, patches you up. |
| Barbed Wire | Gain thorns: reflect 100% of the next enemy attack back to that enemy. Consumed on trigger. | They ran right into it. |
| Bandage | Heal 10 HP, cleanse all poison tiles on board. | Patch wounds, suck out venom. |

**Utility:**

| Name | Effect | Sauce |
|---|---|---|
| Skeleton Key | Unlock all locked tiles. | Every lock has a key. |
| Smoke Bomb | Targeted enemy skips next action. | Swinging at air. |
| Tumbleweed | Reshuffle entire board. | Wind rearranges everything. |
| Signal Flare | Reveal all buried tiles. | Nothing stays hidden. |
| Snake Oil | Random effect (heal/damage/poison/gold). | Who knows what's in the bottle. |

---

## Enemy Design

Each enemy: concrete HP, attack range, intent display (including block), board manipulation signature. Enemies telegraph their next action at the start of each player turn.

When an enemy uses a block action, it gains **5 block** (absorbs that much damage before HP is hit). Enemy block persists until consumed by damage or the fight ends.

Bosses are **natural predators of the red panda** as western archetypes. Each gets a **cinematic pixel art intro**.

### Act 1 — The Dusty Trail

Enemies deal **5-15 damage**. Player is learning the ropes.

| Enemy | HP | Count | Behaviour | Board manipulation |
|---|---|---|---|---|
| Coyote | 20 | 1-2, can howl to summon +1 (max 3) | Attack / howl (summon). | None. |
| Rattlesnake | 40 | 1 | Poison / bite. Blocks occasionally. | Poison 2 tiles. |
| Bandit | 45 | 1-2 | Attack / lock. Blocks before big hits. | Lock 1 tile. |
| Vulture | 25 | 1-2 | Low damage. Buries tiles on hit. | Bury 3 tiles. |

**Boss: "Dusty" Dan McGraw — Alpha Coyote** (150 HP)

*Intro: Ridge at sunset. Howl. Coyote silhouettes — one, three, six. The biggest one stands, arms crossed, tattered bandana. Tilts head. Smiles. Text slams: **"DUSTY" DAN McGRAW**.*

- **Phase 1 (100-50%):** Locks 1/turn, 10-15 damage. Can summon a coyote minion (10 HP).
- **Transition (50%):** Flips table, lock row + 10 block. Must break through.
- **Phase 2 (50-25%):** Locks 3/turn, 15-20 damage. Periodic blocks. **Gravity shifts left** — tiles fall sideways instead of down.
- **Phase 3 (25-0%):** Bomb tile every turn + locks. No blocking. 15-20 damage. Frantic race.

### Act 2 — The Canyon

Enemies deal **12-25 damage**. Board manipulation ramps up.

| Enemy | HP | Count | Behaviour | Board manipulation |
|---|---|---|---|---|
| Prospector Gone Mad | 55 | 1 | Drops bombs. 12-18 damage. | Bomb tiles (3-turn fuse). |
| Dynamite Outlaw | 80 | 1 | Locks tiles, big throws. Blocks before throw. 15-22 damage. | Locks, row clears. |
| Cave Bat Swarm | 15 each | 3 | Each bat attacks independently. 5-8 damage each. Killing a bat removes its attacks. | Bury tiles. |
| Mine Cart | N/A | 1 | **6 turns** to stop the cart by dealing enough damage. Failure = **50 damage** to player. | Pre-placed hazard tiles. |

**Boss: "Copperhead" Cassidy — A Literal Snake** (200 HP)

*Intro: Dim mine shaft. Green liquid trail. Massive coiled form. Slitted eyes glow. Uncoils, fills frame. Tongue flicks. Text slithers: **"COPPERHEAD" CASSIDY**.*

- **Phase 1 (100-50%):** Poisons 4 tiles. Alternates: brew (more poison) / strike (15-20 damage + bonus per poison tile on board). Occasional block (coil).
- **Transition (50%):** Fool's gold tiles appear (look like gold, heal enemy when matched).
- **Phase 2 (50-0%):** Poison + fool's gold. 20-25 damage strikes. Board becomes a minefield of traps.

### Act 3 — The Town

Enemies deal **18-35 damage**. Heavy board control + raw stats.

| Enemy | HP | Count | Behaviour | Board manipulation |
|---|---|---|---|---|
| Corrupt Deputy | 65 | 1-2 | Locks 2-3/turn, warrants (suppress a tile type for 2 turns). Blocks. 18-25 damage. | Locks, type suppression. |
| Saloon Brawler | 100 | 1 | Hits hard. No board tricks. Pure stat check. 22-30 damage. | None. |
| Train Guard (elite) | 75 | 1-2 | Multi-stage train heist sequence. 15-20 damage. | Locks, bombs. |

**Boss: "Iron Eye" Isabella — Leopard Sheriff** (250 HP)

*Intro: Saloon doors. Empty street. Crushed badge in dirt. Pan up to balcony. Snow leopard in long coat, metal eye plate. Crushes second badge without looking. Drops pieces. Text brands: **"IRON EYE" ISABELLA**.*

- **Phase 1 (100-65%):** Locks entire row. 10 passive block/turn. 20-25 damage.
- **Phase 2 (65-30%):** Warrants on 2 tile types (suppressed). Locks need 2 adjacent matches to free. 25-30 damage.
- **Phase 3 (30-0%):** Lockdown — 2 locks + 2 poisons/turn. 30-35 damage. Drops block. Damage race.

### Elite Board Modifiers

Elite encounters begin with a board modifier that lasts the entire fight:

| Modifier | Effect |
|---|---|
| **Dust Storm** | 3 random tiles start buried. |
| **Quicksand** | Bottom row is locked at fight start. |
| **Narrow Canyon** | 2 columns are locked (6x8 playable area). |
| **Cracked Ground** | Cascades deal no damage for the first 2 turns. |

---

## Run Structure

### Map

Slay the Spire-style branching node map. ~12-15 nodes per act with branching paths.

**Guaranteed placements:** One treasure node (free artifact) near the middle of each act. One rest site (campfire) immediately before the boss.

### Node Types

| Node | Description |
|---|---|
| **Combat** | Gold + 25% consumable chance. No artifact. |
| **Elite** | Pick 1 of 3 artifacts + gold + 25% consumable. Board modifier active. |
| **Shop** | Buy artifacts, consumables, or **swap** a non-core/non-starter tile. |
| **Rest Site** | Choose: **rest** (heal 30% max HP) or **upgrade a tile** (permanent +1 tier for the run). |
| **Event** | Narrative encounter with choices. See Events. |
| **Treasure** | Free artifact (pick 1 of 3). Can be skipped. Guaranteed once per act, mid-act. |

### Shop Pricing

| Category | Price Range | Stock |
|---|---|---|
| Consumable | 15-30 gold | 3 available |
| Tile Swap | 50-75 gold | 1 available |
| Artifact | 100-175 gold | 2 available |

### Acts

| Act | Tiles | Boss |
|---|---|---|
| 1 — Dusty Trail | 4 (3 core + 1 starter) | "Dusty" Dan McGraw |
| 2 — The Canyon | 5 (+1 from additional pool) | "Copperhead" Cassidy |
| 3 — The Town | 6 (+1 from additional pool) | "Iron Eye" Isabella |

### Between Acts

Choose **1 of 3 tiles** from the additional pool. Already-chosen tiles cannot appear. This is both the reward and the difficulty scaling (more tile types = more board dilution). **Player heals to full HP between acts.**

---

## Events

Target: ~15-20 events (full game), ~4-6 (MVP).

### The Card Game
*"Raccoon in a top hat. Three cards face down. 'Ten gold a card, friend.'"*
- **Play:** -10 gold, pick a card. Artifact, consumable, tile type, or nothing (cheated).

### The Wanted Board
*"Your face on a poster. Pretty good likeness."*
- **Tear down:** Normalise shop prices.
- **Leave up:** +30 gold, next elite +20% HP.

### The Snake Charmer
*"Hooded figure, swaying snakes. Offers to let one bite you."*
- **Bite:** -10 HP, gain Rattlesnake-tagged artifact.
- **Decline:** +10 gold.

### The Abandoned Mine
*"Sign reads 'KEEP OUT.' Naturally, you go in."*

Multi-step escalation. Stop at any point and keep what you've found.

| Depth | HP cost | Artifact chance | Total HP spent |
|---|---|---|---|
| 1 | -3 | 10% | 3 |
| 2 | -5 | 25% | 8 |
| 3 | -7 | 40% | 15 |
| 4 | -10 | 60% | 25 |
| 5 | -15 | 100% | 40 |

### The Broken Cart
*"Merchant's cart, busted wheel, goods scattered."*
- **Help:** -1 consumable, shops stock +1 item rest of run.
- **Rob:** +2 consumables, +15 gold, next shop +20%.

### The Old Well
*"Deep well. Something jingling below."*
- **Climb:** -10 HP, +30 gold + random consumable.
- **Bucket:** +15 gold.

### The Dynamite Stash
*"Crate of unstable dynamite."*
- **Take carefully:** +2 Stick of TNT.
- **Blow it up:** Skip next node, -15 HP.

---

## Characters

### Red Panda (MVP)

Small, scrappy, cowboy gear. The underdog. Pixel art with expressive reactions — flinch on hit, grin on big match, hat tip on boss kill.

**Ability:** Deadeye (see Combat). **Exclusive artifact:** Fully Loaded.

### Future Characters (post-MVP)

Different abilities and charge rates. Unlocked via Reputation Shop.

---

## Scoring

Expected run: **~1 hour**.

**Base:** Combat 100, Elite 200, Boss 500, Run complete 1000.

**Bonus:** Gold earned (1/gold), Damage dealt (1/10 dmg), Longest cascade (50/step), Trait breakpoints (100/each), Flawless fights (150/each).

**Multipliers:** Ascension (1.0 + 0.2 x level), Time (1.5x at <=45 min, linear to 1.0x at 90 min, no penalty past 90).

`Final = (Base + Bonus) x Ascension x Time`

### Leaderboards (post-MVP)

Daily / Weekly / All-Time. Top 10 each. Anti-cheat addressed at implementation.

---

## Meta Progression

**Reputation** earned per run (based on score) > spent in the **Reputation Shop** (main menu). Unlocks: new artifacts added to the pool, starting loadouts, cosmetics, events, characters. NOT power creep — expands option space. Exact costs TBD via playtesting.

**Ascension** — cumulative difficulty modifiers after first win. Levels 0-20. Players select ascension level during character selection (before tile selection). No ascension is available until the game is beaten once. Clearing a run at level N unlocks level N+1. Score multiplier: 1.0 + 0.2 per level.

Difficulty modifiers per level (cumulative):
- Enemy HP: +10% per level
- Enemy damage: +5% per level
- Gold earned (from tiles): -5% per level (floor 50%)
- Shop prices: +5% per level

---

## Technical Architecture

### Stack

| Layer | Tech |
|---|---|
| Game engine | Phaser 3 (Canvas/WebGL) |
| UI | React + TypeScript (Vite) |
| Styling | Tailwind CSS (React only) |
| Backend | Supabase (free tier) |
| Hosting | Cloudflare Pages (free) |
| PWA | Service worker + manifest |
| Local storage | IndexedDB (offline-first) |

### Project Structure

```
one-more-in-the-chamber/
├── docs/
│   ├── SPEC.md
│   └── CHANGELOG.md
├── public/
│   └── assets/
│       ├── sprites/
│       │   ├── tiles/
│       │   ├── characters/
│       │   ├── enemies/
│       │   └── effects/
│       ├── audio/
│       │   ├── music/
│       │   └── sfx/
│       └── fonts/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # React root
│   ├── game/                       # Phaser game code
│   │   ├── GameConfig.ts
│   │   ├── scenes/
│   │   │   ├── BootScene.ts        # Asset loading
│   │   │   ├── CombatScene.ts      # Main combat loop
│   │   │   └── CutsceneScene.ts    # Boss intros
│   │   ├── board/
│   │   │   ├── Board.ts            # 8x8 grid manager
│   │   │   ├── Tile.ts             # Tile sprite + state
│   │   │   ├── MatchDetector.ts    # Pattern recognition
│   │   │   └── CascadeResolver.ts  # Gravity + chain resolution
│   │   ├── combat/
│   │   │   ├── CombatManager.ts    # Turn flow orchestration
│   │   │   ├── Enemy.ts            # Enemy state + AI
│   │   │   ├── Player.ts          # Player state + ability
│   │   │   └── ResourceResolver.ts # Universal resource rule
│   │   └── animations/
│   │       └── AnimationStateMachine.ts
│   ├── ui/                         # React components
│   │   ├── screens/
│   │   │   ├── MainMenu.tsx
│   │   │   ├── MapScreen.tsx
│   │   │   ├── ShopScreen.tsx
│   │   │   ├── RestSiteScreen.tsx
│   │   │   ├── EventScreen.tsx
│   │   │   └── ScoreScreen.tsx
│   │   └── hud/
│   │       ├── HealthBar.tsx
│   │       ├── StatusEffects.tsx    # Status effect row
│   │       ├── EnemyIntent.tsx
│   │       ├── EnemyTargeting.tsx   # Target selection UI
│   │       ├── ArtifactBar.tsx
│   │       └── AbilityMeter.tsx
│   ├── store/                      # Zustand
│   │   ├── runStore.ts             # Active run state
│   │   └── metaStore.ts            # Persistent progression
│   ├── services/
│   │   ├── supabase.ts             # Client init
│   │   ├── auth.ts                 # Login/signup
│   │   ├── localSave.ts            # IndexedDB save/load
│   │   └── syncService.ts          # Local <-> remote sync
│   ├── data/                       # Static game data
│   │   ├── artifacts.ts
│   │   ├── enemies.ts
│   │   ├── tiles.ts
│   │   ├── traits.ts
│   │   ├── consumables.ts
│   │   └── events.ts
│   └── types/
│       ├── game.ts
│       ├── combat.ts
│       └── tiles.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── README.md
```

### Pixel-Perfect Rendering

The game renders to a **fixed internal resolution** and integer-scales to the display. This guarantees every pixel in every sprite lands on the same grid, regardless of screen size.

**Internal resolution: 480x270** (landscape 16:9).

| Display | Integer scale | Rendered size | Letterbox |
|---|---|---|---|
| 1920x1080 (desktop/TV) | 4x | 1920x1080 | None |
| 1440x810 | 3x | 1440x810 | None |
| 2560x1440 (1440p) | 5x | 2400x1350 | Small bars |
| 1080x1920 (phone portrait) | 2x | 960x540 | Top/bottom bars |

**Combat layout at internal resolution (480x270):**

```
[ Act I ][    gold count    ][ swaps: 2 ][ gear ]      <- top HUD bar (~16px)
[ artifacts row (left-aligned, under top bar) ]        <- artifact icons row (~18px)
[        ]                           [         ]
[ PLAYER ]      [ 8x8 BOARD ]       [ ENEMIES ]       <- main area
[ 64x64  ]      [ in ornate  ]      [ up to 3 ]
[        ]      [  frame     ]      [ 64x64ea ]
[ HP bar ]      [ 256x256    ]      [ HP bars ]
[ status ]      [            ]      [ status  ]
[        ]      [  combo x N ]      [         ]
[        ]                          [ intent  ]
[ [_][_][_] ]                                          <- consumable slots (3 empty squares)
```

**Top HUD bar:** Act label (left), gold count (center), swaps remaining (right), settings gear (far right). No round or turn counter.

**Artifact row:** Directly under the top bar, left-aligned. Small icons showing collected artifacts.

**Consumable slots:** 3 fixed square slots (4 with Saddlebag) near the player, bottom-left. Empty slots are visible outlines.

**Board area:** 256x256 (8x8 grid of 32x32 tiles) centered horizontally. ~112px on each side for characters.

**Mobile (portrait):** Rendered at 2x in landscape orientation within the viewport, or the device is rotated to landscape. Match-3 games in this layout style work best landscape.

**Rules (non-negotiable for pixel art):**

1. **All sprite positions are integers.** No fractional pixels. Ever. `Math.round()` all positions including during tweens/animations.
2. **Integer scaling only.** The canvas scales by 2x, 3x, 4x — never 2.7x. Letterbox the remainder.
3. **No anti-aliasing.** Phaser `pixelArt: true` disables smoothing on textures and enables `roundPixels`.
4. **Camera position is integer.** Screen shake offsets are rounded to whole pixels.
5. **All asset sizes are multiples of 2.** Tiles: 32x32. Characters/enemies: 64x64. Bosses: 96x96. Icons: 16x16.
6. **CSS image-rendering: pixelated.** Phaser sets this automatically with `pixelArt: true`. Prevents browser smoothing on upscale.

**Phaser config:**

```typescript
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 270,
  pixelArt: true, // antialias: false, roundPixels: true
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

// In scene create -- enforce integer camera
this.cameras.main.setRoundPixels(true);
```

**Zoom override** (calculate max integer scale at boot):

```typescript
const maxZoom = Math.min(
  Math.floor(window.innerWidth / 480),
  Math.floor(window.innerHeight / 270)
);
// Apply via Phaser scale manager or CSS transform
```

### Performance

- Board on `<canvas>` via Phaser. Never DOM.
- Cascades: iterative scan, clear, gravity, repeat. Batch detection. ~200-300ms per step (tunable).
- Object pooling for tile sprites.
- Phaser owns combat. React owns HUD + menus. Event bus between them.
- Lazy load per act. Texture atlases. <2MB initial bundle.
- 60fps target on 3+ year old phones. Profile on real devices.
- React.memo on HUD. Zustand for out-of-combat state.
- Touch responsive within 1 frame.
- Boss cutscene assets pre-loaded at boss node entry.

### Save System

**Offline-first.** The game is fully playable without an account or internet connection.

- **Local:** All game state saved to IndexedDB after every node. This is the primary save.
- **Remote:** When logged in, state syncs to Supabase after every node.
- **Mid-combat saves:** post-MVP.

**Sync strategy (local to remote):**

On login or reconnect, sync merges local and remote data. **Remote data is never overwritten or deleted.**

| Data | Merge rule |
|---|---|
| `meta_progression` | Additive merge: union of unlocked arrays, max of reputation, max of highest_ascension_cleared. |
| `runs` (active) | Compare `updated_at`. Keep the more recent state. If both have progress, keep the one with more nodes cleared. |
| `scores` | Append-only. Add any local scores not already present on remote (match by run_id + created_at). |

### Database Schema

```sql
create table players (
  id uuid primary key references auth.users(id),
  display_name text,
  created_at timestamptz default now()
);

create table meta_progression (
  player_id uuid primary key references players(id),
  reputation integer default 0,
  unlocked_artifacts jsonb default '[]',
  unlocked_cosmetics jsonb default '[]',
  unlocked_loadouts jsonb default '[]',
  unlocked_characters jsonb default '["red_panda"]',
  highest_ascension_cleared integer default 0
);

create table runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id),
  character text default 'red_panda',
  status text check (status in ('active', 'completed', 'abandoned')) default 'active',
  seed text not null,
  ascension_level integer default 0,
  current_act integer default 1,
  current_node_id text,
  started_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table run_state (
  run_id uuid primary key references runs(id),
  health integer default 100,
  max_health integer default 100,
  gold integer default 0,
  active_tile_types jsonb default '["bullet", "iron", "gold"]',
  tile_upgrades jsonb default '{}',
  artifacts jsonb default '[]',
  trait_counts jsonb default '{}',
  consumables jsonb default '[]',
  ability_charge integer default 0,
  map_state jsonb,
  combat_state jsonb,               -- all in-fight ephemeral state (ace, crit, dodge, venom, block, etc.)
  updated_at timestamptz default now()
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id),
  run_id uuid references runs(id),
  character text,
  ascension_level integer,
  base_score integer,
  bonus_points integer,
  ascension_multiplier numeric(3,1),
  time_bonus numeric(3,2),
  final_score integer,
  run_duration_seconds integer,
  nodes_cleared integer,
  bosses_defeated integer,
  run_completed boolean default false,
  created_at timestamptz default now()
);

create index idx_scores_final on scores(final_score desc);
create index idx_scores_date on scores(created_at desc);
```

### Deployment

GitHub > Cloudflare Pages (auto-deploy on push) > Supabase backend. **$0.**

---

## MVP Scope

### Placeholder Art System

MVP uses **no image assets**. All visuals are Phaser graphics primitives (rectangles, text, lines) drawn at runtime. This keeps the focus on mechanics and makes every element trivially swappable for real art later.

**Placeholder rendering rules:**

| Element | Placeholder | Label |
|---|---|---|
| Board tiles | 30x30 colored rect, 1px dark border, 20% alpha fill | 1-2 letter abbreviation centered (Bu, Ir, Go, Ri, Sm, Dy, St, .50) |
| Explosive tile | Same as tile but with pulsing border | "!" prefix |
| Showdown tile | Same as tile but diamond-shaped | Star symbol |
| Player character | 56x56 green rect, 30% alpha fill, 1px border | "P" |
| Enemy | 56x56 red rect, 30% alpha fill, 1px border | Enemy name abbreviated (Coy, Rat, Ban, Vul) |
| Boss | 80x80 dark red rect, 30% alpha fill, 2px border | Boss name abbreviated |
| Health bar | Colored rect (green > yellow > red gradient by %) | HP numbers overlaid |
| Status effects | 14x14 colored squares in a row, 2px gap between | 1-letter label (B, D, A, C, T, V, Vu) |
| Enemy intent | Icon-less text above enemy | "ATK 12", "BLK", "PSN 2" |
| Ability meter | Thin rect below player, fills left-to-right | "3/10" charge count |
| Consumables | 24x24 colored squares in HUD row | 2-letter abbreviation |
| Artifacts | 16x16 colored squares in HUD row | Trait tag color-coded |
| Map nodes | 24x24 circles, color-coded by type | Type letter (C, E, S, R, T, ?) |
| Map paths | 1px lines connecting nodes | -- |
| Backgrounds | Solid color fill per screen | -- |
| Boss cutscene | Full-screen colored background with large centered text | Boss name + flavour text |

**Tile colors (distinguishable at a glance):**

| Tile | Fill color | Hex |
|---|---|---|
| Bullet | Brass/orange | `#D4A030` |
| Iron | Steel blue | `#6888A0` |
| Gold | Yellow | `#FFD700` |
| Ricochet | Pink/magenta | `#D06080` |
| Smoke | Gray | `#909090` |
| Dynamite | Red | `#D04040` |
| Stampede | Brown | `#8B6030` |
| Locked | Dark overlay on existing tile | `#000000` 50% alpha |
| Poison | Purple overlay | `#8030A0` 40% alpha |
| Bomb | Flashing red border, countdown number | -- |
| Sand/Buried | Tan, no label (hidden) | `#C8B080` |
| Fifty Cal | Steel blue | `#7090B8` |

All placeholder rendering is behind a single abstraction layer per entity type (e.g., `TileRenderer`, `CharacterRenderer`) so swapping to sprite-based rendering later is a one-file change per type.

### MVP Checklist

- [ ] Main menu (continue, new game, reputation shop shell, settings).
- [ ] Start-of-run tile selection (1 of 3 from starter pool of 4).
- [ ] Match-3 board with 4 tile types. Equal distribution. Swapping, matching, cascading.
- [ ] Universal resource generation. Per-tile combat numbers.
- [ ] 2 swaps/turn. End early. No-valid-moves = lost turn + reshuffle.
- [ ] 4-match (explosive), 5-match (Showdown), cross clear.
- [ ] Deadeye (3 tiles, 1 charge/turn + Dynamite matches, 10 to activate, carry over, Showdown interaction).
- [ ] Crit system (baseline mechanic).
- [ ] Multi-enemy combat (up to 3, targeting, AoE).
- [ ] Placeholder character + enemy rendering with state indication (idle/attacking/blocking/hit/dead).
- [ ] 4 Act 1 enemies with block, summon, and board manipulation.
- [ ] Act 1 boss (Dusty) — phases, block, gravity shift, summon.
- [ ] ~20 artifacts across 7 traits. Trait breakpoints.
- [ ] 13 consumables (3 limit, 25% drop, pre-swap window only).
- [ ] Tile upgrades at rest sites.
- [ ] Status effect display rows (player + enemy).
- [ ] Branching map (Act 1, ~12 nodes). Guaranteed treasure mid-act, campfire pre-boss.
- [ ] Combat, elite (board modifiers), shop, rest site, treasure.
- [ ] ~4 events.
- [ ] Scoring.
- [ ] IndexedDB offline save. Supabase auth (email + Google). Sync on login (no remote overwrite).
- [ ] Cloudflare Pages deploy.

### Post-MVP

- [ ] Boss cutscene animations (pixel art intros).
- [ ] Character + enemy sprite animations with priority state machine.
- [ ] Acts 2-3 (tile count to 5, 6 via between-act choices).
- [ ] Full artifact set (60-80).
- [ ] All additional tiles (Whiskey, Buckshot, Ace, Venom, Ember, Horseshoe, Fifty Cal).
- [ ] Full event pool (~15-20).
- [ ] Meta progression (Reputation shop with unlocks and pricing).
- [ ] Ascension system (selector + difficulty modifiers implemented; values may need tuning).
- [ ] Leaderboards + anti-cheat.
- [ ] Additional characters.
- [ ] Mid-combat saves.
- [ ] Cosmetics.
- [ ] SFX.
- [ ] PWA offline.
- [ ] Polish (screenshake, particles, juice).

---

## Open Questions

- Cascade speed tuning (target ~200-300ms per step, needs playtesting).
- Ascension modifier values may need tuning via playtesting.
- Reputation amounts per run and unlock costs (TBD via playtesting).
- Shop price fine-tuning within established ranges.
