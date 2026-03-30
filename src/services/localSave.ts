/**
 * IndexedDB save/load for offline-first gameplay.
 * Saves run state after every node. Primary save mechanism.
 */

const DB_NAME = 'one-more-in-the-chamber';
const DB_VERSION = 2;
const STORE_RUN = 'runs';
const STORE_META = 'meta';
const STORE_SCORES = 'scores';

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
    };
    request.onsuccess = () => resolve(request.result);
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
