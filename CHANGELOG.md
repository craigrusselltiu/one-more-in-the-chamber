# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## v1.2.0

### Changed
- Updated the visible alpha version to v1.2.0.
- Updated Act 2 encounter presets and Copperhead Cassidy's poison-focused boss pattern.

### Fixed
- Iron Eye Isabella now uses her full boss move set, including buried tiles, poison tiles, and bombs.

## v1.1.0

### Added
- Added placeholder entries for future playable characters: Rudy, Reap, Rita, and Riff (priced at 999,999 in the Reputation Shop).
- Added pre-run character dialogue for the new characters.
- Tutorial overlay system now supports `viewportSpotlight` anchoring directly to screen edges (supporting `vCenter`, `hCenter`, and `applyScale`).

### Changed
- Removed outdated "Coming soon" character tabs and replaced them with integrated (but locked) character slots.
- Adjusted character select tutorials to anchor perfectly to the left edge of the viewport.
- Removed outdated tile powerup tutorials, keeping only shadow and explosive.
- Made the main menu music track slightly louder.
- Decreased the volume of the ability ready sound effect.
- Standard action buttons across all screens now have bold text for improved readability.
- Victory and defeat score screens now show the same translucent dim overlay used by other in-run screens for foreground readability.
- Status effect tooltips on edge-aligned HUD icons (player and enemy panels) can now extend across the full window instead of being clipped at the 960x540 UI bounds, matching how artifact bar tooltips behave.
- Tile names in the Tiles popup now use a more saturated amber so they no longer read as yellow.
- The combat Settings popup title is now larger and uses the title font, matching the Tiles popup heading.

### Fixed
- Missed attacks (Twin Revolvers' 10% miss, Chip's 50% miss) no longer consume Ace stacks.

### Removed
- Pre-1.0.0 changelog history (kept the file focused on the current release line).

## v1.0.9

### Added
- Added Cascade keyword: "Indirect matches that happen after swap." -- referenced by artifacts, tiles, and consumables.
- Added Riverbed to the main menu background pool.
- Locked character slot now previews Rudy's silhouette and label instead of the placeholder.

### Changed
- "Signed In" indicator on the main menu is mixed-case (no longer all-caps) and nudged inward.
- Tooltips with wide content (e.g. tile popup entries with keyword tooltips like Shank, Bounty) now clamp to the window edge instead of the host container, so they no longer get pulled left of the trigger when the popup is narrower than the tooltip.

## v1.0.8

### Added
- Added Rudy character notes and background art.
- Added combat effects for bomb detonations, player shots, and Deadeye shots.
- Main menu visits now randomly pick one of five new backgrounds (church, mine, overlook, town, train) and re-roll on each return.
- Translucent dim overlay over reputation shop, customize, ledger, leaderboard, combat, map, campfire, merchant, tile-select, and event backgrounds for foreground readability.
- Top bar, artifact row, and trait row now stretch to the viewport edges and anchor to the top of the screen.
- Map popup background now extends to the entire screen with the crate art and a dim layer behind the map.
- Character-select background now uses the selected character's full-screen art and updates live on selection.
- Character-select character buttons now anchor to the actual viewport's left edge.

### Changed
- Top bar dark overlay alpha unified to 0.4 across every popup (settings, tiles, changelog, merchant, starter, sign-out, kickout, sync).
- SEED indicator and version label are slightly more transparent.
- Enemy target outline is one pixel thicker; the breathe pulse now runs from 0.5 to 1.0 opacity.
- Loading screen, version label, seed indicator, and main-menu Sign-In / Login button anchor to the actual viewport, not the scaled UI.
- Login button (and Sign-In label) is 1.5x larger.
- Refined tooltip, title, and button label styling across the UI.
- Updated the main menu title art, welcome message placement, and button layout.
- Updated Rust and Reno character notes to match their current kits.

### Fixed
- Merchant's Token is now event-only -- it no longer appears in the regular artifact reward pool.
- Tile popup tooltips were missing after the overlay refactor (data-tooltip-root now propagates through FullScreenOverlay).
- Tooltip auto-flip no longer oscillates inside short host containers (now checks the actual window bounds).
- Leaderboard scroll-to-bottom no longer spazzes (added min-h-0 + overscroll-behavior contain on the scroll area).
- Bones screen no longer renders without a background (folder lookup corrected).
- Spark, ability, and coins effect sheets now use the correct 64x64 frame size; the previous 32x32 setting split each frame into four offset quadrants.
- Bomb explosions now show floating damage numbers on the player.
- Fixed duplicated screen backgrounds after the full-window background scaling update.
- Cleaned up build warnings from font loading, UI sound imports, and production chunk sizes.

### Removed
- Blood splatter and heal HUD effects (and their preloaded sprite sheets).
- Old `main_menu_bg.png` / `main_menu_bg_alt.png` files.

## v1.0.7

### Added
- Added Merchant's Token, an artifact that makes the next merchant 25% cheaper and disables after use.

### Changed
- Polished menu, shop, leaderboard, and popup UI styling.
- Updated the Travelling Preacher event text and choices.
- Golden Hunger now replaces other corruption with Greed and grants Greed's gold only once.
- Train Wreck now grants a Merchant's Token instead of an invisible merchant discount.
- Merchant discounts, sales, and surcharges now stack additively and show adjusted prices in the shop.
- Between-act tile selection now happens at the start of the next act, so the map popup and act label show the new act.
- The Ledger now includes discovered traits and shows artifact traits in artifact entries.
- Broom now clears Tumbleweed and Fake Coin tiles, then resolves any resulting cascades.
- Victory and defeat score screens now use updated subtitle styling and smaller score breakdown text.
- Defeating the Outlaw King now grants a score bonus.

### Fixed
- Existing Charcoal tiles now transform into Obsidian when continuing a combat save at Lv 10.
- Shadow tiles now fire their shadow bolt when destroyed by Deadeye, explosions, and other special clears.
- Starter reward choices can no longer be applied more than once from rapid clicks.
- Milk and Mirage transformations now appear correctly in the combat tile popup.
- Copperhead's Fake Coin move now resolves any matches it creates.
- Shadow bolts and Barkeep's Shotgun now hit the targeted enemy.
- Bounty executions now count their Bounty stacks toward damage score.
- Cheese, Fake Coin, and Showdown tiles now appear in the Ledger when first created.

## v1.0.6

### Fixed
- Charcoal now transforms into Obsidian at Lv 10 and keeps its level.

## v1.0.5

### Changed
- Greed now enters the artifact pool after the Bones encounter if the player didn't pick it.

### Fixed
- Locked tiles now participate in matches again; matching a locked tile decrements its lock instead of destroying it.
- Board reshuffle now correctly detects and breaks matches involving locked tiles.
- Tile swap highlighting no longer shows incorrect tiles when locked tiles are adjacent to valid moves.
- Trait breakpoint tooltips now match their implemented effects.
- Hints and no-move reshuffles now ignore locked tiles correctly.
- Golden Hunger can no longer grant more than one Greed corruption.

## v1.0.4

### Changed
- Bones now appears after the first tile selection instead of before it.
- Updated several Bones rewards: Bone Tax costs more max HP, Supply Satchel gives more consumables, Big Bones heals, and Trade Up only offers additional tiles.
- Updated event rewards and costs to match the latest event balance.
- Updated event text highlights, including new shimmer effects.
- Added the BoldPixels title font.
- Deadeye now lowers combat music volume instead of pausing it, and its activation sound is quieter.
- Enemy sprites now flash red and white when they take damage.
- Moved the combat board slightly lower.
- Player-to-enemy damage lines are now amber without a black outline.
- Powder Monkey now places fewer bombs.
- Hover sounds now play across clickable UI, excluding map nodes and enemies.
- Bones now only gives his sendoff line after the player chooses a reward.
- Enemy death now flashes red and white before turning to dust, except for summoned enemies cleaned up at fight end.
- Reno now switches to his False Shuffle active frame while his ability resolves.
- Improved combat board performance during cascades and animated tile effects.
- Increased Act 3 enemy health.
- Updated Saloon Brawler attacks and Obsidian tooltip text.
- Improved combat performance in board checks, HUD floats, and enemy death effects.
- Updated Death's Glare to grant Ready and made Ready stacks consume one at a time.

### Fixed
- Enemy death dust now reliably clears after the death animation.
- Poison damage no longer triggers the enemy hit flash.
- Targeting now stays on the current enemy when another enemy dies.
- Changelog popup version headers and scrolling display correctly.

## v1.0.3

### Changed
- Milk now grants less block early, scales more cleanly with upgrades, and transforms into Cheese on turn 5 instead of turn 4.
- Milk's flavor text now reads "Yummers!"
- Activating Deadeye now plays both the revolver cock and Deadeye activation sounds.
- Cancelling Deadeye now plays the holster sound.
- Deadeye can no longer be cancelled for about 1 second immediately after activation.
- Rust now switches to a dedicated Deadeye stance frame while Deadeye is active.
- Combat music now fades out and pauses while Deadeye is active, then fades back in when Deadeye ends.

### Fixed
- Passive Thorns damage no longer triggers the player hit feedback when it is fully absorbed by block.

## v1.0.2

### Changed
- Bones no longer appears at the start of a run until the player has beaten the game at least once.
- Deadeye's Rust's Cylinder shot now uses a distinct crosshair cursor.
- Added a local effects viewer for browsing pixel effect animations.
- Main menu buttons now slide in from the left when the menu opens.
- The custom hand cursor now appears over clickable UI, with the regular cursor elsewhere.
- Guest players now see "Login to access the Reputation Shop!" instead of the unlock message.

### Fixed
- Crosshair cursor now resets when navigating away from combat while Deadeye is active.
- Ace now powers Showdown swaps, but is no longer spent by explosive chain clears.
- Welcome message now shows the account display name after logging in instead of the guest name.

## v1.0.1

### Changed
- Lowered tile unlock prices in the Reputation Shop.
- Rebalanced Powder Monkey with lower HP and lighter bomb pressure at the start of the fight and on its bury attack.
- Removed the extra full-card keyword tooltip from merchant and tile selection tiles, so keyword explanations only appear when hovering the highlighted keywords themselves.

### Fixed
- Attempted to fix an issue where combat sometimes failed to load after leaving a campfire or event.

## v1.0.0

### Added
- New corrupt artifact: `Greed`.

### Changed
- The starter screen now has richer animated dialogue and a full new set of Bones reward options.
- Act names now read `the dusty trail`, `the canyon`, and `the town`.
- Rust and Reno now use animated sprite sheets in combat, including hit reactions when they take enemy damage.
- Deadeye now shows its active shot count in the chamber and ends with a dramatic finishing spin and sound.
- The top bar now shows only `Act N`.

### Fixed
- Gold gain modifiers now affect non-combat rewards as well as combat payouts.
- Dusty Dan no longer passively adds bomb hazards in phase 3.
