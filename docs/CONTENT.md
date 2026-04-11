# Notes
Bullet tiles - Bullet, .50 Cal, Buckshot, and Ricochet

# Buffs
- Rageful - Deal 1 extra damage per stack. Decrease stacks by 1 at the end of the turn.
- Sturdy - Gain 1 extra block per stack. Decrease stacks by 1 at the end of the turn.
- Ace - Add x0.25 multiplier per stack to the next non-Ace non-casade match.
- Lucky - 1% chance per stack to deal 1.5x damage. (max 50)
- Barricade - At the end of the turn, retain block and decrease stacks by 1.
- Grace - Negate the next instance of damage taken.
- Resourceful - Double all non-damage resources this turn. Decrease stacks by 1 at the end of the turn.
- Ready - Your next non-cascade attack deals 50% more damage. (max 1)
- Chain - Gain 1 extra damage per Chain tile per stack.
- Thorns - When attacked, deal damage back equal to the number of stacks. Clear at the end of the turn.
- Cloak - Cascade damage is nullified. Decrease stacks by 1 at the end of the turn.
- Hardened - All damage taken is reduced to the number of Hardened stacks.
- Dead Man Walking - Immune to debuffs.
- Protected - Immune to tile hazards. Decrease stacks by 1 at the end of the turn.

# Debuffs
- Vulnerable - Take 50% extra damage from attacks. Decrease stacks by 1 at the end of the turn.
- Poison - At the start of the turn, take damage equal to the number of stacks and decrease stacks by 1.
- Bounty - When applying this or taking damage, if HP is lower than Bounty stacks, die.
- Summoned - Dies when all non-summoned enemies have died.
- Terrified - Deal 50% less damage. Decrease stacks by 1 at the end of the turn.
- Blinded - Attacks deal no damage. Decrease stacks by 1 at the end of the turn.

# Tile Augments

## Positive:
- Explosive -- 4+ match creates an explosive tile; matching it destroys surrounding tiles
- Showdown -- special tile created from 5+ matches; enhanced effect
- Shadow -- when creating match with this tile, shoot a shadow bolt dealing 4 damage to a random enemy

## Hazards:
- Lock -- tile can't be swapped or matched until freed (match adjacent)
- Hardened Lock -- like lock but requires multiple adjacent matches to break
- Poison -- matching it applies Poison stacks to the player
- Bomb -- countdown timer; explodes and damages player if not defused
- Sand -- tile can't be swapped (but can still be matched/cascaded into)
- Fool's Gold -- disguised tile that wastes a match (no resources generated)
- Suppressed -- when creating a match with this tile, that match does nothing

# Consumables

## Offensive

### Stick of TNT
- Effect: Clear entire row. Tiles generate resources; damage goes to targeted enemy.
- Flavor: "Light the fuse."

### Moonshine
- Effect: 2x next match resources, take 5 damage.
- Flavor: "Fighting drunk."

### Wanted Flyer
- Effect: Targeted enemy +50% damage taken, 2 turns.
- Flavor: "Now everyone's looking for 'em."

### Pocket Watch
- Effect: +1 swap this turn.
- Flavor: "Buy yourself some time."

### Strong Coffee
- Effect: 1.5x next match resources.
- Flavor: "Wake up and hit harder."

### Chili Pepper
- Effect: +3 damage to next match. Apply 1 Poison to targeted enemy.
- Flavor: "Hot enough to burn twice."

### Shotgun Shell
- Effect: Deal 8 damage to targeted enemy. Ignores block.
- Flavor: "Point blank. No questions."

### Bounty Poster
- Effect: Targeted enemy takes +50% damage for 1 turn.
- Flavor: "Dead or alive. Preferably dead."

## Defensive

### Tonic
- Effect: Heal 20 HP.
- Flavor: "Burns going down, patches you up."

### Barbed Wire
- Effect: Gain thorns: reflect 100% of next enemy attack back. Consumed on trigger.
- Flavor: "They ran right into it."

### Bandage
- Effect: Heal 10 HP, cleanse all poison tiles on board.
- Flavor: "Patch the wounds. Clean the mess."

### Snake Antidote
- Effect: Cleanse all poison from yourself. Heal 5 HP.
- Flavor: "The rattler's bane."

### Dust Cover
- Effect: All tiles immune to enemy manipulation for 2 turns.
- Flavor: "Batten down the hatches."

### Trail Mix
- Effect: Heal 3 HP per turn for 3 turns.
- Flavor: "Slow and steady keeps you standing."

## Utility

### Skeleton Key
- Effect: Unlock all locked tiles.
- Flavor: "Every lock has a key."

### Smoke Bomb
- Effect: Targeted enemy skips next action.
- Flavor: "Swinging at air."

### Tumbleweed
- Effect: Reshuffle entire board.
- Flavor: "Let the wind decide."

### Signal Flare
- Effect: Reveal all buried tiles.
- Flavor: "Light it up."

### Snake Oil
- Effect: Random effect (heal/damage/poison/gold).
- Flavor: "Could be anything. Probably regret."

### Lucky Horseshoe
- Effect: +25% crit chance for 2 turns.
- Flavor: "Found it in the road. It's a sign."

### Prospector's Compass
- Effect: Convert 3 random tiles to Gold.
- Flavor: "X marks the spot. Three times over."

## Misc

Venom Spread
Poison tiles that survive for 2 turns spread to 1 adjacent tile. Creates an expanding toxic zone that
pressures you to cleanse or match poison tiles quickly before the board gets overrun. Synergizes with
existing poison tile moves -- each turn you ignore them, the problem doubles.

Constrict
Every 3 turns, Copperhead locks the outermost ring of unlocked tiles on the board, shrinking the playable
area. Unlocks after 2 turns. The squeeze makes matches harder to find and creates claustrophobic pressure in
a canyon/mine setting. Pairs well with poison -- fewer tiles to work with while poison eats what's left.

Shed Skin
When Copperhead drops below a HP threshold (e.g. 50%), she cleanses all debuffs on herself, gains a large
block, and transforms all fool's gold tiles into poison tiles (or vice versa). A dramatic phase shift. Could
happen twice (66% and 33%) for a three-phase fight.

Venom Potency
Copperhead has a visible "Potency" counter that increases by 1 each turn. All poison effects (tile poison,
direct poison stacks) scale with Potency. Turn 1 poison is manageable, turn 8 poison is devastating. Creates
a soft enrage timer -- you can't turtle forever.

Coil and Strike
Copperhead alternates between "Coiled" turns (block, poison tiles, fool's gold -- setup) and "Strike" turns
(massive damage scaled off board state). The pattern is visible via intent, so the player knows when to go
offensive vs defensive. Breaking this pattern (e.g. dealing a big hit during Coil) could interrupt the
Strike.

Fang Drain
Whenever Copperhead attacks a poisoned player, she heals for the number of poison stacks on them. Turns
poison into a sustain mechanic for the boss. Antivenom builds become directly valuable, and it creates a
decision: do you cleanse poison to cut her healing, or focus on damage?
