/**
 * Per-tab session identifier, generated once at module load.
 *
 * Used by the runs table to track which browser tab / device currently owns a
 * player's active run. When a different SESSION_ID writes to the row, the
 * previous owner detects the change on its next push and gets kicked out.
 */

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (older Safari etc.).
  return `sess-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export const SESSION_ID: string = generateSessionId();
