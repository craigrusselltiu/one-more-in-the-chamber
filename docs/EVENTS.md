# Event Info

Random events encountered at event nodes on the map. Each event presents 2-3 choices with different risk/reward tradeoffs.

## Gemini Background Prompt
I need you to help me write prompts to give to Gemini to generate high-quality pixel art backgrounds for my western-themed game.
I want 1920x1080 landscape with good quality shading. This will be a background for an event.
I want just the text prompt that I can copy straight into Gemini. No formatting, no lines, no dots, no newlines, just plain text.

## Event Text Prompt
You are a narrative designer writing events for a spaghetti western roguelike starring a lone red panda cowboy traveling through a harsh, lawless frontier of deserts, outlaws, and strange relics.
Write a short event description in the style of Slay the Spire.
Requirements:
Output exactly one paragraph (2–3 sentences).
Use gritty, atmospheric, cinematic language.
Emphasize dust, heat, silence, decay, and danger.
Include a strange, eerie, or supernatural twist (cursed artifact, unnatural creature, ghost town, etc.).
Keep it concise but vivid — every sentence should add tension or intrigue.
Tone should feel lonely, ominous, and mythic, like a frontier legend.
Do not include choices, gameplay mechanics, or outcomes — description only.
Analyse the image provided to write the text.
don't use double dashes, just single

## Event Pools
- All event pool
- Act 1 event pool
- Act 2 event pool
- Act 3 event pool

# Events

## The Card Game
- Text: "A lantern sputters against the bruise-colored dusk, casting its glow across three warped cards and the ringed hand of a raccoon whose own wanted poster peels on the wall behind him. The ghost town beyond is hollow as a gunshot's echo — empty windows, leaning beams, not so much as a dog barking — and the only sound is the soft tick of his pipe and the slow, patient shuffle of pasteboard on pine.\nHe does not look up when you approach; he has been waiting, and the cards, it seems, already know your name."
- Effects: "raccoon" (yellow wiggle), "ghost town" (blue breathe), "already know your name" (red jump)
- Choices:
    - **Play** — Pay 40 gold to play a game. (if the player has no money, this option is disabled)
    - **Leave**
- Play - the player is shown 3 cards, then they are flipped, shuffled showing an animation (make the animation impossible to follow), then the player clicks on a face-down card, which is revealed to show their reward
    - Gold game 50% - 0 gold, 39 gold, 267 gold
    - Item game 20% - Legendary Artifact (just show artifact icon), 3 random consumables (show 3 icons), Common Artifact (just icon)
    - Health game 30% - Lose 7 HP, Gain 5 Max HP, Restore HP to full

## The Old Well
- Text: "A crescent moon presides over a stone well that breathes soft green light into the dusk, as though something below were dreaming in color. Coins spill from the dirt around its base and a weathered hat lies forgotten in the grass — tokens of travelers who leaned too far, or listened too long.\nThe bucket turns on its rope without a hand to crank it, and from the dark throat of the shaft comes a faint, patient jingling, like someone counting their winnings in the deep."
- Effects: "soft green light" (green breathe), "dark throat" (red jump), "patient jingling" (yellow wiggle)
- Choices:
    - **Climb down** — Lose 18 HP, gain 142 gold and a random consumable.
    - **Use the bucket** — Gain 45 gold.
- Result text:
    - **Climb down** — "You descend into the green hush below and come up scraped and soaked, heavier than when you went in."
    - **Use the bucket** — "The rope creaks, the bucket rises, and a handful of coins clatter onto the stones at your feet."

## The Coyote Den
- Text: "The crescent moon hangs pale above the mesas as dusk bleeds purple over the badlands, and a cave yawns from the rock like a wound that never healed. Paw prints trail past a sun-bleached skull toward the dark within, where too many yellow eyes glint in unnatural stillness, unblinking, patient. Something gold catches the last of the light inside that den, glimmering atop the bones of those who reached for it before."
- Effects: "yellow eyes" (yellow breathe), "Something gold" (yellow shimmer)
- Choices:
    - **Go inside and grab it** — Gain 1 random artifact. Fight a pack of coyotes.
    - **Sneak past**
- Result text:
    - **Go inside and grab it** — "Your fingers close around the prize just as the growls behind you deepen into snarls."
    - **Sneak past**

## The Train Wreck
- Text: "Black smoke still curls from the iron belly of a locomotive run aground in the gulch, its cowcatcher buried in red dirt and its wheels locked mid-turn, as if the engine itself had seen something on the tracks worth dying over. Splintered crates bleed gold and gunpowder across the stones, a fallen hat and a lone rifle marking where men stood before the quiet took them, and the telegraph poles lean overhead like mourners at a grave.\nNo crows call, no wind stirs the broken bridge above, yet somewhere beneath the wreckage a slow, steady ticking keeps time with a heart that should not still be beating."
- Effects: "iron belly" (silver jump), "gold" (yellow shimmer), "gunpowder" (silver wiggle), "should not still be beating" (red jump)
- Choices:
    - **Loot the cargo** — Gain 20 gold, 1 random consumable, and 1 random artifact.
    - **Search the engine** — Lose 13 HP from debris. Pick 1 of 3 artifacts.
    - **Check for survivors** — The next merchant's items are 25% off.
- Result text:
    - **Loot the cargo** — "You pry open the splintered crates and pocket what you can carry."
    - **Search the engine** — "You crawl through the twisted steel, bleeding but richer for it."
    - **Check for survivors** — "One man still breathes. He presses a merchant's token into your hand before his eyes close."

## The Abandoned Mine
- Text: "A crooked sign nailed to rotting timbers warns KEEP OUT in letters the sun has nearly scoured away, but the rails still run straight into the mountain's red throat, past a pickaxe left mid-swing and a busted lantern leaking its last oil into the dust.\nDeep inside the shaft, a teal light pulses where no lantern should burn, throwing long shadows across skulls and bone that nothing has bothered to bury. The vultures ride the thermals above the mesas, patient as stone, as though they already know which direction you will choose."
- Effects: "KEEP OUT" (red jump), "a teal light" (teal breathe), "they already know" (red breathe)
- Choices:
    - **Investigate** — Lose 3% max HP for artifact chance. (10%)
    - **Leave**
- Further levels:
    - **Go deeper** — Lose 5% max HP for artifact chance. (20%)
    - **Go deeper** — Lose 7% HP for artifact chance. (30%)
    - **Go deeper** — Lose 10% HP for artifact. (50%)
    - **Go deeper** — Lose 15% HP for artifact. (100%)

## The Vulture Circle
- Text: "The wind has stopped, like the desert itself is holding its breath. A bounty hunter lies face-down in cracked earth, his badge still gleaming beneath a dark bloom of blood, the wanted posters on the wire fence fluttering with names he will never collect. The vultures have already chosen their judge, and one watches from a dead branch with the patient eyes of something that has seen this story end a hundred times before."
- Effects: "badge still gleaming" (yellow shimmer), "watches from a dead branch" (red jump)
- Choices:
    - **Take the gear** — Upgrade a random tile and gain 2 random consumables. This act's boss gains 10% max HP.
    - **Bury him** — Heal 11 HP and gain 33 gold from his pockets.

## The Travelling Preacher
- Text: "He kneels in the middle of the cracked earth like he grew out of it, black coat still as stone, bible heavy in one hand and the other never far from the pistol at his hip. His wagon sags behind him with its silent bell and its perched congregation of vultures, and a crooked cross strung with rosaries leans toward him as if listening for a sermon.\nThe brim of his hat swallows his face, but you can feel him watching, weighing your soul against the weight of the lead in his holster, and deciding which he means to deliver first."
- Effects: "cracked earth" (brown wiggle), "crooked cross" (yellow jump), "watching" (blue breathe)
- Choices:
    - **Confess your sins** — Lose 100 gold, heal to full HP and start the next fight with 3 Grace.
    - **Draw your gun** — Gain 1 corruption, 146 gold, and a Preacher-tagged artifact.
    - **Walk away**

## The Campfire Stranger
- Text: "A low fire crackles in a ring of stones beneath a sky so heavy with stars it feels like the heavens are leaning in to listen. A stranger sits on a half-rotted log across the flames, hat pulled down, face lost to shadow, a tin coffee pot steaming quietly beside his boots as though he had set it out for a guest he already knew was coming.\nThe desert behind him is black and endless, and though he has not spoken, the empty log on your side of the fire seems to have been waiting a very long time."
- Effects: "crackles" (orange jump), "leaning in to listen" (yellow wiggle), "black and endless" (dark purple shimmer)
- Choices:
    - **Sit down** — Heal 20 HP.
    - **Trade** — Give 1 consumable, receive 2 random consumables.
    - **Keep walking** — Start the next fight with 2 extra swaps.

## The Rigged Bridge
- Text: "A rope bridge slumps between two red canyon walls like a broken jaw, its planks warped and half-missing, its cables fraying in the dry wind above a drop deep enough to swallow a man's last words. A bundle of dynamite has been strapped to the anchor post, fuse trailing down the rock like a black snake curled against the stone, and a second bundle waits on the cliff's edge as if someone left the choice behind on purpose.\nFar below, a thin river glints through the haze, patient as a grave digger, and the only sound is the slow groan of the ropes deciding whether to hold a little longer or not."
- Effects: "dynamite" (red wiggle), "glints" (teal shimmer), "slow groan" (red breathe)
- Choices:
    - **Defuse and cross** — Gain 2 Stick of TNT, or lose 21 HP. (50%)
    - **Blow it and climb down** — Lose 6 HP, gain 1 Lasso, and start the next fight with 1 extra swap.
    - **Find another way**

## The Snake Charmer
- Text: "A hooded figure sits cross-legged on a threadbare rug beneath a bruised twilight sky, her lantern burning low beside a cow's bleached skull and a scatter of bones, feathers, and beaded charms laid out like a dealer's cards. A rattlesnake rises from a painted clay pot at the sound of her wooden flute, hood flared, fangs bared, while more of its kin coil quietly through the dust beyond the edges of the rug.\nShe watches you with a knowing smile, eyes half hidden in shadow, as though she has already seen how long you will live after the bite."
- Effects: "burning low" (orange breathe), "hood flared" (green wiggle), "fangs bared" (silver shimmer), "knowing smile" (red jump)
- Choices:
    - **Bite** — Lose 10 HP and gain a Rattlesnake-tagged artifact.
    - **Decline**

## The Ghost Town Saloon
- Text: "The swinging doors hang crooked on rusted hinges and cobwebs drape the bottles behind the bar like funeral lace, each label faded but the whiskey inside still bright as a fresh wound. A half-played hand of cards waits on a dusty table beside a lone revolver and a stack of chips, as if the game had paused mid-bet and the players simply forgot how to breathe.\nSunlight cuts through the torn curtains in slow gold bars, and somewhere in the back room the piano ghosts a single key, though no hand rests upon it."
- Effects: "crooked" (red wiggle), "rusted" (brown wiggle), "slow gold bars" (yellow shimmer)
- Choices:
    - **Drink** — Heal 18 HP. Lose 1 swap at the start of the next fight.
    - **Search the back** — Gain a random artifact, or fight 3 bandits. (50%)
    - **Move on** — Take 39 gold from the tip jar.

## The Medicine Wagon
- Text: "A gaudy wagon creaks to a stop on the dust road, its crooked sign proclaiming DOC HOPKINS' CURE-ALL in peeling gilt letters above shelves crowded with green glass bottles, herb bundles, and tins stamped with writhing serpents. The doc himself tips his bowler and smiles too wide beneath a waxed moustache, hands open in welcome, while his mule watches the horizon with the weary patience of a creature that has seen too many towns and too many funerals.\nSomething in one of the darker bottles shifts on its own when you step closer, and the liquid inside holds its shape a heartbeat too long, as if deciding whether to be medicine or something worse."
- Effects: "DOC HOPKINS' CURE-ALL" (yellow wiggle), "green glass bottles" (green wiggle), "shifts on its own" (red jump)
- Choices:
    - **Buy Strong Whiskey** — Gain 1 Strong Whiskey and lose 15 gold.
    - **Buy Panacea** — Gain 1 Panacea and lose 30 gold.
    - **Threaten him** — Gain 1 Snake Oil, and 129 gold. Merchants cost 25% more this act.
    - **Leave**

# Event Ideas

## The Wanted Board
- Flavor: "Your face on a poster. Pretty good likeness."
- Choices:
    - **Tear down** — Normalise merchant prices.
    - **Leave up** — +30 gold, next elite +20% HP.

## The Broken Cart
- Flavor: "Merchant's cart, busted wheel, goods scattered."
- Choices:
    - **Help** — -1 consumable, merchants stock +1 item.
    - **Rob** — +2 consumables, +15 gold, next merchant +20%.

## The Dynamite Stash
- Flavor: "Crate of unstable dynamite."
- Choices:
    - **Take carefully** — +2 Stick of TNT.
    - **Blow it up** — Skip next node, -15 HP.

## The Dust Devil
- Flavor: "Swirling column of sand barreling toward you. Something glints inside it."
- Choices:
    - **Ride it out** — -10 HP. Board starts shuffled next fight.
    - **Reach in** — -20 HP. Gain artifact + random consumable.
    - **Take cover** — No effect.

## The Stranded Prospector
- Flavor: "Old-timer half-buried in a collapsed mineshaft. 'Get me outta here and I'll make it worth your while.'"
- Choices:
    - **Dig him out** — -5 HP from exertion. +25 gold, upgrade a random tile.
    - **Take his gear** — +2 random consumables. Merchants cost +10% this act.
