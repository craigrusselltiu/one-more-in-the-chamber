# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## v0.4.10

### Added
- Change Name option in Settings (main menu only)
- Changelog button on main menu with scrollable popup

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
