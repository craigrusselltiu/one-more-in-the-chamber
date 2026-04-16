import type { Act } from '../types/game';
import { createSeededRandom } from '../utils/seededRandom';

export interface EventChoice {
  label: string;
  description: string;
  effect: string;
  /** If set, rewards apply immediately and a result screen is shown with this text + Continue. */
  resultText?: string;
}

export type EventAlign = 'left' | 'center' | 'right';

export interface EventDefinition {
  id: string;
  title: string;
  flavourText: string;
  align: EventAlign;
  /** Background image filename under public/assets/events/ */
  background: string;
  choices: EventChoice[];
}

const cardGame: EventDefinition = {
  id: 'card_game',
  title: 'The Card Game',
  flavourText: "A lantern sputters against the bruise-colored dusk, casting its glow across three warped cards and the ringed hand of a {{yellow:raccoon}} whose own wanted poster peels on the wall behind him. The {{blue:ghost town}} beyond is hollow as a gunshot's echo — empty windows, leaning beams, not so much as a dog barking — and the only sound is the soft tick of his pipe and the slow, patient shuffle of pasteboard on pine.\nHe does not look up when you approach; he has been waiting, and the cards, it seems, {{red:already know your name}}.",
  align: 'left',
  background: 'event_card.png',
  choices: [
    {
      label: 'Play',
      description: 'Pay 50 gold to play a game.',
      effect: 'play_card_game',
    },
    {
      label: 'Leave',
      description: '',
      effect: 'none',
    },
  ],
};

const oldWell: EventDefinition = {
  id: 'old_well',
  title: 'The Old Well',
  flavourText: "A crescent moon presides over a stone well that breathes soft {{green:green light}} into the dusk, as though something below were dreaming in color. Coins spill from the dirt around its base and a weathered hat lies forgotten in the grass — tokens of travelers who leaned too far, or listened too long.\nThe bucket turns on its rope without a hand to crank it, and from the dark throat of the shaft comes a faint, patient {{blue:jingling}}, like someone counting their winnings in the deep.",
  align: 'left',
  background: 'event_well.png',
  choices: [
    {
      label: 'Climb down',
      description: 'Lose 18 HP, gain 142 gold and a random consumable.',
      effect: 'well_climb',
      resultText: 'You descend into the green hush below and come up scraped and soaked, heavier than when you went in.',
    },
    {
      label: 'Use the bucket',
      description: 'Gain 45 gold.',
      effect: 'well_bucket',
      resultText: 'The rope creaks, the bucket rises, and a handful of coins clatter onto the stones at your feet.',
    },
  ],
};

const coyoteDen: EventDefinition = {
  id: 'coyote_den',
  title: 'The Coyote Den',
  flavourText: "The crescent moon hangs pale above the mesas as dusk bleeds purple over the badlands, and a cave yawns from the rock like a wound that never healed. Paw prints trail past a sun-bleached skull toward the dark within, where too many {{yellow:yellow eyes}} glint in unnatural stillness, unblinking, patient. Something {{yellow:gold}} catches the last of the light inside that {{red:den}}, glimmering atop the bones of those who reached for it before.",
  align: 'left',
  background: 'event_coyote.png',
  choices: [
    {
      label: 'Go inside and grab it',
      description: 'Gain 1 random artifact. Fight a pack of coyotes.',
      effect: 'coyote_den_fight',
      resultText: 'Your fingers close around the prize just as the growls behind you deepen into snarls.',
    },
    {
      label: 'Sneak past',
      description: '',
      effect: 'none',
    },
  ],
};

const trainWreck: EventDefinition = {
  id: 'train_wreck',
  title: 'The Train Wreck',
  flavourText: "Black smoke still curls from the iron belly of a locomotive run aground in the gulch, its cowcatcher buried in red dirt and its wheels locked mid-turn, as if the engine itself had seen something on the tracks worth dying over. Splintered crates bleed {{yellow:gold}} and gunpowder across the stones, a fallen hat and a lone {{yellow:rifle}} marking where men stood before the quiet took them, and the telegraph poles lean overhead like mourners at a grave.\nNo crows call, no wind stirs the {{blue:broken bridge}} above, yet somewhere beneath the wreckage a slow, steady {{red:ticking}} keeps time with a heart that should not still be beating.",
  align: 'right',
  background: 'event_train.png',
  choices: [
    {
      label: 'Loot the cargo',
      description: 'Gain 20 gold, 1 random consumable, and 1 random artifact.',
      effect: 'train_loot',
      resultText: 'You pry open the splintered crates and pocket what you can carry.',
    },
    {
      label: 'Search the engine',
      description: 'Lose 13 HP from debris. Pick 1 of 3 artifacts.',
      effect: 'train_engine',
      resultText: 'You crawl through the twisted steel, bleeding but richer for it.',
    },
    {
      label: 'Check for survivors',
      description: "The next merchant's items are discounted by 25%.",
      effect: 'train_survivors',
      resultText: "One man still breathes. He presses a merchant's token into your hand before his eyes close.",
    },
  ],
};

const abandonedMine: EventDefinition = {
  id: 'abandoned_mine',
  title: 'The Abandoned Mine',
  flavourText: "A crooked sign nailed to rotting timbers warns {{red:KEEP OUT}} in letters the sun has nearly scoured away, but the rails still run straight into the mountain's red throat, past a pickaxe left mid-swing and a busted lantern leaking its last oil into the dust.\nDeep inside the shaft, a {{blue:teal light}} pulses where no lantern should burn, throwing long shadows across skulls and bone that nothing has bothered to bury. The vultures ride the thermals above the mesas, patient as stone, as though they already know which direction you will choose.",
  align: 'right',
  background: 'event_mine.png',
  choices: [
    {
      label: 'Investigate',
      description: 'Lose 3% max HP for artifact chance. (10%)',
      effect: 'abandoned_mine_step',
    },
    {
      label: 'Leave',
      description: '',
      effect: 'none',
    },
  ],
};

const vultureCircle: EventDefinition = {
  id: 'vulture_circle',
  title: 'The Vulture Circle',
  flavourText: "The wind has stopped, like the desert itself is holding its breath. A {{yellow:bounty hunter}} lies face-down in cracked earth, his {{yellow:badge}} still gleaming beneath a {{red:dark bloom of blood}}, the wanted posters on the wire fence fluttering with names he will never collect. The {{blue:vultures}} have already chosen their judge, and one watches from a dead branch with the patient eyes of something that has seen this story end a hundred times before.",
  align: 'left',
  background: 'event_vulture.png',
  choices: [
    {
      label: 'Take the gear',
      description: "Upgrade a random tile and gain 2 random consumables. This act's boss gains 10% max HP.",
      effect: 'vulture_take',
      resultText: "You strip his kit and pocket what's useful. Somewhere overhead, a vulture marks your face.",
    },
    {
      label: 'Bury him',
      description: 'Heal 16 HP and gain 33 gold from his pockets.',
      effect: 'vulture_bury',
      resultText: 'You scratch a grave from the hardpan. His pockets yield a little kindness in return.',
    },
  ],
};

const travelingPreacher: EventDefinition = {
  id: 'traveling_preacher',
  title: 'The Traveling Preacher',
  flavourText: "He stands in the middle of the cracked earth like he grew out of it, black coat still as stone, bible heavy in one hand and the other never far from the {{yellow:pistol}} at his hip. His wagon sags behind him with its {{blue:silent bell}} and its perched congregation of vultures, and a {{red:crooked cross}} strung with rosaries leans toward him as if listening for a sermon.\nThe brim of his hat swallows his face, but you can feel him watching, weighing your soul against the weight of the lead in his holster, and deciding which he means to deliver first.",
  align: 'left',
  background: 'event_preacher.png',
  choices: [
    {
      label: 'Confess',
      description: 'Lose 66 gold, heal to full HP and start the next fight with 3 Grace.',
      effect: 'preacher_confess',
      resultText: 'You kneel in the dust and speak. He listens without moving, then nods once and lets you go clean.',
    },
    {
      label: 'Draw',
      description: 'Gain 1 corruption and a random Preacher-tagged artifact.',
      effect: 'preacher_draw',
      resultText: 'Smoke, ringing, and two new weights in your pocket. He watches you leave with eyes like scripture.',
    },
    {
      label: 'Walk away',
      description: '',
      effect: 'none',
    },
  ],
};

const campfireStranger: EventDefinition = {
  id: 'campfire_stranger',
  title: 'The Campfire Stranger',
  flavourText: "A low {{red:fire}} crackles in a ring of stones beneath a sky so heavy with {{yellow:stars}} it feels like the heavens are leaning in to listen. A {{blue:stranger}} sits on a half-rotted log across the flames, hat pulled down, face lost to shadow, a tin coffee pot steaming quietly beside his boots as though he had set it out for a guest he already knew was coming.\nThe desert behind him is black and endless, and though he has not spoken, the empty log on your side of the fire seems to have been waiting a very long time.",
  align: 'left',
  background: 'event_stranger.png',
  choices: [
    {
      label: 'Sit down',
      description: 'Heal 23 HP.',
      effect: 'campfire_sit',
      resultText: 'You warm your hands. He pours, you drink, and the dark beyond the firelight feels a little less sharp.',
    },
    {
      label: 'Trade',
      description: 'Give 1 consumable, receive 2 random consumables.',
      effect: 'campfire_trade',
      resultText: 'He takes the offering without looking up, and two new things settle in your pack in its place.',
    },
    {
      label: 'Keep walking',
      description: 'Start the next fight with 2 extra swaps.',
      effect: 'campfire_walk',
      resultText: 'You nod, keep your hand near your holster, and put the fire behind you with your footsteps quickening.',
    },
  ],
};

const riggedBridge: EventDefinition = {
  id: 'rigged_bridge',
  title: 'The Rigged Bridge',
  flavourText: "A {{red:rope bridge}} slumps between two red canyon walls like a broken jaw, its planks warped and half-missing, its cables fraying in the dry wind above a drop deep enough to swallow a man's last words. A bundle of {{red:dynamite}} has been strapped to the anchor post, fuse trailing down the rock like a black snake curled against the stone, and a second bundle waits on the cliff's edge as if someone left the choice behind on purpose.\nFar below, a thin {{blue:river}} glints through the haze, patient as a grave digger, and the only sound is the slow groan of the ropes deciding whether to hold a little longer or not.",
  align: 'left',
  background: 'event_bridge.png',
  choices: [
    {
      label: 'Defuse and cross',
      description: 'Gain 2 Stick of TNT, or lose 21 HP. (50%)',
      effect: 'bridge_defuse',
    },
    {
      label: 'Blow it and climb down',
      description: 'Lose 6 HP, gain 1 Lasso, and start the next fight with 1 extra swap.',
      effect: 'bridge_blow',
      resultText: 'The blast swallows the gap behind you. You pick yourself off the rocks with a rope coiled over your shoulder and your pulse running hot.',
    },
    {
      label: 'Find another way',
      description: '',
      effect: 'none',
    },
  ],
};

const snakeCharmer: EventDefinition = {
  id: 'snake_charmer',
  title: 'The Snake Charmer',
  flavourText: "A hooded figure sits cross-legged on a threadbare rug beneath a bruised twilight sky, her lantern burning low beside a cow's bleached skull and a scatter of bones, feathers, and beaded charms laid out like a dealer's cards. A {{green:rattlesnake}} rises from a painted clay pot at the sound of her wooden flute, hood flared, fangs bared, while more of its kin coil quietly through the dust beyond the edges of the rug.\nShe watches you with a {{red:knowing smile}}, eyes half hidden in shadow, as though she has already seen how long you will live after the bite.",
  align: 'left',
  background: 'event_snake.png',
  choices: [
    {
      label: 'Bite',
      description: 'Lose 10 HP and gain a Rattlesnake-tagged artifact.',
      effect: 'snake_bite',
      resultText: 'The fangs meet bone before the pain even registers. By the time your vision clears, something has settled into your pack that pulses faintly to the rhythm of your blood.',
    },
    {
      label: 'Decline',
      description: '',
      effect: 'none',
    },
  ],
};

const ghostTownSaloon: EventDefinition = {
  id: 'ghost_town_saloon',
  title: 'The Ghost Town Saloon',
  flavourText: "The swinging doors hang crooked on rusted hinges and cobwebs drape the bottles behind the bar like funeral lace, each label faded but the {{yellow:whiskey}} inside still bright as a fresh wound. A half-played hand of cards waits on a dusty table beside a lone revolver and a stack of chips, as if the game had paused mid-bet and the players simply forgot how to breathe.\nSunlight cuts through the torn curtains in slow gold bars, and somewhere in the back room the {{blue:piano}} ghosts a single key, though no hand rests upon it.",
  align: 'left',
  background: 'event_saloon.png',
  choices: [
    {
      label: 'Drink',
      description: 'Heal 20 HP. Lose 1 swap at the start of the next fight.',
      effect: 'saloon_drink',
      resultText: 'The whiskey burns sweeter than it has any right to. Your head swims as you step back out into the light.',
    },
    {
      label: 'Search the back',
      description: 'Gain a random artifact, or fight 3 bandits. (50%)',
      effect: 'saloon_search',
    },
    {
      label: 'Move on',
      description: 'Take 39 gold from the tip jar.',
      effect: 'saloon_move_on',
      resultText: 'You sweep the coins into your palm without breaking stride. The piano behind you plays another note just to be heard.',
    },
  ],
};

const medicineWagon: EventDefinition = {
  id: 'medicine_wagon',
  title: 'The Medicine Wagon',
  flavourText: "A gaudy wagon creaks to a stop on the dust road, its crooked sign proclaiming {{yellow:DOC HOPKINS' CURE-ALL}} in peeling gilt letters above shelves crowded with {{green:green glass bottles}}, herb bundles, and tins stamped with writhing serpents. The doc himself tips his bowler and smiles too wide beneath a waxed moustache, hands open in welcome, while his mule watches the horizon with the weary patience of a creature that has seen too many towns and too many funerals.\nSomething in one of the darker bottles {{red:shifts on its own}} when you step closer, and the liquid inside holds its shape a heartbeat too long, as if deciding whether to be medicine or something worse.",
  align: 'right',
  background: 'event_medicine.png',
  choices: [
    {
      label: 'Buy Strong Whiskey',
      description: 'Gain 1 Strong Whiskey and lose 30 gold.',
      effect: 'medicine_whiskey',
      resultText: "The bottle is heavier than it has any right to be. Doc pockets your coin without counting it.",
    },
    {
      label: 'Drink delayed potion',
      description: 'At the start of next combat, heal 27 HP, take 10 damage, gain 2 Vulnerable, or gain 5 Poison.',
      effect: 'medicine_potion',
      resultText: 'The liquid is warm and faintly alive. Doc watches you swallow and does not bother to wish you luck.',
    },
    {
      label: 'Threaten him',
      description: 'Gain 1 Bandage, 1 Snake Oil, and 129 gold. Merchants cost 20% more this act.',
      effect: 'medicine_threaten',
      resultText: "Doc raises his hands with the same easy smile. Word travels faster than wagons out here, and every shopkeeper this act will know your face.",
    },
  ],
};

export const EVENT_POOLS: Record<'general' | `act${Act}`, EventDefinition[]> = {
  general: [
    cardGame, oldWell, coyoteDen, trainWreck, abandonedMine,
    vultureCircle, travelingPreacher, campfireStranger, riggedBridge,
    snakeCharmer, ghostTownSaloon, medicineWagon,
  ],
  act1: [],
  act2: [],
  act3: [],
};

export function getPoolForAct(act: Act): EventDefinition[] {
  const actPool = EVENT_POOLS[`act${act}` as const];
  return [...EVENT_POOLS.general, ...actPool];
}

/**
 * Shuffle-bag draw: if bag is empty, refill from the act's pool. Pick seeded,
 * remove from bag, return both the event and the remaining bag. Matches the
 * bucket/bag pattern used elsewhere (e.g. Reno's Coin chip bag).
 */
export function pickEventFromBag(
  act: Act,
  seedKey: string,
  bag: string[],
): { event: EventDefinition; newBag: string[] } {
  const pool = getPoolForAct(act);
  const sourceIds = bag.length > 0 ? bag : pool.map((e) => e.id);
  const candidates = sourceIds
    .map((id) => pool.find((e) => e.id === id))
    .filter((e): e is EventDefinition => !!e);
  const rand = createSeededRandom(seedKey);
  const event = candidates[Math.floor(rand() * candidates.length)];
  const newBag = sourceIds.filter((id) => id !== event.id);
  return { event, newBag };
}
