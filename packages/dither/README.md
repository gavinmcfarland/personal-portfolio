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
| `generateIcon(seed)` | any string/number | a shaded 3D material icon (Bayer dither) |
| `generateDitherIcon(seed)` | any string/number | the same, as a square-dot halftone |
| `generateOrganicComposition(seed)` | any string/number | an organised artwork of repeated primitives, organic detail |
| `generateDitherComposition(seed)` | any string/number | the same arrangement, dither tones |
| `ditherImageFrom(src)` | a URL, SVG string, File | **your own picture**, redrawn as dots |
| `ditherImage(source)` | a loaded `<img>`, canvas, `ImageData` | the same, synchronously |

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
| `{ type: 'image', source, cell, method, … }` | a picture, resampled onto the cell grid and dithered (see [Images](#images--svgs)) |

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

### Retro icons

`generateIcon(seed)` draws an iconic silhouette — `circle`, `square`, `diamond`,
`triangle`, `pentagon`, `hexagon`, `octagon`, `star`, `star6`, `heart`, `cross`,
`moon` — filled with a texture that is **organic to the shape**, not a tile
cropped by it. Each shape has a polar field (`t`, the fraction from centre to
its own boundary, plus the angle), and the retro effect is painted in that
space, so it nests inside the outline or radiates from the centre.

```js
generateIcon('badge');                                   // seed picks shape + effect
generateIcon('badge', { shape: 'star', archetype: 'contours' });
```

Effects (`archetype`): `contours` (nested copies of the outline), `dither` (a
Bayer ramp from the centre out), `rays` (a sunburst), `spiral`, `polarxor` (a
polar plaid), and `polargrid` (a retro grid — xor / teletext / maze / plasma /
chevron — wrapped around the shape's rings and sectors). Shapes come from the
`polygon` mask (concave-safe, so stars and hearts work); the moon is a disc with
a `not` disc bitten out; the geometry all runs through the `organic` mask.

### Shaded material icons

`generateIcon(seed)` renders each shape as a **shaded 3-D solid** — its signed
distance field becomes a relief (a `dome` or a `bevel`), lit from a fixed
upper-left key light with Lambert diffuse and a specular highlight, then
ordered-dithered. Materials (`archetype`): `glossy`, `matte`, `metal`, `button`.
`generateDitherIcon(seed)` renders the same lighting as a square-dot **halftone**
(tone bands filled with quarter/checker dots) instead of a Bayer ramp.

## Compositions

`generateOrganicComposition(seed)` and `generateDitherComposition(seed)` build
small organised artworks from **repeated geometric primitives** — everything
snaps to one unit grid, each group repeats a single shape, and stacks share a
baseline:

- `stacks` — bottom-aligned columns (domes, squares, spires), a bar chart of geometry;
- `grid` — a clean N×N grid of one primitive, tone ramping across the diagonal;
- `tower` — a stack of squares under a spire;
- `nested` — concentric arcs (a rainbow) or rings (a tunnel).

The two functions differ only in finish: **organic** fills each primitive with
its own shape-following texture; **dither** fills each with a square-dot halftone
whose density is the element's tone, so a nest of arcs reads as a 1-bit gradient
the way a colour ramp does.

```js
generateDitherComposition('poster', { archetype: 'stacks' }).render(canvas);
```

## Images & SVGs

Every other family invents its pattern. This one takes a picture — a
screenshot, a photo, an SVG, a canvas — and redraws it in the same grammar:
square dots on a regular grid, one hard decision per cell.

```js
import { ditherImageFrom } from '@gavinmcfarland/dither';

const tex = await ditherImageFrom('/screenshot.png', {
  palette: 'bone',
  cell: 3,              // dot pitch — the biggest single look control
  method: 'atkinson',
  autoLevels: true,
  range: [0.12, 0.92],
});
tex.render(canvas);
```

`ditherImageFrom` decodes first, so it takes a URL, a `data:` URL, an SVG
document as a string, or a `File`/`Blob` from an upload or a drop.
`ditherImage` is the synchronous half for pixels you already hold — a loaded
`<img>`, a canvas, an `ImageData`, or a luminance plane from `loadLuma`.
Decode once with `loadLuma`, then re-render from it as options change; the
decode is the expensive part, the dither is not.

The picture is **resampled onto the dot grid by area average**, not point
sampled, so a row of 1px text strokes reduces to a grey rather than to a
coin-flip — which is what keeps a UI screenshot legible at a few thousand
dots. And the decision is still made once per **cell**, so a dot is a whole
square and an edge stair-steps rather than being shaved.

### Options

| option | what it does |
| --- | --- |
| `width` / `height` | output size in CSS px; give one and the other follows the aspect ratio (default 320 wide). Snapped to whole cells. |
| `cell` | dot pitch in CSS px (default 3) |
| `style` | `dither` (one bit per cell) or `halftone` (tone bands filled with the package's quarter/checker dots) |
| `method` | `bayer`, `atkinson`, `floyd`, `jarvis`, `sierra`, `threshold`, `noise` |
| `order` | Bayer matrix side — 2, 4 (the classic), 8 |
| `autoLevels` | stretch the picture's own range to full black-to-white, ends taken at a percentile (default 2%, or pass a number) |
| `range` | `[min, max]` ink coverage — what white and black map to |
| `steps` | posterise the tone to N levels first |
| `contrast` / `brightness` / `gamma` | the usual adjustments |
| `invert` | dots stand for light instead of dark (defaults from the palette) |
| `fit` | `cover` (default), `contain`, `fill` |
| `alpha` | `flatten` (default), `cutout`, or `shadow` — see below |
| `palette` / `background` / `scale` / `ink` | as everywhere else |

### The two that matter

**`autoLevels`** is what makes a flat UI capture work at all. A screenshot of
a light interface sits entirely in the top eighth of the range, where the
difference between a white card and the grey behind it is a rounding error —
and 1 bit has no rounding errors to spare. The ends are taken at a percentile
rather than at the extremes, so a 20px black icon cannot claim the whole
shadow end of the range on behalf of an image that is otherwise all highlight.

**`range`** decides whether the result is a *picture* or a *plate*. Left at
its default the white paper of a screenshot means "no dots", and most of the
sheet comes back empty — faithful, but not a texture. Set `range: [0.12,
0.92]` and white starts meaning "the faintest field" instead: the whole sheet
carries dots, and the picture reads as tonal structure within them, the way
the generated fields do.

`steps` adds the hard tonal terraces of a printed plate — a soft gradient
becomes a few flat fields of dots with a visible step between them.

### Method, briefly

`bayer` is the ordered ramp: a fixed crosshatch, perfectly regular, the Mac
and Game Boy look, and the only one that stays stable under a size change.
`atkinson` is the classic Mac error-diffusion — it deliberately throws away a
quarter of the error, which is why it blows out to crisp solid blacks and
whites. `floyd` and `jarvis` conserve it and hold much finer gradients (Jarvis
the smoother of the two). `sierra` is the cheap one. `threshold` is a hard
50% cut with no dither at all, for flat vector art. `noise` scatters — the one
place in this package where a mark is not ordered, and it looks it.

Error diffusion scans serpentine (alternate rows right-to-left) so the error
cannot drag one way and draw "worms" across a flat area. Pass
`serpentine: false` if you want them.

### SVGs and cut-outs

SVGs are rasterised at 1024px on the long edge rather than at their own size,
so a 24px icon still has real detail to average down from — raise it with
`raster` for something very fine. A vector mark with a transparent ground
wants `background: null` and one of the two cut-out alpha modes:

```js
const mark = await ditherImageFrom(svgString, {
  alpha: 'shadow',   // or 'cutout'
  background: null,
  method: 'atkinson',
  cell: 2,
});
el.style.backgroundImage = `url("${mark.toDataURL()}")`;
```

### The three alpha modes

| mode | transparency is… | good for |
| --- | --- | --- |
| `flatten` | paper. Composited onto `pad`, so the empty area takes the ink floor like any other light passage | photos, screenshots, anything opaque |
| `cutout` | a hard edge, cut at half coverage | flat marks and logos with no soft edges |
| `shadow` | a fading field. Ink is scaled by coverage, so a soft edge or drop shadow survives and thins to genuinely nothing | anything with a shadow, glow or feathered edge |

`cutout` is binary, which is why it discards a drop shadow along with the
empty area — a 20%-alpha pixel is simply *out*. `shadow` keeps the same clean
result over true transparency but lets partial coverage through in
proportion, so a shadow prints as a thinning halo of dots.

The order matters: coverage attenuates the **finished** ink, after the ink
range has been applied. Flattening first would leave the shadow's whole
bounding area sitting at the ink floor instead of fading out — a visible
rectangle of dots around the mark. Scaling last takes the floor down with it.

An image texture is field-relative by definition, so `toBackground()` returns
`null` for one — there is no tile of a photograph that repeats.

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

An image dithering bench (drop your own file in, or use a sample, and work
the controls), a gallery of the six fields, walls of auto-generated dither / pixel / retro
patterns plus generated grounds and decals (click a tile to reseed it, ☆ to
bookmark it), a Bookmarked row that persists across reloads, the preset grounds
and decals, and a surface toggle between `ink` and `bone`.
