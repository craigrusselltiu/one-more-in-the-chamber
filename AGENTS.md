# AGENTS.md - Development Learnings

## Project Architecture
- Phaser 3 game with React UI overlay, bridged by a custom EventBus
- Zustand stores: `runStore` (active run), `combatStore` (HUD state), `metaStore` (progression)
- IndexedDB persistence: runs, meta, scores, combat snapshots
- Screen-based navigation via `EventBus.emit(GameEvent.SCREEN_CHANGE, screenName)`

## Game Flow
Main Menu -> Character Select -> Tile Select -> Map -> [Combat/Shop/Event/Rest/Treasure] -> ... -> Boss -> Next Act or Victory

## Critical: Phaser Scene Lifecycle
- CombatScene is started with `game.scene.start('CombatScene', data)` and stopped with `game.scene.stop('CombatScene')`
- Phaser does NOT auto-call a `shutdown()` method on scenes. Must register: `this.events.on('shutdown', this.shutdown, this)`
- When Phaser stops a scene, `Systems.shutdown()` destroys all game objects in the display list
- The `shutdown` event fires BEFORE Phaser's own cleanup
- Scene instances are singletons in Phaser 3 - same instance reused on restart

## Root Cause: Board Not Rendering on Second Run (FIXED)
- **Symptom**: After give-up/death/refresh -> new game -> combat, the board area is empty (brown background, HUD shows, enemies show, but no tiles). Intermittent.
- **Root cause**: BootScene's audio fade-out tween crashes with `TypeError: Cannot set properties of null (setting 'volume')` when the WebAudioSound's internal audio node is nullified (e.g. on context suspend). Since Phaser's `SceneManager.update` iterates scenes without try-catch, a crash in BootScene's TweenManager prevents CombatScene's TweenManager from ever running. CombatScene's intro animation tweens (which drop tiles from above the board into view) never process, so tiles stay offscreen and `startTurn()` is never called.
- **Fix**: Changed `fadeOutMenuMusic()` to use a proxy object for the tween instead of tweening the Phaser sound directly. Volume is set via `try/catch` in `onUpdate` callback, so a null audio node doesn't crash the update loop.
- **Key insight**: In Phaser 3, `SceneManager.update` processes scenes in registration order without error isolation. A crash in any scene's update loop blocks all subsequent scenes from updating.

## Map Interaction
- Gold-outlined nodes = already visited
- First click on a node shows tooltip, may need second click or specific interaction to enter
- Starting nodes are at the bottom row (row 0)
- Nodes must be connected from current position to be clickable

## Browser Testing
- To open a URL in Chrome: use `mcp__chrome-devtools__list_pages` to check Chrome, then `mcp__chrome-devtools__navigate_page` or `mcp__chrome-devtools__new_page`. Use `mcp__chrome-devtools__take_screenshot` for screenshots. Never use `start chrome` via Bash or `claude-in-chrome` tabs_context — both create duplicate windows.
- Service worker only registers in production (no port in URL). In dev, any existing SW is auto-unregistered to prevent stale cache issues.
- Canvas click limitation: the game UI uses a CSS-transformed overlay (scale transform). React 18's event delegation does NOT respond to synthetic `dispatchEvent` on canvas elements inside transformed containers. `mcp__chrome-devtools__click` only works with uid-based elements, not canvas pixels. For canvas interactions (map nodes, board tiles), ask the user to click manually.

## Key Files
- `src/App.tsx` - Screen management, combat start/stop orchestration
- `src/game/scenes/CombatScene.ts` - Phaser scene for combat board
- `src/game/board/Board.ts` - 8x8 grid, tile creation, swap input, cascades
- `src/game/board/Tile.ts` - Individual tile rendering (rectangle + text label)
- `src/game/combat/CombatManager.ts` - Turn-based combat logic
- `src/store/runStore.ts` - Active run state (Zustand)
- `src/ui/screens/MainMenu.tsx` - Main menu with Continue/New Game
- `src/ui/hud/TopBar.tsx` - In-game top bar with Give Up button
- `src/services/localSave.ts` - IndexedDB CRUD
- `src/services/runPersistence.ts` - Auto-save run on store changes
- `src/services/combatResume.ts` - Mid-combat snapshot restore
