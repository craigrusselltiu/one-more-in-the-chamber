# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## v0.6.10

### Added
- Ascension capped raised to L30. New mutations on top of the existing L1-L20:
  - L21 - Merchants no longer stock a discounted SALE artifact.
  - L22 / L23 / L24 - Normals / elites / bosses gain an additional +5% HP.
  - L25 - Start each run with a random corruption artifact.
  - L26 - Max HP multiplier drops to 0.9 (cumulative -10% with L14).
  - L27 / L28 / L29 - Normals / elites / bosses gain an additional +5% damage.
  - L30 - Start each run with an extra Charcoal tile (moved from the old L10).
- New `AscensionMutations` fields wired through `runStore.startRun` and `MerchantScreen`: `startingGoldOverride`, `disableMerchantSales`, `startWithRandomCorruption` (existing `extraCharcoalTile` flag repurposed for L30).
- Merchant stocks one random artifact at 50% off per visit. The sale is seeded by the run + node id so it stays stable if the player leaves and comes back. `MerchantItem.originalPrice` carries the pre-discount cost; the card shows a red SALE badge top-left and stacks the strikethrough original over the discounted price in the top-right cluster.
- Cherry nameplate (15,000 reputation) appended to the Nameplates tab.

### Changed
- L10 ascension mutation rewritten from "extra Charcoal tile" to "Start with less gold (50g)". `startingGoldOverride` replaces the base 100g; loadouts (e.g. outlaw's stash +15) still stack on top.
- L17 / L18 / L19 ascension mutations dropped from +10% to +5% HP + damage per category, giving room for the additional L22-L24 / L27-L29 stacking bumps.
- Merchant shop layout reorganised: Row 1 is now 4 Artifacts + 1 Upgrade (was Artifacts + Tile); Row 2 is 3 Consumables + 2 Tiles (was 4 Consumables + Upgrade). Stock builder rolls two distinct `tile_swap` entries via `seededShuffle(available, rand).slice(0, 2)` when available.
- Act 1 merchants can now offer tiles from the full `STARTER_POOL + ADDITIONAL_POOL` union, not just starter tiles.
- Ascension max-selectable cap raised from 20 to 30 (`CharacterSelectScreen.tsx`). `ASCENSION_EFFECTS` string table extended with the L21-L30 blurbs.

## v0.6.9

### Added
- Reputation Shop rewrite: 8-category tabbed layout (Featured, Characters, Skins, Artifacts, Events, Nameplates, Colours, Titles) with merchant-style cards. Nameplates use full-width rows that show the art as a live leaderboard-row preview. Featured tab has a curated layout — a 5-card row of colours/titles above a stack of nameplate rows.
- Customize screen (new main-menu entry under Reputation Shop): Nameplates / Skins / Colours / Titles tabs. Click a card, then Equip / Unequip via the footer. `EQUIPPED` badge marks the active selection in each category.
- Leaderboard cosmetics: nameplates render as the row background, colours tint the player name (including animated shimmer gradients via `background-clip: text` + shared `rarity-sweep` keyframe), and titles appear as a 9px stone-400 subtitle under the name. Equipped selections live on `meta_progression` and resolve retroactively across every past entry.
- Four nameplates (Rust, Reno, Wanted, Train), seven shimmer name colours (Rainbow, Red, Gold, Blue, Poison, Shadow, Bubblegum), and three titles (Rust Main, Reno Main, John Chamber). Plus a dev-only "One Above All" title gated by `DEV_USER_IDS` on `auth.isDev`, not in the shop.
- Death-cause tracking: `scores.killed_by` captures the enemy name (combat) or event title (event) that delivered the killing blow. CombatManager's `lastDamageSource` is set at every player-damage site (enemy attack, poison tick, bomb, fuse, Snake Oil backfire); EventScreen's `applyHpLoss` stamps the event title; both flow to `RunState.deathCause` and into the score record.
- Blood overlay: fullscreen `public/assets/blood.png` flash (fade 0 → 0.85 → 0 over 450ms) whenever the player loses HP, whether from combat, events, or anywhere else. Mounted above the Phaser canvas with `zIndex: 9999`.
- Mid-combat snapshot now round-trips through Supabase via the repurposed `run_state.combat_state` column. `pushCombatSnapshot` / `clearRemoteCombatSnapshot` own the column so background run pushes don't clobber it; `pullRemoteRun` extracts the snapshot and mirrors it into local IDB so `checkForCombatResume` restores enemy HP / board / stacks on a second device — not just player HP.
- Leaderboard-row drop shadow: every text column and tile sprite gets a `1px 1px 1px rgba(0,0,0,0.85)` shadow (via `textShadow` or `filter: drop-shadow`) so content reads clearly over equipped nameplate art. Shimmer-class names use `drop-shadow` to avoid the shadow bleeding through the transparent text fill.
- 10-run retention cap per player. New migration `20260418_runs_retention.sql` runs a one-time window-function DELETE for existing rows beyond the cap, then installs an after-insert trigger that prunes the inserting player's rows back to 10 (ordered by `updated_at` desc). `run_state` cascades.
- Public `player_equipped_cosmetics` view (`20260418_player_equipped_view.sql`) that projects only `equipped_nameplate / equipped_colour / equipped_title` from `meta_progression` with `security_invoker = off`. Anyone can resolve any player's equipped look via the leaderboard; reputation and unlock arrays stay owner-only.
- Main-menu Reputation Shop and Customize buttons are disabled for guests, with a hover tooltip ("Log in to spend reputation." / "Log in to customize your look.").
- Abandoned Mine event's last choice now shows its "(100%)" chance in parentheses for consistency with the first three levels.
- Accounts: email/password + Google OAuth via Supabase, with a new tabbed Log In / Sign Up screen, Pick-Name screen for OAuth first-timers, and Sign Out in Settings. Logout clears local meta progression and the active run so a subsequent login on a shared device can't leak unlocks or let someone continue another account's run as a guest.
- One-active-run-per-player enforcement. New Supabase migration `20260418_one_active_run.sql` cleans up any existing duplicate active rows, adds a `runs.session_id uuid` column, and a partial unique index `(player_id) WHERE status = 'active'` so the server rejects a second active run.
- Device-ownership tracking via a per-tab `SESSION_ID`. On login sync the current tab claims ownership of the active run; every subsequent `pushRun` updates with an ownership filter and detects a stolen session. Mismatch -> kickout overlay.
- Kickout overlay ("Signed In Elsewhere") that blocks interaction when another tab/device has taken over, with a single "Back to Main Menu" button that signs out and restores the pre-login guest name.
- Ownership watcher polls `runs.session_id` every 20s (and on every tab-visible) while signed in, so a takeover from another device triggers the kickout overlay even while idle on the main menu or other non-combat screens.
- Login screen remembers the last successfully-used email in localStorage and prefills it on next visit (`omitc-last-login-email`); if an email is prefilled the password field takes autofocus instead.
- Pressing Enter in any field on the login / sign-up / pick-name screens now submits the form.
- Display names stored in a new `public.players` table with a case-insensitive unique index and a 1-32 char check constraint. Client-side validation is minimal (non-empty, max 32) -- the DB is the source of truth.
- First-visit gate: brand-new visitors (no local name, no auth session) see a Welcome screen with "Log In / Sign Up" vs "Continue as Guest". Returning guests / signed-in users skip it.
- "Stay signed in" checkbox on the login screen (default on). Unchecked routes the Supabase session to `sessionStorage` via a custom storage adapter, so the session ends when the tab closes.
- Cross-device progression sync: meta progression and active runs now push to Supabase continuously (debounced ~1.2s / 1.5s). `syncOnLogin` also hydrates the in-memory zustand stores with the merged result, so reputation, unlocks, and the current run appear immediately after login without a reload.
- Blocking "Syncing data..." overlay during `syncOnLogin + hydrateProfile`, plus a small "Retrieving data..." badge (250ms grace) for wrapped pulls like `fetchLeaderboard`.
- Leaderboard: `(Guest)` suffix on rows where `player_id IS NULL`; dashed-underline + `cursor: help` on the Arts count to signal the artifact tooltip.
- New Corrupt rarity for corrupt artifacts (red dim outline + breathe sweep).
- Sheriff's Shadow and Corrupt Deputy sprites now render at 1.5x like other elites/bosses.
- Early 2-Vulture encounter randomly promotes exactly one to Summoned via the existing `:rsummoned` preset marker.
- BootScene preloads all 33 enemy/character sprite PNGs so first combat entry is instant and the loading bar reflects their download.
- Supabase migrations checked in under `supabase/migrations/` for the players constraints and the four sync tables (meta_progression, runs, run_state, scores) with RLS.

### Changed
- `meta_progression` extended via `20260418_customize_and_new_groups.sql` with `unlocked_skins / unlocked_nameplates / unlocked_colours / unlocked_titles` (text[]) and `equipped_skin / equipped_nameplate / equipped_colour / equipped_title` (text, nullable). All wired through `mergeMeta`, `pushMeta`, `pullRemoteStateOverwriteLocal`, and the `CATEGORY_KEY` dispatch for `purchaseShopItem`.
- First-time account creation now seeds the account from the device's guest state. `mergeMeta` falls through to local values when remote is null, so reputation, ascension, unlocks, and equipped cosmetics all upload on the very first `syncMeta`. Subsequent logins prefer remote for numeric fields when a row exists, preventing guest/stale-local data from clobbering real account state (arrays still union-merge).
- Kickout mechanics rebuilt. `SESSION_ID` persisted in localStorage per browser so tab reopens don't masquerade as new devices. `initAuth` session-restore path no longer claims ownership; calls a new `checkOwnershipAndKick` to detect stolen sessions up front. The ownership watcher and `pushRun` two-strike stopped defensively re-claiming on mismatch, so a confirmed mismatch decisively kicks the losing device instead of ping-ponging.
- Kickout overlay "Back to Main Menu" now routes through the normal `logout()` flow (identical to Settings → Sign Out), preserving the pre-login guest name and landing on main menu without a reload.
- `run_state.extra_state` slimmed: dedicated columns are the source of truth for fields they cover (`health`, `gold`, `artifacts`, `map_state`, etc.); `extra_state` carries only non-duplicated residual fields (counters, pending flags, eventBag). `pullRemoteRun` merges dedicated columns with `extra_state` on pull.
- `run_state.trait_counts` column dropped (`20260418_drop_trait_counts.sql`). `traitCounts` is derived from `artifact.tags` on load via a new `computeTraitCounts` helper.
- Cost display on shop cards reads `{cost.toLocaleString()} Reputation` (e.g. `15,000 Reputation`) across both small and full-width card variants. Dropped the old `rep` / `reputation` shorthand.
- `ColourDef` extended with optional `shimmerClass` and `description`; `NameplateDef` extended with optional `imagePath` for asset-based nameplates. `TitleDef` extended with optional `devOnly` flag.
- Customize colour cards render the item name in its shimmer class (no separate sample swatch) to match the Rep Shop's colour-card layout. Title cards render the title text in leaderboard-subtitle style. Nameplate cards use the art as the card background (full-width leaderboard preview) with name + EQUIPPED overlay.
- Leaderboard title subtitle gap tightened so it sits just under the player name (`marginTop: -1px`) instead of the previous 2px.
- Artifact rarity outline on the HUD switched to per-rarity SVG `feMorphology` filters (radius 1.25), matching the enemy target outline technique.
- Combat background sprite now uses `LINEAR` filtering so the 1920x1080 → 640x360 downscale no longer shimmers under the scene-global pixel-art mode.
- Settings screen, in-combat settings popup, Login / Pick-Name screens, Artifact screen, Tiles popup, name prompt, new-game confirm, and leaderboard restyled to a consistent borderless rounded-card aesthetic with uppercase stroked titles and softer button shadows.
- Main menu welcome text now reads "Welcome back, <name>!" when signed in and "Welcome back, <name or Challenger>! (Guest)" otherwise. Log In button moved to bottom-right; flips to a compact "Signed In" label when authenticated.
- Display-name validation loosened from `[A-Za-z0-9_]{3,20}` to 1-32 chars, any characters.
- Leaderboard Player column widened (`w-36` → `w-52`) at the expense of the Tiles column.
- `clearRun` (Main Menu "Delete & Start New", logout) now marks the server row as `abandoned` via `abandonOtherActiveRuns()` in addition to deleting locally. No more orphan server-side active runs.
- `logout` restructured so the screen change + overlay dismiss happen synchronously before any async Supabase work (abandon / signOut / clearRun are now fire-and-forget), so clicking "Back to Main Menu" from the kickout overlay no longer leaves the user staring at the blur background while cleanup completes.
- On passive session restore (same browser/tab reopening), `initAuth` now calls `claimAllMyActiveRuns()` so the new tab's `SESSION_ID` replaces the prior tab's before any push fires. Fixes a false self-kick on quit-and-return within the same browser.

### Fixed
- Infinite render loop on logout from combat: `ConsumableSlots` (and latent in `TraitRow`, `TraitDisplay`, `ArtifactBar`) had zustand selectors returning fresh `[]` / `{}` literals when `run` was null, triggering React's "getSnapshot should be cached" guard → component crash → main menu never paints. Fixed with module-level `EMPTY_*` constants shared by each selector's fallback.
- Cross-device mid-combat divergence: two devices opening the same run could see different enemy state because the combat snapshot was IDB-only. `pushRun` was also clobbering `run_state.combat_state` to null on every tick. Fixed by giving the column its own push/clear path (`pushCombatSnapshot` / `clearRemoteCombatSnapshot`) and by having `pullRemoteRun` mirror remote snapshots into local IDB.
- `textShadow` bleeding through shimmer-gradient names: gradient-clipped text has a transparent fill so the shadow showed through the glyph, looking like it sat on top. Shimmer colours now use `filter: drop-shadow` (which follows rendered alpha) instead of `textShadow`.
- Cross-device ownership ping-pong where the defensive re-claim in `checkOwnership` and `pushRun`'s two-strike let both devices perpetually steal the active run from each other, so neither could actually persist state. Removed the re-claims; mismatches now kick decisively.
- First login on a new device could upload the device's guest state over the account's real data. `mergeMeta` and `syncRuns` now prefer remote for numeric fields / active runs whenever a remote row exists.
- Sheriff's Domino never triggered -- the "all damage blocked" check ran before `executeEnemyTurn`. Split into a new `onAfterEnemyTurn` hook that runs after enemies attack but before block resets.
- `subscribeAuth` now fires the listener immediately with current state on subscribe, closing a gap where React subscribers could miss auth updates that happened between their `useState` lazy init and their `useEffect` subscribe.

## v0.6.8

### Added
- Seven new events, each with a dedicated background and colorized flavor text: The Vulture Circle, The Traveling Preacher, The Campfire Stranger, The Rigged Bridge, The Snake Charmer, The Ghost Town Saloon, The Medicine Wagon.
- Animated event text effects (yellow/green wiggle, red character jump, blue breathe) driven by a `{{color:text}}` markup in event flavor strings.
- New Corrupt trait and three curse artifacts:
  - Lethargic (Common) — the first swap each combat generates no resources. Tiles still move and matches still clear visually, but the cascade produces no damage/gold/block/heal and no shadow/poison/chain side effects. Shows as a player status icon, cleared on consume.
  - Dry Atmosphere (Uncommon) — all healing is reduced by 10%, in combat and out.
  - Tinnitus (Rare) — enemy intents are hidden on turn 1. Shows as a player status icon; enemy intent panels display "?" for that turn.
  - Corrupt(2) — at fight start, add Shadow to 2 random tiles for each Corrupt artifact you own.
- New run-state "pending" fields applied at the next relevant moment, consumed once (unless noted):
  - `pendingActBossHpBonus` — adds % max HP to the current act's boss (Vulture Circle).
  - `pendingEventArtifactChoiceCount` — queues a 1-of-N artifact pick on the next ArtifactScreen visit (Train Wreck).
  - `pendingNextFightGrace` — grants Grace stacks at the start of the next combat (Traveling Preacher).
  - `pendingNextFightSwapBonus` — +/- swaps on turn 1 of the next combat; stacks across events (Campfire Stranger, Rigged Bridge, Ghost Town Saloon).
  - `pendingNextFightPotion` — queues a randomly-rolled delayed-potion outcome (heal 27 / -10 HP / +2 Vulnerable / +5 Poison) applied at the start of the next combat (Medicine Wagon).
  - `forcedCombatEnemies` — overrides the next combat roll with a specific enemy set (Coyote Den, Ghost Town Saloon ambush).
  - `nextMerchantDiscount` — applies a one-shot % discount to the next merchant (Train Wreck "Check for survivors").
  - `actMerchantSurcharge` — additive % surcharge applied to every merchant in the current act, cleared on act advance (Medicine Wagon "Threaten him").
  - `merchantUpgradesPurchased` — tracks upgrade-card purchases so each shop's upgrade costs +50 gold per prior buy this run.
- Score now includes a x2 Completion multiplier on win, on top of the existing ascension and time multipliers.
- Boot loading screen now shows a progress bar and `loaded / total` asset count, driven by a new `BOOT_PROGRESS` event.
- `healAdjust()` utility so out-of-combat heal sources (campfire rest, event heals) respect Dry Atmosphere.
- `pickArtifactByTag()` utility for event rewards filtered by a specific tag, using the same weighted rarity selection (ascension legendary weight + Desperado(2) doubling) as the rest of the game. Used by Snake Charmer and Traveling Preacher "Draw".
- Run persistence can be paused/resumed around non-combat screens so intermediate state doesn't persist mid-event; pair with `forceSaveRun()` to checkpoint cleanly on exit.
- `NonCombatFloats` HUD layer so floating-number feedback works outside combat (e.g. event HP loss, gold gained, heals).
- Stack-based Dead Man Walking on the player (separate from the once-per-combat DMW trait save). Each stack absorbs one incoming debuff (poison, vulnerable, terrified) and decrements 1 at end of turn.
- All 11 event backgrounds (plus the two card sprites) are now preloaded in BootScene so first-visit mounts don't flash a blank background.

### Changed
- Shadow tile damage 4 → 10.
- Death's Glare now also grants the player 3 Dead Man Walking on combat start (in addition to the existing 3 Vulnerable + 3 Terrified to all enemies).
- High Vis Jacket rarity: Rare → Legendary.
- Traveling Preacher "Confess": grants 3 Grace next fight (was 1).
- Trailblazer's Compass reworked: unused swaps at turn end now grant 6 block on your next turn (was 3 damage each to the targeted enemy).
- Abandoned Mine depths rebalanced: Go deeper now costs 5% / 7% / 10% max HP (was 8% / 15% / 25%); chances unchanged.
- Train Wreck "Search the engine" damage 10 → 13; now routes to a 3-artifact pick via `pendingEventArtifactChoiceCount` instead of a single roll.
- Coyote Den choice text: "Fight a pack of wolves" → "Fight a pack of coyotes" (matches the event name and the forced encounter).
- Event flavor text and choice descriptions converted from double-hyphen to real em dashes.
- Event backgrounds moved under `public/assets/events/`; BootScene paths updated.
- Character Select, Tile Select, Merchant, Campfire, and Event screens share the same button styling (rounded-sm, drop shadow, active-state translation, amber-800 primary / stone-800 secondary).
- Merchant overhaul:
  - Shop now stocks **4 artifacts and 4 consumables** (was 3 each).
  - Artifact pricing is rarity-tiered (pre-multiplier): Common 100–140, Uncommon 141–180, Rare 181–220, Legendary 261–300.
  - Consumable pricing now uses each consumable's base `cost` with a uniform ±5 jitter across all 11 integer values instead of a flat 17–35 range.
  - Tile-swap base range bumped ~40%: 77–116 (was 55–83).
  - Upgrade card base 300 → 200, and each purchase this run raises every subsequent shop's upgrade price by 50.
- Event swap bonuses ("Start the next fight with N extra swaps") now apply only to **turn 1** of the next combat, not every turn. Turn 1 is still clamped to at least 1 swap so Saloon "Drink" can't soft-lock the first turn.
- Corrupt-tagged artifacts are event-only: excluded from all ArtifactScreen rolls, merchant stock, and Card Game "Item" spreads. Still granted by explicit event paths (Traveling Preacher "Draw").
- Event text layout: paragraph gap 8 → 16px, text-to-buttons gap 20px; red per-char text keeps word boundaries intact so animated phrases no longer split mid-word.
- "Give Up" prompt no longer shows "End this run?" — just Confirm / Cancel side-by-side.
- `ConsumableDefinition` gained a `cost` field; all twelve consumables now carry a base cost.

### Fixed
- **Event persists through quit/return**: the event bag was previously committed the moment the screen mounted, so quitting mid-event to the main menu and returning drew a different event. Bag now commits only at explicit resolution points (direct nav, result-screen Continue, card-reveal Continue).
- **Event changes aren't persisted until completion**: quitting during a result screen used to leak the choice's effects (lost gold, HP, artifacts, consumables) because the in-memory zustand store had mutated even though IDB didn't auto-save. The event screen now snapshots the pre-event run state on mount via `structuredClone` and, on any non-completing unmount, calls `restoreRun()` to roll the in-memory state back to the snapshot. Combined with the save-on-entry + save-on-completion persistence pattern, quitting mid-event truly reverts everything.
- **Artifact re-roll flash on event pick**: picking from Train Wreck's 3-artifact spread used to briefly display a newly-rolled single artifact as the screen transitioned away. Both the rolled artifacts and the choice-mode flag are now locked in a ref on first render.
- **Event damage could leave the player at 0 HP without ending the run**. Old Well, Train Wreck, Abandoned Mine, and the Card Game "health" reward now trigger a game-over when they would drop the player to 0.
- **Tile-swap soft-lock prevention**: `swapsPerTurn` is clamped to a minimum of 1 so negative event effects (Saloon "Drink") can't zero out a fight.
- Vulture Circle "Take the gear" actually applies its advertised +10% act-boss-HP penalty (consumed when the boss encounter rolls, cleared on act advance).
- Event reward artifacts (Snake Charmer, Traveling Preacher "Draw") now respect rarity weighting — previously they picked uniformly at random across the tagged pool.

## v0.6.7

### Added
- 2x enemy sprite scaling (Tumbleweed Golem and Ore Golem). When a 2x enemy is present, the top enemy slot is auto-disabled so the larger sprite has room.
- Dust Devil scaled to 1.5x
- Used-up artifacts are rendered greyscale and dim in the artifact bar. Shed Skin goes used after triggering its lethal save; Gold Tooth goes used on pickup (its +333 gold was already applied). Used artifacts no longer contribute their combat-time effects.
- Sheriff(6) now actually reflects 100% of absorbed block damage back to the attacker (was documented but unimplemented).
- Skeleton Key and Panacea now grant Jail Cell Keys block per lock they clear.
- 10 new tile ideas added to docs/TILES.md (Echo, Hourglass, Bear Trap, Pact, Scorched Earth, Wagon Wheel, Ledger, Coyote Call, Dead Man's Hand, Anchor). All existing tile idea entries reformatted to the canonical flavor/behaviour/upgrade/formula style.

### Changed
- Act 1 normal enemy HP nerfed per ENEMIES.md: Bandit 48→44, Coyote 37→35, Rattlesnake 43→41, Vulture 32→28, Pack Mule 63→60.
- 3 Vultures late-normal encounter now promotes exactly one random vulture to the Summoned variant (1/3 HP) per roll via a new `:rsummoned` preset marker.
- Chip tile is now a true independent 50/50 roll by default. Reno's Coin still overrides to the 6/8 bag (75% hit, no streaks).
- Traits tuned per TRAITS.md:
  - Outlaw(2): 1 → 3 Rageful on kill
  - Outlaw(5): 3 → 5 Rageful + 2 → 3 Vulnerable at boss start
  - Prospector(2): 5 → 7 gold per proc
  - Prospector(4): 1 → 2 damage per gold gain
  - Preacher(6): 1 → 2 Grace at fight start
  - Gunslinger(6) tooltip now shows its description ("Lucky deals 2x damage instead of 1.5x.")
- Ascension 21+ disabled. Character select caps at 20 and levels past 20 get the same mutations as level 20 (was +4% HP / +2% damage per level beyond 20).
- Scoring system rebuilt:
  - Base: Combats (100 ea), Elites (250 ea), Bosses (500 ea), Flawless (100 ea)
  - Bonus: Gold Obtained (1 pt/gold), Artifacts (50 ea), Damage Dealt (1 pt/5 dmg), Max Combo (100 per 0.1 above 1.0x, e.g. 1.7x = 700)
  - Ascension multiplier: x(1.0 + 0.05 per level), always applies
  - Time multiplier: x2 at 0h linear down to x1 at 1h30+, only on win
  - Removed act-reached bonus, explored nodes bonus, trait bonus, gold-held bonus, run-complete bonus
- Starting gold and starting artifacts no longer count toward the score (`goldObtained` initializes to 0; `artifactsObtained` only ticks on real pickups).
- Reputation rounding: no longer floors at 10. A zero-score run (immediate abandon) now grants zero reputation.
- Enemy target outline replaced with an SVG feMorphology-based ring that no longer tints the sprite body. Outline is now thinner (~1px).
- Ability meter moved lower on the combat screen.
- Leaderboard tile-level badge now displays "Lv2" etc. (base tile shows nothing).
- Enemy encounter bag persisted across Vite HMR reloads via globalThis, with stable string keys so object-reference churn from module reloads no longer defeats the no-repeat guarantee (dev-only bug).

### Fixed
- Combats/Elites cleared and gold obtained now persist across acts (previously only the current act's map contributed to the score, since new acts regenerate the map).
- Player could get stuck at 0 HP after poison ticks or Reno's Coin self-damage because those paths modified `player.health` directly, skipping Shed Skin / Dead Man Walking and not ending combat. Both now route through a shared `tryLethalSave` helper, and poison defeats end combat immediately instead of waiting for the next move.
- Gold Obtained score was always 0 from combat. `resetFightEffects` zeroed `goldThisFight` before the combat result was built; captured it first, and switched to a positive-only counter so fool's-gold / Reno's-Coin penalties don't erase earned gold from the run tally.
- 2x enemy death caused the minion to visually "teleport" from slot 2 to slot 0 because the layout reshuffled the moment the 2x died. Oversize layout now persists for the entire fight once a 2x is in the encounter.
- Reno's Coin self-damage now goes through the lethal save (same root cause as the poison bug).

## v0.6.6

### Added
- Vulture Scavenger passive: when another enemy dies, heal 6 HP (shown as a status icon with tooltip)
- Scavenger keyword added to keywords and status effects UI
- Leaderboard: Won column (amber checkmark), Duration column (H:MM:SS), Artifacts column (count with icon tooltip on hover), custom scrollbar
- Leaderboard: artifact IDs saved and synced with score records
- Preloaded all background images during boot for smoother transitions
- Pack Mule and Tumbleweed Golem sprites scaled to 1.5x
- Trait tooltips now colorize keywords and show keyword sub-tooltips
- Boss companions tagged as Summoned status

### Changed
- Vulture: Heal 6 move removed, replaced by Scavenger start-of-fight buff
- Copperhead Cassidy: reduced from 2 starting Rattlesnakes to 1, removed start-of-fight Poison 4 Tiles
- Leaderboard table widened, columns adjusted for better readability
- Settings screen row padding reduced for compact layout
- Fixed base font size on game container to prevent Edge text scaling issues

### Fixed
- Sidewinder Belt now respects Dead Man Walking (poison applied after enemy start-of-fight buffs)
- Sidewinder Belt now benefits from Rattlesnake Fang Necklace (+1 poison)
- Horseshoe upgrade now correctly scales Lucky stacks per tile (was ignoring upgrade levels)
- Outlaw King artifact reward can no longer be claimed multiple times by spam-clicking
- Shuffle desync: explosive/showdown/shadow tile overlays not updating after Dust Devil Boots shuffle, reshuffles, or match-breaking swaps (tiles could appear explosive but not function as explosive, or vice versa)

## v0.6.5

### Added
- Tutorial system: guided overlay with spotlight cutouts, chained sequences, and "I'm good" skip option
- Tutorials for intro, character select, tile select, map, and top bar
- Tutorials toggle in both main menu settings and in-game settings popup
- Tutorials auto-disabled for players with existing runs
- Player attack sprites: character sprite swaps to attack pose for 0.5s when dealing damage (Rust and Reno)
- Tiles column in leaderboard showing final tile loadout with upgrade levels
- Ascension 21+: infinite scaling beyond level 20 (+10% enemy HP, +5% enemy damage per level)
- Whiskey tile moved to starter pool

### Changed
- Barricade nerfed: max stacks reduced from 2 to 1
- Dead Man Walking: now loses 1 stack whenever a debuff is applied (in addition to end of turn)
- Hardened description updated: damage taken per swap is capped to stacks
- Strong Coffee buffed: 1.5x next match resources changed to 2x (double)
- Dusty Dan: first move and vulture summon now spawn vultures at full HP; summon move only triggers when alone
- Saloon Brawler: first move is always Multi-attack 4x2, Gain 3 Rageful
- Ascension 20 elite companion now has Summoned status
- Act 1 merchants only offer starter tiles
- Rageful and Sturdy bonuses no longer apply to single-tile resolves
- Prairie Fire description simplified to "1 in 4 chance to spread"
- Whiskey: description updated to "Heals 1 HP per 3-match, plus 1 per extra tile"
- Settings screen: blurred background image, smaller row padding
- Leaderboard: added Tiles column, adjusted column widths
- Scaled Mine Cart, Mine Foreman, and Ore Golem sprites to 1.5x
- Text selection disabled across game UI

## v0.6.4

### Added
- Guard Dog enemy in Act 3: low HP aggressive attacker that accompanies Train Guard encounters
- Act 3 late encounter: 1 Train Guard + 2 Guard Dogs
- Act 3 late encounter: 1 Corrupt Deputy + 1 Coyote + 1 Bandit
- Artifact choice screen: artifact map nodes and boss rewards now present 2 artifacts to choose from instead of a single random one. Elites remain single random with take/skip.
- Invulnerable enemy buff: immune to all damage, decreases by 1 at end of turn
- Duel player buff: stacks on Duel tile match, converts to Ready at 4 stacks
- Outlaw King warning notification ("A chill runs down your spine...") on map entry if any node in the act would spawn him
- Copperhead multi-attack intent now updates in real-time as poison tiles change during the player's turn
- Cross-clear tiles now generate single-resolve resources (previously cleared without generating anything)
- Enemy.clearAllStatuses() helper, used by Copperhead shed skin and Saloon Brawler
- CONSUMABLES.md documentation
- Panacea consumable: clears all tile hazards (locks, poison, bombs, sand, fools gold, suppress)
- Consumables can now be used outside of combat (Strong Whiskey, Bandage, Snake Oil)
- Lasso cursor: board cursor changes to lasso icon while lasso is active
- Act 3 late encounter: 3 Guard Dogs
- Death's Glare artifact buffed: 1 -> 3 stacks of Vulnerable and Terrified

### Fixed
- Artifact choice screen boxes now stretch to equal height regardless of text length
- Quitting on the artifact choice screen (artifact map node) now correctly restores to that screen on continue instead of skipping to the map

### Changed
- Outlaw King encounter chance reduced from 1% to 0.5%
- Outlaw King restricted to post-artifact nodes in Act 1
- Cloak: cascade damage reduced by 50% instead of fully nullified
- Dead Man Walking: now decreases by 1 at end of turn instead of being permanent
- Barricade: max increased from 1 to 2
- Prospector(6): gold damage bonus reduced from 10% to 5%
- Tinker's Wrench: explosive spawns from first non-cascade 3-match per turn only (was every 3-match)
- Cavalry tile: changed from 1 damage to 2 block per tile
- Duel tile: base damage 4→2, now upgradeable (+1 per tile per level), grants 1 Duel stack on match
- Horseshoe tile: upgrade changed from flat to per-tile scaling
- Saloon adjacency now respects adjacent tile upgrade levels (was always Lv0)
- Single-resolve flat upgrade bonus divided by 3 (affects Ricochet/Saloon/explosive destruction)
- Flat status effects (Vulnerable, Chain, Duel, Barricade) capped at 1 per explosive/showdown chain
- Boulder single resolve: block bonus divided by 3
- Train Guard: simplified moveset, removed Thorns/Vulnerable from moves, block values adjusted (30->25)
- Sheriff's Shadow: moves 3 and 4 now apply poison tiles instead of bury
- Iron Eye Isabella: stripped legacy 3-phase system, now just gains 10 block per turn as passive. HP trigger at 50%: Rageful 5 + Invulnerable 1 + Terrified 1 + Vulnerable 1
- Act 3 early encounter reworked: Train Guard + Guard Dog (was 2 Train Guards)
- Saloon Brawler: reworked moveset, move 4 clears all own statuses
- Sheriff's Shadow: added Dead Man Walking 3 at start, reworked moves
- Outlaw King (all acts): Dead Man Walking 1→99
- Outlaw King Act 3: HP 344→321, reduced attack/block values
- Extensive enemy rebalance across all acts (see ENEMIES.md)
- Act 3 encounters reworked: new early/late presets
- Hellfire Preacher: reworked moveset, heal now targets injured ally first
- Charcoal flavor text updated

### Removed
- Fool's Magnifying Glass artifact
- Hellfire Preacher ally-heal priority AI behavior (replaced by heal action targeting)

## v0.6.3

### Changed
- Mine Cart reworked: removed legacy "timed encounter" system. Fuse is now a standard enemy status — starts at 5, ticks down each turn, and when it reaches 0 deals 50 damage to the player and kills the Mine Cart. Mine Cart now executes its bomb moveset each turn instead of being inert.
- Mine Cart bomb values corrected to match spec: 5/7/9/3 → 3/5/7/3
- Mine Cart moves now cycle sequentially through the moveset
- Elite HP reduced by 8%: Tumbleweed Golem 109→100, Dust Devil 94→86, Mine Foreman 160→147, Ore Golem 189→174, Mine Cart 252→232, Saloon Brawler 286→263, Sheriff's Shadow 277→255, Outlaw King (Act 1) 184→169, (Act 2) 255→235, (Act 3) 374→344
- Boss HP reduced by 15%: Dusty Dan 244→207, Copperhead Cassidy 338→287, Iron Eye Isabella 416→354

## v0.6.2

### Added
- Charcoal tile: new Special-pool tile. On match deals 1 damage + gains 1 block (flat per match). Cannot be swapped out at the merchant, cannot be upgraded. Flavor: "A piece of charcoal. Somehow makes Fire-type moves more— wrong game."
- Ascension system reworked into discrete per-level mutations (L1–L20, cumulative). Old global HP/damage/gold/price multipliers are gone. Active levels: L1 (+2 elites per act), L2/3/4 (+10% damage to normals/elites/bosses), L5 (80% inter-act heal), L6 (start at 90% HP), L7/8/9 (+10% HP to normals/elites/bosses), L10 (extra Charcoal in deck), L11 (−1 consumable slot), L12 (upgraded reward tiles appear less often), L13 (10% less gold), L14 (5% less max HP), L15 (legendary weight 3→1), L16 (10% shop markup), L17/18/19 (+10% HP and +10% damage to normals/elites/bosses, stacking with L2–L9), L20 (Act 3 final boss spawns with a random Act 3 elite companion).
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

### Removed
- Fool's Magnifying Glass artifact (Prospector common) — fool's gold immunity removed from the game

### Changed
- Prospector(6) trait: gold damage bonus reduced from 10% to 5%
- Barricade: now capped at max 1 stack
- Shank and Ace moved from Additional tile pool to Starter tile pool
- Single-tile resolve (Saloon adjacency, Ricochet bounce) now scales flat-upgrade bonuses correctly — divides upgrade bonus by 3 for single-tile resolution instead of applying the full match bonus
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
- Mine Cart: intent countdown now reads from the mine cart's fuse value directly and always shows "IN N" down to 1 (was off-by-one from the Fuse icon and disappeared entirely on the final turn, making it look like the countdown had stopped)
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
