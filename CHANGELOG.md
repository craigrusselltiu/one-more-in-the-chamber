# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

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
