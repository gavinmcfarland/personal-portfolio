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

/* Shared node wiring: register the DOM element into the engine's id→el map and
   emit the data-* attributes the imperative engine (drag/chrome/fit/save) reads. */
export function useRegister(node) {
  const { nodeEls } = useCanvas();
  const setRef = useCallback(
    (el) => { if (el) nodeEls.set(node.id, el); else nodeEls.delete(node.id); },
    [node.id, nodeEls]
  );
  const dataProps = {
    'data-id': node.id,
    'data-type': node.type,
    'data-x': node.x,
    'data-y': node.y,
    'data-z': node.z,
    'data-anchor': node.anchor ? '1' : '',
  };
  if (node.w != null) dataProps['data-w'] = node.w;
  if (node.h != null) dataProps['data-h'] = node.h;
  const style = { transform: `translate(${node.x}px,${node.y}px)`, zIndex: node.z };
  return { setRef, dataProps, style };
}
