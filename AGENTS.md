# AGENTS.md

## Architecture
- Phaser 3 game + React UI overlay, bridged by EventBus
- Stores: `runStore` (run state), `combatStore` (HUD), `metaStore` (progression)
- IndexedDB persistence for runs, meta, scores, combat snapshots
- Screen navigation: `EventBus.emit(GameEvent.SCREEN_CHANGE, screenName)`

## Game Flow
Main Menu -> Character Select -> Tile Select -> Map -> [Combat/Shop/Event/Rest/Treasure] -> Boss -> Next Act -> Victory

## Phaser Scenes
- `game.scene.start('CombatScene', data)` / `game.scene.stop('CombatScene')`
- Must register shutdown manually: `this.events.on('shutdown', this.shutdown, this)`
- Scene instances are singletons -- same instance reused on restart
- A crash in any scene blocks all subsequent scenes (no error isolation)

## Pixel Art Rendering
- Board tiles: 16px source sprites at **integer 2x scale** (TILE_SIZE=32). Never use fractional sprite scales in Phaser -- causes distortion.
- To make the board appear smaller, increase the Phaser internal resolution (GAME_WIDTH/GAME_HEIGHT) rather than changing TILE_SIZE. Board stays crisp at 2x.
- React SpriteIcon: draws on canvas at integer scale (ceil), then CSS-sizes to desired display size with `imageRendering: pixelated`. Prevents blurry fractional scaling for trait icons etc.

## Music
- BootScene manages all music via `playTrack(key)` / `fadeOut()` with proxy tweens
- `desiredTrack` + `audioUnlocked` pattern; use 'click' (not 'pointerdown') for audio unlock
- Rest/treasure keep map music; settings/leaderboard don't change music

## Tiles
- TileType in `types/game.ts`, definitions in `data/tiles.ts`
- ResourceResolver: base output per type. CombatManager: special behaviors (saloon, ricochet, tombstone, etc.)
- Tiles need `upgradeText` to be upgradeable at campfire
- `spawnSpecialTile(row, col, type, kind)`: kind='explosive' or kind='showdown'

## Characters
- CharacterId: `'red_panda'` (Russ) or `'reno'`
- Character flows through: runStore -> CombatConfig -> CombatManager -> combatStore -> UI
- Ability threshold: Russ=10 (Deadeye), Reno=7 (Shuffle the Deck)
- Exclusive core tiles: Russ=bounty, Reno=chip. Added to activeTileTypes in runStore.startRun()
- Combat snapshots include character for proper restore

## Status Effects
- Ace: +0.25x multiplier/stack, consumed on non-Ace match
- Lucky: +1% crit/stack, consumed on crit
- Barricade: retain block if no damage taken, stacks decrement/turn
- Vulnerable: +50% damage, decreases by 1 at end of enemy turn (not on hit)
- Venom: damage=stacks at turn start, stacks-=1
- Bounty: if enemy HP <= stacks, enemy dies (checked on apply and on damage)

## Combat Manager
- `makeCascadeStepHandler()` shared by swap/deadeye/shuffle for consistent resolution
- `dealDamageToEnemy()` handles pierce + floating numbers + bounty kill check
- Deadeye cancels on combat end and snapshot restore
- Chain bonus tracked per-fight via `ResourceResolver.chainBonusThisFight`

## Map Generation
- 13 rows/act. Row 0=combat, last=boss, second-to-last=rest, midpoint=treasure
- Constraints: 2-3 shops, 3-4 rest sites, 3-4 elites, no consecutive rest/shops

## Key Files
- `src/App.tsx` -- screen management, combat start/stop
- `src/game/GameConfig.ts` -- Phaser resolution (640x360)
- `src/game/scenes/CombatScene.ts` -- combat board + VFX
- `src/game/board/Board.ts` -- 8x8 grid, input, cascades
- `src/game/board/Tile.ts` -- tile rendering, overlays
- `src/game/combat/CombatManager.ts` -- turn-based combat, resource application
- `src/game/combat/ResourceResolver.ts` -- per-tile resource generation
- `src/game/combat/Player.ts` -- player state, ability charge
- `src/game/combat/Enemy.ts` -- enemy state, damage, status effects
- `src/data/tiles.ts` -- tile definitions, pools, colors
- `src/data/spriteConfig.ts` -- all sprite frame indices
- `src/store/combatStore.ts` -- React HUD state synced via EventBus
- `src/ui/components/SpriteIcon.tsx` -- integer-scale canvas rendering for pixel art
