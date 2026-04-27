# "Slick" Reno -- Raccoon Gambler

## Overview

**Name:** "Slick" Reno
**Species:** Raccoon
**Archetype:** Card sharp / gambler
**Character ID:** `reno`
**Unlock:** Reputation Shop character unlock, 2500 reputation
**HP:** 100

A raccoon card sharp in a silk vest and bowler hat. Reno is the luck and board-reset character: he starts with Ace scaling, gold economy, and Chip's high-variance damage, then uses False Shuffle to reroll the board into cascade opportunities.

## Backstory

Reno ran the best poker table in the territory -- not because he was good at cards, but because nobody ever realized he wasn't playing cards at all. He was playing *them*. Rigged decks, loaded dice, a grin that made you feel like you were winning right up until you checked your pockets.

He made a lot of money. Then he made the mistake of running a game on "Copperhead" Cassidy.

Cassidy didn't lose gracefully. She doesn't lose at all. When she figured out the raccoon in the silk vest had been dealing from the bottom for three straight hours, she didn't flip the table -- she smiled, bought him a drink, and told him exactly how much he now owed her. The number was not small. The interest was worse.

Reno skipped town that night. He's been skipping towns ever since. Every time he stops long enough to breathe, one of Cassidy's collectors shows up with a polite reminder and an impolite weapon. The debt follows him like a shadow with teeth.

So he heads deeper into the Frontier, figuring the one place Cassidy's reach might not extend is past her own front door. If he can get to her and settle the debt -- hustle enough gold, win the right game, talk his way out one more time -- maybe the running stops.

But when Reno finally reaches Cassidy, she laughs. The money he stole? It was never hers. She was holding the table for someone else -- running the game on behalf of "Iron Eye" Isabella. The debt Reno's been running from belongs to the most powerful animal in the Frontier, and Cassidy was just the middleman. Settling up with Copperhead doesn't clear a thing.

Now the running stops and the real game starts. Reno has to get to the Town, get to Isabella, and somehow talk his way out of a debt to someone who holds grudges like other people hold cards -- tight and forever. Isabella doesn't forgive. Not because she can't, but because she won't. He's been improvising his whole life. This is the last hand.

*"I don't cheat. I just play a different game than everyone else. It's not my fault they don't read the rules."*

## Pixel Art Personality

- **Idle:** Smooth gambler stance
- **Attack:** Flashy card-sharp strike
- **Hit:** Catches himself with annoyed composure
- **Ability:** False Shuffle pose

## Starting Kit

Reno starts each run with:

- **Starting artifact:** Rigged Deck
- **Core tiles:** Ace, Iron, Gold, Chip
- **Starter tile choice:** At run start, choose 1 of 3 offered starter-pool tiles to become the fifth active tile

## Core Tiles

| Tile | Per-tile / Match Output | Upgrade | Notes |
|------|--------------------------|---------|-------|
| Ace | 1 Ace stack per tile | +1 stack to match total per level | Ace increases the next non-Ace match multiplier, then is consumed. |
| Iron | 2 block per tile | +2 block to match total per level | Standard defense. |
| Gold | 1 gold per tile | +2 gold to match total per level | Early economy tile. |
| **Chip** | 50% chance for 6 damage per tile, 50% chance for 0 | +1 damage per tile per level | Reno-exclusive gamble damage. |

### Chip Mechanic

- Each Chip match rolls hit or miss.
- Without Reno's Coin, Chip is an independent 50/50 roll.
- On hit, Chip deals `(6 + tile level)` damage per Chip tile matched.
- On miss, Chip deals 0 damage.
- Chip hit/miss feedback appears in combat.

**Chip** flavor: *"What's the most you ever lost on a coin toss?"*

## Ability -- False Shuffle

**Charge threshold:** 5

**Charge gain:**
- +1 charge at the start of each player turn, up to the threshold.
- Battery matches and other charge effects can add charge.

**Activation:** Press Space or click the chamber button while fully charged.

False Shuffle immediately consumes 5 charge, shuffles all unlocked board tiles, and allows any matches created by the shuffle to cascade normally.

### False Shuffle Behavior

- Shuffles all unlocked tiles on the board.
- Locked tiles stay locked.
- The shuffle animation can create immediate matches.
- Matches created by False Shuffle resolve as cascades.
- Resources from those cascade matches are generated normally.
- After shuffle cascades resolve, the board is checked for valid moves and reshuffled if needed.
- False Shuffle does not currently use a tile-hold selection mode.

### Ability UI

- The chamber meter uses 5 segments.
- The ability label is `FALSE SHUFFLE`.
- Activation plays shuffle SFX.
- Ability finish triggers the shared chamber spin SFX/VFX.

## Exclusive Starting Artifact

### Rigged Deck

- **Tags:** Prospector
- **Rarity:** Rare
- **Effect:** Chip hits have a 50% chance to hit another enemy. Chip misses generate 2 gold.
- **Flavor:** *"Bad luck is still luck."*

## Exclusive Artifact

### Reno's Coin

- **Tags:** Desperado
- **Rarity:** Legendary
- **Effect:** Chip damage is doubled and hit chance is increased to 75%. On miss, lose 1 HP.
- **Implementation detail:** Reno's Coin uses a Chip bucket of 6 hits and 2 misses per 8 draws, instead of independent 75% rolls.
- **Flavor:** *"Double or nothing. Emphasis on nothing."*

## Implementation Notes

- `CharacterId`: `reno`
- Starting tiles are defined in `CHARACTER_TILES.reno`.
- Reno is unlocked through the Reputation Shop item `shop_character_reno`.
- Starting artifact is assigned in `runStore.startRun()`.
- False Shuffle behavior lives in `CombatManager.activateShuffle()`.
- Chip hit/miss output comes from `ResourceResolver`; Rigged Deck and Reno's Coin modifications are applied by `ArtifactSystem` and `CombatManager`.
