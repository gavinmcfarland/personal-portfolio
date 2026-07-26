# @gavinmcfarland/dither

A canvas engine for **1-bit dither textures** — the fields, grounds and decals
from the *13 · Dither* mockup, rebuilt so they paint to a `<canvas>` instead of
CSS gradients, plus a seeded generator that grows new fields inside the same
grammar.

Every mark it paints is a **square dot on a regular grid**. Denser passages are
never scattered — they are masked into **ordered geometry**: checkerboards,
grids of true circles, horizontal bands. Nothing fades; every stop is hard,
because a dither is a decision made per pixel and a pixel is square. There is
not one round dot in the engine — circles appear only as *masks*, the shape that
selects dots, never as the dot itself.

Squares are always **complete**. A mask is tested once per square, at the
square's centre — never per pixel — so a circle, ring, band or Bayer ramp keeps
or cuts a whole square rather than slicing it into an arc or a triangle. A
circle made of dots stair-steps in whole pixels; it never has a shaved edge.

## Install

```
pnpm add @gavinmcfarland/dither
```

## Quick start

```js
import { field, generate, DitherTexture } from '@gavinmcfarland/dither';

// A named plate onto an existing canvas
field('a').render(document.querySelector('#c'));

// An auto-generated field from any seed (same seed → same field)
generate('gavin').render(canvas);

// Re-tint the whole field by naming a palette
field('a', { palette: 'bone', width: 400 }).render(canvas);

// Roll your own from raw layers
new DitherTexture({
  width: 320,
  height: 200,
  layers: [
    { mark: 'quarter', tile: 6, ink: 'tx' },
    { mark: 'checker', tile: 10, ink: 'tx-strong', mask: { type: 'circleGrid', radius: 18, size: 96 } },
  ],
}).render(canvas);
```

## The catalogue

| helper | ids | what it is |
| --- | --- | --- |
| `field(id)` | `a`–`f` | the six hand-tuned plates (`grid`, `rule`, `pool`, `lens`, `moire`, `plan`) |
| `ground(id)` | `even`, `patch`, `band` | the same engine at ~⅓ the ink, for behind running text |
| `decal(id)` | `seal`, `tab`, `chip`, `stripe` | small marks, rendered transparent so they sit over other content |
| `generate(seed)` | any string/number | a fresh dither field grown from a seed |
| `pixels(seed)` | any string/number | a coarse pixel-block pattern (a second algorithm) |
| `retro(seed)` | any string/number | a retro pattern — Bayer dither, XOR, automata, teletext |
| `generateGround(seed)` | any string/number | a fresh quiet ground for behind text |
| `generateDecal(seed)` | any string/number | a fresh small decal on transparency |
| `generateRetroDecal(seed)` | any string/number | a decal shape filled with a retro pattern |

All helpers take the same overrides: `{ width, height, palette, background, scale }`.

## `DitherTexture`

The value every helper returns. It is an immutable description with a few ways
to get pixels out:

```js
const tex = field('d', { palette: 'bone' });

tex.render(canvas);      // draw into (and size) a canvas — returns it
tex.toCanvas();          // a fresh canvas
tex.toDataURL();         // a PNG data URL
await tex.toBlob();      // a PNG Blob
tex.toImageData();       // raw ImageData (works headless with an ImageData polyfill)
tex.with({ palette: 'ink' }); // a new texture with fields overridden
tex.toBackground();      // a seamless CSS `background` value, or null if not tileable
```

### Seamless tiles

Fields built only from grid-relative masks (checkerboards, circle grids, bands)
repeat cleanly. `toBackground()` cuts the smallest tile that wraps and returns a
ready `background` shorthand:

```js
el.style.background = field('f').toBackground(); // url(...) that tiles
```

Fields that use a **field-relative** mask — a centred pool (`c`), a ring, a hard
stop — cannot tile; `toBackground()` returns `null` for those, so check it.

## Layers

A field is a stack of layers, top-most last. Each layer paints one mark on one
grid, optionally gated by a mask:

```js
{
  mark: 'quarter' | 'checker', // square dot: top-right quadrant, or a diagonal checker
  tile: 6,                     // grid pitch, in CSS px
  offset: [3, 3],              // phase the grid (e.g. half a tile to build 50% ink)
  ink: 'tx',                   // palette token or any CSS colour
  mask: { … } | [ … ],         // where dots survive; an array is a union
}
```

### Inks

Layers paint with **named inks**, not raw colours, so a whole field re-tints
from one palette. Built-in tokens: `tx`, `tx-strong`, `tx-ground`. Built-in
palettes: `ink` (dark terminal) and `bone` (printed sheet). Pass your own:

```js
field('a', { palette: { bg: '#111', tx: 'rgba(0,255,180,.2)', 'tx-strong': 'rgba(0,255,180,.4)' } });
```

Set `background: null` to render onto transparency (the default for decals).

### Masks

| type | shape |
| --- | --- |
| `{ type: 'checker', size }` | a checkerboard of `size` cells |
| `{ type: 'circleGrid', radius, size }` | a true circle of `radius` in every `size` tile |
| `{ type: 'circleCenter', radius }` | one true circle centred on the field |
| `{ type: 'ring', inner, outer }` | an annulus centred on the field |
| `{ type: 'band', axis, on, period, offset }` | repeating bands (`axis: 'x' \| 'y'`) |
| `{ type: 'bandRange', axis, from, to, period }` | a lit strip within each period |
| `{ type: 'linear', axis, at, side }` | one hard stop (`at` is a fraction of the field) |

A mask **array** is a union — a dot survives if any sub-mask allows it.

## The generator

`generate(seed)` never scatters dots, and it never combines masks freely —
that is what makes textures look *messy*. It builds one of a few **archetypes**,
each mirroring the construction of a hand-drawn field, and varies only the
parameters. The archetypes hold three constraints that keep a field legible:

- **harmonic pitches** — a field has one base pitch `P`; coarser layers only
  ever sit at `2P`, never at some arbitrary `P + n`, so grids never beat against
  each other as moiré;
- **grid-aligned masks** — every mask size is an integer multiple of `P`, so
  clumping starts and stops on a dot edge rather than cutting through one;
- **one structure per field** — a field commits to a checker, a circle grid, or
  bands, and at most restates it at a second scale.

```js
generate('gavin');                        // pick an archetype from the seed
generate('gavin', { archetype: 'circles' }); // pin the kind, vary its parameters
```

Archetypes: `checker`, `circles`, `bands`, `pool` (exported as `archetypes`).
The returned texture carries the seed's short label as `.name` (e.g.
`dither-1a2b`) so one you like is easy to find again.

## The pixel generator

A second algorithm, `pixels(seed)`, for when you want **coarse blocks instead
of fine dots**. It fills a small boolean tile with structure and repeats it, so
it reads as pixel art rather than halftone while staying inside the same 1-bit,
square, ordered aesthetic. Structure always comes from **symmetry** — cells are
decided in a fundamental region and reflected out — so the result is ornamental
by construction and tiles seamlessly.

```js
pixels('gavin').render(canvas);
pixels('gavin', { archetype: 'truchet', palette: 'bone' }).render(canvas);
el.style.background = pixels('gavin').toBackground(); // always tiles
```

Archetypes (exported as `pixelArchetypes`):

- `mirror` — a symmetric ornament under one of five symmetry groups;
- `truchet` — a grid of diagonal-line tiles that knit into continuous mazes;
- `weave` — horizontal and vertical bars laced over and under like a basket.

Blocks paint with the `tx-solid` ink token (bolder than a dot), so they re-tint
with the palette like everything else.

## The retro generator

A third family, `retro(seed)`, drawing on computing history — four algorithms,
each a distinct look:

- `bayer` — **ordered (Bayer) dithering**. A gradient (radial, linear,
  diagonal, angular) broken into a 1-bit crosshatched ramp by a Bayer threshold
  matrix. The Mac / Game Boy / newsprint gradient. Fills the frame, so it is not
  tileable.
- `xor` — **munching squares**. Bitwise formulas — `(x ^ y) & k`, `(x * y) & k`,
  and friends — that fold into nested plaids and tartan diamonds. Tiles.
- `automata` — **elementary cellular automata**. A row evolved under a Wolfram
  rule; Rule 90 draws a Sierpinski triangle, others draw fractal bands.
- `teletext` — **2×3 sixel mosaics**, optionally with the gutters of "separated
  graphics" mode. The 80s broadcast Ceefax look.
- `maze` — a **recursive-backtracker maze**, the solvable single-path kind.
- `life` — **Conway's Game of Life** run a few generations from a random soup.
- `invaders` — a sheet of **mirror-symmetric arcade sprites**.
- `plasma` — **summed sine waves** (demoscene plasma) broken up by a 4×4 Bayer
  dither. Tiles.
- `chevron` — **zigzag op-art stripes**. Tiles.

```js
retro('gavin').render(canvas);                          // seed picks the algorithm
retro('gavin', { archetype: 'automata' }).render(canvas); // pin one
```

Archetypes are exported as `retroArchetypes`. Bayer is the only algorithm that
needed an engine addition — a `threshold` mask, which you can use directly:

```js
new DitherTexture({
  layers: [{ mark: 'solid', ink: 'tx-solid', mask: { type: 'threshold', field: 'radial', order: 8, cell: 2 } }],
}).render(canvas);
```

## Generating grounds & decals

The `ground(id)` / `decal(id)` presets have seeded counterparts, so the page
furniture varies as freely as the fields do — and both are bookmarkable and
reproducible like any other family.

```js
generateGround('intro');                        // seed picks the ground kind
generateGround('intro', { archetype: 'band' }); // pin one
generateDecal('stamp');                          // seed picks the decal kind
generateDecal('stamp', { archetype: 'reticle', palette: 'bone' });
```

**Grounds** keep to the quiet `tx-ground` ink and only carve the grid into
geometry, so a paragraph stays readable (exported as `groundArchetypes`):

- `even` — an unmasked field, the quietest;
- `band` — ruled horizontal or vertical bands;
- `patch` — cut off at one edge by a single hard stop;
- `checker` — a faint checkerboard of blocks;
- `fade` — dot density that thins across the sheet (ordered dither at ground ink).

**Decals** draw with the bolder `tx-strong` ink on transparency, in strict
rectangles and true circles, each at its own natural size (exported as
`decalArchetypes`):

- `seal` — a true circular ring;
- `badge` — a filled circle of dots;
- `reticle` — two concentric rings around a centre dot;
- `tab` — a checkered rectangle;
- `chip` — a rectangle with a circle set beside it;
- `bars` — a short stack of ruled bars;
- `stripe` — a weighted band;
- `block` — a small solid square of dots.

Off-centre circles use the `disc` mask (`{ type: 'disc', cx, cy, radius }`,
`cx`/`cy` as fractions of the box), added to the engine for exactly this.

### Retro decals

`generateRetroDecal(seed)` crosses the two ideas: a decal shape (`badge`,
`block`, `tab`, `stripe`, `chip`) clipped over a retro pattern (`xor`,
`automata`, `teletext`, or a `bayer` ramp) on transparency.

```js
generateRetroDecal('stamp');                                 // seed picks both
generateRetroDecal('stamp', { archetype: 'bayer', shape: 'badge' }); // pin fill and/or shape
```

`{ archetype }` pins the retro fill, `{ shape }` pins the shape. Clipping a
*masked* fill (the Bayer ramp already carries a threshold mask) into a shape
needs an AND of two masks, so the engine gained an `intersect` mask
(`{ type: 'intersect', of: [maskA, maskB] }`) — the counterpart to a mask array,
which is a union.

## Bookmarks

Every generated texture is just a **family** (`dither` / `pixels` / `retro`), a
**seed**, and the **archetype** the seed resolved to — that triple regrows the
exact same pattern, so the `bookmarks` store keeps only that, not pixels. It is
backed by `localStorage` (surviving reloads), falls back to memory outside a
browser, and notifies subscribers on every change.

```js
import { bookmarks, bookmark, regenerate, retro } from '@gavinmcfarland/dither';

const tex = retro('sunset');
bookmark(tex);              // toggle-save straight from a texture
// …or store a plain record:
bookmarks.add({ family: 'retro', seed: 'sunset' });

bookmarks.all();           // [{ family, seed, archetype, savedAt }, …] newest first
bookmarks.has(tex);        // is it saved?
bookmarks.remove(record);  // forget one
bookmarks.clear();         // forget all

const unsubscribe = bookmarks.subscribe((list) => renderGallery(list));
```

Turn a saved record back into a texture with `regenerate` — display options
(palette, size, scale) layer on top without changing which pattern comes back:

```js
for (const rec of bookmarks.all()) {
  regenerate(rec, { palette: 'bone', width: 300 }).render(canvasFor(rec));
}
```

Bookmarking works because pinning an archetype consumes the same RNG draw as
letting the seed choose one, so a stored archetype reproduces a pattern
byte-for-byte.

## Demo

```
pnpm --filter @gavinmcfarland/dither demo
```

A gallery of the six fields, walls of auto-generated dither / pixel / retro
patterns plus generated grounds and decals (click a tile to reseed it, ☆ to
bookmark it), a Bookmarked row that persists across reloads, the preset grounds
and decals, and a surface toggle between `ink` and `bone`.
