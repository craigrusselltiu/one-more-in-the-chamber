issues:
- ok, when deadeye activates, the player gets 3 shots. in deadeye mode, the next 3 tiles the user clicks gets triggered & cleared. for each tile, it must wait for cascading to finish before being able to click the next. after 3 shots, deadeye mode completes, and the user goes back to normal mode, and ability charge resets to 0. deadeye clicks do NOT use swaps. also when pressing space it seems to highlight the selected enemy - make it not do that.
- sometimes there are only 2 choices for starting tiles. I think it might be because we removed smoke. please fix. should be 3 at all times
- artifacts should be visible when in campfire or events.
- music shouldn't stop playing when going into the settings on the main menu
- changing volume mid-fight or on main menu should change the volume as the slider moves.
- cross matches (+, T, L) should create the 4-match tile (bomb tile that explodes)
- when taking an artifact during an event, it should just continue (close the event screen)
- when an enemy spawns another enemy, it pushes itself to the top slot. the main enemy shouldn't switch positions. it should just spawn the enemy on one of the empty slots.
- status effects (excluding block) should have a dedicated section below the health bar of each character. each new status effect/buff should not move surrounding components around. player's ability bar should be moved to be under the board.
- when selecting tiles, instead of the colored boxes it should show the actual sprite of the tile.
- when matching 4-match, 5-match, or any of the cross matches, the resulting special tile should be created where the match was swapped into if the match was caused by a player. if done via cascading, then it should just choose a random position in that match to spawn the special tile.
- Patrol Route doesn't work.
- the deadeye crosshair cursor should be twice as big.
- on github pages, music, sprites, and main menu background image are all broken. please fix.

adjustments:
- on combat start, make each column fall at different rates _slightly_ randomly. only so it doesn't look too uniform.
- notification should fade in/out, e.g. A dust storm has rolled in...
- instead of triggering all tiles at once, showdown should trigger each affected tile one by one with a 0.1s delay. cascading is paused when this happens until all tiles of that type have been triggered & cleared.
- instead of a master volume, I want 2 sliders - one for music, and another for sfx. they should both default to 50% upon first playing.
- the cascade combo indicator should be moved to be above the player. also each cascade adds bonus resource gain multiplier to matches (rounded down) which is indicated with the combo multipler, e.g. "9x combo! (1.3x)". the combo indicator should also pop a bit every time cascade combo goes up.

feel free to break this down as you see fit and get sub-agents to help you. also chrome mcp is available.