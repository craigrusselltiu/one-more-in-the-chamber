import { memo, useMemo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { EVENTS, type EventDefinition, type EventChoice } from '../../data/events';
import type { Screen } from '../../App';

/**
 * EventScreen: narrative encounter with choices.
 * Picks a random event and presents choices with effects.
 */
export const EventScreen = memo(function EventScreen() {
  const run = useRunStore((s) => s.run);
  const updateHealth = useRunStore((s) => s.updateHealth);
  const updateGold = useRunStore((s) => s.updateGold);
  const [choiceMade, setChoiceMade] = useState<EventChoice | null>(null);
  const [resultText, setResultText] = useState('');

  const event: EventDefinition = useMemo(() => {
    return EVENTS[Math.floor(Math.random() * EVENTS.length)];
  }, []);

  const handleChoice = (choice: EventChoice) => {
    if (choiceMade || !run) return;

    setChoiceMade(choice);

    // Apply effects based on effect string
    switch (choice.effect) {
      case 'gold_10':
        updateGold(10);
        setResultText('You received 10 gold.');
        break;
      case 'gold_15':
        updateGold(15);
        setResultText('You pulled up 15 gold.');
        break;
      case 'gold_30_elite_buff':
        updateGold(30);
        setResultText('You gained 30 gold. The next elite will be tougher.');
        break;
      case 'shop_normalize':
        setResultText('Shop prices return to normal.');
        break;
      case 'lose_hp_gain_artifact':
        updateHealth(-10);
        setResultText('The bite burns. You gained a mysterious artifact. (-10 HP)');
        break;
      case 'mine_delve': {
        const roll = Math.random();
        if (roll < 0.25) {
          updateHealth(-3);
          setResultText('You explored the first level. Found nothing useful. (-3 HP)');
        } else if (roll < 0.5) {
          updateHealth(-8);
          setResultText('You went deeper and found some gold. (-8 HP, +20 gold)');
          updateGold(20);
        } else {
          updateHealth(-15);
          updateGold(40);
          setResultText('Deep in the mine, you struck gold. (-15 HP, +40 gold)');
        }
        break;
      }
      case 'help_merchant':
        setResultText('The merchant thanks you. Shops will have more stock.');
        break;
      case 'rob_merchant':
        updateGold(15);
        setResultText('You took what you needed. +15 gold. Next shop costs more.');
        break;
      case 'climb_well':
        updateHealth(-10);
        updateGold(30);
        setResultText('The climb was rough, but the payoff was worth it. (-10 HP, +30 gold)');
        break;
      default:
        setResultText(choice.description);
        break;
    }
  };

  const handleContinue = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  if (!run) return null;

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e]/95">
      <div className="max-w-md w-full px-4">
        {/* Event title */}
        <h2 className="text-xl text-amber-400 font-mono mb-3 text-center">{event.title}</h2>

        {/* Flavour text */}
        <div className="border border-stone-600 bg-stone-800/50 p-4 mb-4">
          <p className="text-stone-300 font-mono text-sm italic leading-relaxed">
            "{event.flavourText}"
          </p>
        </div>

        {/* Choices or result */}
        {choiceMade ? (
          <div className="flex flex-col items-center">
            <div className="border border-amber-700/50 bg-amber-900/20 p-4 mb-4 w-full">
              <p className="text-stone-300 font-mono text-sm text-center">{resultText}</p>
            </div>
            <div className="text-xs text-stone-400 font-mono mb-4">
              HP: <span className="text-red-400">{run.health}/{run.maxHealth}</span>
              {' | '}
              Gold: <span className="text-yellow-400">{run.gold}</span>
            </div>
            <button
              onClick={handleContinue}
              className="px-6 py-2 bg-amber-900/60 text-amber-300 font-mono text-sm border border-amber-700 hover:bg-amber-800/60"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {event.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => handleChoice(choice)}
                className="flex flex-col p-3 border border-stone-600 bg-stone-800/50 hover:border-amber-600 hover:bg-stone-700/50 text-left"
              >
                <span className="text-amber-300 font-mono text-sm font-bold">
                  {choice.label}
                </span>
                <span className="text-stone-400 font-mono text-xs mt-1">
                  {choice.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
