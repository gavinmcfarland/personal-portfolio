import { field, ground, decal, generate, pixels, retro, generateGround, generateDecal, generateRetroDecal, generateIcon, generateDitherIcon, generateOrganicComposition, generateDitherComposition, regenerate, bookmarks, fieldMeta, grounds, decals, ditherImage, loadLuma, ditherMethods, imageStyles, alphaModes } from '../src/index.js';

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
let imagePreview = null; // a URL for the "before" panel
let activeSample = SAMPLES[0].id;

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

async function loadImageSource(src, previewUrl) {
  imageSource = await loadLuma(src);
  imagePreview = previewUrl;
  drawImage();
}

function drawImage() {
  const out = $('img-out');
  if (!imageSource) {
    out.replaceChildren();
    return;
  }
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

  const before = document.createElement('div');
  before.className = 'cell';
  const img = document.createElement('img');
  img.src = imagePreview;
  img.alt = 'the source image';
  const beforeCap = document.createElement('p');
  beforeCap.className = 'cap';
  beforeCap.innerHTML = '<b>source</b>';
  before.append(img, beforeCap);

  const after = document.createElement('div');
  after.className = 'cell';
  after.append(tex.render());
  const afterCap = document.createElement('p');
  afterCap.className = 'cap';
  afterCap.innerHTML = `<b>${tex.spec.width}×${tex.spec.height}</b> · <span class="fam">${imageOpts.style} / ${imageOpts.method} · cell ${imageOpts.cell}</span>`;
  after.append(afterCap);

  out.replaceChildren(before, after);
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
      drawImage();
    });
    sync();
  };

  $('img-style').addEventListener('change', (e) => { imageOpts.style = e.target.value; drawImage(); });
  $('img-method').addEventListener('change', (e) => { imageOpts.method = e.target.value; drawImage(); });
  $('img-fit').addEventListener('change', (e) => { imageOpts.fit = e.target.value; drawImage(); });
  range('img-cell', 'cell', (v) => `${v}px`);
  range('img-contrast', 'contrast', (v) => v.toFixed(2));
  range('img-brightness', 'brightness', (v) => (v > 0 ? '+' : '') + v.toFixed(2));
  range('img-lo', 'lo', (v) => v.toFixed(2));
  range('img-hi', 'hi', (v) => v.toFixed(2));
  range('img-steps', 'steps', (v) => (v > 1 ? `${v} levels` : 'off'));

  $('img-auto').checked = imageOpts.autoLevels;
  $('img-auto').addEventListener('change', (e) => { imageOpts.autoLevels = e.target.checked; drawImage(); });
  // Unchecked means "let the palette decide", which is the useful default.
  $('img-invert').addEventListener('change', (e) => { imageOpts.invert = e.target.checked ? true : undefined; drawImage(); });
  $('img-alpha').addEventListener('change', (e) => { imageOpts.alpha = e.target.value; drawImage(); });

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
drawAll();
