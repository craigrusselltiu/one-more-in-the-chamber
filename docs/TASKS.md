> For all tasks: do not make patch jobs or shortcuts. Really think about creating good, maintainable solutions.

## Bug Fixes

- **Block not working correctly**
  - If player has BLK 24 and enemy ATK 9, BLK should drop to 15 and player takes no HP damage
  - If enemy has BLK 20, player damage hits BLK first, then carries over to HP once depleted
  - Example: BLK 10 + 15 damage dealt = 10 damage to BLK, 5 damage to HP
  - Applies to both player and enemies

- **Ricochet** doesn't hit and clear a random tile

- **Showdown swap behavior** — swapping the Showdown tile with any other tile should clear all tiles of that type AND trigger them (e.g. swapping Showdown with a Bullet tile deals damage equal to the current bullet count on the board)

## UI / UX

- **Artifact tooltips** — artifacts should show tooltips describing what they do, like consumables do

- **Status indicators on tiles** — add a visual indicator on tiles that have active statuses

- **Remove pixel filter** — the pixel/scanline filter is visible on the map and board; remove it

- **End Turn button** — move to bottom-left of the combat screen; move swap count display above it

- **Top bar consistency** — the top bar should not change appearance between the map screen and the combat screen

## Mechanics

- **Trigger vs. Clear distinction**
  - *Triggering* a tile: the tile activates its effect (e.g. Bullet deals 3 damage) and is removed from the board
  - *Clearing* a tile: the tile is removed from the board without dealing damage or triggering statuses
  - Tiles should only **trigger** when: matched, hit by ricochet, or swapped with Showdown
  - Tiles should only **clear** (not trigger) when: hit by cross clear, explosion, etc.

## Tile Rebalance

Default upgrade behavior should add to the **total of the match** rather than per tile (e.g. a 3-match Bullet goes from 6 damage → 7 damage total).

| Tile | Change |
|---|---|
| Bullet | Reduce to 2 damage per tile |
| Stampede | Reduce to 1 damage per tile to all enemies |
| Buckshot | 1 damage per tile; upgrades add 1 damage per tile (e.g. 5-match goes from 5 → 10) |
| Iron | Reduce to 1 block per tile |
| Gold | Reduce to 1 gold per tile |
| Dynamite | 1 charge for 3-match, 2 for 4-match, 3 for 5-match |
| Whiskey | Reduce to 1 HP heal per tile |
| Ace | Upgrades give +0.25x to total per match |
| Horseshoe | Upgrades give +5% crit to total per match |
| .50 Cal | **New tile.** 5 damage per tile; upgrades add 1 damage per tile |
