import { field, ground, decal, generate, pixels, retro, generateGround, generateDecal, generateRetroDecal, regenerate, bookmarks, fieldMeta, grounds, decals } from '../src/index.js';

/* Which surface — the dark terminal or the printed "bone" sheet. Every
   texture re-tints from this one value, exactly as the CSS does. */
let palette = 'ink';
document.documentElement.classList.toggle('light', palette === 'bone');

/* The seeded families, keyed by the name a bookmark stores. */
const FAMILIES = { dither: generate, pixels, retro, ground: generateGround, decal: generateDecal, 'retro-decal': generateRetroDecal };

/* Per-family render size (empty → the generator's own intrinsic size, which
   is how decals keep their small footprint). */
const SIZES = {
  dither: { width: 200, height: 200 },
  pixels: { width: 200, height: 200 },
  retro: { width: 200, height: 200 },
  ground: { width: 200, height: 120 },
  decal: {},
  'retro-decal': {},
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
const MOUNTS = { ground: groundMount, decal: decalMount, 'retro-decal': decalMount };
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

/* ── Orchestration ───────────────────────────────────────────────────── */
let genBase = 1000;
let pixBase = 3000;
let retroBase = 7000;
let groundBase = 9000;
let decalBase = 11000;
let retroDecalBase = 13000;

function drawSeeded() {
  starRefreshers.clear();
  reseedRow('generated', 'dither', genBase, 'gen');
  reseedRow('pixels', 'pixels', pixBase, 'pix');
  reseedRow('retro', 'retro', retroBase, 'retro');
  reseedRow('gen-grounds', 'ground', groundBase, 'grd');
  reseedRow('gen-decals', 'decal', decalBase, 'dcl');
  reseedRow('retro-decals', 'retro-decal', retroDecalBase, 'rdc');
}

function drawAll() {
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
  drawSeeded();
});

document.getElementById('surface').addEventListener('click', () => {
  palette = palette === 'ink' ? 'bone' : 'ink';
  document.documentElement.classList.toggle('light', palette === 'bone');
  drawAll();
});

drawAll();
