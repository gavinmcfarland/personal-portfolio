/* Dev-only persistence adapter for the portfolio canvas. These talk to the
   endpoints registered by vite-plugin-canvas-save.js, which bake the board into
   the committed src/data/canvasState.json and store dropped images under
   public/canvas-assets. Passed to <Canvas> as onPublish / onUploadImage. */

/* Bake the current board into the committed data file, so `git commit` + deploy
   makes it the live portfolio. */
export async function publishBoard(snapshot) {
  const res = await fetch('/__canvas/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(snapshot),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);
}

/* Persist a dropped image as a content-hashed static asset; return its URL. */
export async function uploadImage(file, dataUrl) {
  const res = await fetch('/__canvas/asset', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);
  return out.url;
}
