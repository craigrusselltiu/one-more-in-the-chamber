import { memo, useCallback, useEffect, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { fetchLeaderboard, type LeaderboardEntry, type LeaderboardPeriod } from '../../services/leaderboard';
import type { Screen } from '../../App';

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
    <div className="flex flex-col items-center h-full bg-[#1a1a2e]/95">
      {/* Header */}
      <div className="mt-6 mb-2 text-center">
        <h2 className="text-xl text-amber-400 font-mono">Leaderboard</h2>
        <p className="text-xs text-stone-400 font-mono mt-1">Top gunslingers of the West</p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 mb-3 px-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-3 py-1 font-mono text-xs border transition-colors ${
              period === tab.key
                ? 'border-amber-600 bg-amber-900/40 text-amber-300'
                : 'border-stone-700 bg-stone-800/30 text-stone-400 hover:border-stone-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto w-full max-w-[560px] px-4">
        {loading && (
          <p className="text-stone-400 font-mono text-xs text-center mt-8">Loading...</p>
        )}

        {!loading && error && entries.length === 0 && (
          <p className="text-stone-500 font-mono text-xs text-center mt-8">{error}</p>
        )}

        {!loading && entries.length > 0 && (
          <div className="border border-stone-600 bg-stone-800/50">
            {/* Table header */}
            <div className="flex items-center px-3 py-2 border-b border-stone-600 bg-stone-700/30">
              <span className="w-8 text-stone-400 font-mono text-xs">#</span>
              <span className="flex-1 text-stone-400 font-mono text-xs">Player</span>
              <span className="w-14 text-right text-stone-400 font-mono text-xs">Asc</span>
              <span className="w-24 text-right text-stone-400 font-mono text-xs">Score</span>
            </div>

            {/* Rows */}
            {entries.map((entry) => (
              <div
                key={`${entry.rank}-${entry.createdAt}`}
                className={`flex items-center px-3 py-2 border-b border-stone-700/50 ${
                  entry.rank <= 3 ? 'bg-amber-900/10' : ''
                }`}
              >
                <span className={`w-8 font-mono text-xs font-bold ${rankColor(entry.rank)}`}>
                  {entry.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-stone-200 font-mono text-sm truncate block">
                    {entry.playerName}
                  </span>
                </div>
                <span className="w-14 text-right text-stone-400 font-mono text-xs">
                  {entry.ascensionLevel > 0 ? `A${entry.ascensionLevel}` : '-'}
                </span>
                <span className="w-24 text-right text-amber-300 font-mono text-sm font-bold">
                  {entry.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back button */}
      <div className="py-3">
        <button
          onClick={handleBack}
          className="px-6 py-2 bg-stone-700/50 text-stone-300 font-mono text-sm border border-stone-600 hover:bg-stone-600/50"
        >
          Back
        </button>
      </div>
    </div>
  );
});

function rankColor(rank: number): string {
  if (rank === 1) return 'text-amber-400';
  if (rank === 2) return 'text-stone-300';
  if (rank === 3) return 'text-amber-700';
  return 'text-stone-500';
}
