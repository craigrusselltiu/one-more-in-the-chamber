# AGENTS.md

## Versioning
- The version label is sourced from `src/version.ts` and rendered in `src/App.tsx` (bottom-right version text)
- Do not bump the version unless the user explicitly asks for a version bump
- Update `CHANGELOG.md` following Keep a Changelog format (no "Unreleased" header, versions formatted as v0.X.0)
- Treat `CHANGELOG.md` as user-facing release notes: keep entries brief, player-readable, and focused on visible fixes/changes rather than implementation detail
- Patch versions (v0.1.X) for small fixes, minor versions (v0.X.0) for features

## Architecture
- Phaser 3 game + React UI overlay, bridged by EventBus
- Stores: `runStore` (run state), `combatStore` (HUD), `metaStore` (progression in localStorage)
- IndexedDB persistence for runs, scores, combat snapshots
- Screen navigation: `EventBus.emit(GameEvent.SCREEN_CHANGE, screenName)`
- BootScene emits `BOOT_COMPLETE` after all assets load; combat scene waits for this before starting

## Game Flow
Main Menu -> Character Select -> Tile Select -> Map -> [Combat/Merchant/Event/Campfire/Treasure] -> Boss -> Treasure -> Tile Select -> Next Act -> Victory

## Phaser Scenes
- `game.scene.start('CombatScene', data)` / `game.scene.stop('CombatScene')`
- Must register shutdown manually: `this.events.on('shutdown', this.shutdown, this)`
- Scene instances are singletons -- same instance reused on restart
- A crash in any scene blocks all subsequent scenes (no error isolation)
- CombatScene persists as an object even after stop -- DO NOT access its state (board, combatManager) when inactive

## Pixel Art Rendering -- CRITICAL
- **NEVER use fractional scales on Phaser sprites.** Always use integer scales (1, 2, 3). This applies to ALL sprites: board tiles, overlays, hazard icons, status icons, everything. Fractional scales (0.75, 1.5, 1.25) cause visible pixel distortion. `setDisplaySize()` also causes fractional scaling internally -- do NOT use it.
- Board tiles: 16px source at 2x scale. TILE_SIZE=38 (grid spacing, larger than 32px sprite for VFX outline clearance).
- Hazard icons (lock, poison): use integer scale (1x = 16px, 2x = 32px).
- To make the board appear smaller, increase Phaser resolution (GAME_WIDTH/GAME_HEIGHT), not TILE_SIZE.
- React SpriteIcon: draws on canvas at integer scale (ceil), then CSS-sizes to desired display size with `imageRendering: pixelated`.

## Tile Destruction -- CRITICAL
- ALL tile destruction MUST go through `Board.destroyTilesWithEffects(positions)`.
- This method auto-handles: explosive chain detonation (BFS, wave by wave), showdown triggers (clear random type), animation, particles, screen shake, match SFX.
- Callers just pass positions to destroy. DO NOT manually check for explosive/showdown in callers.
- Options: `staggerMs` for sequential one-by-one destruction (showdown style), `detonated` set for shared cycle prevention.

## Seeded Runs
- Each content generation point uses its own `createSeededRandom(seed + context)` from `src/utils/seededRandom.ts`.
- DO NOT override `Math.random` globally -- it causes seed drift when code changes.
- Seeded points: map generation (`seed:actN`), merchants (`seed-merchant-nodeId`), treasures, events, tile select, encounters.
- Combat rolls (crit, damage, etc.) use `Math.random` and naturally diverge based on player choices -- this is expected.

## Combat Snapshots -- CRITICAL
- ONLY save snapshots when `prevScreenRef.current === 'combat'` AND `scene.isActive()`.
- CombatScene persists as a Phaser object after stop with stale data. Saving its state when not in combat produces corrupt snapshots (all-null tiles).
- `purgeCorruptSnapshots()` runs on startup to clean up bad saves.
- Snapshots are cleared on combat end via `clearCombatSnapshot(runId)`.

## Music
- BootScene manages all music via `playTrack(key)` / `fadeOut()` with proxy tweens
- `desiredTrack` + `audioUnlocked` pattern; tries immediate unlock, falls back to user gesture
- Campfire/treasure keep map music; settings/leaderboard don't change music

## Tiles
- TileType in `types/game.ts`, definitions in `data/tiles.ts`
- ResourceResolver: base output per type. CombatManager: special behaviors (saloon, ricochet, tombstone, etc.)
- Tiles need `upgradeText` to be upgradeable at campfire
- `spawnSpecialTile(row, col, type, kind)`: kind='explosive' or kind='showdown'
- VFX overlay system: overlay sprite + 8 offset outline sprites for breathing effects
- Hint system: `Tile.startHint(durationMs)` triggers white fade-in/out pulses via the same overlay system
- `buildTileDescription(type, upgradeLevel)` in KeywordText.tsx renders descriptions with green upgrade highlights

## Characters
- CharacterId: `'red_panda'` (Rust) or `'reno'`
- Character flows through: runStore -> CombatConfig -> CombatManager -> combatStore -> UI
- Ability threshold: Rust=10 (Deadeye), Reno=7 (Shuffle the Deck)
- Exclusive core tiles: Rust=bounty, Reno=chip. Added to activeTileTypes in runStore.startRun()
- Combat snapshots include character for proper restore

## Status Effects
- Ace: +0.25x multiplier per stack, consumed on non-Ace match
- Lucky: +1% crit/stack, consumed on crit (Lucky stacks ARE the crit chance, tracked in two vars)
- Barricade: retain block if no damage taken, stacks decrement/turn
- Vulnerable: +50% damage, decreases by 1 at end of enemy turn (not on hit)
- Venom: damage=stacks at turn start, stacks-=1
- Bounty: if enemy HP <= stacks, enemy dies (checked on apply and on damage)

## Combat Manager
- `makeCascadeStepHandler()` shared by swap/deadeye/shuffle for consistent resolution
- `dealDamageToEnemy()` handles pierce + floating numbers + bounty kill check
- Deadeye cancels on combat end and snapshot restore; cursor switches back immediately after last shot
- Chain bonus tracked per-fight via `ResourceResolver.chainBonusThisFight`

## Map
- 13 rows/act. Row 0=combat, last=boss, second-to-last=campfire, midpoint=treasure
- Constraints: 2-3 merchants, 3-4 campfires, 3-4 elites, no consecutive campfire/merchants
- Map canvas: use `nodeMap` (Map) for O(1) lookups, `reachableSet` (Set) for O(1) checks
- DO NOT use `ctx.filter` in the draw loop -- use manual compositing for dimming (performance)
- Boss node icon renders at 2x size (64px)

## Merchant
- Card layout: Row 1 = 3 artifacts + 1 tile swap. Row 2 = 3 consumables + 1 upgrade (250g)
- Tile swap levels scale by act: Act 1=Lv1, Act 2=80% Lv2/20% Lv3, Act 3=80% Lv3/20% Lv4
- Tiles chosen in Act 3 tile-select start at Lv 2
- Stock is seeded per `run.seed + nodeId` -- deterministic across visits

## Persistence & Resume
- Continue from main menu checks: combat snapshot → incomplete non-combat node → map
- Non-combat nodes (merchant, campfire, event, treasure) marked completed when returning to map
- If node is visited but not completed, Continue returns to that screen
- Player name stored in `metaStore` (localStorage), used for anonymous leaderboard scores

## IndexedDB
- DB name: `one-more-in-the-chamber`, version 3
- Stores: runs, meta, scores, combat_snapshots
- Corrupt DB detection: if version matches but stores are missing, auto-delete and recreate
- `purgeCorruptSnapshots()` on startup removes snapshots with all-null tile boards

## Key Files
- `src/App.tsx` -- screen management, combat start/stop, snapshot save/load
- `src/game/GameConfig.ts` -- Phaser resolution (640x360)
- `src/game/scenes/BootScene.ts` -- asset loading, music management, BOOT_COMPLETE
- `src/game/scenes/CombatScene.ts` -- combat board + VFX
- `src/game/board/Board.ts` -- 8x8 grid, input, cascades, destroyTilesWithEffects, hints
- `src/game/board/Tile.ts` -- tile rendering, VFX overlays + outlines
- `src/game/combat/CombatManager.ts` -- turn-based combat, resource application
- `src/game/combat/ResourceResolver.ts` -- per-tile resource generation
- `src/game/combat/Player.ts` -- player state, ability charge
- `src/game/combat/Enemy.ts` -- enemy state, damage, status effects
- `src/data/tiles.ts` -- tile definitions, pools, colors
- `src/data/spriteConfig.ts` -- all sprite frame indices (TILE_FRAMES, UI_FRAMES, NODE_FRAMES, etc.)
- `src/store/combatStore.ts` -- React HUD state synced via EventBus
- `src/store/metaStore.ts` -- meta progression + player name (localStorage)
- `src/ui/components/SpriteIcon.tsx` -- integer-scale canvas rendering for pixel art
- `src/ui/components/KeywordText.tsx` -- keyword colorization + buildTileDescription
- `src/utils/seededRandom.ts` -- createSeededRandom, seededShuffle
- `src/services/localSave.ts` -- IndexedDB CRUD + purgeCorruptSnapshots
- `src/services/syncService.ts` -- Supabase push (scores with player_name)
- `src/services/leaderboard.ts` -- fetch top 10 scores by period
