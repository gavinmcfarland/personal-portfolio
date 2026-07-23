/* Browser console snippet — run this in the DevTools console of the tab whose
   IndexedDB holds your canvas recordings (i.e. your running dev server origin,
   e.g. http://localhost:5173). It reads every blob out of the per-board
   `<storageKey>-media` databases and downloads them bundled into a single
   `canvas-media-export.json` file.
   Feed that file to scripts/migrate-canvas-media.mjs to bake the audio into
   committed assets and rewrite the board JSON — no re-recording needed.

   Usage: copy this whole file, paste it into the console, press Enter. */
(async () => {
  const STORE = 'media';

  const openDb = (name) =>
    new Promise((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  const readAll = (db) =>
    new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(STORE)) return resolve([]);
      const t = db.transaction(STORE, 'readonly');
      const s = t.objectStore(STORE);
      const keysReq = s.getAllKeys();
      const valsReq = s.getAll();
      t.oncomplete = () =>
        resolve(keysReq.result.map((key, i) => ({ key, blob: valsReq.result[i] })));
      t.onerror = () => reject(t.error);
    });

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });

  if (!indexedDB.databases) {
    console.error(
      '[export] indexedDB.databases() is unavailable in this browser (e.g. Firefox). ' +
        'Use Chrome/Edge/Safari on the same origin, or tell me the DB names to hardcode.',
    );
    return;
  }

  const dbList = await indexedDB.databases();
  const mediaDbs = dbList.map((d) => d.name).filter((n) => n && n.endsWith('-media'));
  if (!mediaDbs.length) {
    console.warn('[export] No "*-media" IndexedDB databases found on this origin.');
    return;
  }

  const items = [];
  for (const name of mediaDbs) {
    const db = await openDb(name);
    const rows = await readAll(db);
    db.close();
    for (const { key, blob } of rows) {
      if (!(blob instanceof Blob)) continue;
      items.push({
        db: name,
        key,
        mime: blob.type || 'application/octet-stream',
        size: blob.size,
        base64: await blobToBase64(blob),
      });
      console.log(`[export] ${name}/${key}  ${blob.type}  ${blob.size} bytes`);
    }
  }

  const out = { exportedFrom: location.origin, items };
  const json = JSON.stringify(out);

  // Stash on window + expose a manual re-trigger, so a blocked auto-download
  // is still recoverable without re-running the whole scan.
  window.__canvasExport = out;
  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas-media-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  window.__canvasExportDownload = download;

  console.log(
    `[export] Found ${items.length} blob(s) across: ${mediaDbs.join(', ')}`,
  );
  if (!items.length) {
    console.warn('[export] Nothing to export — are you on the origin that holds the recordings?');
    return;
  }
  download();
  console.log(
    '[export] Done → canvas-media-export.json. ' +
      'If no file downloaded, run: __canvasExportDownload()',
  );
})();
