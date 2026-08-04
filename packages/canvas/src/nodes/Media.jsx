import { memo, useState } from 'react';
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

/* A raster with an alpha channel needs the same treatment as an SVG — no card
   behind it, or the surface shows through wherever the image is transparent.
   The format alone can't say (a PNG is usually opaque), so sample the decoded
   pixels once per src: draw it small and look for any non-opaque alpha. The
   downscale is deliberate — a transparent halo survives it, and 48×48 is a
   trivial read next to a full-size decode. */
const alphaCache = new Map();
const OPAQUE_FORMAT = /^data:image\/jpe?g|\.jpe?g($|\?)/i; // JPEG has no alpha to find

function detectAlpha(img) {
  const key = img.currentSrc || img.src;
  if (!key || OPAQUE_FORMAT.test(key)) return false;
  if (alphaCache.has(key)) return alphaCache.get(key);
  let found = false;
  try {
    const S = 48;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, S, S);
    const { data } = ctx.getImageData(0, 0, S, S);
    // Not a strict 255: the downscale can leave an opaque edge a hair short.
    for (let i = 3; i < data.length; i += 4) { if (data[i] < 250) { found = true; break; } }
  } catch {
    // A cross-origin image taints the canvas and getImageData throws. Unknown,
    // so keep the card — that's the pre-detection look.
    found = false;
  }
  alphaCache.set(key, found);
  return found;
}

/* Resolve one asset's stored src and render it (image or a playing video).
   `mediaStyle` carries the crop sizing (see MediaNode) onto the img/video.
   `onAlpha` reports back whether the decoded image turned out to be see-through. */
function MediaContent({ nodeId, asset, index, bare, mediaStyle, onAlpha }) {
  const src = useMediaSrc(asset.src);
  const srcDark = useMediaSrc(asset.srcDark);
  if (asset.kind === 'video') {
    return <VideoPlayer src={src} alt={asset.alt} mediaKey={`${nodeId}:${index}`} bare={bare} mediaStyle={mediaStyle} />;
  }
  // An image with a dark-mode variant renders both <img>s; CSS on the `.dark`
  // ancestor decides which shows (see canvas.css), so a live theme toggle swaps
  // instantly with no re-render or refetch — same mechanism as themeInk.
  // Either variant being see-through is enough to drop the card: it would show
  // through in that theme, and the two are the same artwork either way.
  const onLoad = onAlpha ? (e) => onAlpha(detectAlpha(e.currentTarget)) : undefined;
  if (asset.srcDark) {
    return (
      <>
        <img className="cv-light" src={src || undefined} alt={asset.alt || ''} draggable={false} style={mediaStyle} onLoad={onLoad} />
        <img className="cv-dark" src={srcDark || undefined} alt={asset.alt || ''} draggable={false} style={mediaStyle} onLoad={onLoad} />
      </>
    );
  }
  return <img src={src || undefined} alt={asset.alt || ''} draggable={false} style={mediaStyle} onLoad={onLoad} />;
}

function MediaNode({ node }) {
  const { setRef, dataProps, style } = useRegister(node);
  // Which assets decoded as see-through, by index (see detectAlpha).
  const [alpha, setAlpha] = useState({});
  const markAlpha = (i) => (v) => { if (v) setAlpha((m) => (m[i] ? m : { ...m, [i]: true })); };
  // Legacy nodes that predate `assets` still carry a single top-level src.
  const assets = node.assets && node.assets.length
    ? node.assets
    : [{ kind: node.type, src: node.src, alt: node.alt, svg: node.svg }];
  const w = (node.w || (node.type === 'video' ? 320 : 200)) + 'px';
  const h = (node.h || (node.type === 'video' ? 180 : 150)) + 'px';

  // Single asset: keep the original DOM/chrome (a lone SVG stays vector art).
  if (assets.length === 1) {
    const a = assets[0];
    const cls = a.kind === 'video' ? 'cv-node cv-video' : a.svg ? 'cv-node cv-image cv-svg' : 'cv-node cv-image';
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
    // A framed photo keeps its card — the device chrome is the background there,
    // and its own surface is what the media sits on.
    const media = (
      <MediaContent
        nodeId={node.id}
        asset={a}
        index={0}
        bare={false}
        mediaStyle={mediaStyle}
        onAlpha={a.kind === 'video' || a.svg || framed ? undefined : markAlpha(0)}
      />
    );
    // The chrome-bar height (--cv-df-bar) lives on the node so both the frame
    // (which inherits it) and the node's own corner radius scale off it. Fixed
    // mode: a constant world-px bar; scale mode: a fraction of the node height.
    const barStyle = framed
      ? { '--cv-df-bar': `${node.frameScale ? Math.max(1, (node.h || 0) * node.frameScale) : frameBarH(node.frame)}px` }
      : null;
    return (
      <div
        ref={setRef}
        className={`${framed ? `${cls} cv-framed` : cls}${alpha[0] ? ' cv-alpha' : ''}`}
        {...dataProps}
        style={{ ...style, width: w, height: h, ...barStyle }}
      >
        {framed ? <DeviceFrame node={node}>{media}</DeviceFrame> : media}
      </div>
    );
  }

  // Grid: fractional tracks (see resolveGrid); the resize dividers live in chrome.
  const { colFr, rowFr } = resolveGrid(node);
  return (
    <div
      ref={setRef}
      className="cv-node cv-media"
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
        <div
          key={i}
          className={`${a.svg ? 'cv-media-cell cv-svg' : 'cv-media-cell'}${alpha[i] ? ' cv-alpha' : ''}`}
          data-media-idx={i}
        >
          <MediaContent
            nodeId={node.id}
            asset={a}
            index={i}
            bare
            onAlpha={a.kind === 'video' || a.svg ? undefined : markAlpha(i)}
          />
        </div>
      ))}
    </div>
  );
}

export default memo(MediaNode);
