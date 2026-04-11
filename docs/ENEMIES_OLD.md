# Moves
- Enemies in general should not perform the same move twice in a row unless specifed.
- If a non-elite combat happens within the first 3 nodes of an act, choose from Early Normal Encounters, otherwise Late Normal Encounters.
- Encounters should be taken from a bag, and gets refilled when empty, preventing duplicates as much as possible.

## Normal Moves
- Attack - deal damage to the player
- Multi-attack - deal damage X times to the player, e.g. 4x2 = 4 damage twice
- Block - gain block
- Lock - could be X tiles, or 1 row/column
- Apply X Debuff - debuff the player directly
- Hazard X Tiles - put hazard on tiles
- Bomb
- Bury
- Fool's Gold
- Suppress
- Heal

## Exclusive Moves
- Gravity Shift - Dusty exclusive, shifts gravity clockwise, e.g. if gravity is down, shifts it left

## Summoned Enemies
- Summoned enemies have the same moveset as their non-summoned versions, but cannot summon themselves.
- Summoned enemies are summoned with HP equal to 1/3 of the non-summoned version's Max HP.
- If there are no more enemy slots, enemies should not summon.

# Act 1 -- The Dusty Trail

## Normal Enemies Pool

### Bandit
- Base HP: 45
- Moves:
    - Attack 12, Lock 3
    - Multi-attack 6x2
    - Attack 6, Block 12
    - Gain 2 Rageful
    - Summon 1 Bandit
- NOTE: If dropped below 50% HP, will try to block.

### Coyote
- Base HP: 32
- Moves:
    - Attack 7
    - Attack 5, Gain 2 Rageful
    - Block 7, Bury 2
    - Summon 1 Coyote
- NOTE: If alone, always summons.

### Rattlesnake
- Base HP: 40
- Start of fight: Poison 3 Tiles
- Moves:
    - Attack 11, Apply 2 Poison
    - Attack 5, Poison 3 Tiles
    - Block 14
    - Poison 5 Tiles

### Vulture
- Base HP: 29
- Moves:
    - Attack 8, Apply 1 Terrified
    - Multi-attack 2x3, Bury 3
    - Attack 4, Block 6
    - Heal 6

### Pack Mule
- Base HP: 68
- Moves:
    - Attack 13
    - Attack 10, Block 8
    - Bomb 1, Bury 3
    - Heal 8

## Elite Enemies Pool

### Tumbleweed Golem
- Base HP: 84
- Start of fight: Lock 1 row and 1 column
- Moves:
    - Attack 16, Lock 1 row
    - Multi-attack 4x3, Block 9, Lock 3
    - Block 18, Transform 5 tiles into Tumbleweeds
    - Summon 1 Coyote

### Dust Devil
- Base HP: 72
- When HP drops below 50%, gain 4 Rageful
- Start of fight: Bury 8
- Moves:
    - Attack 18, Bury 3
    - Suppress 2, Bury 3
    - Attack 11, Shuffle bottom 2 rows
    - Multi-attack 4x3, Shuffle top 2 rows
- NOTE: use same logic as dust devil boots for shuffling

## Early Normal Encounters
- 1 Coyote
- 1 Bandit
- 2 Vultures

## Late Normal Encounters
- 1 Coyote, 2 Summoned Coyotes
- 3 Vultures
- 1 Pack Mule
- Any 2 Normal Enemy (except Pack Mule)

## Bosses

### "Dusty" Dan McGraw
- Base HP: 196
- Moves:
    - Gravity Shift, Block 12
    - Gravity Shift, Attack 14
    - Gravity Shift, Lock 1 row
    - Gravity Shift, Lock 1 column
    - Summon 1 Coyote
    - Summon 1 Bandit

# Act 2 -- The Canyon

## Normal Enemies Pool

### Prospector Gone Mad
- Base HP: 66
- Moves:
    - Attack 15, Bomb 1
    - Multi-attack 6x3
    - Attack 12, Bomb 2
    - Bomb 3, Block 8

### Cave Bat
- Base HP: 18
- Moves:
    - Attack 6
    - Attack 4, Bury 2
    - Bury 3

### Powder Monkey
- Base HP: 30
- Moves:
    - Attack 11, Bomb 1
    - Multi-attack 4x3
    - Attack 8, Bomb 2
    - Bomb 2, Bury 2

### Canary Swarm
- Base HP: 12
- Moves:
    - Attack 4
    - Attack 3, Bury 2
    - Bury 3

## Elite Enemies Pool

### Dynamite Outlaw
- Base HP: 96
- Moves:
    - Attack 18, Lock 2
    - Multi-attack 7x3, Lock 1
    - Block 16, Lock 3
    - Attack 15, Block 8

### Mine Foreman
- Base HP: 84
- Moves:
    - Attack 16, Lock 2
    - Attack 12, Suppress 2, Block 6
    - Multi-attack 6x3, Suppress 2
    - Block 14, Lock 1 row
- NOTE: The boss underground. Locks, suppresses, then punishes.

### Mine Cart
- Base HP: 120
- Timed encounter: 6 turns to destroy. Deals 50 damage on failure.
- NOTE: Does not attack. Board starts with 3 sand + 1 bomb.

## Early Normal Encounters
- 1 Prospector Gone Mad
- 1 Powder Monkey
- 3 Cave Bats
- 3 Canary Swarms

## Late Normal Encounters
- Any 2 Normal Enemy (except Cave Bat and Canary Swarm)

## Bosses

### "Copperhead" Cassidy
- Base HP: 288
- Start of fight: Poison 4 Tiles
- Moves:
    - Apply 3 Poison, Block 8
    - Attack 20 + (2 x poison tiles on board)
    - Attack 18, Poison 2 Tiles, Fool's Gold 2
    - Block 12, Poison 4 Tiles
- NOTE: Phase 1 (100-50%): alternates brew/strike turns. Phase 2 (50-0%): more aggressive, poisons + fool's gold every turn.

# Act 3 -- The Town

## Normal Enemies Pool

### Card Shark
- Base HP: 77
- Start of fight: Lock 1 row and 1 column
- Moves:
    - Attack 16, Lock 1 row
    - Multi-attack 5x3, Block 9, Lock 3
    - Block 18, Transform 5 tiles into Tumbleweeds
    - Summon 1 Coyote

### Corrupt Deputy
- Base HP: 78
- Moves:
    - Attack 21, Lock 2
    - Attack 18, Suppress 2
    - Multi-attack 9x3, Lock 1
    - Block 14, Lock 3

### Train Guard
- Base HP: 90
- Moves:
    - Attack 17, Lock 2
    - Attack 15, Bomb 1
    - Multi-attack 5x4, Lock 1
    - Bomb 2, Lock 3

### Hangman
- Base HP: 108
- Moves:
    - Attack 24, Lock 2
    - Attack 20, Apply 2 Poison
    - Multi-attack 7x4, Poison 3 Tiles
    - Lock 3, Poison 4 Tiles

### Phantom Rider
- Base HP: 72
- Moves:
    - Attack 18, Suppress 2
    - Attack 15, Bury 3
    - Multi-attack 5x4, Bury 2
    - Suppress 2, Bury 3
- NOTE: You hear hooves but see nothing. Heavy board disruption.

### Dynamite Duchess
- Base HP: 96
- Moves:
    - Attack 21, Bomb 1
    - Attack 18, Lock 2, Bomb 1
    - Multi-attack 6x4, Bomb 1
    - Bomb 3, Lock 2

## Elite Enemies Pool

### Saloon Brawler
- Base HP: 120
- Moves:
    - Attack 26
    - Multi-attack 11x3
    - Attack 22, Gain 2 Rageful
    - Attack 30
- NOTE: Pure damage. No tricks. Just fists. Occasional heavy swing.

### Sheriff's Shadow
- Base HP: 120
- Moves:
    - Attack 25, Lock 2
    - Attack 20, Suppress 2, Block 8
    - Multi-attack 10x3, Lock 1
    - Block 20, Lock 3, Suppress 2
- NOTE: Everything the Sheriff is, but darker. Heavy block + board control.

### Outlaw King
- Base HP: 108
- Moves:
    - Attack 25, Block 8
    - Multi-attack 9x3, Gain 2 Rageful
    - Block 16, Summon 1 Bandit
    - Attack 22, Summon 1 Coyote
- NOTE: The biggest bounty in the west. Summons reinforcements.

## Early Normal Encounters
- 1 Card Shark
- 1 Corrupt Deputy
- 1 Train Guard
- 2 Phantom Riders

## Late Normal Encounters
- 1 Hangman
- 1 Dynamite Duchess
- Any 2 Normal Enemy (except Hangman and Dynamite Duchess)

## Bosses

### "Iron Eye" Isabella
- Base HP: 360
- Start of fight: Lock 1 row
- Moves:
    - Attack 15, Lock 1 row
    - Attack 25, Suppress 2
    - Attack 32
    - Lock 2 (2-hit), Suppress 2, Block 10
- NOTE: Phase 1 (100-65%): row locks + passive 10 block/turn. Phase 2 (65-30%): 2-hit locks + suppress + passive block. Phase 3 (30-0%): locks + poison, no passive block, max aggression.
