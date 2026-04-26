# Rust -- Red Panda Gunslinger

## Overview

**Name:** Rust
**Species:** Red Panda
**Archetype:** Bounty hunter / sharpshooter
**Character ID:** `red_panda`
**Unlock:** Available by default
**HP:** 100

Small, scrappy, cowboy gear. Rust is the direct damage character: he starts with reliable attacks, a Vulnerable setup tile, and Bounty for executions and gold payouts.

## Backstory

Rust and Isabella grew up in the same dusty nowhere town. Kids with nothing to do and nowhere to be. One afternoon Rust got his hands on an old revolver -- rusty, supposedly unloaded. He was showing off, spinning it, pointing it at nothing. Then it went off.

The bullet caught Isabella across the face. Took her right eye. Rust panicked. By the time the town doctor patched her up, Rust's family had already packed up and disappeared down the trail.

Isabella never forgot. They both know it was an accident. That was never the question. But knowing doesn't fix an eye, and Isabella grew up mean, sharp, and powerful -- clawed her way to the top of the Frontier's food chain and earned the name "Iron Eye" for the prosthetic she wore like a badge of spite. First thing she did with real power was put a bounty on the red panda who took her eye. A big one.

Rust knows why. He's not trying to explain what happened -- they were both there. He's trying to get her to let it go. To call off the bounty. To accept that a stupid kid with a rusty gun shouldn't be a death sentence for the rest of his life.

But Isabella had years to make peace with it and chose not to. The bounty isn't about misunderstanding. It's about the fact that she lost something and someone has to pay for it, accident or not.

Now Rust is a wanted animal with his face on every board from the Dusty Trail to the Town. He picks up odd bounties to fund the trip, keeps his head down, and shoots his way through anyone who tries to collect. He didn't ask for this. But he's not going to lie down in the dust and let it end here either.

*"It was one shot. One stupid, lucky, terrible shot. And I've been paying for it ever since."*

## Pixel Art Personality

- **Idle:** Small, alert gunslinger stance
- **Attack:** Quick revolver shot
- **Hit:** Flinches but stays upright
- **Ability:** Deadeye focus pose

## Starting Kit

Rust starts each run with:

- **Starting artifact:** Bamboo Canteen
- **Core tiles:** Bullet, Iron, Shank, Bounty
- **Starter tile choice:** At run start, choose 1 of 3 offered starter-pool tiles to become the fifth active tile

## Core Tiles

| Tile | Per-tile / Match Output | Upgrade | Notes |
|------|--------------------------|---------|-------|
| Bullet | 2 damage per tile | +2 damage to match total per level | Reliable targeted damage. |
| Iron | 2 block per tile | +2 block to match total per level | Standard defense. |
| Shank | 1 damage per tile + 1 Vulnerable | +2 damage to match total per level | Adds Vulnerable after the match damage resolves. |
| **Bounty** | 1 Bounty stack per tile | +1 stack per tile per level | Rust-exclusive execution setup. |

### Bounty Mechanic

- Bounty stacks are applied to the targeted enemy.
- Bounty applies `1 + tile level` stack per Bounty tile matched.
- After Bounty is applied, and after any enemy takes damage, the game checks that enemy's Bounty threshold.
- If an enemy's current HP is less than or equal to its Bounty stacks, it is killed immediately.
- Bounty kills count the enemy's Bounty stacks toward damage score.
- Bounty kills on non-summoned enemies grant 10 gold.
- Bounty stacks persist until the enemy dies.

**Bounty** flavor: *"The S is silent."*

## Ability -- Deadeye

**Charge threshold:** 6

**Charge gain:**
- +1 charge at the start of each player turn, up to the threshold.
- Battery matches and other charge effects can add charge.
- Charge gained while Deadeye is active is held as pending charge and rolls in when Deadeye ends.

**Activation:** Press Space or click the chamber button while fully charged.

Deadeye enters tile-targeting mode. Rust can shoot tiles anywhere on the board.

### Base Deadeye Behavior

- Base Deadeye has 3 shots.
- Each shot destroys the selected tile through `Board.destroyTilesWithEffects`.
- Destroyed tiles generate their normal resources.
- Gravity, refill, and cascades resolve after each shot.
- Special destruction is handled by the board:
  - Explosive tiles detonate through the normal explosive chain system.
  - Showdown tiles trigger their normal type-clear effect.
  - Bounty tiles apply Bounty normally and can trigger execution.
- If Deadeye creates a dead board, the board reshuffles before control returns.
- Deadeye can be canceled after a short lockout. Canceling before any shot keeps the charge; canceling after shots does not refund spent charge, but pending charge gained during Deadeye can roll over.

### Ability UI

- The chamber meter uses 6 segments while charging.
- When active, the chamber displays remaining shots instead of charge.
- Deadeye uses a crosshair cursor. With Rust's Cylinder, the final shot uses the alternate enemy-target cursor.
- Ability finish triggers the shared chamber spin SFX/VFX.

## Exclusive Starting Artifact

### Bamboo Canteen

- **Tags:** Saloon Keeper
- **Rarity:** Rare
- **Effect:** After completing combat, restore 6 HP.
- **Flavor:** *"Bamboo doesn't rust."*

## Exclusive Artifact

### Rust's Cylinder

- **Tags:** Gunslinger, Outlaw
- **Rarity:** Legendary
- **Effect:** Increase Deadeye shots to 6. The last shot can be used on an enemy, dealing 7 damage plus 1 damage per Bounty stack on that enemy.
- **Flavor:** *"Six in the chamber. No reloads."*

## Implementation Notes

- `CharacterId`: `red_panda`
- Starting tiles are defined in `CHARACTER_TILES.red_panda`.
- Starting artifact is assigned in `runStore.startRun()`.
- Deadeye and Rust's Cylinder behavior live in `CombatManager`.
- Bounty resource output comes from `ResourceResolver`; execution is handled by `CombatManager.handleBountyKill()`.
