import { memo, useState, useEffect } from 'react';
import { useTutorialStore } from '../../store/tutorialStore';
import { TUTORIAL_INTRO } from '../../data/tutorials';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { useMetaStore } from '../../store/metaStore';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { UI_FRAMES, ARTIFACT_FRAMES, TILE_FRAMES } from '../../data/spriteConfig';
import { ARTIFACTS, RARITY_BREATHE_CLASS } from '../../data/artifacts';
import { TILE_DEFINITIONS } from '../../data/tiles';
import { KEYWORDS } from '../../data/keywords';
import { colorizeKeywords, KeywordSubTooltips, getReferencedKeywords, buildTileDescription } from '../components/KeywordText';

import type { CharacterId, TileType } from '../../types/game';
import type { Screen } from '../../App';


interface CharacterInfo {
  id: CharacterId;
  name: string;
  hp: number;
  ability: string;
  abilityCharge: number;
  abilityDescription: string;
  sprite: string;
  bg: string;
  exclusiveArtifactId: string;
  exclusiveTileType: TileType;
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
    bg: 'backgrounds/rust_bg.png',
    exclusiveArtifactId: 'bamboo_canteen',
    exclusiveTileType: 'bounty',
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
    bg: 'backgrounds/reno_bg.png',
    exclusiveArtifactId: 'rigged_deck',
    exclusiveTileType: 'chip',
  },
];

export const CharacterSelectScreen = memo(function CharacterSelectScreen() {
  const setPendingNewGame = useRunStore((s) => s.setPendingNewGame);
  const startRun = useRunStore((s) => s.startRun);
  const highestCleared = useMetaStore((s) => s.meta.highestAscensionCleared);
  const lastAscension = useMetaStore((s) => s.meta.lastAscensionLevel);
  const lastCharacter = useMetaStore((s) => s.meta.lastCharacter) as CharacterId;
  const setLastAscensionLevel = useMetaStore((s) => s.setLastAscensionLevel);
  const setLastCharacter = useMetaStore((s) => s.setLastCharacter);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>(lastCharacter ?? 'red_panda');
  const [ascensionLevel, setAscensionLevel] = useState(lastAscension ?? 0);
  const [customSeed, setCustomSeed] = useState('');

  // Ascension caps at 20. Scaling beyond 20 is disabled.
  const maxSelectable = Math.min(20, highestCleared + 1);
  const char = CHARACTERS.find((c) => c.id === selectedCharacter) ?? CHARACTERS[0];

  useEffect(() => {
    useTutorialStore.getState().startTutorial(TUTORIAL_INTRO);
  }, []);

  const handleConfirm = () => {
    setLastAscensionLevel(ascensionLevel);
    setLastCharacter(selectedCharacter);
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
        <ExclusiveRow artifactId={char.exclusiveArtifactId} tileType={char.exclusiveTileType} />
      </div>

      {/* Seed input - bottom left (no background panel) */}
      <div className="absolute bottom-6 left-4 flex items-center gap-2">
        <span
          className="text-stone-500 font-bold uppercase"
          style={{ fontSize: '9px', WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}
        >
          Seed
        </span>
        <input
          type="text"
          value={customSeed}
          onChange={(e) => setCustomSeed(e.target.value)}
          placeholder="random"
          className="bg-stone-900/80 border border-stone-600 text-stone-300 text-xs px-2 py-1 w-32 outline-none focus:border-amber-600"
          style={{ borderRadius: 2 }}
        />
      </div>

      {/* Ascension + Back / Confirm - bottom right (ascension centered above buttons) */}
      <div className="absolute bottom-6 right-4 flex flex-col items-center gap-3">
        {maxSelectable > 0 && (
          <AscensionSelector
            level={ascensionLevel}
            maxLevel={maxSelectable}
            onChange={setAscensionLevel}
          />
        )}
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
            className="px-4 py-1.5 text-xs rounded-sm bg-stone-800 text-stone-400 hover:bg-stone-700 transition-transform active:translate-y-0.5"
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
            className="px-5 py-1.5 text-xs rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 transition-transform active:translate-y-0.5"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
});

const KEYWORD_NAMES = Object.keys(KEYWORDS);
const KEYWORD_REGEX = new RegExp(`\\b(${KEYWORD_NAMES.join('|')})\\b`, 'g');

function extractArtifactKeywords(text: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const regex = new RegExp(KEYWORD_REGEX.source, 'g');
  while ((m = regex.exec(text)) !== null) found.add(m[1]);
  return [...found];
}

/** Starting artifact + exclusive tile icons with full tooltips matching the in-combat UIs. */
function ExclusiveRow({ artifactId, tileType }: { artifactId: string; tileType: TileType }) {
  const artDef = ARTIFACTS.find((a) => a.id === artifactId);
  const tileDef = TILE_DEFINITIONS[tileType];

  const artifactTooltip = artDef ? (
    <div className="flex flex-col gap-0.5">
      <div className="whitespace-nowrap" style={{ fontSize: '10px' }}>
        <span className={RARITY_BREATHE_CLASS[artDef.rarity ?? 'common']}>{artDef.name}</span>
      </div>
      <div className="text-stone-200 whitespace-nowrap" style={{ fontSize: '9px' }}>{colorizeKeywords(artDef.effect)}</div>
      {artDef.description && (
        <div className="text-stone-500 italic whitespace-nowrap" style={{ fontSize: '8px' }}>"{artDef.description}"</div>
      )}
      {(() => {
        const kws = extractArtifactKeywords(artDef.effect);
        if (kws.length === 0) return null;
        return (
          <div className="flex flex-col gap-px mt-0.5 pt-0.5" style={{ borderTop: '1px solid #44403c' }}>
            {kws.map((kw) => (
              <div key={kw} className="whitespace-nowrap" style={{ fontSize: '8px' }}>
                <span style={{ color: KEYWORDS[kw].color, fontWeight: 'bold' }}>{kw}</span>
                <span className="text-stone-400"> - {KEYWORDS[kw].description}</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  ) : undefined;

  const tileTooltip = tileDef ? (
    <div className="flex flex-col gap-0.5">
      <div className="font-bold text-amber-400" style={{ fontSize: '10px' }}>{tileDef.label}</div>
      <div className="text-stone-200 whitespace-nowrap" style={{ fontSize: '9px' }}>{buildTileDescription(tileType, 0)}</div>
      {tileDef.flavor && (
        <div className="text-stone-500 italic whitespace-nowrap" style={{ fontSize: '8px' }}>"{tileDef.flavor}"</div>
      )}
    </div>
  ) : undefined;
  const tileKeywordTooltip =
    tileDef && getReferencedKeywords(tileDef.description).length > 0
      ? <KeywordSubTooltips text={tileDef.description} />
      : undefined;

  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="flex items-center gap-1">
        <span
          className="text-stone-400 font-bold uppercase"
          style={{ fontSize: '8px', WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}
        >
          Starting Artifact
        </span>
        <Tooltip content={artifactTooltip} position="top">
          {ARTIFACT_FRAMES[artifactId] != null ? (
            <SpriteIcon frame={ARTIFACT_FRAMES[artifactId]} scale={1} />
          ) : (
            <div style={{ width: 18, height: 18, backgroundColor: '#808080' }} />
          )}
        </Tooltip>
      </div>
      <div className="flex items-center gap-1">
        <span
          className="text-stone-400 font-bold uppercase"
          style={{ fontSize: '8px', WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}
        >
          Unique Tile
        </span>
        <Tooltip content={tileTooltip} secondContent={tileKeywordTooltip} position="top">
          <SpriteIcon frame={TILE_FRAMES[tileType]} scale={1} />
        </Tooltip>
      </div>
    </div>
  );
}

/** Per-level ascension mutation descriptions (index = level, 0 = none). */
const ASCENSION_EFFECTS: string[] = [
  '',
  'Elites spawn more often.',
  'Normal enemies are deadlier.',
  'Elites are deadlier.',
  'Bosses are deadlier.',
  'Heal less between acts.',
  'Start each run with less health.',
  'Normal enemies are tougher.',
  'Elites are tougher.',
  'Bosses are tougher.',
  'Start each run with an extra Charcoal tile.',
  'Start each run with 1 less consumable slot.',
  'Upgraded tiles appear less often.',
  'All enemies drop less gold.',
  'Start with less max HP.',
  'Legendary artifacts are less common.',
  'Shops cost more.',
  'Normal enemies gain an additional 10% HP and 10% damage.',
  'Elites gain an additional 10% HP and 10% damage.',
  'Bosses gain an additional 10% HP and 10% damage.',
  'At the end of Act 3, the final boss spawns with a random Act 3 elite.',
];

function AscensionSelector({
  level,
  maxLevel,
  onChange,
}: {
  level: number;
  maxLevel: number;
  onChange: (level: number) => void;
}) {
  const effect = ASCENSION_EFFECTS[level] ?? '';

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: 160 }}>
      <span
        className="text-yellow-400 text-xs font-bold uppercase tracking-wider"
        style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill' }}
      >
        Ascension
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, level - 1))}
          disabled={level <= 0}
          className={`text-lg font-bold leading-none ${
            level > 0 ? 'text-amber-300 hover:text-amber-200' : 'text-stone-700 cursor-not-allowed'
          }`}
          style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill' }}
        >
          ←
        </button>
        <span
          className="text-amber-300 text-lg font-bold w-6 text-center"
          style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill' }}
        >
          {level}
        </span>
        <button
          onClick={() => onChange(Math.min(maxLevel, level + 1))}
          disabled={level >= maxLevel}
          className={`text-lg font-bold leading-none ${
            level < maxLevel ? 'text-amber-300 hover:text-amber-200' : 'text-stone-700 cursor-not-allowed'
          }`}
          style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill' }}
        >
          →
        </button>
      </div>
      {/* Fixed-size slot for the effect text: 2 lines reserved so layout never shifts */}
      <div
        className="w-full text-stone-400 text-center leading-tight"
        style={{
          fontSize: '9px',
          height: 24,
          visibility: level > 0 ? 'visible' : 'hidden',
          WebkitTextStroke: '1px #000',
          paintOrder: 'stroke fill',
        }}
      >
        {effect}
      </div>
    </div>
  );
}
