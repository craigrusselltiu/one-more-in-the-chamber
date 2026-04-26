import { memo, useMemo, useState, type ReactNode } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useMetaStore } from '../../store/metaStore';
import { TILE_DEFINITIONS } from '../../data/tiles';
import { ARTIFACTS } from '../../data/artifacts';
import { CONSUMABLES } from '../../data/consumables';
import { TRAITS } from '../../data/traits';
import { KEYWORDS } from '../../data/keywords';
import { TILE_FRAMES, ARTIFACT_FRAMES, CONSUMABLE_FRAMES, STATUS_FRAMES, HAZARD_FRAMES, TRAIT_FRAMES } from '../../data/spriteConfig';
import { SHOP_ITEMS } from '../../data/shopItems';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { ArtifactTooltipContent } from '../components/ArtifactTooltipContent';
import { colorizeKeywords, buildTileDescription } from '../components/KeywordText';
import { TraitTooltipContent } from '../hud/TraitRow';
import type { Screen } from '../../App';
import type { TileType } from '../../types/game';

type TabKey = 'tiles' | 'artifacts' | 'traits' | 'consumables' | 'status';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'tiles', label: 'Tiles' },
  { key: 'artifacts', label: 'Artifacts' },
  { key: 'traits', label: 'Traits' },
  { key: 'consumables', label: 'Consumables' },
  { key: 'status', label: 'Status Effects' },
];

/** Keywords that live in KEYWORDS for coloring text but are not actually
 *  combatant status effects, so they don't belong in the Status tab. Shadow
 *  is a per-tile attribute (Tile.isShadow); Obsidian and Cheese are per-tile
 *  resource-generators (tile types), not stackable buffs/debuffs. */
const NON_STATUS_KEYWORDS = new Set<string>(['Shadow', 'Obsidian', 'Cheese']);

/** Tile/artifact ids that require a shop purchase. Derived once so the Ledger
 *  can show a lock overlay on discovered-but-not-unlocked entries. */
const LOCKED_TILE_SET: Set<string> = new Set(
  SHOP_ITEMS.filter((si) => si.category === 'tile').map((si) => si.unlockId),
);
const LOCKED_ARTIFACT_SET: Set<string> = new Set(
  SHOP_ITEMS.filter((si) => si.category === 'artifact').map((si) => si.unlockId),
);

const KEYWORD_NAMES = Object.keys(KEYWORDS);
const KEYWORD_REGEX = new RegExp(`\\b(${KEYWORD_NAMES.join('|')})\\b`, 'g');
function extractKeywords(text: string): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(KEYWORD_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) found.add(match[1]);
  return [...found];
}

/** Resolve a keyword to a sprite frame:
 *  1. STATUS_FRAMES (dedicated status icon)
 *  2. TILE_FRAMES (keyword shares a name with a tile: Ace, Chain, Bounty, Duel, Loot)
 *  3. ARTIFACT_FRAMES / TRAIT_FRAMES (keyword shares an id with an artifact/trait)
 *  4. null (render letter chip fallback) */
function statusFrameFor(name: string): number | null {
  const slug = name.toLowerCase().replace(/ /g, '_');
  if (slug === 'protected') return ARTIFACT_FRAMES.high_vis_jacket;
  if (slug === 'dead_man_walking') return TRAIT_FRAMES.dead_man_walking;
  if (STATUS_FRAMES[slug] != null) return STATUS_FRAMES[slug];
  if ((TILE_FRAMES as Record<string, number>)[slug] != null) {
    return (TILE_FRAMES as Record<string, number>)[slug];
  }
  if (ARTIFACT_FRAMES[slug] != null) return ARTIFACT_FRAMES[slug];
  if (TRAIT_FRAMES[slug] != null) return TRAIT_FRAMES[slug];
  return null;
}

export const LedgerScreen = memo(function LedgerScreen() {
  const discoveredTiles = useMetaStore((s) => s.meta.discoveredTiles);
  const discoveredArtifacts = useMetaStore((s) => s.meta.discoveredArtifacts);
  const discoveredConsumables = useMetaStore((s) => s.meta.discoveredConsumables);
  const discoveredTraits = useMetaStore((s) => s.meta.discoveredTraits);
  const discoveredStatusEffects = useMetaStore((s) => s.meta.discoveredStatusEffects);
  const unlockedTiles = useMetaStore((s) => s.meta.unlockedTiles);
  const unlockedArtifacts = useMetaStore((s) => s.meta.unlockedArtifacts);
  const [tab, setTab] = useState<TabKey>('tiles');

  const handleBack = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  const cells = useMemo<ReactNode[]>(() => {
    if (tab === 'tiles') {
      return (Object.keys(TILE_DEFINITIONS) as TileType[]).map((type) => {
        const def = TILE_DEFINITIONS[type];
        const discovered = discoveredTiles.includes(type);
        const locked = LOCKED_TILE_SET.has(type) && !unlockedTiles.includes(type);
        const tooltip = discovered ? (
          <EntryTooltip
            name={def.label}
            effectNode={buildTileDescription(type, 0)}
            effectText={def.description}
            flavor={def.flavor}
            locked={locked}
          />
        ) : (
          <UnknownTooltip />
        );
        return (
          <LedgerCell key={`t-${type}`} frame={TILE_FRAMES[type]} discovered={discovered} locked={locked} tooltip={tooltip} />
        );
      });
    }
    if (tab === 'artifacts') {
      return ARTIFACTS.map((a) => {
        const discovered = discoveredArtifacts.includes(a.id);
        const locked = LOCKED_ARTIFACT_SET.has(a.id) && !unlockedArtifacts.includes(a.id);
        const tooltip = discovered ? (
          <ArtifactTooltipContent artifact={a} locked={locked} />
        ) : (
          <UnknownTooltip />
        );
        return (
          <LedgerCell key={`a-${a.id}`} frame={ARTIFACT_FRAMES[a.id]} discovered={discovered} locked={locked} tooltip={tooltip} />
        );
      });
    }
    if (tab === 'traits') {
      return TRAITS.map((trait) => {
        const discovered = discoveredTraits.includes(trait.id);
        const tooltip = discovered
          ? <TraitTooltipContent traitId={trait.id} count={Number.POSITIVE_INFINITY} forceAllReached />
          : <UnknownTooltip />;
        return (
          <LedgerCell
            key={`tr-${trait.id}`}
            frame={TRAIT_FRAMES[trait.id]}
            discovered={discovered}
            tooltip={tooltip}
            fallbackLabel={discovered ? trait.name : '?'}
            fallbackColor="#fbbf24"
          />
        );
      });
    }
    if (tab === 'consumables') {
      return CONSUMABLES.map((c) => {
        const discovered = discoveredConsumables.includes(c.id);
        const tooltip = discovered ? (
          <EntryTooltip
            name={c.name}
            effectNode={colorizeKeywords(c.effect)}
            effectText={c.effect}
            flavor={c.description}
          />
        ) : (
          <UnknownTooltip />
        );
        return (
          <LedgerCell
            key={`c-${c.id}`}
            frame={c.id === 'tumbleweed' ? TILE_FRAMES.tumbleweed : CONSUMABLE_FRAMES[c.id]}
            discovered={discovered}
            tooltip={tooltip}
          />
        );
      });
    }
    // Status effects: discovered once the player gains them or sees them on an enemy.
    return Object.entries(KEYWORDS)
      .filter(([name]) => !NON_STATUS_KEYWORDS.has(name))
      .map(([name, def]) => {
        const frame = statusFrameFor(name);
        const slug = name.toLowerCase().replace(/ /g, '_');
        const discovered = discoveredStatusEffects.includes(slug);
        const tooltip = discovered
          ? <StatusTooltip name={name} color={def.color} description={def.description} />
          : <UnknownTooltip />;
        return (
          <LedgerCell
            key={`s-${name}`}
            frame={frame}
            discovered={discovered}
            tooltip={tooltip}
            fallbackLabel={discovered ? name : '?'}
            fallbackColor={def.color}
          />
        );
      });
  }, [tab, discoveredTiles, discoveredArtifacts, discoveredConsumables, discoveredTraits, unlockedTiles, unlockedArtifacts]);

  return (
    <div
      className="flex flex-col items-center h-full"
      style={{
        width: 960,
        height: 540,
      }}
    >
      {/* Header */}
      <div className="mt-4 mb-4 text-center">
        <h2
          className="text-xl text-amber-400 font-bold uppercase"
          style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}
        >
          Ledger
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-3 px-4 flex-wrap justify-center" style={{ maxWidth: 820 }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3 py-1 text-[10px] rounded-sm transition-transform"
              style={{
                backgroundColor: active ? 'rgba(120, 53, 15, 0.85)' : 'rgba(28, 25, 23, 0.8)',
                color: active ? '#fcd34d' : '#a8a29e',
                boxShadow: active ? '2px 2px 1px rgba(0,0,0,0.4)' : 'none',
                transform: active ? 'translateY(-2px)' : 'none',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto w-full px-6 thin-scroll" style={{ maxWidth: 860 }}>
        <div
          className="grid gap-2 justify-center pt-2 pb-2"
          style={{ gridTemplateColumns: 'repeat(7, max-content)' }}
        >
          {cells}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-5 pb-3 flex gap-3">
        <button
          onClick={handleBack}
          style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
          className="px-6 py-1.5 text-xs rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 active:translate-y-0.5 transition-transform"
        >
          Back
        </button>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Cell

interface LedgerCellProps {
  frame: number | null | undefined;
  discovered: boolean;
  tooltip: ReactNode;
  fallbackLabel?: string;
  fallbackColor?: string;
  /** When true and discovered, overlays a lock icon over the sprite to signal
   *  the entry is gated behind a Reputation Shop purchase. */
  locked?: boolean;
}

const ICON_SCALE = 4;
const ICON_PX = 16 * ICON_SCALE;
const CELL_PX = ICON_PX + 12;

/** Hard pixel-offset shadow under every icon. A single non-blurred
 *  drop-shadow composites far cheaper than chained blurred ones, which matters
 *  because the Artifacts tab renders 100+ canvases — blurred filters on every
 *  cell tank scroll/hover perf. */
const ICON_DROP_SHADOW = 'drop-shadow(3px 4px 0 rgba(0, 0, 0, 1))';

function LedgerCell({ frame, discovered, tooltip, fallbackLabel, fallbackColor, locked }: LedgerCellProps) {
  const hasSprite = typeof frame === 'number';
  const showLock = locked && hasSprite;
  return (
    <Tooltip content={tooltip} position="bottom">
      <div
        className="flex items-center justify-center"
        style={{ width: CELL_PX, height: CELL_PX, cursor: 'default', position: 'relative' }}
      >
        {hasSprite ? (
          <div
            style={{
              filter: discovered ? ICON_DROP_SHADOW : 'brightness(0)',
            }}
          >
            <SpriteIcon frame={frame as number} scale={ICON_SCALE} />
          </div>
        ) : (
          <span
            style={{
              color: discovered ? fallbackColor ?? '#a8a29e' : '#000',
              fontSize: '22px',
              fontWeight: 'bold',
              textShadow: discovered ? '3px 4px 0 rgba(0,0,0,1)' : 'none',
            }}
          >
            {fallbackLabel?.charAt(0) ?? '?'}
          </span>
        )}
        {showLock && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <SpriteIcon frame={HAZARD_FRAMES.lock} scale={2} outline="#000" outlineWidth={2} />
          </div>
        )}
      </div>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Tooltip body — matches ArtifactBar's tooltip: flex col, left-aligned,
// 10/9/8 px typography, divider line before referenced-keyword lines.

interface EntryTooltipProps {
  name: string;
  nameClass?: string;
  effectNode: ReactNode;
  /** Raw effect text used to detect referenced keywords for the divider block. */
  effectText: string;
  flavor?: string;
  locked?: boolean;
}

function EntryTooltip({ name, nameClass, effectNode, effectText, flavor, locked }: EntryTooltipProps) {
  const kws = extractKeywords(effectText);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="whitespace-nowrap" style={{ fontSize: '10px' }}>
        <span className={nameClass ?? 'text-amber-300 font-bold'}>{name}</span>
      </div>
      <div className="text-stone-200 whitespace-nowrap" style={{ fontSize: '9px' }}>
        {effectNode}
      </div>
      {flavor && (
        <div className="text-stone-500 italic whitespace-nowrap" style={{ fontSize: '8px' }}>
          "{flavor}"
        </div>
      )}
      {locked && (
        <div className="whitespace-nowrap text-amber-400" style={{ fontSize: '8px', fontWeight: 'bold' }}>
          Locked -- unlock in the Reputation Shop
        </div>
      )}
      {kws.length > 0 && (
        <div className="flex flex-col gap-px mt-0.5 pt-0.5" style={{ borderTop: '1px solid #44403c' }}>
          {kws.map((kw) => (
            <div key={kw} className="whitespace-nowrap" style={{ fontSize: '8px' }}>
              <span style={{ color: KEYWORDS[kw].color, fontWeight: 'bold' }}>{kw}</span>
              <span className="text-stone-400"> - {KEYWORDS[kw].description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UnknownTooltip() {
  return (
    <div className="whitespace-nowrap text-stone-400" style={{ fontSize: '10px', fontWeight: 'bold' }}>
      ???
    </div>
  );
}

function StatusTooltip({ name, color, description }: { name: string; color: string; description: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="whitespace-nowrap" style={{ fontSize: '10px' }}>
        <span style={{ color, fontWeight: 'bold' }}>{name}</span>
      </div>
      <div className="text-stone-200 whitespace-pre-line" style={{ fontSize: '9px' }}>
        {description}
      </div>
    </div>
  );
}
