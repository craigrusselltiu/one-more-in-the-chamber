import { memo, useMemo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useMetaStore } from '../../store/metaStore';
import { SHOP_ITEMS, type ShopCategory, type ShopItemDefinition } from '../../data/shopItems';
import { NAMEPLATE_BY_ID, COLOUR_BY_ID } from '../../data/cosmetics';
import { TILE_FRAMES } from '../../data/spriteConfig';
import { TILE_DEFINITIONS } from '../../data/tiles';
import { SpriteIcon } from '../components/SpriteIcon';
import { CharacterSheetSprite } from '../components/CharacterSheetSprite';
import { buildTileDescription } from '../components/KeywordText';
import type { Screen } from '../../App';
import type { CharacterId, TileType } from '../../types/game';

type TabKey = 'featured' | ShopCategory;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'character', label: 'Characters' },
  { key: 'skin', label: 'Skins' },
  { key: 'tile', label: 'Tiles' },
  { key: 'artifact', label: 'Artifacts' },
  { key: 'event', label: 'Events' },
  { key: 'nameplate', label: 'Nameplates' },
  { key: 'colour', label: 'Colours' },
  { key: 'title', label: 'Titles' },
];

/** Curated Featured-tab layout. Two small-card rows (colours, titles) above
 *  a stack of full-width nameplate rows. All items still live in their own
 *  category tabs; Featured just resurfaces a picked subset. */
const FEATURED_COLOUR_IDS: string[] = [
  'shop_colour_rainbow',
  'shop_colour_shadow',
  'shop_colour_bubblegum',
  'shop_colour_red',
  'shop_colour_gold',
];
const FEATURED_TITLE_IDS: string[] = [
  'shop_title_john_chamber',
  'shop_title_dead_man_walking',
  'shop_title_rust_main',
  'shop_title_reno_main',
  'shop_title_fuck_it_we_ball',
];
const FEATURED_NAMEPLATE_IDS: string[] = [
  'shop_nameplate_blood_moon',
  'shop_nameplate_void',
  'shop_nameplate_cherry',
  'shop_nameplate_golden_laurels',
  'shop_nameplate_bubble_tea',
];

export const ReputationShopScreen = memo(function ReputationShopScreen() {
  const reputation = useMetaStore((s) => s.meta.reputation);
  const isUnlocked = useMetaStore((s) => s.isUnlocked);
  const purchaseShopItem = useMetaStore((s) => s.purchaseShopItem);

  const [tab, setTab] = useState<TabKey>('featured');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleItems = useMemo<ShopItemDefinition[]>(() => {
    if (tab === 'featured') {
      return [...FEATURED_COLOUR_IDS, ...FEATURED_TITLE_IDS, ...FEATURED_NAMEPLATE_IDS]
        .map((id) => SHOP_ITEMS.find((i) => i.id === id))
        .filter((x): x is ShopItemDefinition => !!x);
    }
    return SHOP_ITEMS.filter((i) => i.category === tab);
  }, [tab]);

  const selectedItem = useMemo(
    () => visibleItems.find((i) => i.id === selectedId) ?? null,
    [visibleItems, selectedId],
  );

  const selectedOwned = selectedItem
    ? isUnlocked(selectedItem.unlockId, selectedItem.category)
    : false;
  const canAfford = selectedItem ? reputation >= selectedItem.cost : false;
  const canPurchase = !!selectedItem && !selectedOwned && canAfford;

  const handleBack = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  const handlePurchase = () => {
    if (!canPurchase || !selectedItem) return;
    purchaseShopItem(selectedItem.unlockId, selectedItem.cost, selectedItem.category);
  };

  const handleTabChange = (key: TabKey) => {
    setTab(key);
    setSelectedId(null);
  };

  return (
    <div
      className="flex flex-col items-center h-full"
      style={{
        width: 960,
        height: 540,
        backgroundImage: `linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.18)), url(${import.meta.env.BASE_URL}assets/backgrounds/reputation.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Header */}
      <div className="mt-4 mb-2 text-center">
        <h2 className="text-xl text-amber-400 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Reputation Shop</h2>
        <p
          className="text-[10px] mt-1 uppercase"
          style={{
            letterSpacing: '1px',
            textShadow: '1px 1px 3px rgba(0,0,0,1), 1px 1px 6px rgba(0,0,0,0.95), 1px 1px 9px rgba(0,0,0,0.85)',
          }}
        >
          <span style={{ color: '#b8b8b8' }}>REPUTATION</span>
          <span style={{ color: '#fcd34d', fontWeight: 700, marginLeft: 8 }}>{reputation.toLocaleString()}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-3 px-4 flex-wrap justify-center" style={{ maxWidth: 820 }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
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

      {/* Card grid -- pt-2 / pb-2 leave room for hover/select translateY so
          cards don't clip behind the tab row or the footer on transform. */}
      <div
        className="flex-1 overflow-y-auto w-full px-6 thin-scroll"
        style={{ maxWidth: 860 }}
      >
        {visibleItems.length === 0 ? (
          <p className="text-stone-500 text-xs text-center mt-12">No items in this category yet.</p>
        ) : tab === 'featured' ? (
          (() => {
            const resolve = (ids: string[]) => ids
              .map((id) => SHOP_ITEMS.find((i) => i.id === id))
              .filter((x): x is ShopItemDefinition => !!x);
            const colourItems = resolve(FEATURED_COLOUR_IDS);
            const titleItems = resolve(FEATURED_TITLE_IDS);
            const nameplateItems = resolve(FEATURED_NAMEPLATE_IDS);
            return (
              <div className="flex flex-col gap-3 pt-2 pb-2 w-full">
                {colourItems.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {colourItems.map((item) => (
                      <ShopCard
                        key={item.id}
                        item={item}
                        owned={isUnlocked(item.unlockId, item.category)}
                        affordable={reputation >= item.cost}
                        selected={selectedId === item.id}
                        onSelect={() => setSelectedId(item.id)}
                      />
                    ))}
                  </div>
                )}
                {titleItems.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {titleItems.map((item) => (
                      <ShopCard
                        key={item.id}
                        item={item}
                        owned={isUnlocked(item.unlockId, item.category)}
                        affordable={reputation >= item.cost}
                        selected={selectedId === item.id}
                        onSelect={() => setSelectedId(item.id)}
                      />
                    ))}
                  </div>
                )}
                {nameplateItems.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {nameplateItems.map((item) => (
                      <NameplateShopCard
                        key={item.id}
                        item={item}
                        owned={isUnlocked(item.unlockId, item.category)}
                        affordable={reputation >= item.cost}
                        selected={selectedId === item.id}
                        onSelect={() => setSelectedId(item.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()
        ) : tab === 'nameplate' ? (
          <div className="flex flex-col gap-2 pt-2 pb-2 w-full">
            {visibleItems.map((item) => (
              <NameplateShopCard
                key={item.id}
                item={item}
                owned={isUnlocked(item.unlockId, item.category)}
                affordable={reputation >= item.cost}
                selected={selectedId === item.id}
                onSelect={() => setSelectedId(item.id)}
              />
            ))}
          </div>
        ) : tab === 'tile' ? (
          <div className="flex flex-wrap gap-2 justify-center pt-2 pb-2">
            {visibleItems.map((item) => (
              <TileShopCard
                key={item.id}
                item={item}
                owned={isUnlocked(item.unlockId, item.category)}
                affordable={reputation >= item.cost}
                selected={selectedId === item.id}
                onSelect={() => setSelectedId(item.id)}
              />
            ))}
          </div>
        ) : tab === 'character' ? (
          <div className="flex flex-wrap gap-2 justify-center pt-2 pb-2">
            {visibleItems.map((item) => (
              <CharacterShopCard
                key={item.id}
                item={item}
                owned={isUnlocked(item.unlockId, item.category)}
                affordable={reputation >= item.cost}
                selected={selectedId === item.id}
                onSelect={() => setSelectedId(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 justify-center pt-2 pb-2">
            {visibleItems.map((item) => (
              <ShopCard
                key={item.id}
                item={item}
                owned={isUnlocked(item.unlockId, item.category)}
                affordable={reputation >= item.cost}
                selected={selectedId === item.id}
                onSelect={() => setSelectedId(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-3 flex gap-3">
        <button
          onClick={handleBack}
          style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
          className="px-6 py-1.5 text-xs rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 active:translate-y-0.5 transition-transform"
        >
          Back
        </button>
        <button
          onClick={handlePurchase}
          disabled={!canPurchase}
          style={{
            boxShadow: canPurchase ? '2px 2px 1px rgba(0,0,0,0.4)' : 'none',
            cursor: canPurchase ? 'pointer' : 'not-allowed',
          }}
          className={`px-6 py-1.5 text-xs rounded-sm transition-transform ${
            canPurchase
              ? 'bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5'
              : 'bg-stone-900 text-stone-600'
          }`}
        >
          Purchase
        </button>
      </div>
    </div>
  );
});

function ShopCard({
  item,
  owned,
  affordable,
  selected,
  onSelect,
}: {
  item: ShopItemDefinition;
  owned: boolean;
  affordable: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const disabled = owned;
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center w-36 h-36 rounded-sm text-center transition-transform ${
        owned
          ? 'opacity-60 cursor-not-allowed'
          : affordable
            ? 'hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer'
            : 'opacity-70 cursor-pointer'
      }`}
      style={{
        backgroundColor: selected
          ? 'rgba(120, 53, 15, 0.75)'
          : owned
            ? 'rgba(28, 25, 23, 0.5)'
            : 'rgba(28, 25, 23, 0.8)',
        padding: '12px 10px',
        boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
        transform: selected ? 'translateY(-4px)' : undefined,
      }}
    >
      <span
        className="absolute top-1 right-1.5 font-bold"
        style={{
          fontSize: '10px',
          color: owned ? '#78716c' : affordable ? '#fcd34d' : '#a8a29e',
        }}
      >
        {owned ? 'OWNED' : item.cost.toLocaleString()}
      </span>
      {(() => {
        // Colour shop items render their name in the shimmer class so the
        // buyer sees exactly what they're getting before they spend rep.
        const colour = item.category === 'colour' ? COLOUR_BY_ID[item.unlockId] : null;
        if (colour?.shimmerClass) {
          return (
            <span className={`text-sm leading-tight ${colour.shimmerClass}`}>{item.name}</span>
          );
        }
        return <span className="text-amber-300 text-xs font-bold leading-tight">{item.name}</span>;
      })()}
      <span className="text-stone-400 text-center mt-1 leading-tight" style={{ fontSize: '9px' }}>
        {item.description}
      </span>
      <span
        className="absolute bottom-1 left-1.5 text-stone-500 uppercase tracking-wide"
        style={{ fontSize: '7px' }}
      >
        {item.category}
      </span>
    </button>
  );
}

/**
 * Full-width nameplate card: shows the nameplate image as the card background
 * (a live preview of what the leaderboard row will look like) with the name
 * on the left and the cost on the right.
 */
function NameplateShopCard({
  item,
  owned,
  affordable,
  selected,
  onSelect,
}: {
  item: ShopItemDefinition;
  owned: boolean;
  affordable: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const nameplate = NAMEPLATE_BY_ID[item.unlockId];
  const base = import.meta.env.BASE_URL;
  const bgImage = nameplate?.imagePath
    ? `url(${base}${nameplate.imagePath})`
    : undefined;
  const bgFallback = nameplate?.cssBackground ?? 'rgba(28, 25, 23, 0.8)';

  return (
    <button
      onClick={onSelect}
      disabled={owned}
      className={`relative flex items-center w-full rounded-sm transition-transform ${
        owned
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer'
      }`}
      style={{
        height: 40,
        backgroundImage: bgImage,
        backgroundColor: bgImage ? undefined : bgFallback,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
        outline: selected ? '2px solid #fcd34d' : '1px solid rgba(0,0,0,0.5)',
        outlineOffset: selected ? '1px' : undefined,
        transform: selected ? 'translateY(-2px)' : undefined,
      }}
    >
      <span
        className="pl-3 text-sm font-bold"
        style={{
          color: '#e7e5e4',
          WebkitTextStroke: '2px #000',
          paintOrder: 'stroke fill',
        }}
      >
        {item.name}
      </span>
      <span
        className="ml-auto pr-3 font-bold"
        style={{
          fontSize: '11px',
          color: owned ? '#d6d3d1' : affordable ? '#fcd34d' : '#e7e5e4',
          WebkitTextStroke: '2px #000',
          paintOrder: 'stroke fill',
        }}
      >
        {owned ? 'OWNED' : item.cost.toLocaleString()}
      </span>
    </button>
  );
}

/** Tile-specific shop card: mirrors the in-run TileSelectScreen card layout
 *  (sprite + label + description + flavor) so the shop preview matches what
 *  the player will see when the tile actually drops. */
function TileShopCard({
  item,
  owned,
  affordable,
  selected,
  onSelect,
}: {
  item: ShopItemDefinition;
  owned: boolean;
  affordable: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const disabled = owned;
  const tileType = item.unlockId as TileType;
  const frame = TILE_FRAMES[tileType];
  const def = TILE_DEFINITIONS[tileType];
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`relative flex flex-col items-center w-32 rounded-sm text-center transition-transform ${
        owned
          ? 'opacity-60 cursor-not-allowed'
          : affordable
            ? 'hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer'
            : 'opacity-70 cursor-pointer'
      }`}
      style={{
        backgroundColor: selected
          ? 'rgba(120, 53, 15, 0.75)'
          : owned
            ? 'rgba(28, 25, 23, 0.5)'
            : 'rgba(28, 25, 23, 0.8)',
        padding: '20px 10px 12px',
        boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
        transform: selected ? 'translateY(-4px)' : undefined,
      }}
    >
      <span
        className="absolute top-1 right-1.5 font-bold"
        style={{
          fontSize: '10px',
          color: owned ? '#78716c' : affordable ? '#fcd34d' : '#a8a29e',
        }}
      >
        {owned ? 'OWNED' : `${item.cost.toLocaleString()}`}
      </span>
      {typeof frame === 'number' && (
        <SpriteIcon frame={frame} scale={2} className="mb-1.5" />
      )}
      <span
        className="text-amber-300 text-xs font-bold"
        style={{ fontSize: def && def.label.length > 12 ? '10px' : undefined }}
      >
        {def?.label ?? item.name}
      </span>
      {def && (
        <span className="text-stone-300 text-center mt-1 leading-tight" style={{ fontSize: '9px' }}>
          {buildTileDescription(tileType, 0)}
        </span>
      )}
      {def?.flavor && (
        <span
          className={`${selected ? 'text-stone-500' : 'text-stone-600'} text-center mt-1 leading-tight italic`}
          style={{ fontSize: '8px' }}
        >
          "{def.flavor}"
        </span>
      )}
    </button>
  );
}

/** Character-specific shop card: shows the character portrait above the name and
 *  description so buyers see who they're unlocking before spending rep. Mirrors
 *  TileShopCard's layout. */
function CharacterShopCard({
  item,
  owned,
  affordable,
  selected,
  onSelect,
}: {
  item: ShopItemDefinition;
  owned: boolean;
  affordable: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const disabled = owned;
  const character = item.unlockId as CharacterId;
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`relative flex flex-col items-center w-32 rounded-sm text-center transition-transform ${
        owned
          ? 'opacity-60 cursor-not-allowed'
          : affordable
            ? 'hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer'
            : 'opacity-70 cursor-pointer'
      }`}
      style={{
        backgroundColor: selected
          ? 'rgba(120, 53, 15, 0.75)'
          : owned
            ? 'rgba(28, 25, 23, 0.5)'
            : 'rgba(28, 25, 23, 0.8)',
        padding: '20px 10px 12px',
        boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
        transform: selected ? 'translateY(-4px)' : undefined,
      }}
    >
      <span
        className="absolute top-1 right-1.5 font-bold"
        style={{
          fontSize: '10px',
          color: owned ? '#78716c' : affordable ? '#fcd34d' : '#a8a29e',
        }}
      >
        {owned ? 'OWNED' : item.cost.toLocaleString()}
      </span>
      <CharacterSheetSprite character={character} size={48} alt={item.name} className="mb-1.5" />
      <span className="text-amber-300 text-xs font-bold">{item.name}</span>
      <span className="text-stone-300 text-center mt-1 leading-tight" style={{ fontSize: '9px' }}>
        {item.description}
      </span>
    </button>
  );
}
