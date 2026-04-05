import { memo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { useMetaStore } from '../../store/metaStore';
import { getAscensionModifiers } from '../../data/ascension';

import type { CharacterId } from '../../types/game';
import type { Screen } from '../../App';

const MAX_ASCENSION = 20;

interface CharacterInfo {
  id: CharacterId;
  name: string;
  hp: number;
  ability: string;
  abilityDescription: string;
  sprite: string;
}

const CHARACTERS: CharacterInfo[] = [
  {
    id: 'red_panda',
    name: 'Rust',
    hp: 100,
    ability: 'Deadeye',
    abilityDescription:
      'Charge by matching tiles. When full, activate to fire 3 targeted shots that destroy individual tiles of your choice.',
    sprite: 'rust.png',
  },
  {
    id: 'reno',
    name: 'Reno',
    hp: 100,
    ability: 'Shuffle the Deck',
    abilityDescription:
      'Charges faster (7 turns). Hold up to 3 tiles, then shuffle the rest of the board. Cascades resolve normally.',
    sprite: 'reno.png',
  },
];

export const CharacterSelectScreen = memo(function CharacterSelectScreen() {
  const setPendingNewGame = useRunStore((s) => s.setPendingNewGame);
  const startRun = useRunStore((s) => s.startRun);
  const highestCleared = useMetaStore((s) => s.meta.highestAscensionCleared);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('red_panda');
  const [ascensionLevel, setAscensionLevel] = useState(0);

  const maxSelectable = Math.min(highestCleared + 1, MAX_ASCENSION);

  const handleConfirm = () => {
    setPendingNewGame({ character: selectedCharacter, ascensionLevel });
    const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    startRun(seed, ascensionLevel);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  const handleBack = () => {

    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  return (
    <div className="flex flex-col items-center justify-center bg-[#1a1a2e]" style={{ width: 960, height: 540 }}>
      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-lg text-amber-400 font-bold">Choose Your Character</h2>
        <p className="text-[10px] text-stone-500 mt-1">
          Each character has a unique ability.
        </p>
      </div>

      {/* Character cards */}
      <div className="flex gap-4 mb-6">
        {CHARACTERS.map((char) => {
          const isSelected = selectedCharacter === char.id;
          return (
            <button
              key={char.id}
              onClick={() => setSelectedCharacter(char.id)}
              className="flex flex-col items-center w-52 text-left"
              style={{
                border: `2px solid ${isSelected ? '#f59e0b' : '#44403c'}`,
                backgroundColor: isSelected ? 'rgba(120, 53, 15, 0.4)' : 'rgba(28, 25, 23, 0.8)',
                padding: '12px 10px',
                transform: isSelected ? 'translateY(-4px)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}assets/sprites/${char.sprite}`}
                alt={char.name}
                style={{ width: 64, height: 64, imageRendering: 'pixelated', objectFit: 'cover' }}
                className="mb-1"
              />
              <span className="text-amber-300 text-sm font-bold mb-2">
                {char.name}
              </span>
              <div className="w-full flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-stone-500" style={{ fontSize: '10px' }}>HP</span>
                  <span className="text-red-400 text-xs font-bold">{char.hp}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-amber-400 text-xs font-bold">{char.ability}</span>
                  <span className="text-stone-400 leading-tight" style={{ fontSize: '9px' }}>
                    {char.abilityDescription}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Ascension selector */}
      {maxSelectable > 0 && (
        <AscensionSelector
          level={ascensionLevel}
          maxLevel={maxSelectable}
          onChange={setAscensionLevel}
        />
      )}

      {/* Buttons */}
      <div className="flex gap-3 mt-5">
        <button
          onClick={handleBack}
          className="px-4 py-1.5 text-xs bg-stone-800/50 text-stone-400 border border-stone-700 hover:bg-stone-700/50"
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          className="px-5 py-1.5 text-xs bg-amber-900/60 text-amber-300 border border-amber-700 hover:bg-amber-800/60"
        >
          Start
        </button>
      </div>
    </div>
  );
});

function AscensionSelector({
  level,
  maxLevel,
  onChange,
}: {
  level: number;
  maxLevel: number;
  onChange: (level: number) => void;
}) {
  const scoreMultiplier = (1.0 + 0.2 * level).toFixed(1);
  const mods = getAscensionModifiers(level);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-3">
        <span className="text-stone-400 text-xs">Ascension</span>
        <button
          onClick={() => onChange(Math.max(0, level - 1))}
          disabled={level <= 0}
          className={`w-5 h-5 flex items-center justify-center text-xs border ${
            level > 0
              ? 'text-amber-300 border-amber-700 bg-amber-900/40 hover:bg-amber-800/50'
              : 'text-stone-600 border-stone-700 bg-stone-800/30 cursor-not-allowed'
          }`}
        >
          -
        </button>
        <span className="text-amber-300 text-sm w-6 text-center font-bold">
          {level}
        </span>
        <button
          onClick={() => onChange(Math.min(maxLevel, level + 1))}
          disabled={level >= maxLevel}
          className={`w-5 h-5 flex items-center justify-center text-xs border ${
            level < maxLevel
              ? 'text-amber-300 border-amber-700 bg-amber-900/40 hover:bg-amber-800/50'
              : 'text-stone-600 border-stone-700 bg-stone-800/30 cursor-not-allowed'
          }`}
        >
          +
        </button>
        {level > 0 && (
          <span className="text-stone-500" style={{ fontSize: '10px' }}>
            Score x{scoreMultiplier}
          </span>
        )}
      </div>
      {level > 0 && (
        <div className="flex gap-3 text-stone-500" style={{ fontSize: '9px' }}>
          <span>HP +{Math.round((mods.enemyHpMultiplier - 1) * 100)}%</span>
          <span>DMG +{Math.round((mods.enemyDamageMultiplier - 1) * 100)}%</span>
          <span>Gold -{Math.round((1 - mods.goldMultiplier) * 100)}%</span>
          <span>Prices +{Math.round((mods.shopPriceMultiplier - 1) * 100)}%</span>
        </div>
      )}
    </div>
  );
}
