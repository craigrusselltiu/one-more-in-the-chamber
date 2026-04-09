# Moves

## Normal Moves
- Attack - deal damage to the player
- Multi-attack - deal damage X times to the player, e.g. 4x2 = 4 damage twice
- Block - gain block
- Lock - could be X tiles, or 1 row/column
- Apply Poison X - poison the player directly
- Poison X Tiles - poison hazard on tiles
- Bomb
- Bury
- Fool's Gold
- Suppress

## Exclusive Moves
- Gravity Shift - Dusty exclusive, shifts gravity clockwise, e.g. if gravity is down, shifts it left

# Act 1 -- The Dusty Trail

## Summoned Enemies
- Summoned enemies have the same moveset as their non-summoned versions, but cannot summon themselves.
- Summoned enemies are summoned with HP equal to 1/3 of the non-summoned version's Max HP.
- If there are no more enemy slots, enemies should not summon.

## Normal Enemies

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
- Start of fight: Poison 3
- Moves:
    - Attack 11, Apply Poison 2
    - Multi-attack 2x3, Poison 3 Tiles
    - Block 14
    - Poison 5

### Vulture
- Base HP: 40
- Moves:
    - Attack 11, Apply Poison 2
    - Multi-attack 2x3, Poison 3 Tiles
    - Block 14
    - Summon 1 Coyote

## Elite Enemies

### Tumbleweed Golem
- Base HP: 84
- Start of fight: Lock 1 row and 1 column
- Moves:
    - Attack 16, Lock 1 row
    - Multi-attack 5x3, Block 9, Lock 3
    - Block 18, Transform 5 tiles into Tumbleweeds
    - Summon 1 Coyote

### Card Shark
- Base HP: 84
- Start of fight: Lock 1 row and 1 column
- Moves:
    - Attack 16, Lock 1 row
    - Multi-attack 5x3, Block 9, Lock 3
    - Block 18, Transform 5 tiles into Tumbleweeds
    - Summon 1 Coyote

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
- NOTE: The first move he does is Summon 1 Bandit and Summon 1 Coyote

## Act 2 -- The Canyon

### Prospector Gone Mad
- HP: 55
- Damage: 12-18
- Moves: ATK, BOMB
- Flavor: "Found something in the mine. Lost his mind finding it."

### Dynamite Outlaw
- HP: 80
- Damage: 15-22
- Moves: ATK, LOCK, DEF
- Flavor: "Tanky. Barricades up, then swings."

### Cave Bat
- HP: 15
- Damage: 5-8
- Moves: ATK, BURY
- Flavor: "Swarm unit. Three at a time, burying everything."

### Mine Cart
- HP: 100
- Damage: 0 (50 on crash)
- Moves: ATK (timed countdown)
- Flavor: "Kill it before it reaches the end of the track."

### Powder Monkey
- HP: 25
- Damage: 8-14
- Moves: ATK, BOMB
- Flavor: "Tiny, fast, and loves explosions."

### Mine Foreman
- HP: 70
- Damage: 12-20
- Moves: ATK, LOCK, DEF, SUPPRESS
- Flavor: "The boss underground."

### Canary Swarm
- HP: 10
- Damage: 3-5
- Moves: ATK, BURY
- Flavor: "3 spawn together. Annoying as a cloud of feathers."

**Boss: "Copperhead" Cassidy** -- 200 HP, 15-25 damage.
- Moves: ATK, POISON, DEF, Fool's Gold
- Flavor: "Brews poison. Strikes when the board is toxic."

## Act 3 -- The Town

### Corrupt Deputy
- HP: 65
- Damage: 18-25
- Moves: ATK, LOCK, SUPPRESS, DEF
- Flavor: "Methodical. Locks, suppresses, then strikes."

### Saloon Brawler
- HP: 100
- Damage: 22-30
- Moves: ATK (heavy)
- Flavor: "Pure damage. No tricks. Just fists."

### Train Guard
- HP: 75
- Damage: 15-20
- Moves: ATK, LOCK, BOMB
- Flavor: "Board control. Locks and bombs."

### Hangman
- HP: 90
- Damage: 20-28
- Moves: ATK, LOCK, POISON
- Flavor: "Locks your tiles like a noose. Poisons what he can't lock."

### Outlaw King
- HP: 120
- Damage: 25-35
- Moves: ATK, DEF, SUMMON
- Flavor: "The biggest bounty in the west."

### Phantom Rider
- HP: 60
- Damage: 15-22
- Moves: ATK, SUPPRESS, BURY
- Flavor: "You hear hooves but see nothing."

### Dynamite Duchess
- HP: 80
- Damage: 18-25
- Moves: ATK, BOMB, LOCK
- Flavor: "Royalty in the demolition business."

### Sheriff's Shadow
- HP: 100
- Damage: 20-30
- Moves: ATK, DEF, LOCK, SUPPRESS
- Flavor: "Everything the Sheriff is, but darker."

**Boss: "Iron Eye" Isabella** -- 250 HP, 20-35 damage.
- Moves: ATK, LOCK, SUPPRESS, POISON
- Flavor: "She sees everything. And she never blinks."

## Elite Encounters

Elites are single enemies drawn from the act's regular pool with buffed stats: 1.5x HP, +2 min damage, +3 max damage.

Excluded from elite pool: Vulture (Act 1), Cave Bat and Mine Cart (Act 2).
