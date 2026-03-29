# One More In The Chamber

## Game Design Specification — v1.0

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

1. **Choose a 4th tile** at run start (1 of 3 from the starter pool).
2. Navigate a branching map, choosing encounters.
3. In combat: match tiles to generate resources. Enemy announces intent, player responds, enemy acts.
4. Collect gold + chance of consumable after fights.
5. Defeat the act boss → **choose a new tile** from the additional pool (1 of 3).
6. After 3 acts, the run ends. Earn Reputation. Start a new run.

**Tile progression:** 4 tiles (Act 1) → 5 (Act 2) → 6 (Act 3). Board dilution IS difficulty scaling.

---

## Main Menu

- **Continue** — resume active run (greyed out if none).
- **New Game** — select character (MVP: red panda only), ascension level.
- **Settings** — audio, controls, account, display.

---

## Combat System

### The Board

- 8x8 grid of tiles.
- **2 swaps per turn** (default). Increased by artifacts/traits.
- Swaps create matches (3+). Tiles clear, new tiles fall, cascades resolve automatically.
- **End turn early** at any time.
- **No valid moves** = turn ends, board reshuffles, enemy still acts.

### Resource Generation Rule

**When a tile is cleared by any means, it generates its own resource.** No exceptions. The trigger doesn't matter; the tile type does.

---

## Tile System

Two **separate pools**: the starter pool (run start) and the additional pool (between acts / shops).

### Core Tiles (always present, cannot be removed)

| Tile | Per-tile | Purpose |
|---|---|---|
| **Bullet** | 3 damage | Primary offence. |
| **Iron** | 4 block | Absorbs damage this turn. Expires at turn end. |
| **Gold** | 3 gold | Currency for shops. Mid-fight greed play. |

### Starter Pool (choose 1 of 3 at run start)

Exclusive to run start. Cannot be gained from shops or between-act rewards. Defines early-game identity.

| Tile | Per-tile | Mechanic | Sauce |
|---|---|---|---|
| **Ricochet** | 1 damage + destroys 1 random tile | Each tile cleared deals 1 damage AND destroys 1 random tile elsewhere on the board (which generates its own resource). A 3-match = 3 damage + 3 random tiles destroyed. Bonus resource generation plus board disruption. | Bullets bounce. You never know what they'll hit. |
| **Smoke** | +1% dodge (caps at 50%) | Each tile cleared adds +1% dodge chance for the rest of the fight. When the enemy attacks, there's a chance to dodge entirely — zero damage. Resets between fights. Slow build, huge late-fight payoff. | Disappear into the haze. They can't hit what they can't see. |
| **Dynamite** | 1 ability charge | Generates ability charge when cleared. Gets Deadeye online fast and often. | Volatile but useful. Light the fuse on your special move. |

### Additional Pool (gained between acts, swappable at shops)

After each act boss, choose **1 of 3**. **Already-chosen tiles cannot be offered.** Shops allow **swapping** a non-core, non-starter tile for a different one from this pool.

| Tile | Per-tile | Mechanic | Sauce |
|---|---|---|---|
| **Whiskey** | 2 HP | Heals player. Basic sustain. | The cowboy's medicine. |
| **Buckshot** | 5 damage | Raw damage (vs Bullet's 3). Board dilution is the cost. | Spread shot. Hits harder, less precise. |
| **Ace** | +0.25x multiplier | Adds to a "next match" multiplier (base 1.0x). 3-match = 1.75x. **Stacks across matches within a fight.** Consumed on next non-Ace match. **Resets between fights. No cap.** Not affected by match bonuses. Displayed below character sprite and health bar. | An ace up your sleeve. |
| **Venom** | 1 stack DOT (2 dmg/turn, 3 turns) | Applies venom to enemy. Stacks infinitely. No immediate damage. **Same DOT as Rattlesnake 3** — they stack together. | Snake venom. Death by a thousand cuts. |
| **Ember** | 4 damage + 25% spread | Each cleared Ember has 25% chance to convert an adjacent **non-Ember** tile into Ember. Fire eats your other tiles. | Playing with fire. Rewarding and dangerous. |
| **Star** | Wildcard | Matches with ANY tile type. Generates whatever resource the matched type generates. No resource of its own. Board fluidity over raw power. | Fits in anywhere. Like you. |
| **Horseshoe** | +5% crit chance | Each tile adds +5% crit chance (stacking). When a crit triggers, that match generates 2x resources, then crit chance resets to 0%. Resets between fights. | Feeling lucky, partner? |

### Crit System

Global mechanic. Every player starts at 0% crit chance per fight. Crit chance is gained from Horseshoe tiles (+5%/tile), Gunslinger trait, and artifacts. When a crit triggers, the match generates **2x resources** (or 3x with Gunslinger 4), then crit chance resets to 0% (or halves with Gunslinger 4).

### Tile Upgrades

Permanently upgraded at rest sites for the rest of the run.

| Tile | Base | Per upgrade |
|---|---|---|
| Bullet | 3 damage | +1 damage |
| Iron | 4 block | +1 block |
| Gold | 3 gold | +1 gold |
| Ricochet | 1 damage + 1 random clear | +1 damage |
| Smoke | +1% dodge/tile | +0.5% dodge/tile |
| Dynamite | 1 charge/tile | +1 charge per match |
| Whiskey | 2 HP | +1 HP |
| Buckshot | 5 damage | +2 damage |
| Ace | +0.25x/tile | +0.1x/tile |
| Venom | 2 dmg/turn DOT | +1 dmg/turn |
| Ember | 4 damage | +1 damage |
| Star | copies matched type | +10% bonus on copied resource |
| Horseshoe | +5% crit/tile | +2% crit/tile |

### Combat Numbers

Per-tile values x tile count x match bonus.

| Match | Multiplier | Example (Bullet 3/tile) |
|---|---|---|
| 3-match | 1.0x | 9 damage |
| 4-match | 1.5x | 18 damage |
| 5-match | 2.0x | 30 damage |
| Cross clear | 1.0x per tile | Varies |

Match bonuses apply to damage, block, gold, healing. Do NOT apply to Ace multiplier, ability charges, Thorn stacks, Venom stacks, Smoke dodge, or Horseshoe crit chance.

**Starting HP: 100 / 100.** Act 1 enemies: 5-15 damage. Scales in Acts 2-3.

### Match Bonuses

- **3-match:** base value.
- **4-match:** 1.5x + spawns **explosive tile** (3x3 clear on match).
- **5-match:** 2x + spawns **Showdown tile** (swap with any adjacent tile → destroys ALL of that type on board).
- **Deadeye + Showdown:** shooting a Showdown tile clears all of a **random** type.
- **L / T / + match (Cross Clear):** clears all tiles in horizontal + vertical lines from intersection.

### Character Ability — "Deadeye"

**Charge:** 10 matches (cascades count). Dynamite tiles add extra charges.

**Activation:** Crosshair cursor. Select **3 tiles** anywhere. Each destroyed + resource generated. Gravity + cascades resolve after.

**Animation:** Draw gun → point at enemy → each click fires (muzzle flash, tile shatters).

**Meter carries over between fights.** Ace multiplier does not.

**"Fully Loaded"** — red panda-exclusive artifact. 3 shots → 6. Six chambers. The title of the game.

### Enemy Turn

1. **Announce intent** (attack, block, ability, board manipulation).
2. **Execute** after player's swaps resolve.

Enemies can **block** (absorbs damage). When blocking, consider matching gold or setting up instead of wasting damage.

### Board Manipulation

| Mechanic | Description |
|---|---|
| **Lock** | Can't swap. Match adjacent to free. |
| **Poison** | Hurts player or debuffs on match. |
| **Bomb** | Countdown. Detonates if not matched. |
| **Sand/Bury** | Hidden. Match adjacent to reveal. |
| **Barricade** | Blocks cascades. Match adjacent to break. |

### Character Animations

Priority (highest first): Death > Hit/Flinch > Ability > Attack > Block > Heal > Match > Idle.

One animation at a time. Effects apply mechanically regardless. Enemies need: idle, attack, block, ability, hit, death.

---

## Traits

7 traits total. Breakpoints vary per trait.

### Outlaw — "The 4+ match trait" (2 / 4 / 6)

| 2 | 4+ matches deal 30% bonus damage. |
|---|---|
| 4 | 4+ matches apply 1 Vulnerable (25% more damage on next hit). |
| 6 | Tiles from 4+ match cascades trigger resource effects twice. |

### Sheriff — "The block trait" (2 / 5)

| 2 | +2 block at turn start. Iron matches +30% block. |
|---|---|
| 5 | Block reflects 100% of absorbed damage back to enemy. |

### Rattlesnake — "The poison tile trait" (1 / 3)

| 1 | Immune to poison tiles. |
|---|---|
| 3 | Matching poison tiles deals 2x bullet damage + applies venom DOT (same effect as Venom tiles, stacks together). |

### Prospector — "The gold trait" (2 / 4 / 6)

| 2 | Non-gold matches: 15% chance to generate 1 gold. |
|---|---|
| 4 | Gold matches: double gold + 2 block. |
| 6 | End of combat: bonus damage = 50% of gold earned in fight. If lethal, double gold. |

### Dynamite — "The bomb tile trait" (1 / 2 / 3)

| 1 | Bomb countdowns +2 turns. |
|---|---|
| 2 | Defusing deals bomb damage to enemy. |
| 3 | Defused bombs clear adjacent tiles for resources. Every 4th match spawns a bomb (3-turn fuse). |

### Mustang — "The extra swap trait" (4)

| 4 | +1 swap/turn (3 total). One swap can be non-adjacent (lasso). 5+ lasso matches: +50% damage. |
|---|---|

### Gunslinger — "The crit trait" (2 / 4)

| 2 | Start each fight with 15% crit chance. Crits deal 3 bonus flat damage on top of 2x resources. |
|---|---|
| 4 | Crit multiplier becomes 3x (from 2x). Crit chance halves on trigger instead of resetting to 0%. Chain crits become possible. |

---

## Artifacts

Found at: **elite combat** (pick 1 of 3), **shops**, **treasure nodes**, **events**. Regular combat does NOT drop artifacts. Cannot be discarded or sold. ~10 expected per full run.

### Sample Artifacts

| Name | Effect | Tags | Sauce |
|---|---|---|---|
| Stolen Badge | +2 block/turn, shops +10%. | Sheriff, Outlaw | Wanted fugitive. Merchants charge extra. |
| Worn Lasso | Once/fight non-adjacent swap. | Mustang | Fraying rope. One use before it snaps. |
| Rattlesnake Fang Necklace | 3 damage on poison match. | Rattlesnake | Pulled the fang. Bites for you now. |
| Stick of Dynamite | Once/fight clear entire row. | Dynamite | Light the fuse, clear the path. |
| Bandit's Bandana | 4+ matches: 25% for 1 gold. | Outlaw | Big moves, big payouts. |
| Wanted Poster | Disable random enemy board ability 3 turns. | Sheriff | Studied their tricks. |
| Snakeskin Boots | First poison tile/turn auto-cleansed. | Rattlesnake | Venom slides right off. |
| Gold Tooth | Bullet matches: 15% for 1 gold. | Outlaw, Prospector | Every shot shakes loose a coin. |
| Saddlebag | +1 consumable slot (4 total). | Mustang | More room, more tricks. |
| Rusty Deputy Badge | +3 block per iron match. | Sheriff | Tarnished but tough. Like you. |
| Twin Revolvers | Bullets hit 2x at 60% each (120%). | Outlaw | Two barrels, two chances. |
| Fool's Gold Detector | Immune to fool's gold tiles. | Prospector | Burned before. Never again. |
| Cactus Spine Vest | Enemy attacks poison 1 tile. | Rattlesnake | They hit you, they get pricked. |
| Lit Fuse | Defused bombs: 50% to spawn new bomb. | Dynamite | Chain reaction never stops. |
| Horseshoe Charm | +5 max HP. First match/fight: 2x resources. | *(none)* | Lucky start. |
| Quickdraw Holster | First swap/turn resolves early. Kill = refund swaps. | Mustang, Outlaw | Draw first, ask questions never. |
| Dynamite Vest | Bomb detonation: 50% damage reflected. | Dynamite | Explosives on your chest. Crazy but effective. |
| Prospector's Pickaxe | Sand tiles revealed on any adjacent match. | Prospector | You know where to dig. |
| Loaded Dice | Fight start: 3 tiles replaced with gold. | Prospector | Rigged in your favour. |
| Bounty Board | +15% damage vs enemies with board abilities. | Sheriff | Only hunt the dirty ones. |
| Coyote Pelt | Summoned enemies take 5 damage immediately. | Outlaw, Rattlesnake | Skinned the last one. Hint taken. |
| Iron Horse Shoes | Iron matches: 20% for 1 ability charge. | Mustang, Sheriff | Armoured AND fast. |
| Lucky Bullet | +10% crit chance at fight start. | Gunslinger | Only need to be lucky once. |
| Dead Man's Hand | Crits apply 1 Vulnerable. | Gunslinger | A poker hand so cursed it kills. |
| Rigged Deck | Crits give 5 gold. | Gunslinger, Prospector | Lady luck pays well. |
| Sharpshooter's Eye | +5% crit per swap used this turn. Resets. | Gunslinger, Outlaw | More shots, sharper aim. |
| Silver Bullet | +20% crit vs bosses only. | Gunslinger, Sheriff | Save these for the big ones. |
| **Fully Loaded** | **Red panda only.** Deadeye: 3 → 6 shots. | *(none)* | Six chambers. All loaded. The title. |

Target: **60-80 artifacts** (full game), **~20** (MVP).

---

## Consumables

Max **3** held at a time. Used during combat. **25% drop rate** from all combat encounters.

**Offensive:**

| Name | Effect | Sauce |
|---|---|---|
| Stick of TNT | Clear entire row. | Light the fuse. |
| Moonshine | 2x next match resources, take 5 damage. | Fighting drunk. |
| Wanted Flyer | Enemy +50% damage taken, 2 turns. | Price on their head. |
| Pocket Watch | +1 swap this turn. | Bought a little more time. |
| Strong Coffee | 2x next match resources. | Eyes sharp, hands steady. |

**Defensive:**

| Name | Effect | Sauce |
|---|---|---|
| Tonic | Heal 20 HP. | Burns going down, patches you up. |
| Barbed Wire | Reflect 100% of next enemy attack. | They ran right into it. |
| Bandage | Heal 10 HP, cleanse all poison tiles. | Patch wounds, suck out venom. |

**Utility:**

| Name | Effect | Sauce |
|---|---|---|
| Skeleton Key | Unlock all locked tiles. | Every lock has a key. |
| Smoke Bomb | Enemy skips next action. | Swinging at air. |
| Tumbleweed | Reshuffle entire board. | Wind rearranges everything. |
| Signal Flare | Reveal all buried tiles. | Nothing stays hidden. |
| Snake Oil | Random effect (heal/damage/poison/gold). | Who knows what's in the bottle. |

---

## Enemy Design

Each enemy: HP, attack pattern (with visible intent including block), board manipulation signature.

Bosses are **natural predators of the red panda** as western archetypes. Each gets a **cinematic pixel art intro**.

### Act 1 — The Dusty Trail

| Enemy | HP | Behaviour | Board manipulation |
|---|---|---|---|
| Coyote | Low | Attack / howl (summon). | None. |
| Rattlesnake | Medium | Poison / bite. Blocks occasionally. | Poison 2 tiles. |
| Bandit | Medium | Attack / lock. Blocks before big hits. | Lock 1 tile. |
| Vulture | Low | Buries on damage. | Bury 3 tiles. |

**Boss: "Dusty" Dan McGraw — Alpha Coyote**

*Intro: Ridge at sunset. Howl. Coyote silhouettes — one, three, six. The biggest one stands, arms crossed, tattered bandana. Tilts head. Smiles. Text slams: **"DUSTY" DAN McGRAW**.*

- **Phase 1 (100-50%):** Locks 1/turn, hits hard.
- **Transition (50%):** Flips table → barricade + chunk of block. Must break through.
- **Phase 2 (50-25%):** Locks 3/turn, stronger attacks, periodic blocks.
- **Phase 3 (25-0%):** Bomb tile every turn + locks. No blocking. Frantic race.

### Act 2 — The Canyon

| Enemy | HP | Behaviour | Board manipulation |
|---|---|---|---|
| Prospector Gone Mad | Medium | Drops bombs. | Bomb tiles (3-turn). |
| Dynamite Outlaw | High | Barricades, big throws. Blocks before throw. | Barricades, row clears. |
| Cave Bat Swarm | Swarm | Hit thresholds clear bats. | Bury tiles. |
| Mine Cart | Timer | N turns to stop cart. | Pre-placed hazards. |

**Boss: "Copperhead" Cassidy — A Literal Snake**

*Intro: Dim mine shaft. Green liquid trail. Massive coiled form. Slitted eyes glow. Uncoils, fills frame. Tongue flicks. Text slithers: **"COPPERHEAD" CASSIDY**.*

- **Phase 1 (100-50%):** 4 poison tiles. Brew (more poison) / Strike (damage scaled by poison count). Occasional block (coil).
- **Transition (50%):** Fool's gold tiles appear (look like gold, heal enemy).
- **Phase 2 (50-0%):** Poison + fool's gold. Frequent strikes. Board becomes a minefield of traps.

### Act 3 — The Town

| Enemy | HP | Behaviour | Board manipulation |
|---|---|---|---|
| Corrupt Deputy | Medium | Locks 2-3/turn, warrants (suppress tile type). Blocks. | Locks, type suppression. |
| Saloon Brawler | High | Hits hard. No board tricks. Stat check. | None. |
| Train Guard (elite) | Medium | Multi-stage train heist. | Barricades, bombs. |

**Boss: "Iron Eye" Isabella — Leopard Sheriff**

*Intro: Saloon doors. Empty street. Crushed badge in dirt. Pan up to balcony. Snow leopard in long coat, metal eye plate. Crushes second badge without looking. Drops pieces. Text brands: **"IRON EYE" ISABELLA**.*

- **Phase 1 (100-65%):** Locks entire row. High passive block. Moderate attacks.
- **Phase 2 (65-30%):** Warrants on 2 types. Locks need 2 matches to free.
- **Phase 3 (30-0%):** Lockdown — 2 locks + 2 poisons/turn. Massive attacks. Drops block. Damage race.

---

## Run Structure

### Map

Slay the Spire-style branching node map. ~12-15 nodes per act with branching paths.

### Node Types

| Node | Description |
|---|---|
| **Combat** | Gold + 25% consumable chance. No artifact. |
| **Elite** | Pick 1 of 3 artifacts + gold + 25% consumable. Board modifier at start. |
| **Shop** | Buy artifacts, consumables, or **swap** a non-core/non-starter tile. Pricing: consumables < tile swaps < artifacts. |
| **Rest Site** | Choose: **rest** (heal 30% max HP) or **upgrade a tile** (permanent +1 tier for the run). |
| **Event** | Narrative encounter with choices. See Events. |
| **Treasure** | Free artifact. Rare, risky path. |

### Acts

| Act | Tiles | Boss |
|---|---|---|
| 1 — Dusty Trail | 4 (3 core + 1 starter) | "Dusty" Dan McGraw |
| 2 — The Canyon | 5 (+1 from additional pool) | "Copperhead" Cassidy |
| 3 — The Town | 6 (+1 from additional pool) | "Iron Eye" Isabella |

### Between Acts

Choose **1 of 3 tiles** from the additional pool. Already-chosen tiles cannot appear. This is both the reward and the difficulty scaling.

---

## Events

### The Campfire Stranger
*"Cloaked figure at a fire. 'I can make you stronger. It'll cost you.'"*
- **Accept:** -20 HP, upgrade random artifact.
- **Decline:** Heal 10 HP.

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

Multi-step escalation. Stop at any point.

| Depth | HP cost | Artifact chance | Total HP |
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

Target: ~15-20 events (full game), ~4-6 (MVP).

---

## Characters

### Red Panda (MVP)

Small, scrappy, cowboy gear. The underdog. Pixel art with expressive reactions — flinch on hit, grin on big match, hat tip on boss kill.

**Ability:** Deadeye (see Combat). **Exclusive artifact:** Fully Loaded.

### Future Characters (post-MVP)

Different abilities and charge rates. Unlocked via Reputation.

---

## Scoring

Expected run: **~1 hour**.

**Base:** Combat 100, Elite 200, Boss 500, Run complete 1000.

**Bonus:** Gold earned (1/gold), Damage dealt (1/10 dmg), Longest cascade (50/step), Trait breakpoints (100/each), Flawless fights (150/each).

**Multipliers:** Ascension (1.0 + 0.2 x level), Time (1.5x at ≤45 min → 1.0x at 90 min, no penalty past 90).

`Final = (Base + Bonus) x Ascension x Time`

### Leaderboards (post-MVP)

Daily / Weekly / All-Time. Top 10 each. Anti-cheat addressed at implementation.

---

## Meta Progression

**Reputation** earned per run → unlocks: new artifacts in pool, starting loadouts, cosmetics, events, characters. NOT power creep — expands option space.

**Ascension** — cumulative difficulty modifiers after first win. Tiers TBD via playtesting.

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
│   │   │   ├── Player.ts           # Player state + ability
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
│   │       ├── EnemyIntent.tsx
│   │       ├── ArtifactBar.tsx
│   │       ├── AbilityMeter.tsx
│   │       └── AceMultiplier.tsx
│   ├── store/                      # Zustand
│   │   ├── runStore.ts             # Active run state
│   │   └── metaStore.ts            # Persistent progression
│   ├── services/
│   │   ├── supabase.ts             # Client init
│   │   ├── auth.ts                 # Login/signup
│   │   └── saveSystem.ts           # Save/load logic
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

### Performance

- Board on `<canvas>` via Phaser. Never DOM.
- Cascades: iterative scan → clear → gravity → repeat. Batch detection. ~200-300ms per step (tunable).
- Object pooling for tile sprites.
- Phaser owns combat. React owns HUD + menus. Event bus between them.
- Lazy load per act. Texture atlases. <2MB initial bundle.
- 60fps target on 3+ year old phones. Profile on real devices.
- React.memo on HUD. Zustand for out-of-combat state.
- Touch responsive within 1 frame.
- Auto-save to Supabase after every node. Mid-combat saves post-MVP.
- Boss cutscene assets pre-loaded at boss node entry.

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
  ace_multiplier numeric default 1.0,
  crit_chance numeric default 0.0,
  thorns integer default 0,
  smoke_dodge numeric default 0.0,
  map_state jsonb,
  combat_state jsonb,
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

GitHub → Cloudflare Pages (auto-deploy on push) → Supabase backend. **$0.**

---

## MVP Scope

- [ ] Main menu.
- [ ] Start-of-run tile selection (1 of 3 from starter pool).
- [ ] Match-3 board with 4 tiles. Swapping, matching, cascading.
- [ ] Universal resource generation. Per-tile combat numbers.
- [ ] 2 swaps/turn. End early. No-valid-moves = lost turn + reshuffle.
- [ ] 4-match (explosive), 5-match (Showdown), cross clear.
- [ ] Deadeye (3 tiles, 10 charges, carry over, Showdown interaction, draw-fire animation).
- [ ] Crit system (baseline mechanic).
- [ ] Character + enemy animations with priority state machine.
- [ ] 4 Act 1 enemies with block intent.
- [ ] Act 1 boss (Dusty) — phases, block, cutscene.
- [ ] ~20 artifacts across 7 traits.
- [ ] Trait breakpoints.
- [ ] 13 consumables (3 limit, 25% drop).
- [ ] Tile upgrades at rest sites.
- [ ] Branching map (Act 1, ~8 nodes).
- [ ] Combat, elite, shop (artifacts + consumables + tile swaps), rest site.
- [ ] ~4 events.
- [ ] Scoring.
- [ ] Pixel art Act 1 assets.
- [ ] Supabase auth (email + Google).
- [ ] Save/load between nodes.
- [ ] Cloudflare Pages deploy.

### Post-MVP

- [ ] Acts 2-3 (tile count → 5, 6 via between-act choices).
- [ ] Full artifact set (60-80).
- [ ] All additional tiles (Whiskey, Buckshot, Ace, Venom, Ember, Star, Horseshoe).
- [ ] Full event pool (~15-20).
- [ ] Meta progression (Reputation).
- [ ] Ascension system.
- [ ] Leaderboards + anti-cheat.
- [ ] Additional characters.
- [ ] Mid-combat saves.
- [ ] Cosmetics.
- [ ] SFX.
- [ ] PWA offline.
- [ ] Polish (screenshake, particles, juice).

---

## Open Questions

- Exact shop prices (consumables < tile swaps < artifacts).
- Shop stock count per visit.
- Cascade speed tuning.
- Which 3 starter tiles are offered per run — always all 3, or random 2 of 3?
- Ember spread: what happens when it converts a tile that was part of an ongoing cascade?
- Ricochet: does the random tile destruction happen during or after cascade resolution?
- Smoke dodge: does it interact with multi-hit attacks (dodge each hit independently)?
- Star tile: when matching with a type, does the Star count as that type for trait effects (e.g., 4+ bullet match including 2 Stars)?
