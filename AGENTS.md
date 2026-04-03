# AGENTS.md - Development Learnings

## Project Architecture
- Phaser 3 game with React UI overlay, bridged by a custom EventBus
- Zustand stores: `runStore` (active run), `combatStore` (HUD state), `metaStore` (progression)
- IndexedDB persistence: runs, meta, scores, combat snapshots
- Screen-based navigation via `EventBus.emit(GameEvent.SCREEN_CHANGE, screenName)`
- Unified TopBar + ArtifactBar rendered once in App.tsx for all in-run screens

## Game Flow
Main Menu -> Character Select -> Tile Select -> Map -> [Combat/Shop/Event/Rest/Treasure] -> ... -> Boss -> Next Act or Victory

## Critical: Phaser Scene Lifecycle
- CombatScene is started with `game.scene.start('CombatScene', data)` and stopped with `game.scene.stop('CombatScene')`
- Phaser does NOT auto-call a `shutdown()` method on scenes. Must register: `this.events.on('shutdown', this.shutdown, this)`
- When Phaser stops a scene, `Systems.shutdown()` destroys all game objects in the display list
- Scene instances are singletons in Phaser 3 - same instance reused on restart
- `SceneManager.update` processes scenes in registration order without error isolation. A crash in any scene blocks all subsequent scenes.

## Music System
- BootScene manages all music via `playTrack(key)` and `fadeOut()` with proxy tweens
- Uses `desiredTrack` + `audioUnlocked` pattern: screen changes update desiredTrack immediately, gesture handler (on 'click', not 'pointerdown') defers playback via requestAnimationFrame so the correct track plays even on fast clicks
- Use 'click' event for audio unlock (not 'pointerdown') so React onClick handlers fire first
- Settings/leaderboard/reputation-shop don't change music (main menu sub-screens)
- Rest/treasure keep map music playing

## Tile System
- TileType union in `types/game.ts`, definitions in `data/tiles.ts`
- ResourceResolver handles base output per tile type; CombatManager handles special behaviors (saloon adjacent, ricochet random, tombstone execute, etc.)
- Tiles have `upgradeText` field - tiles without it can't be upgraded at campfire
- `spawnSpecialTile(row, col, type, kind)`: kind='explosive' for bomb tiles, kind='showdown' for showdown tiles. Showdown is detected by kind, not type.
- Mirage tiles shuffle via `board.shuffleMirageTiles()` at the start of every swap
- Prairie Fire spread happens per match step (not end of cascade), 10% chance, can chain

## Status Effects
- Ace: +0.25x multiplier per stack on next non-Ace match, consumed when used (Player.consumeAce)
- Lucky: +1% crit per stack, all stacks consumed when crit triggers (Player.consumeLucky)
- Barricade: retain block if no damage taken this turn, stacks decrement each turn
- Vulnerable: +50% damage, decreases by 1 at end of enemy turn (NOT consumed on hit)
- Venom: damage = stacks at turn start, stacks decrease by 1

## Combat Manager Patterns
- `makeCascadeStepHandler()` shared by swap and deadeye for consistent SFX/combo/hazard resolution
- `dealDamageToEnemy()` helper handles pierce + floating numbers
- `floatOnPlayer()`/`floatOnEnemy()` emit FLOATING_NUMBER events rendered by React FloatingNumbers component
- Deadeye cancels on combat end and snapshot restore
- Chain tile damage bonus tracked per-fight via `ResourceResolver.chainBonusThisFight`

## Floating Numbers
- Rendered as React overlay (FloatingNumbers.tsx in CombatHUD), NOT Phaser objects, so they appear above HP bars
- Physics: pop upward then arc down with gravity, fade over 1 second
- Spawn in rectangular areas matching character sprites to prevent overlap

## Map Generation
- 13 rows per act. Row 0 = combat, last = boss, second-to-last = rest, midpoint = treasure
- Post-generation ensures: 2-3 shops, 3-4 rest sites, 3-4 elites
- First 3 rows: no events or rest sites
- No consecutive rest sites or shops
- Node.visited = clicked on map, Node.completed = finished (used for scoring)

## Browser Testing
- To open a URL in Chrome: use `mcp__chrome-devtools__list_pages` then `navigate_page` or `new_page`. Use `take_screenshot` for screenshots. Never use `start chrome` via Bash or `claude-in-chrome` tabs_context — both create duplicate windows.
- Service worker only registers in production (no port in URL). In dev, any existing SW is auto-unregistered.
- Canvas click limitation: CSS-transformed overlay makes synthetic events unreliable. Use `mcp__chrome-devtools__click` for uid-based elements only. For canvas interactions, ask the user.

## Key Files
- `src/App.tsx` - Screen management, combat start/stop, unified TopBar rendering
- `src/game/scenes/CombatScene.ts` - Phaser scene for combat board + VFX
- `src/game/scenes/BootScene.ts` - Asset loading, music management
- `src/game/board/Board.ts` - 8x8 grid, tile creation, swap input, cascades
- `src/game/board/Tile.ts` - Tile rendering, effect overlays (rainbow/yellow/red breathing)
- `src/game/board/CascadeResolver.ts` - Cascade loop, special tile detonation, prairie fire spread
- `src/game/combat/CombatManager.ts` - Turn-based combat logic, resource application
- `src/game/combat/ResourceResolver.ts` - Per-tile resource generation
- `src/game/combat/Player.ts` - Player state, status effect management
- `src/game/combat/Enemy.ts` - Enemy state, damage/venom/vulnerable
- `src/game/map/MapGenerator.ts` - Seeded map generation with constraints
- `src/data/tiles.ts` - Tile definitions, pools, colors
- `src/data/spriteConfig.ts` - All sprite frame indices (tiles, status, nodes, UI, traits)
- `src/store/combatStore.ts` - React HUD state synced from EventBus
- `src/store/settingsStore.ts` - Music/SFX volume, game speed, localStorage persistence
- `src/store/metaStore.ts` - Reputation, unlocks, localStorage persistence
- `src/ui/components/Tooltip.tsx` - Unified tooltip (text or rich content, top/bottom position)
- `src/ui/hud/FloatingNumbers.tsx` - React-based floating combat numbers
