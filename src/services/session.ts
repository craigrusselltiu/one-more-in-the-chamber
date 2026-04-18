/**
 * Per-browser session identifier.
 *
 * Persisted in localStorage so that reopening a tab, refreshing, or restoring
 * a stale Supabase auth session all reuse the same id. Two tabs in the same
 * browser share the id; a different browser / device gets its own. This is
 * what lets the kickout system detect a genuine cross-device takeover versus
 * the same user simply reopening their own tab.
 */

const SESSION_ID_KEY = 'omitc-device-session-id';

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
  } catch { /* ignore */ }
  const fresh = generateSessionId();
  try { localStorage.setItem(SESSION_ID_KEY, fresh); } catch { /* ignore */ }
  return fresh;
}

export const SESSION_ID: string = getOrCreateSessionId();
