import { memo } from 'react';
import { useRegister, useMediaSrc, resolveGrid } from './common';
import { frameBarH } from '../constants';
import VideoPlayer from './VideoPlayer';
import DeviceFrame from './DeviceFrame';

/* One media node holds an `assets` array — a grid of images, gifs and videos.
   A lone asset renders exactly as before (a plain image, a vector SVG, or a
   video with hover controls); two or more lay out in a grid of cover-cropped
   cells whose track sizes come from the node's grid layout. Double-clicking /
   tapping a cell opens it in the full-screen gallery (read-only), or — in edit
   mode — enters proportion-editing, where the screen-space dividers (drawn in
   the chrome layer, see Chrome.jsx) resize the tracks. Files dropped onto the
   node append to its grid (see addMediaFiles). */

/* Resolve one asset's stored src and render it (image or a playing video).
   `mediaStyle` carries the crop sizing (see MediaNode) onto the img/video. */
function MediaContent({ nodeId, asset, index, bare, mediaStyle }) {
  const src = useMediaSrc(asset.src);
  if (asset.kind === 'video') {
    return <VideoPlayer src={src} alt={asset.alt} mediaKey={`${nodeId}:${index}`} bare={bare} mediaStyle={mediaStyle} />;
  }
  return <img src={src || undefined} alt={asset.alt || ''} draggable={false} style={mediaStyle} />;
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
    // A cmd-drag crop shows a sub-window of the media: render the full media at
    // 1/crop of the box, shifted so the window's top-left lands on the box's
    // (translate % is self-relative, so the offset fractions map directly), and
    // let overflow:hidden trim the rest. Fractions keep the framing stable
    // through aspect-locked resizes.
    const crop = node.crop && node.crop.w > 0 && node.crop.h > 0 && !a.svg ? node.crop : null;
    const mediaStyle = crop
      ? {
        width: `${100 / crop.w}%`,
        height: `${100 / crop.h}%`,
        transform: `translate(${-(crop.x || 0) * 100}%,${-(crop.y || 0) * 100}%)`,
      }
      : undefined;
    // A device frame (browser chrome, …) wraps a photo/video — never a lone SVG,
    // which renders as transparent vector art with no card to frame.
    const framed = node.frame && !a.svg;
    const media = <MediaContent nodeId={node.id} asset={a} index={0} bare={false} mediaStyle={mediaStyle} />;
    // The chrome-bar height (--cv-df-bar) lives on the node so both the frame
    // (which inherits it) and the node's own corner radius scale off it. Fixed
    // mode: a constant world-px bar; scale mode: a fraction of the node height.
    const barStyle = framed
      ? { '--cv-df-bar': `${node.frameScale ? Math.max(1, (node.h || 0) * node.frameScale) : frameBarH(node.frame)}px` }
      : null;
    return (
      <div ref={setRef} className={framed ? `${cls} framed` : cls} {...dataProps} style={{ ...style, width: w, height: h, ...barStyle }}>
        {framed ? <DeviceFrame node={node}>{media}</DeviceFrame> : media}
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
