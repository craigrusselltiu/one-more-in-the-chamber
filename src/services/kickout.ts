/**
 * Kickout pub/sub.
 *
 * Fired when we detect that a different browser tab / device has taken
 * ownership of this player's active run (session_id on the server no longer
 * matches ours). Consumers: KickoutOverlay, which displays a blocking modal
 * and forces sign-out.
 */

type Listener = (kicked: boolean) => void;
const listeners = new Set<Listener>();
let kicked = false;

export function subscribeKicked(fn: Listener): () => void {
  listeners.add(fn);
  try { fn(kicked); } catch { /* ignore */ }
  return () => { listeners.delete(fn); };
}

export function isKicked(): boolean {
  return kicked;
}

export function notifyKicked(): void {
  if (kicked) return;
  kicked = true;
  for (const l of listeners) {
    try { l(true); } catch { /* ignore */ }
  }
}

/** Reset the kicked flag (used on sign-out so a subsequent sign-in starts clean). */
export function clearKicked(): void {
  kicked = false;
  for (const l of listeners) {
    try { l(false); } catch { /* ignore */ }
  }
}
