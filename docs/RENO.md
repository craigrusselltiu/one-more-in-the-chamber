# "Slick" Reno -- Second Playable Character

## Overview

**Name:** "Slick" Reno
**Species:** Raccoon
**Archetype:** Card sharp / gambler
**Sprite:** 64x64 pixel art

A raccoon card sharp in a silk vest and bowler hat. Where Russ is a scrappy gunslinger who aims true, Reno is a smooth-talking gambler who stacks the odds. He doesn't fight fair -- he fights lucky.

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

- **Idle:** Flips a poker chip across his knuckles
- **Match:** Smirks and tips his hat
- **Hit:** Catches his falling bowler hat, annoyed
- **Ability:** Fans a deck of cards, then scatters them across the board
- **Boss kill:** Leans back, puts feet up on the table

## Core Tiles

Reno starts with 4 core tiles (other characters start with 3):

| Tile | Per-tile | Upgrade | Description |
|------|----------|---------|-------------|
| Bullet | 1 damage | +2 damage/level | Standard damage tile. |
| Iron | 1 block | +2 block/level | Standard block tile. |
| Gold | 1 gold | +2 gold/level | Standard gold tile. |
| **Chip** | 10 or 0 damage | +5 damage/level | 50% chance to deal 10 damage; 50% chance to deal 0. |

**Chip** flavor: *"Heads or tails. Either way, the coin's in the air."*

Act 1 has 5 tile types (4 core + 1 starter) instead of 4. Board dilution starts earlier, but the character-specific tile gives Reno a unique strategic identity.

### Chip Mechanic

- Each Chip match rolls a 50/50: hit or miss
- Hit: deal 10 + upgrade bonus damage to the targeted enemy
- Miss: deal 0 damage
- Match length does not affect the outcome (flat per match)
- Upgrades add +5 damage per level to the hit value

## Ability -- Shuffle the Deck

**Charge:** +1 per player turn. Requires **7 charges** to activate. Meter carries over between fights.

**Activation (press Space):**
1. Enter **Hold mode** -- select up to **3 tiles** to hold (marked with a gold tint, locked in place)
2. Press Space again (or click SHUFFLE) to confirm
3. All non-held tiles shuffle to random board positions
4. Board resolves: any matches created by the shuffle cascade normally, generating resources

**Key interactions:**
- Hold a Showdown or Explosive tile to protect it through the shuffle
- Shuffle can break a dead board when no good swaps exist
- Cascades from the shuffle generate full resources
- The shuffle itself is the value -- a board reset that creates new match opportunities

### Ability Bar

The ability bar spans the full width of the board at the bottom, split into 7 segments (one per charge threshold).

- **Charging:** Filled segments are PURPLE (#B060D0). Unfilled segments are dark gray.
- **Ready (7/7):** All segments turn YELLOW with a pulsing glow VFX.
- **Active Hold Mode:** Shows holds used as gold dots. SHUFFLE button to confirm.

### Contrast with Deadeye

| | Deadeye (Russ) | Shuffle the Deck (Reno) |
|---|---|---|
| Charge | +1/turn, threshold 10 | +1/turn, threshold 7 |
| Value type | Direct (destroy tiles = immediate resources) | Setup (rearrange board = create opportunities) |
| Skill expression | Pick the 3 best tiles to shoot | Pick the 3 best tiles to hold |
| Feel | Precision marksman | Chaos with a safety net |

## Exclusive Artifact

**Double Down** -- Chip damage doubled on hit. On miss, lose HP (starts at 1, increases by 1 per miss permanently). *"The stakes just got higher."*
