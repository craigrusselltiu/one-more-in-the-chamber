# Colt -- Red Panda Gunslinger

## Overview

**Name:** Colt

Small, scrappy, cowboy gear. The underdog. Pixel art with expressive reactions -- flinch on hit, grin on big match, hat tip on boss kill.

## Core Tiles

Red Panda starts with 4 core tiles (other characters start with 3):

| Tile | Per-tile | Upgrade | Description |
|------|----------|---------|-------------|
| Bullet | 1 damage | +2 damage/level | Standard damage tile. |
| Iron | 1 block | +2 block/level | Standard block tile. |
| Gold | 1 gold | +2 gold/level | Standard gold tile. |
| **Bounty** | 1 damage | +2 damage/level | Deal 1 damage per tile. Apply 1 Bounty stack per tile to targeted enemy. Deadeye shots deal +1 bonus damage per Bounty stack on target, then consume all stacks. |

**Bounty** flavor: *"Higher the bounty, harder they fall."*

Act 1 has 5 tile types (4 core + 1 starter) instead of 4. Board dilution starts earlier, but the character-specific tile gives Red Panda a unique strategic identity.

### Bounty Mechanic

- Bounty stacks are applied to the **targeted enemy** when Bounty tiles are matched
- Stacks persist until consumed by Deadeye or the enemy dies
- During Deadeye: each shot checks the targeted enemy's Bounty stacks, deals +1 damage per stack, then sets stacks to 0
- Stacks do NOT scale with upgrades -- only the damage portion scales
- Bounty stacks are displayed as a status effect icon under enemy HP bars

## Ability -- Deadeye

**Charge:** +1 per player turn. Requires **10 charges** to activate. Meter carries over between fights.

**Activation:** Crosshair cursor appears. Select **3 tiles** anywhere on the board (6 with Fully Loaded). Each selected tile is destroyed and generates its resource. Gravity + cascades resolve after each shot.

**Deadeye + Showdown:** Shooting a Showdown tile clears all tiles of a random type on the board.

**Deadeye + Explosive:** Shooting an explosive tile detonates its 3x3 area.

**Deadeye + Bounty:** Each shot consumes Bounty stacks on the targeted enemy for bonus damage.

### Ability Bar

The ability bar spans the full width of the board at the bottom, split into 10 segments (one per charge threshold).

- **Charging:** Filled segments are RED. Unfilled segments are dark gray.
- **Ready (10/10):** All segments turn YELLOW with a pulsing glow VFX.
- **Active Deadeye:** Shows shots remaining as gold indicator dots.

### Shot VFX & SFX

Each Deadeye shot:
- Plays a gunshot sound effect
- Triggers an enhanced particle explosion (bigger and more particles than standard tile clears, mix of tile color + white)
- Leaves a bullet hole at the tile position that fades away after ~1 second
- Light screen shake on impact

## Exclusive Artifact

**Fully Loaded** -- Deadeye: 3 shots become 6. *"Six in the chamber. No reloads."*
