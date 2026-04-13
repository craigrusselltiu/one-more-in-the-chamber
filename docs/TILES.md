# Tiles

NOTE: The tile pool for Acts 2, 3, and also the shop should be the Starter Tiles AND the Additional Tiles. Act 1 should only be limited to Starter Tiles.

## Exclusive Tiles

### Bounty
- Rust exclusive
- Flavor text: "The S is silent."
- Behaviour text: Apply 1 stack of Bounty per tile. When this kills a non-summoned enemy, gain 10 gold.
- Upgrade text: +1 stack per tile per level
- Resource formula: (1 stack + level * 1) * tiles
- Single formula: 1 stack + level * 1

### Chip
- Reno exclusive
- Flavor text: "What's the most you ever lost on a coin toss?"
- Behaviour text: 50% chance to deal 6 damage per tile; 50% chance to deal 0.
- Upgrade text: +1 damage per tile per level
- Resource formula: (6 damage + level * 1) * tiles (on hit)
- Single formula: 6 damage + level * 1 (on hit)

## Starter Tiles

### Bullet
- Flavor text: "Highly effective negotiation tool."
- Behaviour text: Deal 2 damage per tile.
- Upgrade text: +2 damage to match total per level
- Resource formula: (2 damage * tiles) + (level * 2)
- Single formula: 2 damage + floor(level * 2 / 3)

### Iron
- Flavor text: "Bend, don't break."
- Behaviour text: Gain 2 block per tile.
- Upgrade text: +2 block to match total per level
- Resource formula: (2 block * tiles) + (level * 2)
- Single formula: 2 block + floor(level * 2 / 3)

### Gold
- Flavor text: "Makes the world go 'round."
- Behaviour text: Earn 1 gold per tile.
- Upgrade text: +2 gold to match total per level
- Resource formula: (1 gold * tiles) + (level * 2)
- Single formula: 1 gold + floor(level * 2 / 3)

### Ricochet
- Flavor text: "Bullets bounce. You never know what they'll hit."
- Behaviour text: Deal 1 damage per tile. Destroy 1 random other tile per 3-match, plus 1 per extra tile.
- Upgrade text: +1 to number of tiles destroyed on match per level
- Resource formula: 1 damage * tiles, (tiles - 2) + (level * 1) tiles destroyed
- Single formula: 1 damage

### Stampede
- Flavor text: "The ground shakes. Everything in the way gets flattened."
- Behaviour text: Deal 1 damage to ALL enemies per tile.
- Upgrade text: +2 damage to match total per level
- Resource formula: (1 AoE damage * tiles) + (level * 2)
- Single formula: 1 AoE damage + floor(level * 2 / 3)

### Buckshot
- Flavor text: "Spread shot. Hits harder, less precise."
- Behaviour text: Each tile deals 2 damage to a random enemy.
- Upgrade text: +1 damage per tile per level
- Resource formula: tiles hits, each dealing (2 damage + level * 1) to a random enemy
- Single formula: 2 damage + level * 1 to a random enemy

### Battery
- Flavor text: "Juice for the iron. Every spark counts."
- Behaviour text: Gain 1 ability charge per 3-match, plus 1 per extra tile.
- Upgrade text: +1 charge to match total per level
- Resource formula: (tiles - 2) charges + (level * 1)
- Single formula: floor(level * 1 / 3) charges

### Waste
- Flavor text: "Slow poison. The patient killer's weapon."
- Behaviour text: Apply 1 Poison per tile.
- Upgrade text: +1 stack to match total per level
- Resource formula: (1 Poison * tiles) + (level * 1)
- Single formula: 1 Poison + floor(level * 1 / 3)

### Prairie Fire
- Flavor text: "Sparks fly. Some of them catch."
- Behaviour text: Deal 2 damage per tile. After each turn, each tile has a 1 in 4 chance to spread.
- Upgrade text: +2 damage to match total per level
- Resource formula: (2 damage * tiles) + (level * 2)
- Single formula: 2 damage + floor(level * 2 / 3)

### Shank
- Flavor text: "That's not a knife."
- Behaviour text: Deal 1 damage per tile and apply 1 Vulnerable.
- Upgrade text: +2 damage to match total per level
- Resource formula: (1 damage * tiles) + (level * 2), 1 Vulnerable (max 1)
- Single formula: 1 damage + floor(level * 2 / 3), 1 Vulnerable (max 1)

### Ace
- Flavor text: "Always keep one up your sleeve."
- Behaviour text: Gain 1 stack of Ace per tile.
- Upgrade text: +1 stack to match total per level
- Resource formula: (1 Ace * tiles) + (level * 1)
- Single formula: 1 Ace + floor(level * 1 / 3)

### Whiskey
- Flavor text: "The cowboy's medicine."
- Behaviour text: Heals 1 HP per 3-match, plus 1 per extra tile.
- Upgrade text: +1 heal to match total per level
- Resource formula: 2 healing + (tiles - 3) + (level * 1)
- Single formula: 2 healing + floor(level * 1 / 3)

## Additional Tiles

### Chain
- Flavor text: "Links in the chain. More you match, harder they hit."
- Behaviour text: Deal 1 damage per tile. Each Chain match adds +1 damage to ALL Chain tiles for this combat.
- Upgrade text: +1 damage to match total per level
- Resource formula: (1 damage * tiles) + (level * 1), 1 Chain
- Single formula: 1 damage + floor(level * 1 / 3), 1 Chain

### Horseshoe
- Flavor text: "Luck favors the prepared."
- Behaviour text: Gain 1 stack of Lucky per tile.
- Upgrade text: +1 stack per tile per level
- Resource formula: (1 Lucky * tiles) + (level * 1)
- Single formula: 1 Lucky + floor(level * 1 / 3)

### .50 Cal
- Flavor text: "Turns cover into a suggestion."
- Behaviour text: Deal 3 damage per tile. 5-match deals double damage.
- Upgrade text: +1 damage per tile per level
- Resource formula: (3 damage + level * 1) * tiles (doubled if tiles >= 5)
- Single formula: 3 damage + level * 1

### Tombstone
- Flavor text: "Dead men pay debts."
- Behaviour text: Deal 2 damage per tile. Deals double damage when target is below 30% HP.
- Upgrade text: +2 damage to match total per level
- Resource formula: (2 damage * tiles) + (level * 2) (doubled if target below 30% HP)
- Single formula: 2 damage + floor(level * 2 / 3)

### Saloon
- Flavor text: "Belly up to the bar. Drinks are on the house."
- Behaviour text: Heal 1 HP per 3-match, plus 1 per extra tile. Generate the base resources of adjacent tiles.
- Upgrade text: +1 heal to match total per level
- Resource formula: (tiles - 2) healing + (level * 1), plus adjacent tile resources
- Single formula: floor(level * 1 / 3) healing, plus adjacent tile resources

### Rattler
- Flavor text: "Fangs out. Bite first, ask questions never."
- Behaviour text: Deal 2 damage per tile and apply 1 Poison. Pierces block.
- Upgrade text: +1 damage and poison stack to match total per level
- Resource formula: (2 damage * tiles) + (level * 1) (pierces block), (1 Poison * tiles) + (level * 1)
- Single formula: 2 damage + floor(level * 1 / 3) (pierces block), 1 Poison + floor(level * 1 / 3)

### Barricade
- Flavor text: "Flip the table. Take cover."
- Behaviour text: Gain 2 block per tile and 1 Barricade.
- Upgrade text: +1 block per tile per level
- Resource formula: (2 block + level * 1) * tiles, 1 Barricade
- Single formula: 2 block + level * 1, 1 Barricade

### Boulder
- Flavor text: "Gravity does the rest."
- Behaviour text: Deal 1 damage per tile, plus 1 damage per block.
- Upgrade text: +1 damage per tile per level
- Resource formula: (1 damage + level * 1) * tiles + current block
- Single formula: 1 damage + level * 1 + floor(current block / 3)

### Cavalry
- Flavor text: "Reinforcements have arrived."
- Behaviour text: 2 block per tile. If 4+ matched, +1 swap this turn (max 1 per turn).
- Upgrade text: +2 block to match total per level
- Resource formula: (1 block * tiles) + (level * 2), +1 swap if tiles >= 4 (max 1/turn)
- Single formula: 1 block + floor(level * 2 / 3)

### Duel
- Flavor text: "In carnage, I bloom, like a flower in the dawn."
- Behaviour text: Deal 2 damage per tile. On exactly 4-match, deal the damage twice. Gain 1 Duel.
- Upgrade text: +1 damage per tile per level
- Resource formula: (2 damage + level * 1) * tiles (dealt twice if tiles == 4), 1 Duel
- Single formula: 2 damage + level * 1, 1 Duel

### Mirage
- Flavor text: "Now you see it. Now you don't. Now it's something else."
- Behaviour text: At the start of combat, transforms into a random tile you don't own for the rest of combat.
- Upgrade text: +1 to the level of the tile it transforms into
- Resource formula: resolves as the transformed tile
- Single formula: resolves as the transformed tile

## Special Tiles

### Showdown
- Flavor text: "Clear the board. No survivors."
- Behaviour text: Swap with any adjacent tile to destroy all tiles of that type on the board.
- Single formula: no resource generation

### Tumbleweed
- Flavor text: "Just passing through. Taking up space."
- Behaviour text: Does nothing.
- Single formula: no resource generation

### Charcoal
- Flavor text: "It is said to makes Fire-type moves more powerful."
- Behaviour text: On match, deal 1 damage and gain 1 block. Cannot be upgraded or swapped out for another tile.
- Resource formula: 1 damage, 1 block (ignores tile count)
- Single formula: 1 damage, 1 block

### Fool's Gold
- Flavor text: "All that glitters."
- Behaviour text: Looks like Gold but generates nothing. Can match with regular Gold tiles. Reveals when matched.
- Single formula: no resource generation

## New Tile Ideas

### Cactus
- Behaviour: Gain 1 block per tile. Deal 1 damage back to any enemy that attacks you this turn.
- Upgrade: +1 reflected damage to match total per level
- Flavor: "Touch it. I dare you."

### Dynamite
- Behaviour: 1 ability charge per 3-match, plus 1 per extra tile.
- Upgrade: +1 charge to match total per level
- Flavor: "Volatile but useful. Light the fuse on your special move."

### Moonshine
- Behaviour: Deal 3 damage per tile to yourself. Deal 6 damage per tile to the targeted enemy.
- Upgrade: +2 enemy damage to match total per level
- Flavor: "Burns both ways."

### Wanted
- Behaviour: Apply 1 Vulnerable per tile to the targeted enemy.
- Upgrade: +1 stack to match total per level
- Flavor: "Dead or alive. Preferably dead."

### Loot
- Behaviour: Earn 1 gold per tile. Heal 1 HP per tile.
- Upgrade: +1 gold to match total per level
- Flavor: "A little bit of everything."

### Sandstorm
- Behaviour: Bury 1 random enemy tile per 3-match, plus 1 per extra tile. Deal 1 damage per tile.
- Upgrade: +1 damage to match total per level
- Flavor: "Can't hit what you can't see."

### Branding Iron
- Behaviour: Deal 2 damage per tile. Apply 1 Rageful to yourself.
- Upgrade: +2 damage to match total per level
- Flavor: "Mark them. Then finish them."

### Last Stand
- Behaviour: Deal damage per tile equal to your missing HP (max HP minus current HP), divided by 10.
- Upgrade: +1 flat damage to match total per level
- Flavor: "Nothing left to lose."

### Tequila
- Behaviour: Gain 2 block per tile. Heal 1 HP per 3-match, plus 1 per extra tile.
- Upgrade: +1 block to match total per level
- Flavor: "Liquid armor."

### Quickdraw
- Behaviour: Deal 1 damage per tile. If this is the first match of the turn, deal double damage.
- Upgrade: +1 damage per tile per level
- Flavor: "Fastest hand in the west."

### Rope
- Behaviour: Deal 1 damage per tile. Lock 1 random enemy tile per 3-match.
- Upgrade: +1 damage to match total per level
- Flavor: "Tie them down."

### Skull
- Behaviour: Deal 3 damage per tile. If the target dies this match, heal 5 HP.
- Upgrade: +1 damage per tile per level
- Flavor: "Death pays a bounty."

### Gambit
- Behaviour: Deal 4 damage per tile. Lose 1 block per tile matched.
- Upgrade: +2 damage to match total per level
- Flavor: "Drop your guard. Swing harder."

### Smoke Bomb
- Behaviour: 25% dodge chance per tile for this turn (caps at 75%).
- Upgrade: +5% dodge per tile per level
- Flavor: "Disappear into the haze."

### Duelist
- Behaviour: Deal 3 damage per tile, but only if there is exactly 1 enemy alive.
- Upgrade: +2 damage to match total per level
- Flavor: "One on one. The way it should be."

### Spur
- Behaviour: +1 swap this turn per 4+ match (max 1 per turn). Deal 1 damage per tile.
- Upgrade: +1 damage to match total per level
- Flavor: "Kick the horse. Move faster."

### Grave
- Behaviour: Deal 2 damage per tile. +2 bonus damage per dead enemy this fight.
- Upgrade: +1 damage per tile per level
- Flavor: "The more they fall, the harder you hit."

### Bandolier
- Behaviour: Store 1 charge per tile (max 10). On next Bullet match, add stored charges as bonus damage and reset.
- Upgrade: +1 max storage per level
- Flavor: "Save your rounds. Make them count."

### Peyote
- Behaviour: Gain 2 block per tile. Gain 1 Lucky per tile.
- Upgrade: +1 block to match total per level
- Flavor: "The spirits protect you."

### Rattlesnake Bite
- Behaviour: Apply 2 Poison per tile. Pierces block.
- Upgrade: +1 venom to match total per level
- Flavor: "No antidote out here."

### Telegraph
- Behaviour: Reveal all buried tiles on the board. Deal 1 damage per buried tile revealed.
- Upgrade: +1 damage per revealed tile per level
- Flavor: "Message received."

### Stampede Horn
- Behaviour: Deal 1 damage to ALL enemies per tile. Apply 1 Vulnerable to all enemies.
- Upgrade: +1 damage to match total per level
- Flavor: "The herd doesn't care who's in the way."

### Prospector's Pick
- Behaviour: Earn 2 gold per tile. 25% chance per tile to convert 1 adjacent tile to Gold.
- Upgrade: +1 gold to match total per level
- Flavor: "Strike it rich. One swing at a time."

### Coffin Nail
- Behaviour: Deal 1 damage per tile. If the enemy has Poison, deal +1 damage per Poison stack.
- Upgrade: +1 base damage to match total per level
- Flavor: "Seal the deal."
