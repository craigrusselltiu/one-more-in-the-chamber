# Russ -- Red Panda Gunslinger

## Overview

**Name:** Russ
**Species:** Red Panda
**Archetype:** Bounty hunter / sharpshooter

Small, scrappy, cowboy gear. The underdog. Pixel art with expressive reactions -- flinch on hit, grin on big match, hat tip on boss kill.

## Backstory

Russ and Isabella grew up in the same dusty nowhere town. Kids with nothing to do and nowhere to be. One afternoon Russ got his hands on an old revolver -- rusty, supposedly unloaded. He was showing off, spinning it, pointing it at nothing. Then it went off.

The bullet caught Isabella across the face. Took her right eye. Russ panicked. By the time the town doctor patched her up, Russ's family had already packed up and disappeared down the trail.

Isabella never forgot. They both know it was an accident. That was never the question. But knowing doesn't fix an eye, and Isabella grew up mean, sharp, and powerful -- clawed her way to the top of the Frontier's food chain and earned the name "Iron Eye" for the prosthetic she wore like a badge of spite. First thing she did with real power was put a bounty on the red panda who took her eye. A big one.

Russ knows why. He's not trying to explain what happened -- they were both there. He's trying to get her to let it go. To call off the bounty. To accept that a stupid kid with a rusty gun shouldn't be a death sentence for the rest of his life.

But Isabella had years to make peace with it and chose not to. The bounty isn't about misunderstanding. It's about the fact that she lost something and someone has to pay for it, accident or not.

Now Russ is a wanted animal with his face on every board from the Dusty Trail to the Town. He picks up odd bounties to fund the trip, keeps his head down, and shoots his way through anyone who tries to collect. He didn't ask for this. But he's not going to lie down in the dust and let it end here either.

*"It was one shot. One stupid, lucky, terrible shot. And I've been paying for it ever since."*

## Core Tiles

Russ starts with 4 core tiles (other characters start with 3):

| Tile | Per-tile | Upgrade | Description |
|------|----------|---------|-------------|
| Bullet | 2 damage | +2 damage/level | Standard damage tile. |
| Iron | 2 block | +2 block/level | Standard block tile. |
| Gold | 1 gold | +2 gold/level | Standard gold tile. |
| **Bounty** | 2 stacks | +2 stacks/level | Apply 2 Bounty stacks per 3-match; +1 per extra tile. If enemy HP <= Bounty stacks, enemy dies. |

Act 1 has 5 tile types (4 core + 1 starter) instead of 4. Board dilution starts earlier, but the character-specific tile gives Russ a unique strategic identity.

### Bounty Mechanic

- Bounty stacks are applied to the **targeted enemy** when Bounty tiles are matched
- A 3-match applies 2 stacks; each extra tile in the match adds +1 stack
- Upgrades add +2 stacks to the match total per level
- Stacks persist until the enemy dies
- **Kill threshold:** whenever Bounty stacks are applied or the enemy takes damage, if the enemy's current HP is less than or equal to its Bounty stacks, the enemy dies instantly
- Bounty stacks are displayed as a status effect icon under enemy HP bars

## Ability -- Deadeye

**Charge:** +1 per player turn. Requires **10 charges** to activate. Meter carries over between fights.

**Activation:** Crosshair cursor appears. Select **3 tiles** anywhere on the board (6 with Fully Loaded). Each selected tile is destroyed and generates its resource. Gravity + cascades resolve after each shot.

**Deadeye + Showdown:** Shooting a Showdown tile clears all tiles of a random type on the board.

**Deadeye + Explosive:** Shooting an explosive tile detonates its 3x3 area.

**Deadeye + Bounty:** Shooting a Bounty tile applies stacks as normal and triggers the kill threshold check.

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
