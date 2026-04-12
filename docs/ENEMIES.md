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
- Base HP: 48
- Moves:
    - Attack 12, Lock 3
    - Multi-attack 6x2
    - Attack 6, Block 12
    - Gain 2 Rageful
- NOTE: If dropped below 50% HP, will try to block.

### Coyote
- Base HP: 37
- Moves:
    - Attack 7
    - Attack 5, Gain 2 Rageful
    - Block 7, Bury 2
    - Summon 1 Coyote
- NOTE: If alone, always summons.

### Rattlesnake
- Base HP: 43
- Start of fight: Poison 3 Tiles
- Moves:
    - Attack 11, Apply 2 Poison
    - Attack 5, Poison 2 Tiles
    - Attack 6, Block 8
    - Poison 4 Tiles

### Vulture
- Base HP: 32
- Moves:
    - Attack 8, Apply 1 Terrified
    - Multi-attack 2x3, Bury 3
    - Attack 4, Block 6
    - Heal 6

### Pack Mule
- Base HP: 63
- Moves:
    - Attack 12
    - Multi-attack 4x2, Block 8
    - Attack 5, Bomb 1, Bury 3
    - Heal 6

## Elite Enemies Pool

### Tumbleweed Golem
- Base HP: 100
- Start of fight: Lock 1 row and 1 column, Gain 1 Cloak
- Moves:
    - Attack 13, Lock 1 row
    - Multi-attack 4x4, Lock 4
    - Block 8, Gain 2 Thorns, Transform 4 tiles into Tumbleweeds
    - Block 14, Summon 1 Coyote

### Dust Devil
- Base HP: 86
- When HP drops below 50%, gain 2 Rageful. its next move should be Multi-attack 1x6
- Start of fight: Bury 8
- Moves:
    - Attack 13, Bury 3
    - Attack 6, Suppress 1, Bury 3
    - Attack 10, Bury 5, Shuffle bottom 2 rows
    - Multi-attack 3x3, Shuffle top 2 rows
- NOTE: use same logic as dust devil boots for shuffling

## Outlaw King

### Outlaw King (Act 1)
- Base HP: 169
- Starts with 2 Coyote (summoned)
- Start of fight: Apply 2 Terrified, Gain 1 Cloak, Gain 99 Dead Man Walking
- Moves:
    - Attack 19, Block 12
    - Multi-attack 5x3, Gain 2 Rageful
    - Block 23, Gain 1 Cloak
    - Attack 22

## Early Normal Encounters
- 1 Coyote
- 1 Bandit
- 2 Vultures

## Late Normal Encounters
- 2 Coyote, 1 Summoned Coyotes
- 3 Vultures
- 1 Pack Mule
- Any 2 Normal Enemy (except Pack Mule)

## Bosses

### "Dusty" Dan McGraw
- Base HP: 207
- Moves:
    - Gravity Shift, Attack 12, Block 12
    - Gravity Shift, Attack 3x5, Lock 1 row
    - Gravity Shift, Attack 16, Lock 1 column
    - Gravity Shift, Gain 16 block, Lock 3, Suppress 2
- NOTE: The first move he does is always Summon 1 Bandit and Summon 1 Coyote

# Act 2 -- The Canyon

## Normal Enemies Pool

### Powder Monkey
- Base HP: 67
- Start of fight: Bomb 2
- Moves:
    - Attack 11, Bomb 2
    - Multi-attack 3x3
    - Bomb 3
    - Attack 8, Bomb 2, Bury 3

### Mining Canary
- Base HP: 49
- Moves:
    - Attack 9, Lock 2
    - Attack 2x3, Bury 4
    - Attack 3, Lock 5
- NOTE: If there are multiple of them, only 1 of them should be doing Attack 4x3, Bury 4

### Tunnel Rat
- Base HP: 84
- Start of fight: Bury 3
- Moves:
    - Attack 14, Bury 2
    - Attack 11, Heal 7
    - Block 12, Bury 5
    - Summon 1 Tunnel Rat
- NOTE: The first move he does is always Attack 14, Bury 2

### Prospector Gone Mad
- Base HP: 104
- Start of fight: Gain 5 Rageful
- Moves:
    - Attack 16, Bomb 2
    - Bomb 3, Gain 3 Rageful
    - Attack 12, Block 10, Bomb 2
    - Attack 19

## Elite Enemies Pool

### Mine Foreman
- Base HP: 147
- Moves:
    - Attack 18, Lock 5, Bury 5
    - Attack 12, Suppress 1, Block 12
    - Multi-attack 7x3, Suppress 1
    - Block 22, Lock 1 row

### Ore Golem
- Base HP: 174
- Start of fight: Gain 21 Hardened
- Moves:
    - Attack 22
    - Block 25
    - Multi-attack 6x3
    - Attack 12, Gain 3 Rageful
    - Attack 6, Summon 1 Prospector Gone Mad
- NOTE: The first move he does is always Summon 1 Prospector Gone Mad

### Mine Cart
- Base HP: 232
- Start of fight: Gain 5 Fuse. When Fuse reaches 0, deals 50 damage to the player and dies.
- Moves:
    - Bomb 3, Lock 4
    - Bomb 5, Lock 2
    - Bomb 7
    - Block 20, Bomb 2, Lock 1 row

## Outlaw King

### Outlaw King (Act 2)
- Base HP: 235
- Starts with 2 Coyotes (with full HP, not 1/3)
- Start of fight: Apply 3 Terrified, Gain 1 Cloak, Gain 99 Dead Man Walking
- Moves:
    - Attack 24, Block 18
    - Multi-attack 6x3, Gain 2 Rageful
    - Block 34, Gain 1 Cloak
    - Attack 31

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
- Base HP: 287
- Starts with 2 Rattlesnake (not summoned)
- Start of fight: Poison 4 Tiles
- When HP drops below 50%, clear ALL statuses, and should show a float text "SHED SKIN", then locks all tiles on the edge of the board.
- Moves:
    - Attack 24, Poison 4 Tiles
    - Attack 16, Block 16, Apply 3 Poison
    - Multi-attack 4x<number-of-poison-tiles-on-board>
    - Attack 12, Poison 2 Tiles, Fool's Gold 8
    - Clear all poison tiles on the board and heal 2% max HP for each. If none, gain 2 Vulnerable

# Act 3 -- The Town

## Normal Enemies Pool

### Train Guard
- Base HP: 111
- Start of fight: Lock 1 column
- Moves:
    - Attack 14, Lock 1 row
    - Multi-attack 4x4, Lock 4
    - Attack 7, Block 14, Apply 2 Vulnerable
    - Block 30, Gain 5 Thorns, Lock 1 row
- NOTE: The first move he does is always Block 30, Lock 1 row

### Hellfire Preacher
- Base HP: 97
- Start of fight: Gain 3 Grace
- Moves:
    - Multi-attack 4x2, Block 16
    - Attack 12, Heal 18 (can be self or ally if injured)
    - Attack 9, Bomb 6
    - Block 26, Apply 1 Terrified

### Hangman
- Base HP: 159
- Start of fight: Apply 4 Terrified
- Moves:
    - Lock 7, Suppress 2
    - Attack 18, Apply 3 Vulnerable
    - Block 18, Gain 8 Rageful, Bury 8
    - Attack 34, Gain 2 Vulnerable (the vulnerable is applied to Hangman here)
- NOTE: This enemy always goes down the movelist in order exactly from the top, then repeats.

### Corrupt Deputy
- Base HP: 138
- Moves:
    - Attack 18, Lock 5
    - Attack 16, Suppress 1
    - Multi-attack 7x3, Lock 1
    - Block 14, Lock 5
    - Summon 2 Bandits (with full HP, not 1/3)

## Elite Enemies Pool

### Saloon Brawler
- Base HP: 263
- Moves:
    - Multi-attack 11x2
    - Multi-attack 4x2, Gain 3 Rageful
    - Attack 24
    - Attack 6x2, Clear ALL statuses

### Sheriff's Shadow
- Base HP: 255
- Start of fight: Gain 30 block, Gain 3 Dead Man Walking
- Moves:
    - Attack 12, Block 12, Suppress 1
    - Attack 25, Suppress 2
    - Suppress 3, Apply 1 Terrified
    - Block 28, Bury 5

## Outlaw King

### Outlaw King  (Act 3)
- Base HP: 321
- Starts with 2 Bandits (with full HP, not 1/3)
- Start of fight: Apply 4 Terrified, Gain 2 Cloak, Gain 99 Dead Man Walking
- Moves:
    - Attack 28, Block 22
    - Multi-attack 9x3, Gain 5 Rageful
    - Block 40, Gain 1 Cloak
    - Attack 35

## Early Normal Encounters
- 1 Train Guard
- 2 Train Guard
- 1 Hellfire Preacher, 1 Bandit

## Late Normal Encounters
- 1 Train Guard, 1 Hellfire Preacher
- 1 Corrupt Deputy, 1 Coyote
- 1 Hangman
- Any 2 Normal Enemy (Except Hangman or Corrupt Deputy)

## Bosses

### "Iron Eye" Isabella
- Base HP: 354
- Start of fight: Lock 2 rows
- Passive: Gain 10 block per turn
- When HP drops below 50%, Gain 5 Rageful, 1 Invulnerable, Apply 3 Terrified. sprite changes to ironeye_alt
- Moves:
    - Attack 15, Lock 1 row, Lock 1 column
    - Attack 22, Suppress 2
    - Attack 28
    - Suppress 4
