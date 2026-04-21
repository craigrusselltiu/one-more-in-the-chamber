import { saveMeta, loadMeta } from './localSave';
import type { LastRunSummary } from '../types/game';

const KEY = 'last_run_summary';

/** Persist a summary of the just-ended run so the next run's starter screen can reference it. */
export async function saveLastRunSummary(summary: LastRunSummary): Promise<void> {
  try {
    await saveMeta(KEY, summary);
  } catch (err) {
    console.error('[lastRun] save failed:', err);
  }
}

export async function loadLastRunSummary(): Promise<LastRunSummary | null> {
  try {
    const raw = (await loadMeta(KEY)) as (LastRunSummary & { key?: string }) | null;
    if (!raw || typeof raw !== 'object' || !('outcome' in raw)) return null;
    // saveMeta stores {key, ...data}; strip the meta key before returning.
    const { key: _ignored, ...rest } = raw;
    void _ignored;
    return rest as LastRunSummary;
  } catch {
    return null;
  }
}
