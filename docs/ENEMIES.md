# Moves
- Enemies in general should not perform the same move twice in a row unless specifed.
- If a non-elite combat happens within the first 3 nodes of an act, choose from Early Normal Encounters, otherwise Late Normal Encounters.
- Encounters should be taken from a bag, and gets refilled when empty, preventing duplicates as much as possible.

## Normal Moves
- Attack - deal damage to the player
- Multi-attack - deal damage X times to the player, e.g. 4x2 = 4 damage twice
- Block - gain block
- Lock - could be X tiles, or 1 row/column
- Gain X Buff - the enemy gains the buff
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
- Base HP: 42
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
- Base HP: 37
- Start of fight: Poison 3 Tiles
- Moves:
    - Attack 11, Apply 2 Poison
    - Attack 5, Poison 3 Tiles
    - Block 8
    - Poison 5 Tiles

### Vulture
- Base HP: 28
- Moves:
    - Attack 8, Apply 1 Terrified
    - Multi-attack 2x3, Bury 3
    - Attack 4, Block 6
    - Heal 6

### Pack Mule
- Base HP: 64
- Moves:
    - Attack 12
    - Attack 9, Block 8
    - Bomb 1, Bury 3
    - Heal 8

## Elite Enemies Pool

### Tumbleweed Golem
- Base HP: 84
- Start of fight: Lock 1 row and 1 column
- Moves:
    - Attack 14, Lock 1 row
    - Multi-attack 4x3, Block 5, Lock 3
    - Gain 2 Thorns, Transform 5 tiles into Tumbleweeds
    - Summon 1 Coyote

### Dust Devil
- Base HP: 72
- When HP drops below 50%, gain 4 Rageful. its next move should be Multi-attack 2x4
- Start of fight: Bury 8, Gain 1 Cloak
- Moves:
    - Attack 13, Bury 3
    - Suppress 1, Bury 3
    - Attack 10, Shuffle bottom 2 rows
    - Multi-attack 3x3, Shuffle top 2 rows
- NOTE: use same logic as dust devil boots for shuffling

## Outlaw King

### Outlaw King (Act 1)
- Base HP: 126
- Starts with 1 Coyote (summoned)
- Start of fight: Apply 2 Terrified, Gain 1 Cloak, Gain 1 Dead Man Walking
- Moves:
    - Attack 10, Block 8
    - Multi-attack 5x3, Gain 2 Rageful
    - Block 12
    - Attack 18

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
- Base HP: 188
- Moves:
    - Gravity Shift, Attack 14, Block 12
    - Gravity Shift, Summon 1 Bandit
    - Gravity Shift, Lock 1 row
    - Gravity Shift, Lock 1 column
- NOTE: The first move he does is always Summon 1 Bandit and Summon 1 Coyote

# Act 2 -- The Canyon

## Normal Enemies Pool

### Powder Monkey
- Base HP: 53
- Start of fight: Bomb 1
- Moves:
    - Attack 11, Bomb 1
    - Multi-attack 3x3
    - Bomb 2
    - Bomb 1, Bury 3

### Mining Canary
- Base HP: 37
- Moves:
    - Attack 7, Lock 2
    - Attack 2x3, Bury 2
    - Lock 3

### Tunnel Rat
- Base HP: 68
- Start of fight: Bury 3
- Moves:
    - Attack 12, Bury 2
    - Attack 8, Heal 6
    - Block 8, Bury 3
    - Summon 1 Tunnel Rat
- NOTE: The first move he does is always Block 8, Bury 3

### Prospector Gone Mad
- Base HP: 73
- Moves:
    - Attack 14, Bomb 1
    - Gain 5 Rageful
    - Attack 12, Bomb 2
    - Bomb 3, Block 8

## Elite Enemies Pool

### Mine Foreman
- Base HP: 123
- Moves:
    - Attack 10, Lock 5, Bury 5
    - Attack 12, Suppress 1, Block 6
    - Multi-attack 3x3, Suppress 1
    - Block 11, Lock 1 row

### Ore Golem
- Base HP: 145
- Start of fight: Gain 15 Hardened
- Moves:
    - Attack 15
    - Block 20
    - Multi-attack 5x3
    - Attack 5, Gain 3 Rageful
    - Summon 1 Prospector Gone Mad
- NOTE: The first move he does is always Summon 1 Prospector Gone Mad

### Mine Cart
- Base HP: 194
- Start of fight: Gain 5 Fuse. 5 turns to destroy. Deals 50 damage on failure.
- Moves:
    - Bomb 1, Lock 4
    - Bomb 2, Lock 2
    - Bomb 3
    - Block 10, Bomb 1, Lock 2

## Outlaw King

### Outlaw King (Act 2)
- Base HP: 196
- Starts with 2 Coyotes (summoned)
- Start of fight: Apply 2 Terrified, Gain 1 Cloak, Gain 1 Dead Man Walking
- Moves:
    - Attack 12, Block 8
    - Multi-attack 6x3, Gain 2 Rageful
    - Block 14
    - Attack 20

## Early Normal Encounters
- 1 Prospector Gone Mad
- 2 Powder Monkeys
- 2 Tunnel Rats
- 3 Mining Canaries

## Late Normal Encounters
- 1 Prospector, 2 Mining Canaries
- 3 Powder Monkeys
- 1 Tunnel Rat, 1 Powder Monkey, 1 Mining Canary
- Any 2 Normal Enemy (Can't be Mining Canaries or both be Prospectors)

## Bosses

### "Copperhead" Cassidy
- Base HP: 260
- Starts with 1 Rattlesnake (with full HP, not 1/3)
- Start of fight: Poison 4 Tiles, Starts with 1 Rattlesnake
- When HP drops below 50%, clear ALL statuses, and should show a float text "SHED SKIN", then locks all tiles on the edge of the board.
- Moves:
    - Attack 17, Poison 4 Tiles
    - Block 8, Apply 3 Poison
    - Multi-attack 3x<number-of-poison-tiles-on-board>
    - Attack 12, Poison 2 Tiles, Fool's Gold 5
    - Clear all poison tiles on the board and heal 2% HP for each

# Act 3 -- The Town

## Normal Enemies Pool

### Train Guard
- Base HP: 88
- Start of fight: Lock 1 column
- Moves:
    - Attack 16, Lock 2
    - Multi-attack 4x4, Lock 4
    - Attack 4, Block 6, Apply 2 Vulnerable
    - Lock 1 row, Block 10

### Hellfire Preacher
- Base HP: 76
- Start of fight: Gain 3 Grace
- Moves:
    - Multi-attack 3x2, Block 6, Apply 1 Terrified
    - Attack 16, Heal 6
    - Heal 14, Bomb 2
    - Bomb 6
    - Heal 12 to another enemy (will do next when another enemy is not full health)

### Hangman
- Base HP: 138
- Start of fight: Apply 1 Terrified
- Moves:
    - Lock 2, Suppress 2
    - Attack 8, Apply 3 Vulnerable
    - Block 18, Gain 2 Rageful
    - Attack 20, Gain 2 Vulnerable (the vulnerable is applied to Hangman here)
- NOTE: This enemy always goes down the movelist in order exactly from the top, then repeats.

### Corrupt Deputy
- Base HP: 120
- Moves:
    - Attack 13, Lock 5
    - Attack 11, Suppress 1
    - Multi-attack 6x3, Lock 1
    - Block 14, Lock 5
    - Summon 2 Bandits (from act 1)

## Elite Enemies Pool

### Saloon Brawler
- Base HP: 220
- Moves:
    - Multi-attack 2x6
    - Multi-attack 4x2, Gain 2 Rageful
    - Attack 20
    - Attack 5x3

### Sheriff's Shadow
- Base HP: 213
- Start of fight: Gain 30 block
- Moves:
    - Attack 12, Block 12, Suppress 1
    - Attack 18, Suppress 2
    - Suppress 3
    - Block 24

## Outlaw King

### Outlaw King  (Act 3)
- Base HP: 288
- Starts with 2 Coyotes (with full HP, not 1/3)
- Start of fight: Apply 2 Terrified, Gain 1 Cloak, Gain 1 Dead Man Walking
- Moves:
    - Attack 15, Block 8
    - Multi-attack 7x3, Gain 2 Rageful
    - Block 16
    - Attack 24

## Early Normal Encounters
- 1 Train Guard
- 1 Hellfire Preacher
- 1 Corrupt Deputy

## Late Normal Encounters
- 1 Hangman
- 1 Corrupt Deputy, 1 Coyote
- Any 2 Normal Enemy (except Hangman and Corrupt Deputy)

## Bosses

### "Iron Eye" Isabella
- Base HP: 320
- Start of fight: Lock 2 rows
- When HP drops below 50%, Gain 5 Rageful, 30 Block, 1 Barricade, 1 Cloak, 1 Grace, Apply 3 Terrified. sprite changes to ironeye_alt
- Moves:
    - Attack 15, Lock 1 row, Lock 1 column
    - Attack 22, Suppress 2
    - Attack 28
    - Suppress 5
