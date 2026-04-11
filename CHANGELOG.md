# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## v0.6.2

### Added
- Charcoal tile: new Special-pool tile. On match deals 1 damage + gains 1 block (flat per match). Cannot be swapped out at the merchant, cannot be upgraded. Flavor: "A piece of charcoal. Somehow makes Fire-type moves more— wrong game."
- Ascension system reworked into discrete per-level mutations (L1–L20, cumulative). Old global HP/damage/gold/price multipliers are gone. Active levels: L1 (+2 elites per act), L2/3/4 (+10% damage to normals/elites/bosses), L5 (80% inter-act heal), L6 (start at 90% HP), L7/8/9 (+10% HP to normals/elites/bosses), L10 (10% shop markup), L11 (−1 consumable slot), L12 (upgraded reward tiles appear less often), L13 (10% less gold), L14 (5% less max HP), L15 (legendary weight 3→1), L16 (extra Charcoal in deck), L17/18/19 (+10% HP and +10% damage to normals/elites/bosses, stacking with L2–L9), L20 (Act 3 final boss spawns with a random Act 3 elite companion).
- Outlaw King now guarantees a Legendary artifact drop on defeat (routed through ArtifactScreen even from a normal combat node)
- Character Select screen redesign:
  - "Starting Artifact" and "Unique Tile" row under the ability description with in-combat-style tooltips
  - "ASCENSION" selector relocated above Back/Confirm, centered, with yellow-outlined label, ← → arrows, and a fixed two-line slot for the per-level mutation description (so the control doesn't jitter as descriptions change length)
  - Seed input de-boxed (bottom-left, bare label + field)
- Cross/L/T match that also contains a 5-in-a-line run now spawns BOTH a Showdown tile (at the intersection) and an Explosive tile (on the line)
- Summon action now supports a `summonFullHp` flag; summons no longer forced to 1/3 HP
- Tumbleweed Golem, Prospector Gone Mad, Hellfire Preacher, Train Guard, and Outlaw King (all acts) gained new cloak/grace/thorns/rageful start-of-fight buffs and firstMove patterns
- Train Guard: first move is always Block 30, Lock 1 row
- Tunnel Rat: first move is always Attack 14, Bury 2
- Final boss + random Act 3 elite companion (ascension L20)
- Tile reward level rolls: between-acts tile select and merchant now roll upgrade levels per offered tile based on the target act (Act 2: 80% Lv 1 / 20% Lv 2; Act 3: 20% Lv 1 / 60% Lv 2 / 20% Lv 3). L12 ascension lowers these to Act 2 90/10 and Act 3 50/40/10.

### Changed
- Buckshot: base damage 1 → 2 per tile
- Vulnerable: +25% damage taken (was +50%, briefly +20%)
- Hint system: board idle-hint trigger delay 15s → 10s
- Enemy bomb default countdown 2 → 3 turns (applies to all enemy-placed bombs including Powder Monkey, Prospector Gone Mad, Mine Cart, Hellfire Preacher, Dusty Dan's initial hazards). Sapper trait's +2 countdown bonus still stacks on top (5 total with both).
- Boss reward artifacts restricted to Rare (25%) / Legendary (75%); commons/uncommons no longer appear after a boss fight
- Prairie Fire spread: triggers once per turn (was per swap), 1-in-4 chance
- Normal enemy HP increased ~15%: Bandit 42→48, Coyote 32→37, Rattlesnake 37→43, Vulture 28→32, Pack Mule 64→66, Powder Monkey 53→67, Mining Canary 37→49, Tunnel Rat 68→84, Prospector Gone Mad 73→104, Train Guard 88→111, Hellfire Preacher 76→97, Hangman 138→159, Corrupt Deputy 120→138
- Elite and boss HP increased ~30%: Tumbleweed Golem 84→109, Dust Devil 72→94, Dusty Dan 188→244, Mine Foreman 123→160, Ore Golem 145→189, Mine Cart 194→252, Copperhead Cassidy 260→338, Saloon Brawler 220→286, Sheriff's Shadow 213→277, Outlaw King (Act 1) 126→184, (Act 2) 196→255, (Act 3) 288→374, Iron Eye Isabella 320→416
- Full enemy moveset rework across all acts — damage numbers, block values, and debuff stacks rebalanced throughout. See docs/ENEMIES.md for per-enemy details.
- Bandit no longer summons other bandits
- Rattlesnake: poison tile counts reduced (Move 2 poison 2, Move 4 poison 4)
- Pack Mule: new moves (Attack 12 / Multi-attack 4x2 + Block 8 / Attack 5 + Bomb 1 + Bury 3 / Heal 7)
- Dust Devil: HP-below-50% trigger is now Multi-attack 1x6 with +2 Rageful (was 2x6 with +4 Rageful)
- Tumbleweed Golem: start of fight now includes Gain 1 Cloak
- Prospector Gone Mad: now starts with 5 Rageful
- Dusty Dan: full moveset pass — Attack 12/Block 12, Attack 9x2/Lock row, Attack 17/Lock column, Block 18/Suppress 3
- Copperhead Cassidy: now starts with 2 Rattlesnakes (full HP, not summoned); multi-attack is now 4x (was 3x); Move 2 now Attack 16/Block 16/Apply 3 Poison; Fool's Gold count 5→8
- Outlaw King (Act 1): 2 summoned Coyotes companion; Attack 19/Block 12; Block 23/Gain 1 Cloak; Attack 22
- Outlaw King (Act 2): 2 full-HP Coyote companions; Attack 24/Block 18; Block 34/Gain 1 Cloak; Attack 31; applies 3 Terrified on start
- Outlaw King (Act 3): 2 full-HP Bandit companions (was Coyotes); Attack 30/Block 24; Multi-attack 9x3/Gain 5 Rageful; Block 42/Gain 1 Cloak; Attack 37; applies 4 Terrified, Gain 2 Cloak on start
- Corrupt Deputy summons 2 full-HP Bandits (was 1/3 HP summoned)
- Act 1 late encounters: "1 Coyote + 2 Summoned Coyotes" is now "2 Coyote + 1 Summoned"
- Act 3 early encounters: added Hangman as a solo early pick
- Act 3 late encounters: now 100% dynamic with "can't both be Hangman or Corrupt Deputy" constraint
- Merchant base tile upgrade distribution nerfed (Act 2: 80/20 Lv 1/Lv 2, Act 3: 20/60/20 Lv 1/Lv 2/Lv 3; was Lv 2/Lv 3 and Lv 3/Lv 4)

### Fixed
- Ascension enemy damage scaling actually works now. Previously `applyAscensionToEnemies` only scaled the `minDamage`/`maxDamage` display fields, which combat never consults — so L2/3/4 "+10% damage" and L17/18/19 "+10% more" had zero effect in practice. The fix walks each enemy's full move library (`moves`, `firstMove`, `hpTriggers`, `forceNextMove`) and scales every `attack` / `multi_attack` action's `value`. Works cleanly at all ascension levels and across cascade triggers like Dust Devil's forced enrage.
- Rageful: now decrements once per attack move, not once per hit. Multi-attacks no longer burn through stacks on hit 1.
- Rageful bonus damage is now reflected in the enemy intent badge (e.g. "2x6" with +4 Rageful shows as "6x6" on the telegraph)
- Cloak now suppresses cascade damage from Deadeye, False Shuffle (Reno), Dust Devil Boots, Prairie Fire spread, Tumbleweed Golem transform, and the dead-board reshuffle (previously only suppressed damage on swap-initiated cascades)
- Deadeye: after the post-shot cascade settles, the board is now reshuffled if no valid swaps remain (cross/L/T explosions could previously leave the board un-swappable)
- Tumbleweed Golem's tile transform now resolves any matches it creates (with full cascade chains)
- Gillie Suit only triggers on a 5+ in-a-line match — crosses/L/T shapes with 5+ total tiles no longer count
- Mine Cart: fuse now explodes immediately when it hits 0 (was delayed by one turn). Fuse also ticks at end of player turn instead of start, so the countdown display correctly shows 5 on turn 1.
- Copperhead Cassidy: heal move now self-applies 2 Vulnerable if there are no poison tiles on the board to clear (previously wasted the move)
- Charcoal tile is now correctly filtered out of the merchant's "swap a tile" offer; it's no longer offered as a swap target or a swap source
- Chain status tooltip wording updated to "Your Chain tiles gain 1 extra damage per stack."

## v0.6.1

### Added
- Cross/L/T match that also contains a 5-in-a-line run now spawns BOTH a Showdown tile (at the intersection) and an Explosive tile (on the line)

### Changed
- Boss reward artifacts are now restricted to Rare (25%) or Legendary (75%); commons and uncommons no longer appear after a boss fight
- Prairie Fire: spread now triggers once per turn (was: after each swap), 1-in-4 chance (was: 1-in-3)
- Vulnerable: now grants +20% damage taken (was: +50%)
- Ability meter positioned slightly lower during combat
- Corrupt Deputy now uses its own sprite instead of reusing the bandit sprite

### Fixed
- Hardened damage cap now correctly applies after Vulnerable (was: before, letting Vulnerable push damage above the cap)
- Crit floating numbers on enemies now show actual HP lost instead of pre-cap damage
- Pierce (Rattler, Rust's Cylinder finisher) now only bypasses block — still respects Vulnerable, Hardened, and Grace (was: ignored all defensive layers)
- Hint effect on buried tiles no longer reveals the hidden tile sprite — shows the sand outline instead

## v0.6.0

### Added

#### Artifacts & traits
- 18 new artifacts: Holy Water, Resurrecting Nails, Dead Man's Bones, Absolution Rounds, Last Breath Tonic, Temperance Flask, Scope Lens, Detonator, Snake Eye, Golden Shovel, High Vis Jacket, Golden Scarab, Burial Rites, Sniper's Eye, Heliograph Shard, Death's Glare, Strong Liver, Golden Pickaxe
- Gunslinger trait breakpoint 6: Lucky deals 2x damage instead of 1.5x

#### Status effects
- Player Vulnerable debuff: take 50% more damage; decrement at end of player turn
- Player Protected buff: immune to tile hazard placement (covers enemy startOfFight hazards too); decrement at end of player turn. High Vis Jacket grants 1 Protected at fight start.
- Enemy Cloak buff: cascade damage is nullified; decrement at end of turn (renamed from Cracked Ground)
- Enemy Thorns buff: deal damage equal to stacks per hit taken; cleared at end of turn
- Enemy Grace buff: negate the next instance of damage taken
- Enemy Hardened buff: incoming damage capped to stack count
- Enemy Fuse buff: countdown timer for Mine Cart (5 turns → 50 damage on failure)
- Enemy Dead Man Walking buff: immune to debuffs (Poison, Vulnerable, Terrified, Blinded, Bounty)
- Enemy Barricade buff: at the start of the enemy turn, retains block instead of clearing; decrement by 1
- Enemy Blinded debuff: enemy attacks deal no damage; decrement at end of turn

#### Enemy AI / encounters
- Encounter bag system: no repeat presets until the bag is exhausted (normals and elites)
- Late normal encounters use a 25/50/25 split: early preset / late preset / dynamic 2-pick
- HP threshold triggers (Dust Devil at 50% gains 4 Rageful and forces a Multi-attack 2x4 next turn; Iron Eye Isabella at 50% enrages)
- Forced next-move system that overrides the next telegraph (used by Dust Devil's enrage)
- Sequential move order flag (Hangman cycles top-to-bottom, then loops)
- `firstMove` override (Dusty Dan, Tunnel Rat, Ore Golem)

#### Enemies & bosses
- Act 2 roster additions: Mining Canary, Tunnel Rat, Ore Golem (starts with 15 Hardened)
- Act 3 roster additions: Hellfire Preacher (Grace start, heal-ally AI), Hangman (sequential, vulnerable-self on big attack)
- Copperhead Cassidy rework: starts with a full-HP Rattlesnake escort; phase transition at 50% HP clears all statuses ("SHED SKIN"), locks every edge tile, multi-attack hits scale with poison tile count, heal-from-poison move clears all poison tiles and heals 2% max HP per tile
- Iron Eye Isabella 50% HP enrage: gains 5 Rageful, 30 Block, 1 Barricade, 1 Cloak, 1 Grace, applies 3 Terrified to the player, sprite swaps to her enraged variant
- Iron Eye Isabella renders at 1.5× sprite scale, with intent icon lifted accordingly

#### Tiles
- Mirage is now upgradeable: each upgrade level adds +1 to the level of the tile it transforms into

#### UI / polish
- Sprite outlines on artifact bar icons tinted by rarity color
- Artifact tooltips now show keyword descriptions below the artifact info
- Enemy name shown via sprite-hover tooltip (replaced always-on name text)
- Train Guard, Hangman, and Corrupt Deputy now use their own sprites instead of the bandit placeholder
- Character selection remembered between sessions
- Background images for leaderboard, reputation shop, victory/defeat screens
- Event screen now uses the current act background
- "Coming Soon" placeholder on the Reputation Shop screen is now large/centered
- docs/EVENTS.md documents all 16 events
- docs/ENEMIES_OLD.md preserves the pre-v0.6.0 enemy definitions for diffing

### Changed

#### Balance
- Complete Act 1 rebalance: Bandit 42 HP, Coyote 32 HP, Rattlesnake 37 HP (Block 8), Vulture 28 HP, Pack Mule 64 HP, Tumbleweed Golem 84 HP (Gain 2 Thorns + Transform 5 tiles), Dust Devil 72 HP (Bury 8 + Gain 1 Cloak start), Dusty Dan 188 HP
- Complete Act 2 rewrite: Powder Monkey 53 HP, Mining Canary 37 HP, Tunnel Rat 68 HP, Prospector Gone Mad 73 HP, Mine Foreman 123 HP, Ore Golem 145 HP, Mine Cart 194 HP (5-turn fuse, 50 damage on failure), Copperhead Cassidy 260 HP
- Complete Act 3 rewrite: Train Guard 88 HP, Hellfire Preacher 76 HP, Hangman 138 HP, Corrupt Deputy 120 HP, Saloon Brawler 220 HP, Sheriff's Shadow 213 HP, Iron Eye Isabella 320 HP
- Train Guard "Attack 4, Block 6" move now also applies 2 Vulnerable
- Sheriff's Shadow max block move reduced 25 → 24
- Hangman move 3 block value 8 → 18
- Act 3 Late "1 Corrupt Deputy" preset now also includes 1 Coyote
- Act 2 Late dynamic encounters can no longer roll two Prospectors Gone Mad
- Reno's Coin now overrides the chip bucket to 6 hit / 2 miss instead of an independent re-roll
- Tinker's Wrench now only spawns explosives from non-cascade 3-matches
- Rust's Cylinder last shot now deals 7 base damage plus 1 per Bounty stack
- Duel reworked: always deals damage, exactly 4-match deals damage twice (two separate hits)
- Prairie Fire reworked: after each swap, each tile has a 1-in-3 chance to convert 1 adjacent or diagonal tile to Prairie Fire (8-way spread); resulting matches resolve cascades and continue the combo
- Dust Devil row shuffle now reshuffles until no matches are created (matches out-of-moves reshuffle behavior)
- Thorns reworked: deals damage equal to stacks per hit, cleared at end of turn (was reflect full damage, consumed on trigger)
- Bombs start with a 2-turn timer (was 3)
- High Vis Jacket effect text updated: "At the start of combat, gain 1 Protected"

#### Mechanics
- Enemy block now cleared at the start of the enemy turn (Barricade retains it)
- Player Terrified decrements at end of player turn (was end of enemy turn)
- Suppress tiles no longer cleared by matching adjacent tiles
- `player_terrified` and `terrified` consolidated into a single status type
- Renamed `gain_terrified` move action to `apply_terrified` for consistency with `apply_vulnerable`
- Cracked Ground renamed to Cloak

#### UI / assets
- Main menu buttons smaller; artifact bar gap reduced
- Background images reorganized into `assets/backgrounds/`
- Sprite picker grid layout matches the underlying spritesheet

### Fixed
- Enemy Rageful now buffs the enemy (was incorrectly buffing the player)
- Vulture's Terrified now applies to the player (was a no-op)
- HP triggers now actually fire (e.g. Dust Devil gains 4 Rageful below 50% HP)
- Coyote always summons when alone
- Dusty Dan's first move is now always Summon 1 Bandit + Summon 1 Coyote
- Dusty Dan gravity shift no longer fires twice per turn
- Hangman `startOfFight` Terrified application now fires (the inline whitelist was missing the apply_terrified case)
- Enemy Blinded / Terrified stacks no longer decrement before the enemy acts (single stacks now correctly apply on the turn they are active)
- Enemy block no longer doubled by the legacy executeIntent path
- Boss summons now use the full moveset instead of legacy empty minions
- Death's Pocket Watch block now survives the end-of-turn reset
- Trapper's Snare, Gravedigger's Shovel, and Golden Shovel now trigger when buried tiles are revealed by matching (not just by the Tracker trait)
- Prairie Fire matches after a spread now resolve cascades and continue the combo
- Dust Devil Boots matches continue the combo counter from the main cascade
- Suppress tiles now render with a grey breathing overlay effect
- Target outline only appears on the enemy sprite, not the shadow
- Enemy intent icons use STATUS_FRAMES / HAZARD_FRAMES directly instead of duplicating in INTENT_FRAMES
- Chain-destruction match SFX volume lowered (double-showdown, showdown clear-all-of-type, ricochet-into-showdown) so high-volume cascades no longer wall-of-sound the mix

### Removed
- All legacy enemy AI code
- Elite modifier system (Dust Storm, Quicksand, Narrow Canyon, Cloak modifiers — Cloak is now an enemy buff, not a modifier)
- Card Shark, Phantom Rider, Dynamite Duchess, Cave Bat, Canary Swarm, Dynamite Outlaw enemies
- Legacy boss minion creation (`createBossMinion`)
- `docs/SPEC.md` (outdated; superseded by topic-specific docs)

## v0.5.5

### Added
- Structured moveset system: each enemy has an explicit list of moves with multi-action support
- Intent icons: enemy intents display as sprite icons with number badges instead of text
- New enemies: Pack Mule (Act 1 normal), Dust Devil (Act 1 elite)
- Early/Late encounter system: encounters differ based on map position within an act
- Start-of-fight actions for enemies (e.g. Rattlesnake poisons 3 tiles at combat start)
- HP threshold triggers for enemies (e.g. Dust Devil gains Rageful below 50% HP)
- TraitRow: traits now display in the top bar (right side) across all in-run screens

### Changed
- Complete enemy data rewrite matching ENEMIES.md definitions
- Encounter rolling uses preset bags for early nodes, dynamic picks for late nodes
- Summoned enemies use 1/3 HP of their base definition
- Seed text moved to bottom-left corner
- ArtifactBar and TraitRow limited to 48% screen width with wrapping

## v0.5.4

### Changed
- Suppress hazard now shows as desaturated (gray tint) tile instead of overlay VFX
- Reputation Shop re-enabled with "Coming soon" placeholder
- Board reshuffles at turn start if no valid moves available

### Fixed
- Dust Devil Boots now resolves matches and cascades after shuffling bottom rows
- Chain tile upgrade text restored (was missing from upgrade screen)

## v0.5.3

### Changed
- Suppress (warrant) reworked from board-level tile type suppression to per-tile hazard with gray VFX overlay
- Suppressed tiles are now cleared by matching adjacent tiles (like locks)
- Enemy suppress intents now place 3 suppress hazards on random tiles
- All Act 1 enemy HP reduced by ~36%: Coyote 15, Rattlesnake 24, Bandit 27, Vulture 19, Tumbleweed Golem 46, Card Shark 27
- Dusty Dan boss HP reduced to 173 (was 216)
- Ascension level remembered between runs
- Event artifact buttons reordered (Skip left, Take right)

## v0.5.2

### Changed
- Tumbleweed Golem base HP doubled (36 -> 72)

### Fixed
- Legacy saves with 'treasure' map node type now migrate to 'artifact' on load

## v0.5.1

### Fixed
- Ricochet bonus tile destruction animation reduced from 150ms to 50ms for snappier shots
- Ricochet tile destruction now plays match destruction sound

## v0.5.0

### Added
- Rattlesnake trait with breakpoints at 2 and 4
- Shadow tile augment with dark purple VFX overlay and idle particles
- Chain player buff: stacks per Chain match, adds bonus damage per Chain tile
- Ready player buff: next non-cascade attack deals 50% more damage
- Terrified enemy debuff: deal 50% less damage, stacks decrease at end of turn
- Poison keyword consolidating old Venom/Venomous into a single mechanic
- 45 artifacts with full runtime implementations
- Keyword tooltips on individual keywords (hover to see description) across all screens
- Artifact rarity system with colored names and animated gradient text effect
- Artifact trait tooltips on hover in artifact and merchant screens
- Sprite shadows behind player and enemy characters
- Elite reward resume: quitting after elite victory correctly returns to artifact screen
- Merchant stock persistence: quitting mid-shop preserves purchased items
- Character select screen overhaul with dynamic backgrounds and tab-style character buttons
- Tile selection background, Act 3 combat background, boss-specific backgrounds
- Map parchment background, crate background, board background
- Map slide-in animation with bounce when entering a new act

### Changed
- Renamed Treasure screen to Artifact screen; map node label now shows "Artifact"
- Renamed Venom tile to Waste; consolidated Venom/Venomous keywords into Poison
- Renamed Reno's ability from "Shuffle the Deck" to "False Shuffle"
- Unified Lock and Hardened Lock into a single Lock system with hit counts
- Chain tile reworked: removed scaling, now grants Chain buff stacks
- Sheriff breakpoint 2 now triggers once per combat (was per turn); breakpoint 4 grants 4 Sturdy (was 5)
- Dead Man Walking breakpoint 5 triggers at or below 20% HP; breakpoint 7 heals 20% max HP
- Undertaker breakpoint 6 grants 1 Ready on enemy kill
- Antivenom breakpoint changed from 1 to 3; old breakpoint 4 moved to Rattlesnake
- Complete artifact overhaul: removed ~50 legacy artifacts, updated all effects and tags
- All enemy base HP increased by 20%; boss HP increased by 44%
- Merchant prices increased by 10%; tile upgrade cost raised to 300g
- Tile swap screen overhauled with side-by-side layout
- Floating status text now shows full names (RAGEFUL, POISON, etc.) at smaller size
- Ricochet shots now fire simultaneously instead of sequentially
- Enemy HP bars update immediately after each attack and poison tick
- Bomb explosions play block/hit sounds appropriately
- Tile selection cards widened with more padding

### Fixed
- Ricochet tiles destroyed by explosions/showdowns no longer trigger their destroy behavior
- Ricochet properly triggers explosive and showdown tiles
- Merchant stock no longer re-rolls when buying artifacts or swapping tiles
- Legacy saves with 'venom' tile type automatically migrate to 'waste'
- Tooltip z-index fixed to render above card stacking contexts via portal

## v0.4.17

### Added
- Ascension level indicator in top bar center (hidden at ascension 0)

### Changed
- Run timer only ticks during active gameplay (pauses on menus)
- Chip tile uses marble bag (3 hits / 3 misses per 6 draws) instead of pure random

### Fixed
- Boss fight save/load no longer allows infinite treasure exploits
- Continuing a run after boss victory correctly resumes at treasure or tile selection
- Shuffling the board no longer removes bury (sand) visuals from tiles

## v0.4.16

### Changed
- Artifact tooltips show Name (Tags), Effect, and Flavor on 3 single lines with capitalized tag names
- Wanted Flyer text: "Apply 2 Vulnerable to target enemy." with keyword tooltip

### Fixed
- Merchant purchases now persist across main menu / refresh (sold-out items stay sold)
- Summoning an enemy no longer shifts the player's target
- Infinite loop crash in MerchantScreen from unstable Zustand selector
- Boss enemies no longer have ascension HP scaling applied multiple times on save/load

## v0.4.15

### Added
- Consumable and artifact sprites in merchant screen
- Keyword highlighting in consumable tooltips (combat HUD and merchant)
- Act 2 combat background (act2_bg)

### Changed
- Tonic renamed to Moonshine (display only, save-compatible)
- Wanted Flyer effect text: "Apply 2 Vulnerable to target enemy."
- Removed Moonshine (2x match), Barbed Wire, and Smoke Bomb consumables
- Removed colored category backgrounds from consumable slots

### Fixed
- Merchant node no longer auto-completes when viewing map overlay from merchant

## v0.4.14

### Added
- Sniper trait: (4) on 5-match, gain 1 swap for that turn
- Dead Man Walking trait: (3) take 1 less damage, (5) below 20% HP doubles damage, (7) survive lethal with 10 HP + 20 block

### Changed
- Outlaw trait reworked: (2) killing enemy grants 1 Rageful, (5) boss start: 3 Rageful + 2 Vulnerable to all
- Prospector trait reworked: (2) any match 20% gold, (4) gold gain deals 1 damage, (6) +10% gold as extra damage
- Sapper trait simplified: (1) enemy bomb timers +2, (5) explosive radius +1
- Saloon Keeper threshold changed: (5) random consumable at combat start (was 4)
- Reno's Coin reworked: hit chance 50% → 75%, damage doubled, flat 1 HP on miss (no escalation)
- Rigged Deck reworked: chip hits have 50% chance to hit another enemy; misses still generate 2 gold
- Rigged Deck tag changed from Desperado to Prospector
- Chip base damage increased from 5 to 6
- Double showdown swap delay reduced from 100ms to 20ms
- Leaderboard now shows which character (Rust/Reno) was used for each score

## v0.4.13

### Added
- Tile resolve ordering system: tiles resolve in priority order (buffs > block > healing > damage > scaling > utility)
- Shed Skin artifact now functional: once/fight survive lethal damage with 1 HP
- Split CONTENT.md into TILES.md, TRAITS.md, ARTIFACTS.md, ENEMIES.md

### Changed
- Lucky crit multiplier reduced from 2x to 1.5x
- Gunslinger trait reworked: (2) gun tiles +1 damage per tile, (4) gain 1 Lucky per gun tile matched
- Sheriff trait reworked: (2) first block gain each turn doubled, (4) gain 5 Sturdy at combat start, (6) block reflects damage
- Rust's Cylinder last shot damage reduced from 2 to 1 per Bounty stack
- Reno ability charge threshold increased from 4 to 5
- Outlaw King nerfed: 120 HP → 90, 25-35 dmg → 20-28
- Rigged Deck tag changed from Desperado to Prospector
- Gold float numbers driven by GOLD_CHANGE event (auto-float, no manual calls)

## v0.4.12

### Changed
- Whiskey tile base heal increased from 1 to 2 HP per 3-match
- Saloon adjacency now generates base (Lv0) resources instead of upgraded
- Gold floats appear next to the top bar gold indicator, drift right and fade
- Floating numbers render above the top bar (z-index fix)
- Battery, Whiskey, Saloon upgrade text shows inline value instead of confusing "plus X"
- Preload all background images (campfire, merchant, treasure, main menu) during loading screen

### Fixed
- Bamboo Canteen post-combat heal now updates the HP bar
- Map node stuck bug: screen wipe race condition could skip marking non-combat nodes as completed
- Safeguard: non-combat nodes auto-complete if visited but stuck incomplete on map
- Safeguard: unknown node types on Continue mark completed instead of soft-locking
- Save migration: old saves with "shop"/"rest" node types auto-migrate to "merchant"/"campfire"

## v0.4.11

### Added
- Treasure background image on treasure screen

### Changed
- In-run shop renamed to "merchant" throughout code, map nodes, and UI (title: "GENERAL MERCHANT")
- Rest site renamed to "campfire" throughout code, map nodes, and UI
- ShopScreen.tsx → MerchantScreen.tsx, RestSiteScreen.tsx → CampfireScreen.tsx
- Treasure screen: removed subtitle, more opaque artifact card and buttons

## v0.4.10

### Added
- Change Name option in Settings (main menu only)
- Changelog button on main menu with scrollable popup
- Campfire background image on rest site screen
- Shop background image (merchant_bg)

### Changed
- Screen titles (shop, campfire, event, treasure, score) are bold, uppercase, with black outline
- Ricochet upgrade text uses arrow format (e.g. "Destroy 1 → 2 tiles") with plural handling
- Version label now reads "Pre-alpha v..."
- Shop and campfire cards more opaque for readability
- Shop and campfire background images darkened with overlay

## v0.4.9

### Added
- Bury (sand) visual rework: buried tiles show sand sprite with breathing "?" overlay
- Sand-colored particles on bury clear
- Bury hazard sprite in spriteConfig

## v0.4.8

### Changed
- Bamboo Canteen and Rigged Deck are now character exclusive

## v0.4.7

### Added
- Saloon Keeper trait (2: consumables heal 5 HP, 4: random consumable at combat start)
- Desperado and High Roller trait tags
- Reno's Coin artifact (renamed from Double Down, tags: Desperado + High Roller)
- Rigged Deck: Reno starting artifact (Chip misses generate 2 gold)
- Reno now gets Rigged Deck as starting artifact
- Hit SFX on direct HP damage (debounced)
- Block SFX on shield absorption
- Ability ready SFX when charge reaches threshold
- Alt music tracks: 3 variants per act, 2 elite themes
- Tumbleweed Golem enemy sprite

### Changed
- Gold tile: 1 gold per tile (was 2)
- Bamboo Canteen: tags changed to Saloon Keeper only, not character exclusive
- Stacked Deck (formerly Rigged Deck): crits give 5 gold

## v0.4.6

### Changed
- Combat HUD: swaps/end turn above player, ability bar + traits below player
- Ability bar: 128px wide, name label above, breathing READY text below
- Traits section hidden when no artifacts, independently positioned
- Pre-boss row has 2-3 rest sites instead of 1
- Reputation Shop disabled on main menu

### Fixed
- Rattlesnake(1) trait now grants immunity to poison tile venomous stacks
- Trait tooltips show above icons (were clipped at bottom edge)

## v0.4.5

### Fixed
- Stick of TNT killing last enemy now ends combat (missing await on async call)

## v0.4.4

### Added
- Card Shark enemy sprite

### Fixed
- Tumbleweed consumable now resolves matches after shuffle (was skipping cascades)

## v0.4.3

### Added
- Act 1 enemies: Tumbleweed Golem, Card Shark
- Act 2 enemies: Powder Monkey, Mine Foreman, Canary Swarm
- Act 3 enemies: Hangman, Phantom Rider, Dynamite Duchess, Sheriff's Shadow, Outlaw King (elite)
- Saloon Brawler now elite-only in Act 3

### Changed
- Max campfires per map: 1 pre-boss + 2-3 elsewhere (was 2 + 3-4)

## v0.4.2

### Fixed
- Swap counter flickering "SWAPS /" during resolution (removed spurious event)
- End Turn button stays visible but disabled during resolution (was disappearing)

## v0.4.1

### Changed
- Swap counter and End Turn button moved under player character
- Swap counter shows "SWAPS 1/3" with black outline
- "TRAITS" label above trait icons
- Reputation Shop disabled on main menu

## v0.4.0

### Added
- Alt combat music tracks (50/50 chance per non-boss encounter)
- Mirage transformed tile entry in Tiles popup (greyed out, with tooltips)
- Mirage replacement type persists in combat snapshot
- Consumable left-click dropdown with Use/Discard options
- Artifact sprite icons in artifact bar (Bamboo Canteen, Rust's Cylinder)

### Changed
- Renamed Fully Loaded to Rust's Cylinder (Gunslinger + Outlaw tags)
- Bamboo Canteen tags: Outlaw + Saloon Keeper
- Bounty: upgrade now +1 stack per tile per level (was flat +2)
- Bounty kill gold moved to Bounty keyword tooltip
- Bounty Hunter trait removed; effects moved to Bounty tile and Rust's Cylinder
- Lucky stacks no longer consumed on crit
- Lucky tooltip: "1% chance per stack to deal double damage. (max 50)"
- Lucky floating text shows "+15 LCK" instead of "+15% LCK"
- Gold floating text shows "+Xg" suffix
- Tiles popup title is yellow
- Deadeye cancel restores charges when no shots fired

### Fixed
- Wipe animation race condition causing board not to load after campfire
- ConsumableSlots infinite re-render loop (moved store selector to parent)

## v0.3.9

### Changed
- Bounty Hunter trait label: "The Bounty Hunter"
- Bounty tile description updated to match behavior (1 stack per tile)

### Fixed
- Board not loading after campfire: wipe animation race condition
- Phaser scene.start data loss workaround (module-level fallback)
- Bounty Hunter trait descriptions in tooltip (was showing "Breakpoint 1/2")
- Bounty Hunter and Saloon Keeper sprite config entries

## v0.3.8

### Changed
- Ricochet rework: destroy 1 tile per 3-match + 1 per extra (was per-tile), upgrade adds flat bonus
- Map node positions have slight random jitter for organic look

### Fixed
- Reverted perf changes that didn't help (HSL optimization, enemy state cache)

## v0.3.7

### Added
- Right-click consumables to discard them (context menu)
- Character-exclusive artifacts: Fully Loaded (Rust), Double Down (Reno)

### Changed
- Prairie Fire description: "Each tile has a 50% chance..."
- Act 3 boss no longer drops treasure (goes straight to score)
- Incomplete map nodes are retryable (fixes boss hard-lock retroactively)
- Incomplete current nodes don't show gold glow on map

### Fixed
- Boss hard-lock: re-enter combat instead of corrupting node state
- Map node visual: incomplete nodes breathe instead of showing visited glow

## v0.3.6

### Fixed
- Enemies no longer shift slots when another enemy dies (summons replace dead slots)
- Visited-but-incomplete nodes (boss/combat) are retryable on the map (fixes hard-lock)
- Works retroactively for existing hard-locked runs

## v0.3.5

### Changed
- Shop upgrade screen matches campfire layout (full-screen, 4-column grid, select+confirm flow)
- Campfire upgrade grid uses 4-column layout

### Fixed
- Consumables (Stick of TNT, Snake Oil) killing the last enemy now ends combat
- Upgrade tile grid overflowing at 4+ cards

## v0.3.4

### Changed
- Shop upgrade card opens full upgrade screen (select, confirm, back to shop)
- Leaderboard shows top 100 instead of 10
- Cactus Spine Vest: "Enemy attacks apply 1 Venomous to them."

### Fixed
- Boss/combat node hard-lock: defer marking visited until combat starts
- Safeguard: reset visited combat nodes with no snapshot on continue

## v0.3.3

### Added
- Global version label on all screens (moved from MainMenu to App)
- Upgrade preview tooltips with orange-highlighted changes (arrow transitions and bonus previews)
- Breathing pixel outline VFX for targeted enemies
- Rattlesnake and Dusty Dan enemy sprites

### Changed
- Shop tile tooltips now show only keywords + upgrade text (matching tile selection screen)
- Upgrade picker widened to 4 columns to fit 7+ tiles
- Campfire upgrade tooltips use same upgrade preview format
- Default music volume reduced to 25%
- Upgrade SFX plays twice (400ms apart)

### Fixed
- Enemy targeting resetting after each swap (alive-index mismatch)
- Locked tiles changing type during reshuffle
- Mirage tiles appearing during reshuffle instead of transformed type
- Reshuffle no longer generates new tiles (swap-based match breaking)
- Flash lines and floating numbers targeting correct zig-zag enemy positions
- Dead enemies blocking summon UI slots
- Crit floating number showing post-block damage instead of full crit damage
- Chip MISS text shows on enemy instead of player
- Browser focus outline on enemy cards
- Cursor reverting to system cursor on enemy hover

## v0.3.0

### Added
- Act 1 enemy sprites: coyote, bandit, vulture (Dusty Dan reuses bandit sprite)
- Bounty Hunter trait (Rust exclusive, 2 breakpoints): bounty kill gold (tier 1), last deadeye shot targets enemy for 2x bounty stacks damage (tier 2)
- Bamboo Canteen: Rust starting artifact, restores 6 HP after combat
- Saloon Keeper trait tag (for future use)
- Cancel button for Deadeye: retain charges if unused, reset to 0 if partly used
- Animated board reshuffle: tiles scale down, shuffle, scale back up
- Crit floating numbers display larger with exclamation mark (e.g. "-30!")

### Changed
- Lucky: 1% crit chance per stack, capped at 50 stacks max
- Bounty: simplified to 1 stack per tile (was 2 per 3-match + 1 per extra)
- Bounty keyword: "When applying this or taking damage, if HP is lower than Bounty stacks, die."
- Bounty kill gold moved from base mechanic to Bounty Hunter(1) trait
- Fully Loaded artifact: tags updated to Bounty Hunter + Outlaw
- Reno's Shuffle the Deck reworked: instant reshuffle, no hold mode
- Ability charges capped at threshold (excess charges discarded)
- Board reshuffle preserves tile effects (explosive, showdown, bomb, poison)
- Locked tiles excluded from reshuffle

## v0.2.0

### Added
- VFX outline effect on special tiles (showdown, explosive, bomb, poison)
- Title logo on main menu with welcome message
- Dynamic tile descriptions with green-highlighted upgrade values
- Shop redesign: card layout with Artifacts, Tiles, Consumables, Upgrade sections
- Shop tile levels scale by act (Act 2: Lv2/3, Act 3: Lv3/4)
- Shop upgrade card (250g, once per shop)
- Boss defeats award artifact reward before tile select
- Seeded runs: same seed produces same map, shops, events, tiles, encounters
- Seed input on character select, seed indicator in top bar (click to copy)
- Player name prompt on first visit, used for leaderboard
- Supabase leaderboard integration (anonymous, no auth required)
- Hint system: valid move tile pulses white after 15s of inactivity
- SFX: gunshot for deadeye, campfire, treasure, UI hover/click sounds
- Custom crosshair cursor for deadeye, bullet hole at pointer position
- Blur background behind game area for non-16:9 displays
- Give Up confirmation dialog

### Changed
- Centralized tile destruction system: all destruction flows through Board.destroyTilesWithEffects()
- Ricochet rework: 1 damage + destroy (1+upgrade) tiles per tile matched
- Buckshot: per-tile random enemy targeting
- Tile descriptions use "per 3-match plus X" wording for upgrade clarity
- Board tile spacing increased to 38px for VFX outline clearance
- Map nodes use brightness filter instead of transparency for unreachable nodes
- Boss map node icon 2x size
- Campfire renamed from "Rest" in UI
- Campfire/upgrade screens use sprite icons
- Map performance: O(1) node lookups, manual dimming instead of ctx.filter

### Fixed
- Double explosive swap now chain-detonates caught explosives
- Double showdown swap clears tiles sequentially (100ms delay L-to-R T-to-B)
- Deadeye explosive chain detonation
- Locked tiles excluded from reshuffle and valid move checks
- Treasure double-click giving multiple artifacts
- Shop/event/treasure content no longer rerolls when exiting to main menu
- Continue from main menu resumes shop/campfire/event if not completed
- ServiceWorker 404 on GitHub Pages subpath deployment
- Consumable tooltip z-index behind artifact row

## v0.1.0

### Added
- Core match-3 combat system with 8x8 board, swap mechanics, and cascades
- Two playable characters: Rust (Deadeye ability) and Reno (Shuffle the Deck)
- Three-act campaign with map navigation, shops, campfires, events, treasures
- 25+ tile types with unique mechanics (damage, block, gold, status effects)
- Tile upgrades at campfires
- Explosive (4-match) and Showdown (5-match) special tiles
- Enemy encounters with AI, status effects, and boss fights
- Artifact and consumable systems
- Trait system with tag-based breakpoints
- Reputation meta-progression shop
- Score screen with detailed breakdown
- Settings: game speed, volume, screen shake, animations
- Pixel art sprite rendering with integer scaling
- Music and SFX system
- IndexedDB persistence for runs, meta, scores
- Mid-combat save/restore
