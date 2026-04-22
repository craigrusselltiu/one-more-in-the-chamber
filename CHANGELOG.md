# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

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

## v0.7.5

### Added
- Combat now shows a visible turn indicator.

### Changed
- Combat attack lines now fire from the player to the enemy instead of from tiles to enemies.
- The combo indicator is now larger, clearer, and centered above the board.
- Rust now uses an animated combat sprite.
- Merchant sale items are now 75% off with a clearer sale badge.
- The Customize and Reputation Shop screens now use updated backgrounds and darker overlays for readability.

### Fixed
- Milk now transforms into Cheese correctly on turn 4, and keeps its upgrade level through the transformation.
- Tumbleweed can no longer be upgraded by random upgrade rewards.
- Gold Tooth no longer appears in merchant stock.
- Lasso is no longer consumed by invalid swap attempts.
- Summoned enemies now correctly trigger on-death effects from non-match kills, and bounty execution now checks more damage sources.

## v0.7.4

### Added
- The ability HUD has been reworked into a rotating revolver chamber.
- Character Select now shows Reno's unlock requirement and a placeholder slot for a future character.

### Changed
- Deadeye now spends and restores chamber bullets more cleanly while active.

### Fixed
- Tooltips now anchor correctly across the UI instead of drifting too low on some screens.
- Event, campfire, artifact, and merchant progress now resume more reliably after quitting and continuing a run.

## v0.7.3

### Added
- Enemy intents now show hover tooltips.
- The Reputation Shop now includes a Characters tab, and Reno can be unlocked there.

### Changed
- Snake Oil and several events were updated to match their current designs.
- Status effects in the Ledger are now discovered as you encounter them.

### Fixed
- Merchant tile swaps now respect tile unlocks from the Reputation Shop.
- Boulder no longer appears as an upgraded tile offer.
- The board now auto-reshuffles if a turn starts with no legal swaps.

## v0.7.2

### Added
- The Reputation Shop now includes a Tiles tab with unlockable tiles.
- Locked tiles and artifacts now show a lock overlay and unlock hint in the Ledger.
- Tooltips now flip when needed to stay on screen.

### Changed
- Milk now states that it transforms on turn 4.
- Dry Atmosphere now reduces healing by 20%.

### Fixed
- Lethargic is no longer wasted by an invalid swap.
