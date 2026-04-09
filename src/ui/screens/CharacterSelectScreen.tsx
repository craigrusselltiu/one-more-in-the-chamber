import { memo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { useMetaStore } from '../../store/metaStore';
import { getAscensionModifiers } from '../../data/ascension';
import { SpriteIcon } from '../components/SpriteIcon';
import { UI_FRAMES } from '../../data/spriteConfig';

import type { CharacterId } from '../../types/game';
import type { Screen } from '../../App';

const MAX_ASCENSION = 20;

interface CharacterInfo {
  id: CharacterId;
  name: string;
  hp: number;
  ability: string;
  abilityCharge: number;
  abilityDescription: string;
  sprite: string;
  bg: string;
}

const CHARACTERS: CharacterInfo[] = [
  {
    id: 'red_panda',
    name: 'Rust',
    hp: 100,
    ability: 'Deadeye',
    abilityCharge: 6,
    abilityDescription:
      'Shoot any 3 tiles on the board. Each tile destroyed generates its resources.',
    sprite: 'rust.png',
    bg: 'rust_bg.png',
  },
  {
    id: 'reno',
    name: 'Reno',
    hp: 100,
    ability: 'False Shuffle',
    abilityCharge: 5,
    abilityDescription:
      'Shuffle the board.',
    sprite: 'reno.png',
    bg: 'reno_bg.png',
  },
];

export const CharacterSelectScreen = memo(function CharacterSelectScreen() {
  const setPendingNewGame = useRunStore((s) => s.setPendingNewGame);
  const startRun = useRunStore((s) => s.startRun);
  const highestCleared = useMetaStore((s) => s.meta.highestAscensionCleared);
  const lastAscension = useMetaStore((s) => s.meta.lastAscensionLevel);
  const setLastAscensionLevel = useMetaStore((s) => s.setLastAscensionLevel);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('red_panda');
  const [ascensionLevel, setAscensionLevel] = useState(lastAscension ?? 0);
  const [customSeed, setCustomSeed] = useState('');

  const maxSelectable = Math.min(highestCleared + 1, MAX_ASCENSION);
  const char = CHARACTERS.find((c) => c.id === selectedCharacter) ?? CHARACTERS[0];

  const handleConfirm = () => {
    setLastAscensionLevel(ascensionLevel);
    setPendingNewGame({ character: selectedCharacter, ascensionLevel });
    const seed = (customSeed.trim() || Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).toUpperCase();
    startRun(seed, ascensionLevel);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  const handleBack = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  return (
    <div
      className="relative flex flex-col overflow-hidden"
      style={{
        width: 960,
        height: 540,
        backgroundImage: `url(${import.meta.env.BASE_URL}assets/${char.bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 0.3s',
      }}
    >
      {/* Title */}
      <div className="text-center mt-8">
        <h2
          className="text-xl text-amber-400 font-bold uppercase"
          style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}
        >
          Choose Your Character
        </h2>
      </div>

      {/* Character tabs on the left edge */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {CHARACTERS.map((c) => {
          const isSelected = selectedCharacter === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCharacter(c.id)}
              className="flex items-center gap-2"
              style={{
                padding: '10px 16px 10px 48px',
                backgroundColor: isSelected ? 'rgba(120, 53, 15, 0.8)' : 'rgba(28, 25, 23, 0.8)',
                border: `2px solid ${isSelected ? '#f59e0b' : '#44403c'}`,
                borderLeft: 'none',
                borderRadius: '0 6px 6px 0',
                transform: isSelected ? 'translateX(0)' : 'translateX(-20px)',
                transition: 'transform 0.15s',
                minWidth: 170,
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}assets/sprites/${c.sprite}`}
                alt={c.name}
                style={{ width: 40, height: 40, imageRendering: 'pixelated', objectFit: 'cover' }}
              />
              <span
                className="text-sm font-bold"
                style={{
                  color: isSelected ? '#fcd34d' : '#a8a29e',
                  WebkitTextStroke: '2px #000',
                  paintOrder: 'stroke fill',
                }}
              >
                {c.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Character info - center bottom */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <span
          className="text-lg font-bold uppercase tracking-wide"
          style={{
            color: '#fcd34d',
            WebkitTextStroke: '3px #000',
            paintOrder: 'stroke fill',
          }}
        >
          {char.name}
        </span>
        <div className="flex items-center gap-1 mt-1" style={{ marginLeft: -8 }}>
          <SpriteIcon frame={UI_FRAMES.health} scale={1} />
          <span
            className="text-red-400 text-sm font-bold"
            style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill' }}
          >
            {char.hp}
          </span>
        </div>
        <span
          className="text-amber-400 text-xs font-bold mt-1"
          style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill' }}
        >
          {char.ability} ({char.abilityCharge} charge)
        </span>
        <span
          className="text-stone-300 text-center mt-1 leading-tight max-w-xs"
          style={{ fontSize: '9px', WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}
        >
          {char.abilityDescription}
        </span>
      </div>

      {/* Settings panel - bottom left */}
      <div
        className="absolute bottom-4 left-4 flex flex-col gap-3"
        style={{
          backgroundColor: 'rgba(20, 16, 12, 0.75)',
          border: '1px solid #44403c',
          borderRadius: 4,
          padding: '10px 14px',
          minWidth: 240,
        }}
      >
        {maxSelectable > 0 && (
          <AscensionSelector
            level={ascensionLevel}
            maxLevel={maxSelectable}
            onChange={setAscensionLevel}
          />
        )}
        <div className="flex items-center gap-2">
          <span className="text-stone-500 text-xs font-bold uppercase" style={{ fontSize: '9px' }}>Seed</span>
          <input
            type="text"
            value={customSeed}
            onChange={(e) => setCustomSeed(e.target.value)}
            placeholder="random"
            className="bg-stone-900/80 border border-stone-600 text-stone-300 text-xs px-2 py-1 w-32 outline-none focus:border-amber-600"
            style={{ borderRadius: 2 }}
          />
        </div>
      </div>

      {/* Back / Confirm - bottom right */}
      <div className="absolute bottom-6 right-4 flex gap-3">
        <button
          onClick={handleBack}
          className="px-4 py-1.5 text-xs bg-stone-800/80 text-stone-400 border border-stone-700 hover:bg-stone-700/80"
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          className="px-5 py-1.5 text-xs bg-amber-900/60 text-amber-300 border border-amber-700 hover:bg-amber-800/60"
        >
          Confirm
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-stone-500 text-xs font-bold uppercase" style={{ fontSize: '9px' }}>Ascension</span>
        <button
          onClick={() => onChange(Math.max(0, level - 1))}
          disabled={level <= 0}
          className={`w-5 h-5 flex items-center justify-center text-xs border ${
            level > 0
              ? 'text-amber-300 border-amber-700 bg-amber-900/40 hover:bg-amber-800/50'
              : 'text-stone-600 border-stone-700 bg-stone-800/30 cursor-not-allowed'
          }`}
          style={{ borderRadius: 2 }}
        >
          -
        </button>
        <span className="text-amber-300 text-sm w-5 text-center font-bold">
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
          style={{ borderRadius: 2 }}
        >
          +
        </button>
        {level > 0 && (
          <span className="text-amber-400/70" style={{ fontSize: '9px' }}>
            x{scoreMultiplier}
          </span>
        )}
      </div>
      <div className="flex gap-2 text-stone-500" style={{ fontSize: '8px', minHeight: 12, visibility: level > 0 ? 'visible' : 'hidden' }}>
        <span>HP +{Math.round((mods.enemyHpMultiplier - 1) * 100)}%</span>
        <span>DMG +{Math.round((mods.enemyDamageMultiplier - 1) * 100)}%</span>
        <span>Gold -{Math.round((1 - mods.goldMultiplier) * 100)}%</span>
        <span>Price +{Math.round((mods.merchantPriceMultiplier - 1) * 100)}%</span>
      </div>
    </div>
  );
}
