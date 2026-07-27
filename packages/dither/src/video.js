/* Moving pictures.

   `image.js` turns one picture into dots. This turns a clip into dots —
   sixty times a second if you ask it to — and it does so by the same route:
   grab the frame the <video> is showing, reduce it to a luminance plane, run
   it through exactly the same resample-and-decide path as a PNG. Nothing in
   the engine knows it is watching a video.

   That choice is the whole point of the module. The alternative — record the
   dithered canvas to a file and play the file back — bakes the dot grid into
   a bitmap, and a bitmap of square dots is the one thing that cannot be
   resized: scale it up and the dots blur or double unevenly; scale it down
   and the grid moires against itself. Keeping the SOURCE clip and dithering
   it live means the grid is re-cut at the size the element actually is, so a
   32px avatar and a full-bleed header are the same clip at the same dot
   pitch, both crisp. Live is also the only way the effect can follow the
   page's theme.

   Two halves, mirroring image.js:

     · recording — `record()` takes a camera, a canvas or any MediaStream and
       hands back a clip. Point it at the camera to keep the source (what you
       want); point it at the dithered canvas to bake the effect into a file
       (what you want when something else has to play it);

     · playing — `ditherVideo()` mounts a looping clip into a box and repaints
       it as dots at whatever size the box is, live.

   ── A note on method ────────────────────────────────────────────────────
   Ordered (`bayer`) is the default here and the error-diffusion methods are
   a trap on moving pictures. A diffusion kernel decides every cell from the
   error carried out of the cell before it, so a hair of movement re-decides
   the whole grid and the texture BOILS between frames — the dots crawl even
   in passages that never moved. An ordered matrix is fixed in space: a cell
   that did not change keeps its dot. That stability is also what lets the
   same clip be cut at any size and stay recognisably itself. */

import { imageSpec, toLuma } from './image.js';
import { renderImageData } from './engine.js';

const isBrowser = typeof document !== 'undefined';

/* ── Recording ────────────────────────────────────────────────────────

   In preference order — what a clip is written as depends entirely on the
   browser. Chrome and Firefox write WebM; Safari writes MP4 and cannot read
   VP9. Recording in whatever the browser offers and naming the file to match
   is the only portable answer, so a clip recorded on a Mac in Safari is an
   .mp4 and one recorded in Chrome is a .webm, and both play everywhere the
   <video> element does. */
const MIME_PREFERENCE = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
];

/* The best container this browser will actually write, or null if it will
   not record at all. */
export function pickVideoMime(preferred) {
  if (typeof MediaRecorder === 'undefined') return null;
  const list = preferred ? [preferred, ...MIME_PREFERENCE] : MIME_PREFERENCE;
  for (const type of list) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  // Some browsers record happily but refuse to answer isTypeSupported.
  return '';
}

/* The file extension a mime type wants. */
export function extensionFor(mime) {
  return /mp4/.test(mime || '') ? 'mp4' : 'webm';
}

/* Whatever we were handed, as a MediaStream:

     a MediaStream            itself
     a <canvas>               its frames, at `fps`
     a <video>                its frames (a camera preview, a clip)
     { video } | { stream }   an openCamera()/openVideo() handle

   The canvas case is what bakes a dither into a file: capture the canvas the
   player is painting into and you get the effect itself, not its source. */
function toStream(source, fps) {
  if (!source) throw new Error('record: nothing to record.');
  if (typeof MediaStream !== 'undefined' && source instanceof MediaStream) return source;
  if (source.stream instanceof MediaStream) return source.stream;

  const el = source.video || source.canvas || source;
  // A camera preview already IS a stream — take the device's own frames
  // rather than asking the element to re-capture them, which not every
  // browser implements for <video>.
  if (el && el.srcObject instanceof MediaStream) return el.srcObject;
  if (el && typeof el.captureStream === 'function') return el.captureStream(fps || undefined);
  throw new Error('record: cannot capture a stream from that source.');
}

/* Record a clip.

     const take = record(camera, { seconds: 4 });
     take.stop();                      // or let `seconds` end it
     const clip = await take.done;     // { blob, mime, extension, url, seconds }

   `seconds` is a ceiling, not a promise — `stop()` any time before it. The
   returned `url` is an object URL for the blob, live until `revoke()`. */
export function record(source, opts = {}) {
  const mime = pickVideoMime(opts.mime);
  if (mime === null) throw new Error('This browser cannot record video (no MediaRecorder).');

  const stream = toStream(source, opts.fps);
  const recorder = new MediaRecorder(stream, {
    ...(mime ? { mimeType: mime } : {}),
    ...(opts.bitrate ? { videoBitsPerSecond: opts.bitrate } : {}),
  });

  const chunks = [];
  let timer = 0;
  let started = 0;
  let stopped = false;

  const done = new Promise((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    recorder.onerror = (e) => reject(e.error || new Error('Recording failed.'));
    recorder.onstop = () => {
      const type = recorder.mimeType || mime || 'video/webm';
      const blob = new Blob(chunks, { type });
      const url = URL.createObjectURL(blob);
      resolve({
        blob,
        url,
        mime: type,
        extension: extensionFor(type),
        seconds: (performance.now() - started) / 1000,
        revoke: () => URL.revokeObjectURL(url),
      });
    };
  });

  // A timeslice keeps data flowing rather than arriving in one lump at the
  // end, so a long take cannot be lost to a tab that goes away mid-record.
  recorder.start(500);
  started = performance.now();

  const stop = () => {
    if (stopped) return done;
    stopped = true;
    clearTimeout(timer);
    if (recorder.state !== 'inactive') recorder.stop();
    return done;
  };

  if (opts.seconds) timer = setTimeout(stop, opts.seconds * 1000);

  return {
    done,
    stop,
    mime,
    get state() {
      return recorder.state;
    },
    /* How long the take has been running, in seconds — for a counter. */
    elapsed: () => (performance.now() - started) / 1000,
  };
}

/* Save a clip (or any blob) to the user's disk. */
export function download(blob, filename) {
  const url = blob instanceof Blob ? URL.createObjectURL(blob) : blob;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  if (blob instanceof Blob) setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ── A clip as a frame source ─────────────────────────────────────────
   The same shape `openCamera()` returns, so everything downstream is
   identical whether the pixels come from a device or a file:

     const clip = await openVideo('/take.webm');
     ditherImage(clip.grab(), opts)   // this frame
     clip.stop();

   Muted, inline and looping, because those three are what an autoplay policy
   demands before it will let a video start without a click. */
export async function openVideo(src, opts = {}) {
  if (!isBrowser) throw new Error('openVideo needs a browser.');

  const video = src instanceof HTMLVideoElement ? src : document.createElement('video');
  if (video !== src) {
    video.src = typeof src === 'string' ? src : URL.createObjectURL(src);
    if (typeof src !== 'string') video.dataset.objectUrl = video.src;
  }
  video.loop = opts.loop !== false;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = video.crossOrigin || (typeof src === 'string' && /^https?:/.test(src) ? 'anonymous' : null);

  if (!video.videoWidth) {
    await new Promise((resolve, reject) => {
      video.addEventListener('loadeddata', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error(`Could not load video: ${String(src).slice(0, 80)}`)), { once: true });
    });
  }
  // A rejected play() is not fatal — a paused video still holds a frame, and
  // the player will try again on the first interaction.
  await video.play().catch(() => {});

  // Frames are read back at `raster` px on the long edge. Reading a full
  // 1080p frame sixty times a second is the one thing that will drop the
  // rate, and the plane is about to be averaged down to a few thousand dots
  // regardless.
  const raster = opts.raster || 480;
  return {
    video,
    grab: () => toLuma(video, { raster }),
    stop() {
      video.pause();
      if (video.dataset.objectUrl) URL.revokeObjectURL(video.dataset.objectUrl);
      if (video !== src) video.removeAttribute('src');
    },
  };
}

/* ── The player ───────────────────────────────────────────────────────

     const player = ditherVideo('/take.webm', { cell: 3, palette: 'ink' });
     player.mount(box);        // fills the box, follows its size, loops
     player.update({ palette: 'bone' });
     player.destroy();

   Everything `ditherImage` takes is taken here too and means the same thing.
   On top of those:

     fps      repaint ceiling (default 15). A 1-bit texture reads as film at
              twelve; sixty costs four times as much for a difference you
              cannot see
     scale    device-pixel ratio for the canvas (default 1). One is right for
              the `dither` style, whose mark fills the whole cell: there is no
              sub-cell detail to lose, so a canvas at CSS size shown through
              `image-rendering: pixelated` is pixel-identical to one rendered
              at 2× and costs a quarter as much. Raise it for `halftone`,
              whose marks DO have structure inside the cell
     autoplay pause when scrolled out of view or the tab is hidden (default
              true) — nothing is dithered while nobody is looking
     respectReducedMotion  under `prefers-reduced-motion`, paint one frame and
              hold it (default true)
     onFrame  called after each paint, for a counter or a readout */
export class DitherVideoPlayer {
  constructor(source, options = {}) {
    if (!isBrowser) throw new Error('ditherVideo needs a browser.');
    this.source = source;
    this.options = { cell: 3, method: 'bayer', fit: 'cover', fps: 15, scale: 1, ...options };

    this.canvas = options.canvas || document.createElement('canvas');
    this.canvas.style.display = 'block';
    // The canvas is presented at CSS size; nearest-neighbour keeps a dot a
    // square instead of smearing it when `scale` is below the display's.
    this.canvas.style.imageRendering = 'pixelated';

    this.clip = null;
    this.error = null;
    this.host = null;
    this.width = options.width || 0;
    this.height = options.height || 0;
    this.playing = false;
    this.visible = true;
    this.destroyed = false;
    // Intent, as distinct from `playing`: the clip may not have loaded yet,
    // and mount() may already have decided the box is off-screen.
    this._wanted = true;
    this._frame = 0;
    this._last = 0;
    this._observers = [];

    /* Resolves to the player, or to null if the clip would not load — it does
       NOT reject. A texture is decoration: a missing or unplayable file should
       leave an empty box and a warning, not an unhandled rejection in a
       console that has real errors in it. `player.error` holds what happened,
       and `onError` takes over the reporting if you want to handle it. */
    this.ready = openVideo(source, options).then(
      (clip) => {
        if (this.destroyed) {
          clip.stop();
          return null;
        }
        this.clip = clip;
        this._sizeToVideo();
        this.draw(); // a first frame, whether or not it is going to run
        if (this._wanted) this.start();
        return this;
      },
      (err) => {
        this.error = err;
        if (options.onError) options.onError(err, this);
        else console.warn(`[dither] ${err.message}`);
        return null;
      },
    );
  }

  /* The <video> itself, once it has loaded — for a preview panel. */
  get video() {
    return this.clip && this.clip.video;
  }

  /* Fill `host`, and keep filling it as it resizes. The canvas is appended
     to the host, so the host is what you size in CSS. */
  mount(host) {
    this.host = host;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    if (this.canvas.parentNode !== host) host.append(this.canvas);

    const resize = new ResizeObserver(() => this._sizeToHost());
    resize.observe(host);
    this._observers.push(() => resize.disconnect());
    this._sizeToHost();

    if (this.options.autoplay !== false) this._watchVisibility(host);
    return this;
  }

  /* Explicit size, in CSS px, for a player that is not filling a box. */
  resize(width, height) {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.draw();
    return this;
  }

  /* Change any dither option — a theme flip, a new dot pitch — without
     touching playback. */
  update(options) {
    Object.assign(this.options, options);
    this.draw();
    return this;
  }

  start() {
    this._wanted = true;
    if (this.playing || this.destroyed || !this.clip || this._reduced()) return this;
    this.playing = true;
    this.clip.video.play().catch(() => {});
    this._schedule();
    return this;
  }

  stop() {
    this._wanted = false;
    this.playing = false;
    if (this.clip) this.clip.video.pause();
    if (this._frame) {
      if (this._cancel) this._cancel(this._frame);
      this._frame = 0;
    }
    return this;
  }

  destroy() {
    this.destroyed = true;
    this.stop();
    for (const off of this._observers) off();
    this._observers = [];
    if (this.clip) this.clip.stop();
    this.canvas.remove();
  }

  /* One frame, now. Safe to call at any time — it is what the loop calls,
     and what a resize or a theme change calls. */
  draw() {
    if (!this.clip || this.destroyed) return;
    const width = this.width;
    const height = this.height;
    if (!width || !height) return;

    const spec = imageSpec(this.clip.grab(), { ...this.options, width, height });
    const img = renderImageData({
      width: spec.width,
      height: spec.height,
      layers: spec.layers,
      palette: this.options.palette,
      background: this.options.background,
      scale: this.options.scale,
    });

    const canvas = this.canvas;
    if (canvas.width !== img.width) canvas.width = img.width;
    if (canvas.height !== img.height) canvas.height = img.height;
    (this._ctx || (this._ctx = canvas.getContext('2d'))).putImageData(img, 0, 0);
    if (this.options.onFrame) this.options.onFrame(this);
  }

  /* ── internals ───────────────────────────────────────────────────── */

  /* One paint per PRESENTED frame where the browser will tell us about them
     (requestVideoFrameCallback), otherwise one per display frame — either
     way held to `fps`. The distinction matters: a 30fps clip presents thirty
     frames a second no matter how fast the display refreshes, and dithering
     the same frame twice is pure waste. */
  _schedule() {
    if (!this.playing || this.destroyed) return;
    const video = this.clip.video;
    const useVFC = typeof video.requestVideoFrameCallback === 'function';
    const request = useVFC ? video.requestVideoFrameCallback.bind(video) : requestAnimationFrame;
    this._cancel = useVFC ? video.cancelVideoFrameCallback.bind(video) : cancelAnimationFrame;

    const tick = (now) => {
      if (!this.playing || this.destroyed) return;
      const interval = 1000 / Math.max(1, this.options.fps);
      const t = now || performance.now();
      if (t - this._last >= interval - 1) {
        this._last = t;
        this.draw();
      }
      this._frame = request(tick);
    };
    this._frame = request(tick);
  }

  _sizeToHost() {
    if (!this.host) return;
    const box = this.host.getBoundingClientRect();
    const width = Math.round(box.width);
    const height = Math.round(box.height);
    if (!width || !height) return;
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.draw();
  }

  /* A size to fall back on when nobody has given one: the clip's own, so a
     player used standalone shows something rather than nothing. */
  _sizeToVideo() {
    if (this.width && this.height) return;
    const v = this.clip.video;
    this.width = this.width || v.videoWidth || 320;
    this.height = this.height || Math.round(this.width * (v.videoHeight / v.videoWidth || 0.5625));
  }

  /* Someone who has asked for less motion gets one frame, held. The clip is
     still dithered — the texture is the content — it just does not move. */
  _reduced() {
    return (
      this.options.respectReducedMotion !== false &&
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /* Nothing is dithered while nobody is looking — the single biggest saving
     available, since a portfolio page may carry several of these. */
  _watchVisibility(host) {
    const sync = () => {
      if (this.visible && !document.hidden) this.start();
      else this.stop();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
        sync();
      },
      { rootMargin: '128px' },
    );
    io.observe(host);
    document.addEventListener('visibilitychange', sync);

    this._observers.push(() => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    });
  }
}

/* The one-liner. */
export function ditherVideo(source, options = {}) {
  return new DitherVideoPlayer(source, options);
}
