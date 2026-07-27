/* Start a clip downloading while the bundle is still on the wire.

   The masthead clip is imported by a component, so nothing asks for it until
   the whole bundle has arrived and React has mounted — measured on a 9Mbps
   connection, that put the request at 808ms and the first dots on screen at
   938ms, with the file itself accounting for only 130ms of that. The clip was
   waiting in line behind the code that names it.

   The fix is to name it earlier. This injects a few lines into <head> that
   create a detached <video> and point it at the clip, so the fetch starts
   alongside the CSS and the bundle rather than after them. By the time the
   bundle lands the clip is decoded and holding a frame, and the player paints
   on its first tick.

   The element is left on `window` under `globalName` because it is the thing
   worth handing over, not just a warm cache entry: `openVideo()` in
   @gavinmcfarland/dither takes an HTMLVideoElement as its source, so passing
   the element means there is no second request to coalesce, no second decode,
   and no dependence on cache headers to make the saving real.

   `rel="preload"` would be the obvious way to do this and does not work:
   `as="video"` is not a destination Chromium implements, and the tag is
   ignored — measured, the request still waited for the bundle. `as="fetch"`
   preloads into a cache that a media element's range request does not
   reliably match. A <video> asking for a video is the one thing every engine
   agrees about.

   Fails open: if the asset cannot be found the tag is not injected, the
   import in the component still resolves, and the only cost is the wait we
   started with. */
import path from 'node:path';

/* Kept to one line and no comments: this is the first thing in the document
   and every byte of it is ahead of the charset declaration. `muted`,
   `playsInline` and `loop` are set here because they are what an autoplay
   policy wants to see before it will start a video without a click — the
   element should reach the player already acceptable. */
const script = (url, globalName) =>
  `(function(){try{var v=document.createElement('video');` +
  `v.preload='auto';v.muted=true;v.defaultMuted=true;v.playsInline=true;v.loop=true;` +
  `v.src=${JSON.stringify(url)};window[${JSON.stringify(globalName)}]=v;}catch(e){}})();`;

/* `file` is the clip's path from the project root, as written in the import
   it mirrors — e.g. 'src/assets/avatar.mp4'. */
export function clipWarmup({ file, globalName }) {
  const base = path.basename(file);
  return {
    name: 'clip-warmup',
    // After Vite has emitted assets, so the hashed name is known.
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      let url;
      if (ctx.bundle) {
        // Built: find what the clip was emitted as, hash and all.
        const asset = Object.values(ctx.bundle).find(
          (out) => out.type === 'asset' && out.name === base,
        );
        url = asset && `/${asset.fileName}`;
      } else {
        // Served: Vite hands source files out at their own path.
        url = `/${file}`;
      }
      if (!url) return html;
      return {
        html,
        /* `head-prepend`, not `head`, for two reasons. It is the earliest the
           fetch can start. And `head` means "before </head>", which Vite
           finds by scanning the HTML — in dev that HTML already contains the
           editor's inspector, whose own source has the characters `</head>`
           inside a string literal, so the tag landed in the middle of a JS
           expression and took the page down with a syntax error. Prepending
           depends on nothing another plugin may have written. */
        tags: [{ tag: 'script', injectTo: 'head-prepend', children: script(url, globalName) }],
      };
    },
  };
}
