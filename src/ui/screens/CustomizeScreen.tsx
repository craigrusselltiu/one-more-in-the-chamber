import { memo, useEffect, useMemo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useMetaStore } from '../../store/metaStore';
import { NAMEPLATES, COLOURS, COLOUR_BY_ID, TITLES, SKINS } from '../../data/cosmetics';
import { getAuthState, subscribeAuth, type AuthState } from '../../services/auth';
import type { Screen } from '../../App';

type TabKey = 'skin' | 'nameplate' | 'colour' | 'title';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'nameplate', label: 'Nameplates' },
  { key: 'skin', label: 'Skins' },
  { key: 'colour', label: 'Colours' },
  { key: 'title', label: 'Titles' },
];

interface Entry {
  id: string;          // unique row id (tab-scoped)
  unlockId: string;    // id stored in meta.unlocked* / meta.equipped*
  name: string;
  category: TabKey;
  preview?: React.ReactNode;
  description?: string;
}

export const CustomizeScreen = memo(function CustomizeScreen() {
  const meta = useMetaStore((s) => s.meta);
  const setEquippedSkin = useMetaStore((s) => s.setEquippedSkin);
  const setEquippedNameplate = useMetaStore((s) => s.setEquippedNameplate);
  const setEquippedColour = useMetaStore((s) => s.setEquippedColour);
  const setEquippedTitle = useMetaStore((s) => s.setEquippedTitle);

  const [tab, setTab] = useState<TabKey>('nameplate');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Dev flag from auth state -- surfaces creator-only cosmetics on the
  // current account's Customize screen without requiring a purchase.
  const [auth, setAuth] = useState<AuthState>(() => ({ ...getAuthState() }));
  useEffect(() => subscribeAuth(setAuth), []);

  // Build the owned-only entry list for each category.
  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];

    // Skins
    for (const s of SKINS) {
      if (!meta.unlockedSkins.includes(s.id)) continue;
      out.push({
        id: `skin_${s.id}`,
        unlockId: s.id,
        name: s.name,
        category: 'skin',
      });
    }

    // Nameplates -- preview handled by NameplateCustomizeCard (full-width
     // row showing the actual nameplate image). No inline preview needed.
    for (const np of NAMEPLATES) {
      if (!meta.unlockedNameplates.includes(np.id)) continue;
      out.push({
        id: `nameplate_${np.id}`,
        unlockId: np.id,
        name: np.name,
        category: 'nameplate',
      });
    }

    // Colours -- the name itself is the preview (rendered in the shimmer
    // class inside CustomizeCard), matching the Rep Shop card layout.
    for (const c of COLOURS) {
      if (!meta.unlockedColours.includes(c.id)) continue;
      out.push({
        id: `colour_${c.id}`,
        unlockId: c.id,
        name: c.name,
        category: 'colour',
        description: c.description,
      });
    }

    // Titles -- rendered like a leaderboard subtitle inside CustomizeCard,
    // so no separate description (it'd just duplicate the title text).
    // devOnly titles bypass the unlockedTitles check and surface only when
    // the signed-in account is a dev (auth.isDev from DEV_USER_IDS).
    for (const t of TITLES) {
      const unlocked = meta.unlockedTitles.includes(t.id);
      const devUnlocked = !!t.devOnly && auth.isDev;
      if (!unlocked && !devUnlocked) continue;
      out.push({
        id: `title_${t.id}`,
        unlockId: t.id,
        name: t.name,
        category: 'title',
      });
    }

    return out;
  }, [meta, auth.isDev]);

  const visibleEntries = useMemo(
    () => entries.filter((e) => e.category === tab),
    [entries, tab],
  );

  const isEntryEquipped = (e: Entry): boolean => {
    switch (e.category) {
      case 'skin':       return meta.equippedSkin === e.unlockId;
      case 'nameplate':  return meta.equippedNameplate === e.unlockId;
      case 'colour':     return meta.equippedColour === e.unlockId;
      case 'title':      return meta.equippedTitle === e.unlockId;
    }
  };

  const selected = useMemo(
    () => visibleEntries.find((e) => e.id === selectedId) ?? null,
    [visibleEntries, selectedId],
  );
  const selectedEquipped = selected ? isEntryEquipped(selected) : false;

  const handleBack = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  const handleEquipToggle = () => {
    if (!selected) return;
    const unequip = selectedEquipped;
    switch (selected.category) {
      case 'skin':
        setEquippedSkin(unequip ? null : selected.unlockId);
        return;
      case 'nameplate':
        setEquippedNameplate(unequip ? null : selected.unlockId);
        return;
      case 'colour':
        setEquippedColour(unequip ? null : selected.unlockId);
        return;
      case 'title':
        setEquippedTitle(unequip ? null : selected.unlockId);
        return;
    }
  };

  const handleTabChange = (key: TabKey) => {
    setTab(key);
    setSelectedId(null);
  };

  const equipButtonLabel = selectedEquipped ? 'Unequip' : 'Equip';
  const equipButtonDisabled = !selected;

  return (
    <div
      className="flex flex-col items-center h-full"
      style={{
        width: 960,
        height: 540,
        backgroundImage: `linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.18)), url(${import.meta.env.BASE_URL}assets/backgrounds/customize.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Header */}
      <div className="mt-4 mb-2 text-center">
        <h2 className="text-xl text-amber-400 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Customize</h2>
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

      {/* Card grid -- nameplates render as full-width rows (image visible at
          real aspect, mirrors the shop); other categories use the small grid.
          pt-2 / pb-2 give hover/select translateY room so cards don't clip. */}
      <div className="flex-1 overflow-y-auto w-full px-6 thin-scroll" style={{ maxWidth: 860 }}>
        {visibleEntries.length === 0 ? (
          <p className="text-stone-500 text-xs text-center mt-12">
            Nothing unlocked here yet. Earn reputation and visit the shop.
          </p>
        ) : tab === 'nameplate' ? (
          <div className="flex flex-col gap-2 pt-2 pb-2 w-full">
            {visibleEntries.map((entry) => (
              <NameplateCustomizeCard
                key={entry.id}
                entry={entry}
                equipped={isEntryEquipped(entry)}
                selected={selectedId === entry.id}
                onSelect={() => setSelectedId(entry.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 justify-center pt-2 pb-2">
            {visibleEntries.map((entry) => (
              <CustomizeCard
                key={entry.id}
                entry={entry}
                equipped={isEntryEquipped(entry)}
                selected={selectedId === entry.id}
                onSelect={() => setSelectedId(entry.id)}
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
          onClick={handleEquipToggle}
          disabled={equipButtonDisabled}
          style={{
            boxShadow: equipButtonDisabled ? 'none' : '2px 2px 1px rgba(0,0,0,0.4)',
            cursor: equipButtonDisabled ? 'not-allowed' : 'pointer',
          }}
          className={`px-6 py-1.5 text-xs rounded-sm transition-transform ${
            equipButtonDisabled
              ? 'bg-stone-900 text-stone-600'
              : 'bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5'
          }`}
        >
          {equipButtonLabel}
        </button>
      </div>
    </div>
  );
});

function CustomizeCard({
  entry,
  equipped,
  selected,
  onSelect,
}: {
  entry: Entry;
  equipped: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="relative flex flex-col items-center justify-center w-36 h-36 rounded-sm text-center transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
      style={{
        backgroundColor: selected ? 'rgba(120, 53, 15, 0.75)' : 'rgba(28, 25, 23, 0.8)',
        padding: '12px 10px',
        boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
        transform: selected ? 'translateY(-4px)' : undefined,
        cursor: 'pointer',
      }}
    >
      {equipped && (
        <span
          className="absolute top-1 left-1.5 font-bold"
          style={{ fontSize: '9px', color: '#fcd34d' }}
        >
          EQUIPPED
        </span>
      )}
      {(() => {
        // Colour cards: the item name IS the preview, rendered in its
        // shimmer class (matches the Rep Shop's colour card layout).
        if (entry.category === 'colour') {
          const colour = COLOUR_BY_ID[entry.unlockId];
          if (colour?.shimmerClass) {
            return (
              <span className={`text-sm leading-tight ${colour.shimmerClass}`}>{entry.name}</span>
            );
          }
          // Solid-hex fallback.
          return (
            <span
              className="text-sm font-bold leading-tight"
              style={{ color: colour?.hex ?? '#e7e5e4' }}
            >
              {entry.name}
            </span>
          );
        }
        // Title cards: render the title text in the same stone-400 subtitle
        // style the leaderboard uses, so the card IS a true preview.
        if (entry.category === 'title') {
          return (
            <span className="text-stone-300 leading-tight" style={{ fontSize: '11px' }}>
              {entry.name}
            </span>
          );
        }
        // Other categories: keep the preview + amber name layout.
        return (
          <>
            <div className="flex items-center justify-center" style={{ minHeight: 40 }}>
              {entry.preview ?? (
                <span className="text-stone-500" style={{ fontSize: '9px' }}>{entry.category}</span>
              )}
            </div>
            <span className="text-amber-300 text-xs font-bold leading-tight mt-1">{entry.name}</span>
          </>
        );
      })()}
      {entry.description && (
        <span className="text-stone-400 text-center mt-1 leading-tight" style={{ fontSize: '9px' }}>
          {entry.description}
        </span>
      )}
      <span
        className="absolute bottom-1 left-1.5 text-stone-500 uppercase tracking-wide"
        style={{ fontSize: '7px' }}
      >
        {entry.category}
      </span>
    </button>
  );
}

/**
 * Full-width nameplate card: the nameplate image is the card background (a
 * leaderboard-row preview) with the name on the left and the EQUIPPED badge
 * on the right when applicable.
 */
function NameplateCustomizeCard({
  entry,
  equipped,
  selected,
  onSelect,
}: {
  entry: Entry;
  equipped: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const np = NAMEPLATES.find((n) => n.id === entry.unlockId);
  const base = import.meta.env.BASE_URL;
  const bgImage = np?.imagePath ? `url(${base}${np.imagePath})` : undefined;
  const bgFallback = np?.cssBackground ?? 'rgba(28, 25, 23, 0.8)';

  return (
    <button
      onClick={onSelect}
      className="relative flex items-center w-full rounded-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer"
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
        {entry.name}
      </span>
      {equipped && (
        <span
          className="ml-auto pr-3 font-bold"
          style={{
            fontSize: '11px',
            color: '#fcd34d',
            WebkitTextStroke: '2px #000',
            paintOrder: 'stroke fill',
          }}
        >
          EQUIPPED
        </span>
      )}
    </button>
  );
}
