import { useCallback, useEffect, useState } from 'react';
import { useCanvas } from '../CanvasProvider';

/* Resolve a node's stored src for rendering. Plain URLs / data URLs pass
   through synchronously; `idb:` refs (media parked in IndexedDB) resolve to a
   cached object URL, returning '' until ready. */
export function useMediaSrc(src) {
  const { eng } = useCanvas();
  const isIdb = typeof src === 'string' && src.startsWith('idb:');
  const [url, setUrl] = useState(isIdb ? '' : src);
  useEffect(() => {
    let live = true;
    if (isIdb) eng.resolveMediaSrc(src).then((u) => { if (live) setUrl(u); });
    else setUrl(src);
    return () => { live = false; };
  }, [src, isIdb, eng]);
  return url;
}

/* Resolve a media node's grid into concrete column/row track sizes, reconciled
   with the current asset count. A custom layout ({ colFr, rowFr } set by the
   proportion editor) keeps its ratios and just pads with equal tracks (fr = 1)
   as more assets are appended; otherwise the grid defaults to ~√n equal columns.
   Shared by the node renderer and the screen-space divider chrome so both agree. */
export function resolveGrid(node) {
  const n = node.assets && node.assets.length ? node.assets.length : 1;
  const stored = node.grid;
  let cols = stored && stored.colFr && stored.colFr.length ? stored.colFr.length : Math.ceil(Math.sqrt(n));
  cols = Math.max(1, Math.min(cols, n));
  const rows = Math.ceil(n / cols);
  const fit = (arr, len) => {
    const out = [];
    for (let i = 0; i < len; i += 1) out.push(arr && arr[i] > 0 ? arr[i] : 1);
    return out;
  };
  return { cols, rows, colFr: fit(stored && stored.colFr, cols), rowFr: fit(stored && stored.rowFr, rows) };
}

/* Shared node wiring: register the DOM element into the engine's id→el map and
   emit the data-* attributes the imperative engine (drag/chrome/fit/save) reads. */
export function useRegister(node) {
  const { nodeEls } = useCanvas();
  const setRef = useCallback(
    (el) => { if (el) nodeEls.set(node.id, el); else nodeEls.delete(node.id); },
    [node.id, nodeEls]
  );
  const scale = node.scale || 1;
  const dataProps = {
    'data-id': node.id,
    'data-type': node.type,
    'data-x': node.x,
    'data-y': node.y,
    'data-z': node.z,
    'data-scale': scale,
    'data-anchor': node.anchor ? '1' : '',
  };
  if (node.w != null) dataProps['data-w'] = node.w;
  if (node.h != null) dataProps['data-h'] = node.h;
  // A per-node scale multiplies the whole object (content, borders, media)
  // about its top-left (transform-origin 0 0); the screen-space chrome/geometry
  // in CanvasProvider multiplies offsetWidth/Height by data-scale to match.
  const style = { transform: `translate(${node.x}px,${node.y}px) scale(${scale})`, zIndex: node.z };
  return { setRef, dataProps, style };
}
