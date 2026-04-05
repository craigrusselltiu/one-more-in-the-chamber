# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

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
