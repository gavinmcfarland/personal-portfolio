/* Shared persistence wiring for every <Canvas> in the portfolio.

   Saving: the canvas "Save" button calls the onPublish adapter, which POSTs
   the board to the dev-only endpoints in vite-plugin-canvas-save.js. Those
   bake it into src/data/canvas/<storageKey>.json (and dropped images into
   public/canvas-assets), so `git commit` + deploy makes the board live.
   The endpoints only exist under `vite serve`, so hosts pass the adapters
   in dev only — in production the Save button simply doesn't render. */

/* Committed board snapshots, keyed by storageKey. Eagerly globbed so a board
   with no published file just resolves to undefined. */
const files = import.meta.glob('./canvas/*.json', { eager: true });

export function publishedBoard(key) {
  const mod = files[`./canvas/${key}.json`];
  return mod ? mod.default : undefined;
}

/* onPublish adapter for the board saved under `key`. Returns undefined outside
   dev so the canvas hides its Save button where saving can't work. */
export function boardSaver(key) {
  if (!import.meta.env.DEV) return undefined;
  return async (snapshot) => {
    const res = await fetch('/__canvas/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, snapshot }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);
  };
}

/* onUploadImage / onUploadVideo adapter: persist dropped media as a
   content-hashed static asset and return its URL, so saved boards reference
   committable files instead of per-browser IndexedDB blobs. Dev only, same
   as boardSaver. */
export const uploadMedia = import.meta.env.DEV
  ? async (file, dataUrl) => {
      const res = await fetch('/__canvas/asset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);
      return out.url;
    }
  : undefined;
