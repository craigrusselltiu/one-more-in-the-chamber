/**
 * Simple seeded PRNG (mulberry32).
 * Given a string seed, produces a deterministic sequence of random numbers.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

export function createSeededRandom(seed: string): () => number {
  let state = hashString(seed);
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic shuffle using a seeded RNG. */
export function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Global game RNG — overrides Math.random during a run for full determinism.
// ---------------------------------------------------------------------------

const originalRandom = Math.random.bind(Math);
let gameRng: (() => number) | null = null;
let activeSeed: string | null = null;

/**
 * Install a seeded RNG as the global Math.random for the duration of a run.
 * All game code (combat, board, enemies, etc.) automatically uses it.
 */
export function installGameSeed(seed: string): void {
  activeSeed = seed;
  gameRng = createSeededRandom(seed);
  Math.random = () => gameRng!();
}

/** Restore the original Math.random (e.g. when returning to main menu). */
export function uninstallGameSeed(): void {
  activeSeed = null;
  gameRng = null;
  Math.random = originalRandom;
}

/** Get the current active seed, or null if not in a run. */
export function getActiveSeed(): string | null {
  return activeSeed;
}
