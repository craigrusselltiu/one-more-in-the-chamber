import { memo, useCallback, useEffect, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { fetchLeaderboard, type LeaderboardEntry, type LeaderboardPeriod } from '../../services/leaderboard';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { TILE_FRAMES, ARTIFACT_FRAMES } from '../../data/spriteConfig';
import { NAMEPLATE_BY_ID, COLOUR_BY_ID, TITLE_BY_ID } from '../../data/cosmetics';
import type { TileType } from '../../types/game';
import type { Screen } from '../../App';

/** Shared drop-shadow values so every row column stays legible over any
 *  equipped nameplate art. Light enough not to overpower the type. */
/** Stacked shadows: crisp 1px layer keeps the shadow attached to the glyph,
 *  larger blurred layer adds weight without pulling it away from the text. */
const ROW_TEXT_SHADOW = '1px 1px 0 rgba(0, 0, 0, 1), 2px 2px 2px rgba(0, 0, 0, 1)';
const ROW_ICON_SHADOW = 'drop-shadow(1px 1px 0 rgba(0, 0, 0, 1)) drop-shadow(2px 2px 2px rgba(0, 0, 0, 1))';

/** 1px black outline around glyphs; `paintOrder: 'stroke fill'` draws the
 *  stroke behind the fill so the color (or shimmer gradient) sits on top. */
const ROW_OUTLINE = {
  WebkitTextStroke: '1px #000',
  paintOrder: 'stroke fill',
} as const;

const TABS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'all-time', label: 'All-Time' },
];

export const LeaderboardScreen = memo(function LeaderboardScreen() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('all-time');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (p: LeaderboardPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard(p);
      setEntries(data);
      if (data.length === 0) {
        setError('No scores yet -- be the first.');
      }
    } catch {
      setError('Could not load leaderboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(period);
  }, [period, loadData]);

  const handleBack = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  const handleTabChange = (p: LeaderboardPeriod) => {
    setPeriod(p);
  };

  return (
    <div
      className="flex flex-col items-center h-full"
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}assets/backgrounds/leaderboard.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Header */}
      <div className="mt-5 mb-3 text-center">
        <h2
          className="text-xl text-amber-400 font-bold uppercase"
          style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill', letterSpacing: '1px' }}
        >
          Leaderboard
        </h2>
        <p className="text-[11px] text-stone-400 mt-1">Top gunslingers of the West</p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 mb-3 px-4">
        {TABS.map((tab) => {
          const active = period === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className="px-5 py-1.5 text-[11px] rounded-sm transition-transform"
              style={{
                backgroundColor: active ? 'rgba(120, 53, 15, 0.85)' : 'rgba(28, 25, 23, 0.8)',
                color: active ? '#fcd34d' : '#a8a29e',
                boxShadow: active ? '2px 2px 1px rgba(0,0,0,0.4)' : 'none',
                transform: active ? 'translateY(-2px)' : 'none',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto w-full max-w-[820px] px-4 leaderboard-scroll">
        {loading && (
          <p className="text-stone-400 text-xs text-center mt-8">Loading...</p>
        )}

        {!loading && error && entries.length === 0 && (
          <p className="text-stone-500 text-xs text-center mt-8">{error}</p>
        )}

        {!loading && entries.length > 0 && (
          <div
            className="rounded-sm divide-y divide-stone-700/60 overflow-hidden"
            style={{ backgroundColor: 'rgba(28, 25, 23, 0.75)', boxShadow: '3px 3px 2px rgba(0,0,0,0.6)' }}
          >
            {/* Table header */}
            <div
              className="flex items-center px-3 py-1.5"
              style={{ backgroundColor: 'rgba(28, 25, 23, 0.6)' }}
            >
              <span className="w-8 text-stone-500 text-[10px] uppercase tracking-wider">#</span>
              <span className="w-52 text-stone-500 text-[10px] uppercase tracking-wider">Player</span>
              <span className="flex-1 text-stone-500 text-[10px] uppercase tracking-wider">Tiles</span>
              <span className="w-10 text-center text-stone-500 text-[10px] uppercase tracking-wider">Arts</span>
              <span className="w-10 text-center text-stone-500 text-[10px] uppercase tracking-wider">Won</span>
              <span className="w-12 text-center text-stone-500 text-[10px] uppercase tracking-wider">Char</span>
              <span className="w-10 text-right text-stone-500 text-[10px] uppercase tracking-wider">Wanted</span>
              <span className="w-16 text-right text-stone-500 text-[10px] uppercase tracking-wider">Time</span>
              <span className="w-20 text-right text-stone-500 text-[10px] uppercase tracking-wider">Score</span>
            </div>

            {/* Rows */}
            {entries.map((entry) => {
              const nameplate = entry.equippedNameplate ? NAMEPLATE_BY_ID[entry.equippedNameplate] : null;
              const colour = entry.equippedColour ? COLOUR_BY_ID[entry.equippedColour] : null;
              const title = entry.equippedTitle ? TITLE_BY_ID[entry.equippedTitle] : null;
              const topThreeBg = entry.rank <= 3 && !nameplate;
              const nameplateStyle: React.CSSProperties | undefined = nameplate
                ? nameplate.imagePath
                  ? {
                      backgroundImage: `url(${import.meta.env.BASE_URL}${nameplate.imagePath})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }
                  : nameplate.cssBackground
                    ? { background: nameplate.cssBackground }
                    : undefined
                : undefined;
              return (
              <div
                key={`${entry.rank}-${entry.createdAt}`}
                className={`flex items-center px-3 py-2 ${topThreeBg ? 'bg-amber-900/10' : ''}`}
                style={nameplateStyle}
              >
                <span
                  className={`w-8 text-xs font-bold ${rankColor(entry.rank)}`}
                  style={{ textShadow: ROW_TEXT_SHADOW }}
                >
                  {entry.rank}
                </span>
                <div className="w-52 min-w-0">
                  <span
                    className={`text-sm truncate block ${colour?.shimmerClass ?? ''}`}
                    style={{
                      color: colour?.shimmerClass
                        ? undefined
                        : (colour?.hex ?? '#e7e5e4' /* stone-200 */),
                      // Shimmer text uses transparent fill (-webkit-text-fill-color)
                      // with a gradient clipped to the glyph, so a text-shadow
                      // bleeds through the see-through text. Use drop-shadow
                      // (which wraps the visible pixels) for shimmer, regular
                      // text-shadow for solid colours.
                      ...(colour?.shimmerClass
                        ? { filter: ROW_ICON_SHADOW }
                        : { textShadow: ROW_TEXT_SHADOW }),
                    }}
                  >
                    {entry.playerName}
                    {entry.isGuest && (
                      <span className="text-stone-500 text-xs ml-1">(Guest)</span>
                    )}
                  </span>
                  {title && (
                    <span
                      className="block text-stone-400 leading-none"
                      style={{ fontSize: '9px', marginTop: -1, textShadow: ROW_TEXT_SHADOW }}
                    >
                      {title.text}
                    </span>
                  )}
                </div>
                <div className="flex-1 flex items-center gap-0.5 flex-wrap">
                  {entry.tiles.map((tile, i) => {
                    const frame = TILE_FRAMES[tile.type as TileType];
                    if (frame == null) return null;
                    return (
                      <div
                        key={i}
                        className="relative"
                        style={{ width: 16, height: 16, filter: ROW_ICON_SHADOW }}
                      >
                        <SpriteIcon frame={frame} />
                        {tile.level > 0 && (
                          <span
                            className="absolute font-bold"
                            style={{
                              fontSize: '7px',
                              lineHeight: 1,
                              right: -1,
                              bottom: -1,
                              color: '#fbbf24',
                              WebkitTextStroke: '1.5px #000',
                              paintOrder: 'stroke fill',
                            }}
                          >
                            {`Lv${tile.level + 1}`}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <span className="w-10 text-center">
                  {entry.artifacts.length > 0 ? (
                    <Tooltip position="bottom" content={
                      <div className="flex flex-wrap gap-0.5 py-1" style={{ maxWidth: 200 }}>
                        {entry.artifacts.map((id, i) => {
                          const frame = ARTIFACT_FRAMES[id];
                          if (frame == null) return null;
                          return <div key={i} style={{ width: 16, height: 16 }}><SpriteIcon frame={frame} /></div>;
                        })}
                      </div>
                    }>
                      <span
                        className="text-xs text-amber-300 hover:text-amber-200 transition-colors"
                        style={{
                          cursor: 'help',
                          borderBottom: '1px dashed rgba(251, 191, 36, 0.5)',
                          paddingBottom: 1,
                          textShadow: ROW_TEXT_SHADOW,
                          ...ROW_OUTLINE,
                        }}
                      >
                        {entry.artifacts.length}
                      </span>
                    </Tooltip>
                  ) : (
                    <span className="text-xs text-stone-600" style={{ textShadow: ROW_TEXT_SHADOW, ...ROW_OUTLINE }}>0</span>
                  )}
                </span>
                <span
                  className="w-10 text-center text-xs text-amber-300"
                  style={{ textShadow: ROW_TEXT_SHADOW, ...ROW_OUTLINE }}
                >
                  {entry.runCompleted ? '\u2714' : ''}
                </span>
                <span
                  className="w-12 text-center text-stone-400 text-xs"
                  style={{ textShadow: ROW_TEXT_SHADOW, ...ROW_OUTLINE }}
                >
                  {entry.character === 'reno' ? 'Reno' : 'Rust'}
                </span>
                <span
                  className="w-10 text-right text-stone-400 text-xs"
                  style={{ textShadow: ROW_TEXT_SHADOW, ...ROW_OUTLINE }}
                >
                  {entry.wantedLevel > 0 ? `W${entry.wantedLevel}` : '-'}
                </span>
                <span
                  className="w-16 text-right text-stone-400 text-xs"
                  style={{ textShadow: ROW_TEXT_SHADOW, ...ROW_OUTLINE }}
                >
                  {formatDuration(entry.runDurationSeconds)}
                </span>
                <span
                  className="w-20 text-right text-amber-300 text-sm font-bold"
                  style={{ textShadow: ROW_TEXT_SHADOW, ...ROW_OUTLINE }}
                >
                  {entry.score.toLocaleString()}
                </span>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Back button */}
      <div className="py-3">
        <button
          onClick={handleBack}
          style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
          className="px-5 py-1.5 text-xs rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 active:translate-y-0.5 transition-transform"
        >
          Back
        </button>
      </div>
    </div>
  );
});

function formatDuration(seconds: number): string {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function rankColor(rank: number): string {
  if (rank === 1) return 'text-amber-400';
  if (rank === 2) return 'text-stone-300';
  if (rank === 3) return 'text-amber-700';
  return 'text-stone-500';
}
