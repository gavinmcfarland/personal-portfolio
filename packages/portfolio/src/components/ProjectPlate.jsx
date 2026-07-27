import { useEffect, useRef } from "react";
import { ditherImage, loadLuma } from "@gavinmcfarland/dither";
import { artFor } from "../data/projectArt";
import { useTheme } from "../contexts/ThemeContext";
import { paletteFor } from "../lib/ditherPalette";

/* The abstract plate on a project row — the project's own SVG artwork (see
   src/data/projectArt.js) redrawn by @gavinmcfarland/dither as square dots on
   a regular grid, one hard decision per cell.

   `bayer` is the method: an ordered threshold matrix, the Mac / Game Boy /
   newsprint ramp. It is also the only method that stays stable under a size
   change — the threshold map is fixed, so a plate re-cut at a new column width
   dithers the same passage to the same dots instead of re-deciding the whole
   grid from a moving error term. That matters here because the plate is
   painted at the element's own size and repainted on every resize.

   Painted into a <canvas> at that size rather than scaled from a fixed bitmap,
   so every square dot lands on a whole device pixel at any column width — the
   package's whole doctrine is that a dot is never sliced. */

/* Dot pitch in CSS px — the biggest single look control. At 3 a 30rem plate is
   ~160 dots across: coarse enough to read as print, fine enough that the
   artwork's structure survives the reduction. */
const CELL = 3;

/* What white and black map to in ink coverage. Left at the default [0, 1] the
   light passages of the artwork would mean "no dots" and most of the plate
   would come back empty — faithful, but not a texture. A floor of 0.08 makes
   white the faintest field instead, so the whole plate carries dots and the
   drawing reads as tonal structure within them, the way the generated fields
   next to it do. */
const RANGE = [0.08, 0.9];

/* Decoding is the expensive half and it is per-artwork, not per-size or
   per-theme: rasterise each SVG once, keep the luminance plane, and re-dither
   from it synchronously on every resize and theme flip. Keyed by the SVG
   source, so the six plates share nothing and each decodes exactly once for
   the life of the page. */
const planes = new Map();

function planeFor(svg) {
  let plane = planes.get(svg);
  if (!plane) {
    // Don't let a failed decode sit in the cache as a permanent rejection.
    plane = loadLuma(svg).catch((err) => {
      planes.delete(svg);
      throw err;
    });
    planes.set(svg, plane);
  }
  return plane;
}

export default function ProjectPlate({ id, className = "" }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const { theme } = useTheme();
  const art = artFor(id);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas || !art) return;

    let plane = null;
    let frame = 0;
    let live = true;

    const draw = () => {
      if (!plane) return;
      const width = Math.round(box.clientWidth);
      const height = Math.round(box.clientHeight);
      if (!width || !height) return;
      ditherImage(plane, {
        width,
        height,
        cell: CELL,
        method: "bayer",
        order: 4, // the classic 4×4 matrix
        fit: "cover",
        // The artwork is drawn to fill its own range already; autoLevels keeps
        // it honest if one is ever redrawn flatter than the rest.
        autoLevels: true,
        range: RANGE,
        palette: paletteFor(theme),
        // Transparent, so the plate sits on the page ground the way the
        // mockup's bordered plate does.
        background: null,
      }).render(canvas);
    };

    planeFor(art)
      .then((decoded) => {
        if (!live) return;
        plane = decoded;
        draw();
      })
      .catch(() => {});

    // Re-cut the plate when the column resizes — coalesced to one paint per
    // frame, since each render walks every cell.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    });
    observer.observe(box);
    return () => {
      live = false;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [art, theme]);

  return (
    <div
      ref={boxRef}
      className={`overflow-hidden border border-line ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
