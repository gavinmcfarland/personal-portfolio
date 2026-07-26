/* Bookmarks — a small localStorage-backed store for patterns worth keeping.

   A generated texture is nothing but a family (`dither` / `pixels` / `retro`),
   a seed, and — if it was pinned — an archetype. That triple is all it takes
   to grow the exact same pattern again, so a bookmark stores just that, not
   pixels. Pair it with `regenerate()` (from the package index) to turn a saved
   record back into a texture.

   The store keeps an in-memory cache, mirrors it to localStorage when that is
   available (so it survives a reload), and notifies subscribers on every
   change so a UI can stay in sync. Outside a browser it simply works in
   memory. */

const STORAGE_KEY = 'gm-dither-bookmarks';

const canStore = () => {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
};

const now = () => (typeof Date !== 'undefined' && Date.now ? Date.now() : 0);

/* The identity of a bookmark: same family + archetype + seed → same pattern,
   so this is what dedupes and what `has`/`remove` match on. */
function keyOf(rec) {
  return `${rec.family}:${rec.archetype || '*'}:${rec.seed}`;
}

function load() {
  if (!canStore()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((r) => r && r.family && r.seed != null) : [];
  } catch {
    return [];
  }
}

function persist(list) {
  if (!canStore()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* private mode / quota — stay in memory rather than throwing */
  }
}

let cache = load();
const listeners = new Set();

function emit() {
  const snapshot = cache.slice();
  for (const cb of listeners) cb(snapshot);
}

export const bookmarks = {
  /* Every saved record, newest first. */
  all() {
    return cache.slice();
  },

  /* Is this pattern already bookmarked? Accepts a record or a key string. */
  has(rec) {
    const k = typeof rec === 'string' ? rec : keyOf(rec);
    return cache.some((r) => keyOf(r) === k);
  },

  /* Save a pattern. Needs at least { family, seed }; archetype and label are
     optional. A duplicate is a no-op. Returns true if it was added. */
  add(rec) {
    if (!rec || !rec.family || rec.seed == null) {
      throw new Error('A bookmark needs at least { family, seed }.');
    }
    const clean = {
      family: rec.family,
      seed: rec.seed,
      archetype: rec.archetype || undefined,
      label: rec.label || undefined,
      palette: rec.palette || undefined,
      savedAt: rec.savedAt || now(),
    };
    const k = keyOf(clean);
    if (cache.some((r) => keyOf(r) === k)) return false;
    cache = [clean, ...cache];
    persist(cache);
    emit();
    return true;
  },

  /* Remove a pattern. Accepts a record or a key string. */
  remove(rec) {
    const k = typeof rec === 'string' ? rec : keyOf(rec);
    const next = cache.filter((r) => keyOf(r) !== k);
    if (next.length === cache.length) return false;
    cache = next;
    persist(cache);
    emit();
    return true;
  },

  /* Add if absent, remove if present. Returns the new state (true = saved). */
  toggle(rec) {
    if (this.has(rec)) {
      this.remove(rec);
      return false;
    }
    this.add(rec);
    return true;
  },

  /* Forget everything. */
  clear() {
    if (!cache.length) return;
    cache = [];
    persist(cache);
    emit();
  },

  /* Listen for changes; returns an unsubscribe function. */
  subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  /* Re-read from storage — useful if another tab wrote to it. */
  reload() {
    cache = load();
    emit();
    return cache.slice();
  },

  /* The stable identity of a record, exposed for callers that key their own
     maps by it. */
  key: keyOf,
};
