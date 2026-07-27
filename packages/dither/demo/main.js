import { field, ground, decal, generate, pixels, retro, generateGround, generateDecal, generateRetroDecal, generateIcon, generateDitherIcon, generateOrganicComposition, generateDitherComposition, regenerate, bookmarks, fieldMeta, grounds, decals, ditherImage, loadLuma, openCamera, ditherMethods, imageStyles, alphaModes, ditherVideo, record, download, pickVideoMime } from '../src/index.js';

/* Which surface — the dark terminal or the printed "bone" sheet. Every
   texture re-tints from this one value, exactly as the CSS does. */
let palette = 'ink';
document.documentElement.classList.toggle('light', palette === 'bone');

/* The seeded families, keyed by the name a bookmark stores. */
const FAMILIES = { dither: generate, pixels, retro, ground: generateGround, decal: generateDecal, 'retro-decal': generateRetroDecal, icon: generateIcon, 'dither-icon': generateDitherIcon, 'organic-composition': generateOrganicComposition, 'dither-composition': generateDitherComposition };

/* Per-family render size (empty → the generator's own intrinsic size, which
   is how decals keep their small footprint). */
const SIZES = {
  dither: { width: 200, height: 200 },
  pixels: { width: 200, height: 200 },
  retro: { width: 200, height: 200 },
  ground: { width: 200, height: 120 },
  decal: {},
  'retro-decal': {},
  icon: {},
  'dither-icon': {},
  'organic-composition': {},
  'dither-composition': {},
};

/* How each family presents. Grounds render behind a paragraph to show they
   stay readable; decals sit in a box the way they would over content. */
function canvasMount(tex) {
  return tex.render();
}
function groundMount(tex) {
  const wrap = document.createElement('div');
  wrap.className = 'ground-preview';
  const c = tex.render();
  c.className = 'bg';
  const p = document.createElement('p');
  p.textContent = 'A field you can read a paragraph through is the entire point; the dots sit behind the words, never over them.';
  wrap.append(c, p);
  return wrap;
}
function decalMount(tex) {
  const box = document.createElement('div');
  box.className = 'decal-box';
  box.append(tex.render());
  return box;
}
// Compositions fill the whole tile (canvasMount, the default) rather than
// sitting small in a decal box — they are posters, not stamps.
const MOUNTS = { ground: groundMount, decal: decalMount, 'retro-decal': decalMount, icon: decalMount, 'dither-icon': decalMount };
const mountFor = (family, tex) => (MOUNTS[family] || canvasMount)(tex);

/* Labelled cell holding a rendered canvas — used by the static rows
   (fields, grounds, decals). */
function cell(texture, title, sub) {
  const el = document.createElement('div');
  el.className = 'cell';
  el.append(texture.render());
  const cap = document.createElement('p');
  cap.className = 'cap';
  cap.innerHTML = sub ? `<b>${title}</b> · ${sub}` : `<b>${title}</b>`;
  el.append(cap);
  return el;
}

/* ── Reseedable, bookmarkable tiles ──────────────────────────────────
   Each generated tile can be reseeded (click the canvas) and bookmarked
   (click the star). Stars are kept in sync with the store via the set
   below, which is rebuilt whenever the seeded rows are redrawn. */
const starRefreshers = new Set();

function reseedableCell(family, baseSeed) {
  const el = document.createElement('div');
  el.className = 'cell';
  const stage = document.createElement('div');
  stage.className = 'stage';
  stage.title = 'Click to reseed';

  const bar = document.createElement('div');
  bar.className = 'cellbar';
  const cap = document.createElement('p');
  cap.className = 'cap';
  const star = document.createElement('button');
  star.type = 'button';
  bar.append(cap, star);
  el.append(stage, bar);

  let seed = baseSeed;
  let archetype;
  let bump = 0;
  const record = () => ({ family, seed, archetype });

  function refreshStar() {
    const on = bookmarks.has(record());
    star.textContent = on ? '★' : '☆';
    star.className = 'star' + (on ? ' on' : '');
    star.title = on ? 'Remove bookmark' : 'Bookmark this pattern';
  }
  starRefreshers.add(refreshStar);

  function draw() {
    const tex = FAMILIES[family](seed, { palette, ...SIZES[family] });
    archetype = tex.archetype;
    stage.replaceChildren(mountFor(family, tex));
    cap.innerHTML = `<b>${tex.name}</b> · <span class="fam">${family}${archetype ? ' / ' + archetype : ''}</span>`;
    refreshStar();
  }

  stage.addEventListener('click', () => { seed = `${baseSeed}-${++bump}`; draw(); });
  star.addEventListener('click', () => bookmarks.toggle(record()));
  draw();
  return el;
}

function reseedRow(hostId, family, base, prefix) {
  const host = document.getElementById(hostId);
  host.replaceChildren();
  for (let i = 0; i < 8; i++) host.append(reseedableCell(family, `${prefix}-${base + i}`));
}

/* ── Bookmarks browser ──────────────────────────────────────────────── */
function drawBookmarks() {
  const host = document.getElementById('bookmarks');
  const empty = document.getElementById('bookmarks-empty');
  const list = bookmarks.all();
  empty.style.display = list.length ? 'none' : '';
  host.replaceChildren();

  for (const rec of list) {
    const el = document.createElement('div');
    el.className = 'cell';
    // Grow the saved pattern back from its seed + algorithm.
    const tex = regenerate(rec, { palette, ...SIZES[rec.family] });
    el.append(mountFor(rec.family, tex));

    const bar = document.createElement('div');
    bar.className = 'cellbar';
    const cap = document.createElement('p');
    cap.className = 'cap';
    cap.innerHTML = `<b>${tex.name}</b> · <span class="fam">${rec.family}${tex.archetype ? ' / ' + tex.archetype : ''}</span>`;
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'star on';
    rm.textContent = '★';
    rm.title = 'Remove bookmark';
    rm.addEventListener('click', () => bookmarks.remove(rec));
    bar.append(cap, rm);
    el.append(bar);
    host.append(el);
  }
}

/* ── Static rows ─────────────────────────────────────────────────────── */
function drawFields() {
  const host = document.getElementById('fields');
  host.replaceChildren();
  for (const meta of fieldMeta) {
    host.append(cell(field(meta.id, { palette, width: 200, height: 200 }), meta.name, meta.use));
  }
}

function drawGrounds() {
  const host = document.getElementById('grounds');
  host.replaceChildren();
  for (const id of Object.keys(grounds)) {
    host.append(cell(ground(id, { palette, width: 200, height: 120 }), id));
  }
}

function drawDecals() {
  const host = document.getElementById('decals');
  host.replaceChildren();
  for (const id of Object.keys(decals)) {
    const wrap = document.createElement('div');
    wrap.className = 'cell';
    const box = document.createElement('div');
    box.className = 'decal-box';
    box.textContent = 'placed over a corner';
    const c = decal(id, { palette }).render();
    c.style.top = '-10px';
    c.style.right = '-10px';
    box.append(c);
    wrap.append(box);
    const cap = document.createElement('p');
    cap.className = 'cap';
    cap.innerHTML = `<b>${id}</b>`;
    wrap.append(cap);
    host.append(wrap);
  }
}

/* ── Image dither ─────────────────────────────────────────────────────
   Decode once into a luminance plane, then re-render from it on every
   control change — resampling and dithering are cheap, decoding is not. */
const SAMPLES = [
  { id: 'window', label: 'window', src: './sample-window.svg' },
  { id: 'mark', label: 'vector mark', src: './sample-mark.svg', alpha: 'shadow' },
];

const imageOpts = {
  style: 'dither',
  method: 'bayer',
  fit: 'cover',
  cell: 3,
  contrast: 1.2,
  brightness: 0,
  // The ink range is what makes a flat UI capture read as a plate rather
  // than as a mostly empty sheet: white paper becomes the faintest field of
  // dots instead of nothing at all.
  lo: 0.12,
  hi: 0.92,
  steps: 0,
  autoLevels: true, // flat UI captures live in the top of the range
  invert: undefined, // let the palette decide
  alpha: 'flatten',
};

let imageSource = null; // the decoded luminance plane
let activeSample = SAMPLES[0].id;
let camera = null; // an open camera, while one is running
let liveFrame = 0; // its rAF handle

const $ = (id) => document.getElementById(id);

function fillSelect(el, values, current) {
  el.replaceChildren();
  for (const v of values) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    o.selected = v === current;
    el.append(o);
  }
}

/* The before/after panels are built once and then updated in place. A live
   camera would otherwise have its <video> torn out of the document and
   rebuilt sixty times a second, which stops playback dead. */
let panels = null;
function imagePanels() {
  if (panels) return panels;

  const before = document.createElement('div');
  before.className = 'cell';
  const source = document.createElement('div');
  source.className = 'srchost';
  const beforeCap = document.createElement('p');
  beforeCap.className = 'cap';
  beforeCap.innerHTML = '<b>source</b>';
  before.append(source, beforeCap);

  const after = document.createElement('div');
  after.className = 'cell';
  const canvas = document.createElement('canvas');
  const cap = document.createElement('p');
  cap.className = 'cap';
  after.append(canvas, cap);

  $('img-out').replaceChildren(before, after);
  panels = { source, canvas, cap };
  return panels;
}

async function loadImageSource(src, previewUrl) {
  stopCamera();
  imageSource = await loadLuma(src);
  const img = document.createElement('img');
  img.src = previewUrl;
  img.alt = 'the source image';
  imagePanels().source.replaceChildren(img);
  drawImage();
}

function drawImage() {
  if (!imageSource) return;
  const { canvas, cap } = imagePanels();
  const tex = ditherImage(imageSource, {
    palette,
    width: 420,
    cell: imageOpts.cell,
    style: imageOpts.style,
    method: imageOpts.method,
    fit: imageOpts.fit,
    contrast: imageOpts.contrast,
    brightness: imageOpts.brightness,
    range: [imageOpts.lo, imageOpts.hi],
    steps: imageOpts.steps,
    autoLevels: imageOpts.autoLevels,
    invert: imageOpts.invert,
    alpha: imageOpts.alpha,
    // A cut-out wants to sit over whatever is behind it, not on paper.
    background: imageOpts.alpha === 'flatten' ? undefined : null,
  });

  tex.render(canvas);
  cap.innerHTML = `<b>${tex.spec.width}×${tex.spec.height}</b> · <span class="fam">${imageOpts.style} / ${imageOpts.method} · cell ${imageOpts.cell}</span>`;
}

/* ── The camera ───────────────────────────────────────────────────────
   A live feed dithered frame by frame. Each tick grabs the current frame as
   a luminance plane and runs it through exactly the same path as a file —
   nothing about the engine knows it is video. */
async function startCamera() {
  stopCamera();
  activeSample = 'camera';
  drawSampleButtons();
  try {
    camera = await openCamera();
  } catch (err) {
    // Denied, or no device. Say so where the user is looking.
    camera = null;
    activeSample = null;
    drawSampleButtons();
    $('img-drop').textContent = `Camera unavailable — ${err.message}`;
    return;
  }
  // Redraw again now the camera is actually open — the pass above ran
  // before the permission prompt resolved, so the button still said "start".
  drawSampleButtons();
  imagePanels().source.replaceChildren(camera.video);

  const tick = () => {
    if (!camera) return;
    imageSource = camera.grab();
    drawImage();
    liveFrame = requestAnimationFrame(tick);
  };
  tick();
}

function stopCamera() {
  if (liveFrame) cancelAnimationFrame(liveFrame);
  liveFrame = 0;
  if (camera) camera.stop();
  camera = null;
}

function drawSampleButtons() {
  const host = $('img-samples');
  host.replaceChildren();
  for (const s of SAMPLES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.label;
    b.className = s.id === activeSample ? 'on' : '';
    b.addEventListener('click', () => {
      activeSample = s.id;
      imageOpts.alpha = s.alpha || 'flatten';
      $('img-alpha').value = imageOpts.alpha;
      drawSampleButtons();
      loadImageSource(s.src, s.src);
    });
    host.append(b);
  }

  const cam = document.createElement('button');
  cam.type = 'button';
  cam.textContent = camera ? 'stop camera' : 'camera';
  cam.className = activeSample === 'camera' ? 'on' : '';
  cam.addEventListener('click', () => {
    if (camera) {
      stopCamera();
      activeSample = null;
      drawSampleButtons();
    } else {
      startCamera();
    }
  });
  host.append(cam);
}

/* A dropped or chosen file: decode it, and show the file itself as the
   "before" panel. */
function takeFile(file) {
  if (!file) return;
  activeSample = null;
  drawSampleButtons();
  const url = URL.createObjectURL(file);
  loadImageSource(file, url);
}

/* Every control below tunes the still AND anything the video section is
   looping — they are the same options, so the sliders stay the one place the
   look is decided. */
function optionsChanged() {
  drawImage();
  syncVideo();
}

function bindImageControls() {
  fillSelect($('img-style'), imageStyles, imageOpts.style);
  fillSelect($('img-method'), ditherMethods, imageOpts.method);
  fillSelect($('img-fit'), ['cover', 'contain', 'fill'], imageOpts.fit);
  fillSelect($('img-alpha'), alphaModes, imageOpts.alpha);

  const range = (id, key, fmt) => {
    const el = $(id);
    const out = $(id + '-v');
    el.value = imageOpts[key];
    const sync = () => {
      out.textContent = fmt(imageOpts[key]);
    };
    el.addEventListener('input', () => {
      imageOpts[key] = parseFloat(el.value);
      sync();
      optionsChanged();
    });
    sync();
  };

  $('img-style').addEventListener('change', (e) => { imageOpts.style = e.target.value; optionsChanged(); });
  $('img-method').addEventListener('change', (e) => { imageOpts.method = e.target.value; optionsChanged(); });
  $('img-fit').addEventListener('change', (e) => { imageOpts.fit = e.target.value; optionsChanged(); });
  range('img-cell', 'cell', (v) => `${v}px`);
  range('img-contrast', 'contrast', (v) => v.toFixed(2));
  range('img-brightness', 'brightness', (v) => (v > 0 ? '+' : '') + v.toFixed(2));
  range('img-lo', 'lo', (v) => v.toFixed(2));
  range('img-hi', 'hi', (v) => v.toFixed(2));
  range('img-steps', 'steps', (v) => (v > 1 ? `${v} levels` : 'off'));

  $('img-auto').checked = imageOpts.autoLevels;
  $('img-auto').addEventListener('change', (e) => { imageOpts.autoLevels = e.target.checked; optionsChanged(); });
  // Unchecked means "let the palette decide", which is the useful default.
  $('img-invert').addEventListener('change', (e) => { imageOpts.invert = e.target.checked ? true : undefined; optionsChanged(); });
  $('img-alpha').addEventListener('change', (e) => { imageOpts.alpha = e.target.value; optionsChanged(); });

  const drop = $('img-drop');
  const file = $('img-file');
  drop.addEventListener('click', () => file.click());
  file.addEventListener('change', () => takeFile(file.files[0]));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    takeFile(e.dataTransfer.files[0]);
  });

  drawSampleButtons();
  loadImageSource(SAMPLES[0].src, SAMPLES[0].src);
}

/* ── Video ────────────────────────────────────────────────────────────
   A take off the camera, kept as its SOURCE clip and re-dithered live at
   three sizes at once. The three boxes are the argument: one file, three
   different pixel dimensions, and the dots come out the same size in all of
   them, because each player cuts its own grid at its own size rather than
   scaling a picture of somebody else's.

   The look is not a separate set of controls — it is `imageOpts`, the same
   object the still above reads, so tuning the sliders retunes the loops. */

const vidOpts = { seconds: 4, fps: 15 };

/* The three cuts, coarsest last so the banner leads. */
const VIDEO_CUTS = [
  { className: 'vidbox vid-banner', label: 'banner — full width' },
  { className: 'vidbox vid-square', label: '200 × 200' },
  { className: 'vidbox vid-chip', label: '96px, round' },
];

let clip = null; // { url, blob, extension, seconds }
let players = [];
let take = null; // a recording in progress
let takeTimer = 0;
// Held rather than looked up: showClip() empties the host, which detaches it.
const vidEmpty = $('vid-empty');

/* Everything `ditherImage` is being given upstairs, plus the playback-only
   options. `alpha` is forced to flatten: a camera frame has no transparency,
   and a cutout mode would only throw away the darks. */
function videoOptions() {
  return {
    style: imageOpts.style,
    method: imageOpts.method,
    fit: imageOpts.fit,
    cell: imageOpts.cell,
    contrast: imageOpts.contrast,
    brightness: imageOpts.brightness,
    range: [imageOpts.lo, imageOpts.hi],
    steps: imageOpts.steps,
    autoLevels: imageOpts.autoLevels,
    invert: imageOpts.invert,
    alpha: 'flatten',
    palette,
    fps: vidOpts.fps,
  };
}

function syncVideo() {
  const opts = videoOptions();
  for (const p of players) p.update(opts);
  writeSnippet();
}

function tearDownPlayers() {
  for (const p of players) p.destroy();
  players = [];
}

/* Mount the current clip into the three boxes. */
function showClip() {
  tearDownPlayers();
  const host = $('vid-out');
  host.replaceChildren();
  if (!clip) {
    host.append(vidEmpty);
    return;
  }

  const opts = videoOptions();
  const row = document.createElement('div');
  row.className = 'vid-row';

  VIDEO_CUTS.forEach((cut, i) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const box = document.createElement('div');
    box.className = cut.className;
    const cap = document.createElement('p');
    cap.className = 'cap';
    cap.innerHTML = `<b>${cut.label}</b>`;
    cell.append(box, cap);
    (i === 0 ? host : row).append(cell);
    players.push(ditherVideo(clip.url, opts).mount(box));
  });

  host.append(row);
  writeSnippet();
}

function setStatus(text) {
  $('vid-status').textContent = text;
}

/* ── Taking one ─────────────────────────────────────────────────────── */
async function startTake() {
  // The camera is the source; open it if the Images section has not.
  if (!camera) {
    await startCamera();
    if (!camera) return; // denied, or no device — startCamera has said so
  }

  let handle;
  try {
    handle = record(camera, { seconds: vidOpts.seconds, fps: vidOpts.fps });
  } catch (err) {
    setStatus(err.message);
    return;
  }
  take = handle;
  drawVideoActions();

  takeTimer = setInterval(() => setStatus(`Recording… ${handle.elapsed().toFixed(1)}s`), 100);

  try {
    const result = await handle.done;
    if (clip) clip.revoke();
    clip = result;
    setStatus(`${result.seconds.toFixed(1)}s · ${(result.blob.size / 1024).toFixed(0)} KB · .${result.extension}`);
    showClip();
  } catch (err) {
    setStatus(`Recording failed — ${err.message}`);
  } finally {
    clearInterval(takeTimer);
    take = null;
    drawVideoActions();
    drawVideoExports();
  }
}

/* A clip that was never recorded here — a file off disk. Same path from
   here on: it is only ever a source of frames. */
function takeVideoFile(file) {
  if (!file) return;
  if (clip) clip.revoke();
  const url = URL.createObjectURL(file);
  const named = /\.([a-z0-9]{2,4})$/i.exec(file.name);
  clip = {
    url,
    blob: file,
    extension: named ? named[1].toLowerCase() : 'webm',
    seconds: 0,
    revoke: () => URL.revokeObjectURL(url),
  };
  setStatus(`${file.name} · ${(file.size / 1024).toFixed(0)} KB`);
  showClip();
  drawVideoExports();
}

/* ── Exports ────────────────────────────────────────────────────────── */

/* Bake the effect into a file. Only worth it where something else has to
   play the clip and cannot run the engine — an email, a slide, a CMS. It
   fixes the dot grid at the banner's current size, which is exactly the
   limitation the live player exists to avoid, so it says so. */
async function bakeClip() {
  const player = players[0];
  if (!player) return;
  const seconds = clip.seconds || player.video.duration || 4;
  player.video.currentTime = 0;
  const handle = record(player.canvas, { seconds, fps: vidOpts.fps });
  setStatus(`Baking one pass at ${player.width}×${player.height}…`);
  const baked = await handle.done;
  download(baked.blob, `dither-baked.${baked.extension}`);
  baked.revoke();
  setStatus(`Baked ${baked.seconds.toFixed(1)}s at ${player.width}×${player.height} — fixed dots, do not resize.`);
}

function drawVideoActions() {
  const host = $('vid-actions');
  host.replaceChildren();

  const rec = document.createElement('button');
  rec.type = 'button';
  if (take) {
    rec.textContent = 'stop';
    rec.className = 'vid-rec';
    rec.addEventListener('click', () => take.stop());
  } else {
    rec.textContent = camera ? `record ${vidOpts.seconds}s` : `camera · record ${vidOpts.seconds}s`;
    rec.addEventListener('click', startTake);
  }
  host.append(rec);

  const pick = document.createElement('button');
  pick.type = 'button';
  pick.textContent = 'use a video file';
  pick.addEventListener('click', () => $('vid-file').click());
  host.append(pick);
}

function drawVideoExports() {
  const host = $('vid-exports');
  host.replaceChildren();
  if (!clip) return;

  const src = document.createElement('button');
  src.type = 'button';
  src.textContent = `download source .${clip.extension}`;
  src.title = 'The clip itself — this is the one to put in the portfolio';
  src.addEventListener('click', () => download(clip.blob, `dither-source.${clip.extension}`));

  const baked = document.createElement('button');
  baked.type = 'button';
  baked.textContent = 'download baked';
  baked.title = 'The dots themselves, as a video — fixed size, for players that cannot run the engine';
  baked.addEventListener('click', bakeClip);

  host.append(src, baked);
}

/* The code that puts this clip on a page, with the settings as tuned. */
function writeSnippet() {
  const el = $('vid-snippet');
  if (!clip) {
    el.hidden = true;
    return;
  }
  const o = videoOptions();
  const props = [
    `src={clip}`,
    `cell={${o.cell}}`,
    `method="${o.method}"`,
    o.style !== 'dither' ? `style="${o.style}"` : '',
    `fit="${o.fit}"`,
    `fps={${o.fps}}`,
    `contrast={${o.contrast}}`,
    o.brightness ? `brightness={${o.brightness}}` : '',
    `range={[${o.range[0]}, ${o.range[1]}]}`,
    o.steps ? `steps={${o.steps}}` : '',
    o.autoLevels ? `autoLevels` : '',
  ].filter(Boolean);

  el.hidden = false;
  el.textContent = [
    `import DitherVideo from "../components/DitherVideo";`,
    `import clip from "../assets/dither/my-take.${clip.extension}";`,
    ``,
    `<DitherVideo`,
    ...props.map((p) => `  ${p}`),
    `  className="w-full aspect-[16/5]"`,
    `/>`,
  ].join('\n');
}

function bindVideoControls() {
  // Null means no MediaRecorder at all; an empty string means it will record
  // but would not say what in, which is fine.
  if (pickVideoMime() === null) {
    setStatus('This browser cannot record video (no MediaRecorder) — you can still drop a video file in.');
  }

  const range = (id, key, fmt, after) => {
    const el = $(id);
    const out = $(id + '-v');
    el.value = vidOpts[key];
    const sync = () => { out.textContent = fmt(vidOpts[key]); };
    el.addEventListener('input', () => {
      vidOpts[key] = parseFloat(el.value);
      sync();
      if (after) after();
    });
    sync();
  };
  range('vid-seconds', 'seconds', (v) => `${v}s`, drawVideoActions);
  range('vid-fps', 'fps', (v) => `${v}/s`, syncVideo);

  $('vid-file').addEventListener('change', (e) => takeVideoFile(e.target.files[0]));

  drawVideoActions();
  drawVideoExports();
}

/* ── Orchestration ───────────────────────────────────────────────────── */
let genBase = 1000;
let pixBase = 3000;
let retroBase = 7000;
let groundBase = 9000;
let decalBase = 11000;
let retroDecalBase = 13000;
let iconBase = 15000;
let ditherIconBase = 17000;
let organicCompBase = 19000;
let ditherCompBase = 21000;

function drawSeeded() {
  starRefreshers.clear();
  reseedRow('generated', 'dither', genBase, 'gen');
  reseedRow('pixels', 'pixels', pixBase, 'pix');
  reseedRow('retro', 'retro', retroBase, 'retro');
  reseedRow('gen-grounds', 'ground', groundBase, 'grd');
  reseedRow('gen-decals', 'decal', decalBase, 'dcl');
  reseedRow('retro-decals', 'retro-decal', retroDecalBase, 'rdc');
  reseedRow('retro-icons', 'icon', iconBase, 'icn');
  reseedRow('dither-icons', 'dither-icon', ditherIconBase, 'dic');
  reseedRow('organic-compositions', 'organic-composition', organicCompBase, 'ocmp');
  reseedRow('dither-compositions', 'dither-composition', ditherCompBase, 'dcmp');
}

function drawAll() {
  drawImage();
  syncVideo();
  drawBookmarks();
  drawFields();
  drawSeeded();
  drawGrounds();
  drawDecals();
}

/* Keep the bookmarks row and every star in sync whenever the store changes. */
bookmarks.subscribe(() => {
  drawBookmarks();
  starRefreshers.forEach((fn) => fn());
});

document.getElementById('regen').addEventListener('click', () => {
  genBase += 8;
  pixBase += 8;
  retroBase += 8;
  groundBase += 8;
  decalBase += 8;
  retroDecalBase += 8;
  iconBase += 8;
  ditherIconBase += 8;
  organicCompBase += 8;
  ditherCompBase += 8;
  drawSeeded();
});

document.getElementById('surface').addEventListener('click', () => {
  palette = palette === 'ink' ? 'bone' : 'ink';
  document.documentElement.classList.toggle('light', palette === 'bone');
  drawAll();
});

bindImageControls();
bindVideoControls();
drawAll();
