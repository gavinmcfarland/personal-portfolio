import { memo } from 'react';
import { useRegister, useMediaSrc, resolveGrid } from './common';
import VideoPlayer from './VideoPlayer';

/* One media node holds an `assets` array — a grid of images, gifs and videos.
   A lone asset renders exactly as before (a plain image, a vector SVG, or a
   video with hover controls); two or more lay out in a grid of cover-cropped
   cells whose track sizes come from the node's grid layout. Double-clicking /
   tapping a cell opens it in the full-screen gallery (read-only), or — in edit
   mode — enters proportion-editing, where the screen-space dividers (drawn in
   the chrome layer, see Chrome.jsx) resize the tracks. Files dropped onto the
   node append to its grid (see addMediaFiles). */

/* Resolve one asset's stored src and render it (image or a playing video). */
function MediaContent({ nodeId, asset, index, bare }) {
  const src = useMediaSrc(asset.src);
  if (asset.kind === 'video') {
    return <VideoPlayer src={src} alt={asset.alt} mediaKey={`${nodeId}:${index}`} bare={bare} />;
  }
  return <img src={src || undefined} alt={asset.alt || ''} draggable={false} />;
}

function MediaNode({ node }) {
  const { setRef, dataProps, style } = useRegister(node);
  // Legacy nodes that predate `assets` still carry a single top-level src.
  const assets = node.assets && node.assets.length
    ? node.assets
    : [{ kind: node.type, src: node.src, alt: node.alt, svg: node.svg }];
  const w = (node.w || (node.type === 'video' ? 320 : 200)) + 'px';
  const h = (node.h || (node.type === 'video' ? 180 : 150)) + 'px';

  // Single asset: keep the original DOM/chrome (a lone SVG stays vector art).
  if (assets.length === 1) {
    const a = assets[0];
    const cls = a.kind === 'video' ? 'node video' : a.svg ? 'node image svg' : 'node image';
    return (
      <div ref={setRef} className={cls} {...dataProps} style={{ ...style, width: w, height: h }}>
        <MediaContent nodeId={node.id} asset={a} index={0} bare={false} />
      </div>
    );
  }

  // Grid: fractional tracks (see resolveGrid); the resize dividers live in chrome.
  const { colFr, rowFr } = resolveGrid(node);
  return (
    <div
      ref={setRef}
      className="node media"
      {...dataProps}
      style={{
        ...style,
        width: w,
        height: h,
        gridTemplateColumns: colFr.map((f) => `${f}fr`).join(' '),
        gridTemplateRows: rowFr.map((f) => `${f}fr`).join(' '),
      }}
    >
      {assets.map((a, i) => (
        <div key={i} className={a.svg ? 'media-cell svg' : 'media-cell'} data-media-idx={i}>
          <MediaContent nodeId={node.id} asset={a} index={i} bare />
        </div>
      ))}
    </div>
  );
}

export default memo(MediaNode);
