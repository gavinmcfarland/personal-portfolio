/* @gavinmcfarland/dither — a canvas engine for 1-bit dither textures.

   Everything it paints is a square dot on a regular grid, clumped only by
   ordered masks. It reproduces the six named fields, three grounds and five
   decals from the "13 · Dither" mockup, and grows new fields from a seed
   while staying inside the same grammar.

   Quick start:

     import { DitherTexture, field, generate } from '@gavinmcfarland/dither';

     field('a').render(canvas);              // a named plate
     generate('hello').render(canvas);       // an auto-generated field
     new DitherTexture({ layers, palette: 'bone', width: 400 }).render(canvas);
*/

import { renderImageData } from './engine.js';
import { resolvePalette } from './palette.js';
import { fields, fieldMeta, fieldLayers, grounds, decals } from './presets.js';
import { generateLayers, seamlessSize, archetypes } from './generate.js';
import { generatePixelLayers, pixelArchetypes } from './pixel.js';
import { generateRetroLayers, retroArchetypes } from './retro.js';
import { bookmarks } from './bookmarks.js';
import { generateGroundLayers, groundArchetypes, generateDecalSpec, decalArchetypes, generateRetroDecalSpec } from './furniture.js';
import { seedLabel } from './rng.js';

const isBrowser = typeof document !== 'undefined';

/* A texture is an immutable description (size, palette, layers) plus the
   handful of ways you might want to get pixels out of it: onto a canvas,
   into an <img>, or into a CSS background. */
export class DitherTexture {
  constructor(spec = {}) {
    this.spec = {
      width: 256,
      height: 256,
      palette: 'ink',
      background: undefined, // undefined → palette bg; null → transparent
      scale: isBrowser ? Math.min(window.devicePixelRatio || 1, 2) : 1,
      layers: [],
      ...spec,
    };
  }

  /* A new texture with some fields overridden — re-tint or resize without
     rebuilding the layer stack. */
  with(overrides) {
    return new DitherTexture({ ...this.spec, ...overrides });
  }

  /* Pixels. Everything below is built on this one call. */
  toImageData() {
    return renderImageData(this.spec);
  }

  /* Draw into an existing canvas (sized to match), or into a fresh one.
     Returns the canvas either way. */
  render(canvas) {
    const img = this.toImageData();
    const target = canvas || document.createElement('canvas');
    target.width = img.width;
    target.height = img.height;
    // Present at CSS size so device-pixel scaling stays crisp.
    target.style.width = this.spec.width + 'px';
    target.style.height = this.spec.height + 'px';
    target.getContext('2d').putImageData(img, 0, 0);
    return target;
  }

  toCanvas() {
    return this.render();
  }

  toDataURL(type = 'image/png') {
    return this.toCanvas().toDataURL(type);
  }

  toBlob(type = 'image/png', quality) {
    return new Promise((resolve) => this.toCanvas().toBlob(resolve, type, quality));
  }

  /* Cut the smallest tile that repeats seamlessly and hand back a ready-made
     `background` shorthand. Returns null for field-relative textures (a
     centred pool, a ring, a hard stop) that cannot tile — check for it. */
  toBackground() {
    const size = seamlessSize(this.spec.layers);
    if (!size) return null;
    const bg = this.spec.background === null || this.spec.background === 'transparent';
    const url = this.with({ width: size, height: size }).toDataURL();
    return `${bg ? '' : this.paletteBg() + ' '}url("${url}")`;
  }

  paletteBg() {
    return resolvePalette(this.spec.palette).bg;
  }
}

/* ── Catalogue helpers ────────────────────────────────────────────────
   Thin wrappers that turn a preset id into a texture. All of them take the
   usual overrides (palette, width, height, scale, background). */

export function field(id, overrides = {}) {
  return new DitherTexture({ layers: fieldLayers(id), width: 240, height: 240, ...overrides });
}

export function ground(id, overrides = {}) {
  const g = grounds[id];
  if (!g) throw new Error(`Unknown ground "${id}". Try: ${Object.keys(grounds).join(', ')}`);
  return new DitherTexture({ ...g, ...overrides });
}

export function decal(id, overrides = {}) {
  const d = decals[id];
  if (!d) throw new Error(`Unknown decal "${id}". Try: ${Object.keys(decals).join(', ')}`);
  return new DitherTexture({ ...d, ...overrides });
}

/* Grow a fresh field from a seed. The returned texture carries the seed's
   short label as `.name` so a texture you like can be found again. Pass
   `{ archetype: 'checker' | 'circles' | 'bands' | 'pool' }` to pin the kind
   of field and let the seed vary only its parameters. */
export function generate(seed, overrides = {}) {
  const { archetype, ...spec } = overrides;
  const layers = generateLayers(seed, { archetype });
  return tag(new DitherTexture({ layers, width: 240, height: 240, ...spec }), 'dither', seed, layers.archetype);
}

/* A second algorithm: coarse pixel-block patterns rather than dither. Same
   palette, same seeded reproducibility. Pass `{ archetype: 'mirror' |
   'truchet' | 'weave' }` to pin the kind of pattern. */
export function pixels(seed, overrides = {}) {
  const { archetype, ...spec } = overrides;
  const layers = generatePixelLayers(seed, { archetype });
  return tag(new DitherTexture({ layers, width: 240, height: 240, ...spec }), 'pixels', seed, layers.archetype);
}

/* A third family: retro-inspired patterns — ordered (Bayer) dither, XOR
   munching squares, cellular automata, teletext mosaics. Pass
   `{ archetype: 'bayer' | 'xor' | 'automata' | 'teletext' }` to pin one. */
export function retro(seed, overrides = {}) {
  const { archetype, ...spec } = overrides;
  const layers = generateRetroLayers(seed, { archetype });
  return tag(new DitherTexture({ layers, width: 240, height: 240, ...spec }), 'retro', seed, layers.archetype);
}

/* Grow a fresh GROUND from a seed — a quiet field for behind running text.
   Pass `{ archetype: 'even' | 'band' | 'patch' | 'checker' | 'fade' }` to
   pin the kind. */
export function generateGround(seed, overrides = {}) {
  const { archetype, ...spec } = overrides;
  const layers = generateGroundLayers(seed, { archetype });
  return tag(new DitherTexture({ layers, width: 320, height: 160, ...spec }), 'ground', seed, layers.archetype);
}

/* Grow a fresh DECAL from a seed — a small mark on transparency, sized by
   its archetype. Pass `{ archetype: 'seal' | 'badge' | 'reticle' | 'tab' |
   'chip' | 'bars' | 'stripe' | 'block' }` to pin the kind. */
export function generateDecal(seed, overrides = {}) {
  const { archetype, ...over } = overrides;
  const s = generateDecalSpec(seed, { archetype });
  return tag(
    new DitherTexture({ layers: s.layers, width: s.width, height: s.height, background: null, ...over }),
    'decal',
    seed,
    s.archetype,
  );
}

/* Grow a fresh RETRO DECAL from a seed — a decal shape (badge, tab, block,
   stripe, chip) filled with a retro pattern (XOR, automata, teletext, or a
   Bayer ramp) on transparency. Pin the fill with `{ archetype: 'xor' |
   'automata' | 'teletext' | 'bayer' }` and/or the shape with `{ shape }`. */
export function generateRetroDecal(seed, overrides = {}) {
  const { archetype, shape, ...over } = overrides;
  const s = generateRetroDecalSpec(seed, { archetype, shape });
  return tag(
    new DitherTexture({ layers: s.layers, width: s.width, height: s.height, background: null, ...over }),
    'retro-decal',
    seed,
    s.archetype,
  );
}

/* Every generated texture carries the three things a bookmark needs to grow
   it again: its family, its seed, and the archetype the seed resolved to. */
function tag(tex, family, seed, archetype) {
  tex.name = seedLabel(seed);
  tex.family = family;
  tex.seed = seed;
  tex.archetype = archetype;
  return tex;
}

/* The generators, keyed by the family a bookmark stores. */
const GENERATORS = { dither: generate, pixels, retro, ground: generateGround, decal: generateDecal, 'retro-decal': generateRetroDecal };

/* Turn a saved bookmark back into a texture. `overrides` (palette, size,
   scale…) are display choices layered on top of the stored seed/archetype —
   they do not change which pattern comes back. */
export function regenerate(record, overrides = {}) {
  const gen = GENERATORS[record.family];
  if (!gen) throw new Error(`Unknown bookmark family "${record.family}".`);
  return gen(record.seed, { archetype: record.archetype, ...overrides });
}

/* Convenience: bookmark (toggle) a texture directly, reading the family, seed
   and archetype off it. Also accepts a plain record. Returns the new state
   (true = now saved). */
export function bookmark(texOrRecord) {
  const rec =
    texOrRecord instanceof DitherTexture
      ? { family: texOrRecord.family, seed: texOrRecord.seed, archetype: texOrRecord.archetype, palette: texOrRecord.spec.palette }
      : texOrRecord;
  return bookmarks.toggle(rec);
}

export {
  renderImageData,
  fields,
  fieldMeta,
  grounds,
  decals,
  generateLayers,
  generatePixelLayers,
  generateRetroLayers,
  generateGroundLayers,
  generateDecalSpec,
  generateRetroDecalSpec,
  seamlessSize,
  archetypes,
  pixelArchetypes,
  retroArchetypes,
  groundArchetypes,
  decalArchetypes,
  bookmarks,
  seedLabel,
};
export { palettes, resolvePalette, parseColor } from './palette.js';
export { makeRng, hashSeed } from './rng.js';
