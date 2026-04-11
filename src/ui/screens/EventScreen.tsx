import { memo, useMemo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { EVENTS, type EventDefinition, type EventChoice } from '../../data/events';
import { ARTIFACTS, type ArtifactDefinition } from '../../data/artifacts';
import { createSeededRandom } from '../../utils/seededRandom';
import { weightedArtifactPick } from '../../utils/weightedSelection';
import { getAscensionMutations } from '../../data/ascension';
import type { TraitId } from '../../types/game';
import type { Screen } from '../../App';

/** Pick a random unowned artifact, optionally filtered by tag. */
function pickArtifact(
  ownedIds: Set<string>,
  character: string,
  desperadoActive: boolean,
  legendaryWeight: number,
  tag?: TraitId,
): ArtifactDefinition {
  let pool = ARTIFACTS.filter((a) => !ownedIds.has(a.id) && (!a.exclusive || a.exclusive === character));
  if (tag) {
    const tagged = pool.filter((a) => a.tags.includes(tag));
    if (tagged.length > 0) pool = tagged;
  }
  if (pool.length === 0) pool = tag ? ARTIFACTS.filter((a) => a.tags.includes(tag) && (!a.exclusive || a.exclusive === character)) : ARTIFACTS.filter((a) => !a.exclusive || a.exclusive === character);
  if (pool.length === 0) pool = ARTIFACTS;
  return weightedArtifactPick(pool, Math.random, desperadoActive, false, legendaryWeight);
}

/**
 * EventScreen: narrative encounter with choices.
 * Picks a random event and presents choices with effects.
 */
export const EventScreen = memo(function EventScreen() {
  const run = useRunStore((s) => s.run);
  const updateHealth = useRunStore((s) => s.updateHealth);
  const updateGold = useRunStore((s) => s.updateGold);
  const addArtifact = useRunStore((s) => s.addArtifact);
  const addConsumable = useRunStore((s) => s.addConsumable);
  const [choiceMade, setChoiceMade] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [rewardArtifact, setRewardArtifact] = useState<ArtifactDefinition | null>(null);
  const [artifactHandled, setArtifactHandled] = useState(false);

  const event: EventDefinition = useMemo(() => {
    const rand = createSeededRandom(`${run?.seed ?? ''}-event-${run?.currentNodeId ?? ''}`);
    return EVENTS[Math.floor(rand() * EVENTS.length)];
  }, []);

  const ownedIds = useMemo(() => {
    return new Set((run?.artifacts ?? []).map((a) => a.id));
  }, [run?.artifacts]);

  const handleChoice = (choice: EventChoice) => {
    if (choiceMade || !run) return;
    setChoiceMade(true);

    let artifact: ArtifactDefinition | null = null;
    const desperadoActive = (run.traitCounts?.desperado ?? 0) >= 2;
    const legendaryWeight = getAscensionMutations(run.ascensionLevel).legendaryWeight;

    switch (choice.effect) {
      case 'gold_5':
        updateGold(5);
        setDisplayText('You found 5 gold.');
        break;
      case 'gold_10':
        updateGold(10);
        setDisplayText('You received 10 gold.');
        break;
      case 'gold_15':
        updateGold(15);
        setDisplayText('You pulled up 15 gold.');
        break;
      case 'gold_30_elite_buff':
        updateGold(30);
        setDisplayText('You gained 30 gold. The next elite will be tougher.');
        break;
      case 'merchant_normalize':
        setDisplayText('Merchant prices return to normal.');
        break;
      case 'lose_hp_gain_artifact':
        updateHealth(-10);
        artifact = pickArtifact(ownedIds, run!.character, desperadoActive, legendaryWeight, 'antivenom');
        setDisplayText('The bite burns, but something powerful courses through you.');
        break;
      case 'lose_hp_gain_gunslinger_artifact':
        updateHealth(-15);
        artifact = pickArtifact(ownedIds, run!.character, desperadoActive, legendaryWeight, 'gunslinger');
        setDisplayText('You drew and fired. The preacher nods, impressed. He leaves you a gift.');
        break;
      case 'lose_hp_gain_artifact_consumable':
        updateHealth(-20);
        artifact = pickArtifact(ownedIds, run!.character, desperadoActive, legendaryWeight);
        addConsumable({ id: 'tonic' });
        setDisplayText('You reached in and pulled out something valuable, along with a tonic.');
        break;
      case 'search_saloon': {
        const roll = Math.random();
        if (roll < 0.5) {
          artifact = pickArtifact(ownedIds, run!.character, desperadoActive, legendaryWeight);
          setDisplayText('You found something hidden behind the bar.');
        } else {
          updateHealth(-15);
          setDisplayText('An ambush in the back room. You barely escape.');
        }
        break;
      }
      case 'search_engine_artifact':
        updateHealth(-10);
        artifact = pickArtifact(ownedIds, run!.character, desperadoActive, legendaryWeight);
        setDisplayText('You dug through the wreckage and found something worth keeping.');
        break;
      case 'gain_artifact_buff_elite':
        artifact = pickArtifact(ownedIds, run!.character, desperadoActive, legendaryWeight);
        setDisplayText('You took the dead hunter\'s gear. Something about it feels... watched.');
        break;
      case 'lose_artifact_full_heal': {
        if (run.artifacts.length > 0) {
          updateHealth(run.maxHealth - run.health);
          setDisplayText('You feel cleansed. Fully healed, but lighter.');
        } else {
          updateHealth(run.maxHealth - run.health);
          setDisplayText('Nothing to confess. You feel healed anyway.');
        }
        break;
      }
      case 'mine_delve': {
        const roll = Math.random();
        if (roll < 0.25) {
          updateHealth(-3);
          setDisplayText('You explored the first level. Found nothing useful.');
        } else if (roll < 0.5) {
          updateHealth(-8);
          updateGold(20);
          setDisplayText('You went deeper and found some gold.');
        } else {
          updateHealth(-15);
          updateGold(40);
          setDisplayText('Deep in the mine, you struck gold.');
        }
        break;
      }
      case 'help_merchant':
        setDisplayText('The merchant thanks you. Merchants will have more stock.');
        break;
      case 'rob_merchant':
        updateGold(15);
        setDisplayText('You took what you needed. Next merchant costs more.');
        break;
      case 'climb_well':
        updateHealth(-10);
        updateGold(30);
        setDisplayText('The climb was rough, but the payoff was worth it.');
        break;
      case 'gain_tnt':
        addConsumable({ id: 'stick_of_tnt' });
        addConsumable({ id: 'stick_of_tnt' });
        setDisplayText('You carefully packed away two sticks of dynamite.');
        break;
      case 'skip_node_lose_hp':
        updateHealth(-15);
        setDisplayText('The explosion clears the way, but the blast catches you.');
        break;
      case 'block_5_next_fight':
        setDisplayText('You walk away unscathed. Your guard is up.');
        break;
      case 'lose_hp_shuffle_board':
        updateHealth(-10);
        setDisplayText('The sand stings your eyes. Your board starts shuffled next fight.');
        break;
      case 'heal_20_lose_swap':
        updateHealth(20);
        setDisplayText('The whiskey warms you up. Your reflexes are a bit sluggish.');
        break;
      case 'lose_hp_gold_upgrade_tile':
        updateHealth(-5);
        updateGold(25);
        setDisplayText('You dug him out. He hands you gold and shares a trick of the trade.');
        break;
      case 'gain_consumables_merchant_penalty':
        addConsumable({ id: 'tonic' });
        addConsumable({ id: 'bandage' });
        setDisplayText('You took his gear. Merchants will charge you more this act.');
        break;
      case 'heal_and_intel':
        updateHealth(15);
        setDisplayText('A restful night. You feel healed and informed about what lies ahead.');
        break;
      case 'trade_consumables':
        addConsumable({ id: 'tonic' });
        addConsumable({ id: 'bandage' });
        setDisplayText('A fair trade. You got some useful supplies.');
        break;
      case 'bonus_swap_next_fight':
        setDisplayText('You kept walking. Your focus sharpens.');
        break;
      case 'loot_train':
        updateGold(20);
        addConsumable({ id: 'tonic' });
        setDisplayText('You scavenged gold and a tonic from the wreckage.');
        break;
      case 'merchant_discount':
        setDisplayText('The survivors are grateful. Next merchant will offer better prices.');
        break;
      case 'bury_heal_gold':
        updateHealth(10);
        updateGold(10);
        setDisplayText('You gave him a proper burial and found some gold in his pockets.');
        break;
      case 'defuse_bridge': {
        const roll = Math.random();
        if (roll < 0.5) {
          addConsumable({ id: 'stick_of_tnt' });
          addConsumable({ id: 'stick_of_tnt' });
          setDisplayText('Steady hands. You defused the charges and kept the dynamite.');
        } else {
          updateHealth(-10);
          setDisplayText('The wires were tricky. You got singed, but made it across.');
        }
        break;
      }
      case 'blow_bridge_skip':
        updateHealth(-20);
        setDisplayText('The bridge is gone. You climbed down the hard way.');
        break;
      case 'buy_tonic':
        if (run.gold >= 15) {
          updateGold(-15);
          updateHealth(30);
          setDisplayText('The tonic tastes terrible but heals you well.');
        } else {
          setDisplayText('You can\'t afford it.');
        }
        break;
      case 'buy_mystery_vial': {
        if (run.gold >= 10) {
          updateGold(-10);
          const roll = Math.random();
          if (roll < 0.33) {
            updateHealth(20);
            setDisplayText('The vial glows faintly. You feel much better.');
          } else if (roll < 0.66) {
            addConsumable({ id: 'tonic' });
            setDisplayText('Strong stuff. You pocket the moonshine for later.');
          } else {
            updateHealth(-10);
            setDisplayText('Poison. You feel terrible.');
          }
        } else {
          setDisplayText('You can\'t afford it.');
        }
        break;
      }
      case 'threaten_merchant':
        addConsumable({ id: 'tonic' });
        addConsumable({ id: 'bandage' });
        setDisplayText('He hands over the goods. Merchants will charge more this act.');
        break;
      case 'smoke_out_den':
        updateGold(20);
        setDisplayText('The coyotes scatter. You find cached loot inside.');
        break;
      case 'gain_bandage':
        addConsumable({ id: 'bandage' });
        setDisplayText('You crept past without a sound and found some bandages.');
        break;
      case 'none':
        setDisplayText('You move on.');
        break;
      default:
        setDisplayText(choice.description);
        break;
    }

    if (artifact) {
      setRewardArtifact(artifact);
    }
  };

  const handleTakeArtifact = () => {
    if (rewardArtifact) {
      addArtifact({ id: rewardArtifact.id, tags: rewardArtifact.tags });
    }
    setArtifactHandled(true);
    // Auto-continue after taking artifact
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  const handleSkipArtifact = () => {
    setArtifactHandled(true);
  };

  const handleContinue = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  if (!run) return null;

  const showArtifactPopup = rewardArtifact && !artifactHandled;
  const showContinue = choiceMade && (!rewardArtifact || artifactHandled);

  const actBg = `${import.meta.env.BASE_URL}assets/backgrounds/act${run?.currentAct ?? 1}_bg.png`;
  return (
    <div
      className="flex flex-col h-full"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${actBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="flex-1 flex flex-col items-center justify-center">
      <div className="max-w-md w-full px-4">
        {/* Event title */}
        <h2 className="text-xl text-amber-400 mb-3 text-center font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>{event.title}</h2>

        {/* Flavour text / result text */}
        <div className="border border-stone-600 bg-stone-800/50 p-4 mb-4">
          <p className="text-stone-300 text-sm italic leading-relaxed">
            "{choiceMade ? displayText : event.flavourText}"
          </p>
        </div>

        {/* Choices (before selection) */}
        {!choiceMade && (
          <div className="flex flex-col gap-2">
            {event.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => handleChoice(choice)}
                className="flex flex-col p-3 border border-stone-600 bg-stone-800/50 hover:border-amber-600 hover:bg-stone-700/50 text-left"
              >
                <span className="text-amber-300 text-sm font-bold">
                  {choice.label}
                </span>
                <span className="text-stone-400 text-xs mt-1">
                  {choice.description}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Artifact reward popup */}
        {showArtifactPopup && rewardArtifact && (
          <div className="flex flex-col items-center">
            <div
              className="flex flex-col items-center w-48 mb-4"
              style={{
                border: '2px solid #b45309',
                backgroundColor: 'rgba(120, 53, 15, 0.3)',
                padding: '16px 12px',
              }}
            >
              <div className="w-10 h-10 rounded-sm mb-3 bg-amber-700/60 border border-amber-600" />
              <span className="text-amber-300 text-sm font-bold text-center">
                {rewardArtifact.name}
              </span>
              <span className="text-stone-400 text-center mt-2 leading-tight" style={{ fontSize: '9px' }}>
                {rewardArtifact.description}
              </span>
              <span className="text-amber-600 text-center mt-2 leading-tight" style={{ fontSize: '9px' }}>
                {rewardArtifact.effect}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSkipArtifact}
                className="px-6 py-1.5 text-xs bg-stone-800/50 text-stone-400 border border-stone-700 hover:bg-stone-700/50"
              >
                Skip
              </button>
              <button
                onClick={handleTakeArtifact}
                className="px-6 py-1.5 text-xs bg-amber-900/60 text-amber-300 border border-amber-700 hover:bg-amber-800/60"
              >
                Take It
              </button>
            </div>
          </div>
        )}

        {/* Continue button (after artifact handled or non-artifact choice) */}
        {showContinue && (
          <div className="flex flex-col items-center">
            <button
              onClick={handleContinue}
              className="px-6 py-2 bg-amber-900/60 text-amber-300 text-sm border border-amber-700 hover:bg-amber-800/60"
            >
              Continue
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
});
