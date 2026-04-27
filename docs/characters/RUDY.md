# Rudy -- Armadillo Sheriff

## Overview

**Name:** Rudy
**Species:** Armadillo
**Archetype:** Sheriff / defensive bruiser
**Character ID:** `rudy` (planned)
**Unlock:** TBD
**HP:** 100 (planned)

An old frontier sheriff in a sun-bleached duster, wide-brim hat, and dented badge. Rudy is the block-scaling character: he builds block, preserves it, and turns a fortified board state into delayed punishment.

## Backstory

Rudy used to keep peace in a border town that barely deserved the word. One road in, one road out, a jail with one working lock, and a courthouse bell that rang more often for funerals than trials. He was not quick, not flashy, and not especially charming. But when Rudy stood in a doorway, trouble usually decided it had business elsewhere.

That changed when Iron Eye Isabella started buying towns instead of robbing them.

Her riders came through with contracts, badges, and enough money to make honest animals forget which side of the bars they belonged on. Rudy refused the offer. Then he refused the second one. On the third visit, Isabella's men burned the jail, emptied the evidence room, and pinned the whole thing on him. By sunrise, the sheriff was wanted for corruption, arson, and murder in the town he had spent his life protecting.

Rudy could have run. Instead, he rolled up, took the beating, and survived long enough to crawl out from under the wreckage with his badge still in his fist.

Now he is headed toward the Town with a warrant nobody recognizes and a grudge he refuses to call revenge. Rust wants a bounty lifted. Reno wants a debt cleared. Rudy wants the law put back where it belongs, even if he has to carry it there on his shell.

*"A badge ain't worth much when the town stops believing in it. Good thing I was never counting on the badge."*

## Pixel Art Personality

- **Idle:** Heavy sheriff stance, one claw near his badge
- **Attack:** Short, grounded draw or shell-backed shove
- **Hit:** Braces behind his shell and barely gives ground
- **Ability:** Full defensive crouch, then a dust-heavy ground slam

## Starting Kit

Rudy should start each run with:

- **Starting artifact:** Deputy's Star
- **Core tiles:** Iron, Barricade, Boulder, Badge
- **Starter tile choice:** At run start, choose 1 of 3 offered starter-pool tiles to become the fifth active tile

## Core Tiles

| Tile | Per-tile / Match Output | Upgrade | Notes |
|------|--------------------------|---------|-------|
| Iron | 2 block per tile | +2 block to match total per level | Standard defense. |
| Barricade | 2 block per tile + 1 Barricade stack | +1 block per tile per level | Keeps Rudy's block plan from falling apart between turns. |
| Boulder | 20% of current block as damage | Cannot be upgraded | Converts stored block into direct targeted damage. |
| **Badge** | 1 Resolve stack per tile | +1 Resolve stack per tile per level | Rudy-exclusive delayed block damage. |

### Badge Mechanic

- Badge grants Resolve to Rudy.
- Badge grants `1 + tile level` Resolve per Badge tile matched.
- Resolve lasts until the end of the player turn.
- At end of turn, each Resolve deals damage to the targeted enemy equal to 10% of Rudy's current block.
- Resolve damage does not consume block.
- If there is no valid target, Resolve hits a random living enemy.
- Resolve expires after it deals damage.

**Badge** flavor: *"Authority is heavy. Carry it anyway."*

## Ability -- Hunker Down

**Charge threshold:** 8 (planned)

**Charge gain:**
- +1 charge at the start of each player turn, up to the threshold.
- Battery matches and other charge effects can add charge.

**Activation:** Press Space or click the chamber button while fully charged.

Hunker Down is a defensive spike that rewards using Rudy's ability after he has already built a strong block total.

### Hunker Down Behavior

- Gain block equal to 50% of current block, with a minimum of 10 block.
- Spawn 3 Armored tiles on random non-special board spaces.
- Until the start of Rudy's next turn, incoming attack damage is reduced by 25%.
- Armored tiles behave like their normal tile type when matched or destroyed.
- When an Armored tile is matched or destroyed, Rudy gains 4 block.
- Armored status is removed after triggering once.

### Ability UI

- The chamber meter should use 8 segments.
- The ability label is `HUNKER DOWN`.
- Activation should briefly rattle the player portrait and board edge.
- Armored tiles should use a small silver shield overlay.
- Ability finish should trigger the shared chamber spin SFX/VFX.

## Exclusive Starting Artifact

### Deputy's Star

- **Tags:** Sheriff
- **Rarity:** Rare
- **Effect:** At the start of combat, gain 8 block. The first time each combat you end a turn with 20 or more block, gain 1 Ready.
- **Flavor:** *"Small badge. Big promise."*

## Exclusive Artifact

### Rudy's Shell

- **Tags:** Sheriff, Dead Man Walking
- **Rarity:** Legendary
- **Effect:** At the end of your turn, deal damage to the targeted enemy equal to 25% of your current block. If you blocked all incoming attack damage last enemy turn, gain 1 Barricade.
- **Flavor:** *"The law has armor."*

## Implementation Notes

- Rudy is a proposed character and is not currently wired into `CharacterId`.
- Planned starting tiles should be added to `CHARACTER_TILES.rudy`.
- Planned starting artifact should be assigned in `runStore.startRun()`.
- Badge output should be added to `ResourceResolver`.
- Resolve, Hunker Down, Armored tiles, Deputy's Star, and Rudy's Shell need implementation hooks in combat and artifact systems.
