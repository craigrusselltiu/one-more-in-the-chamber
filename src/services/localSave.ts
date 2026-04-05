/**
 * IndexedDB save/load for offline-first gameplay.
 * Saves run state after every node. Primary save mechanism.
 */

const DB_NAME = 'one-more-in-the-chamber';
const DB_VERSION = 3;
const STORE_RUN = 'runs';
const STORE_META = 'meta';
const STORE_SCORES = 'scores';
const STORE_COMBAT = 'combat_snapshots';

const REQUIRED_STORES = [STORE_RUN, STORE_META, STORE_SCORES, STORE_COMBAT];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_RUN)) {
        db.createObjectStore(STORE_RUN, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_SCORES)) {
        db.createObjectStore(STORE_SCORES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_COMBAT)) {
        db.createObjectStore(STORE_COMBAT, { keyPath: 'runId' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // If DB is corrupt (version matches but stores are missing), delete and retry
      const missing = REQUIRED_STORES.some((s) => !db.objectStoreNames.contains(s));
      if (missing) {
        db.close();
        const del = indexedDB.deleteDatabase(DB_NAME);
        del.onsuccess = () => openDB().then(resolve, reject);
        del.onerror = () => reject(new Error('Failed to delete corrupt DB'));
        return;
      }
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

// --- Runs ---

export async function saveRun(data: unknown): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_RUN, 'readwrite');
  tx.objectStore(STORE_RUN).put(data);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadRun(id: string): Promise<unknown> {
  const db = await openDB();
  const tx = db.transaction(STORE_RUN, 'readonly');
  const request = tx.objectStore(STORE_RUN).get(id);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function loadActiveRun(): Promise<unknown> {
  const db = await openDB();
  const tx = db.transaction(STORE_RUN, 'readonly');
  const request = tx.objectStore(STORE_RUN).getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const runs = request.result as Array<{ status: string }>;
      resolve(runs.find((r) => r.status === 'active') ?? null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function loadAllRuns(): Promise<unknown[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_RUN, 'readonly');
  const request = tx.objectStore(STORE_RUN).getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteRun(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_RUN, 'readwrite');
  tx.objectStore(STORE_RUN).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Meta progression ---

export async function saveMeta(key: string, data: unknown): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_META, 'readwrite');
  tx.objectStore(STORE_META).put({ key, ...(data as object) });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadMeta(key: string): Promise<unknown> {
  const db = await openDB();
  const tx = db.transaction(STORE_META, 'readonly');
  const request = tx.objectStore(STORE_META).get(key);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

// --- Scores ---

export async function saveScore(data: unknown): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_SCORES, 'readwrite');
  tx.objectStore(STORE_SCORES).put(data);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllScores(): Promise<unknown[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_SCORES, 'readonly');
  const request = tx.objectStore(STORE_SCORES).getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

// --- Combat snapshots (mid-combat saves) ---

export async function saveCombatSnapshot(data: unknown): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_COMBAT, 'readwrite');
  tx.objectStore(STORE_COMBAT).put(data);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCombatSnapshot(runId: string): Promise<unknown> {
  const db = await openDB();
  const tx = db.transaction(STORE_COMBAT, 'readonly');
  const request = tx.objectStore(STORE_COMBAT).get(runId);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function clearCombatSnapshot(runId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_COMBAT, 'readwrite');
  tx.objectStore(STORE_COMBAT).delete(runId);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Remove all combat snapshots with empty boards (corrupt saves). */
export async function purgeCorruptSnapshots(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_COMBAT, 'readwrite');
    const store = tx.objectStore(STORE_COMBAT);
    const getAll = store.getAll();
    return new Promise((resolve) => {
      getAll.onsuccess = () => {
        let purged = 0;
        for (const snap of getAll.result) {
          const tiles = snap?.board?.tiles;
          if (!tiles) { store.delete(snap.runId); purged++; continue; }
          // Check if all tiles are null (corrupt)
          let hasAnyTile = false;
          for (let r = 0; r < tiles.length && !hasAnyTile; r++) {
            for (let c = 0; tiles[r] && c < tiles[r].length; c++) {
              if (tiles[r][c]) { hasAnyTile = true; break; }
            }
          }
          if (!hasAnyTile) { store.delete(snap.runId); purged++; }
        }
        tx.oncomplete = () => resolve(purged);
        tx.onerror = () => resolve(purged);
      };
      getAll.onerror = () => resolve(0);
    });
  } catch { return 0; }
}
