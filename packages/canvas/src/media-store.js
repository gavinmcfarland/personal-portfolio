/* Tiny IndexedDB blob store for dropped media. localStorage caps out around
   5MB which a single video (or big GIF) blows straight through, so the autosave
   snapshot only keeps an `idb:<key>` reference and the bytes live here. One DB
   per canvas instance (named after its storageKey) so boards don't see each
   other's blobs and garbage collection stays safe. */

const STORE = 'media';
const dbs = new Map(); // name -> Promise<IDBDatabase>

export const hasIDB = typeof indexedDB !== 'undefined';

function openDb(name) {
  if (!dbs.has(name)) {
    dbs.set(name, new Promise((resolve, reject) => {
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }
  return dbs.get(name);
}

function tx(db, mode, run) {
  return openDb(db).then((d) => new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const out = run(t.objectStore(STORE));
    t.oncomplete = () => resolve(out.result !== undefined ? out.result : undefined);
    t.onerror = () => reject(t.error);
  }));
}

export function putMedia(db, key, blob) {
  return tx(db, 'readwrite', (s) => s.put(blob, key));
}

export function getMedia(db, key) {
  return tx(db, 'readonly', (s) => s.get(key));
}

export function listMediaKeys(db) {
  return tx(db, 'readonly', (s) => s.getAllKeys());
}

export function deleteMedia(db, keys) {
  return tx(db, 'readwrite', (s) => { keys.forEach((k) => s.delete(k)); return {}; });
}
