import { useEffect, useMemo, useRef } from "react";
import { ditherVideo } from "@gavinmcfarland/dither";
import { paletteFor } from "../lib/ditherPalette";
import { useTheme } from "../contexts/ThemeContext";

/* A clip, redrawn by @gavinmcfarland/dither as square dots on a regular grid
   — one hard decision per cell, live, sixty frames of it a minute, looping.

   It is the moving twin of ProjectPlate and works the same way: what ships is
   the SOURCE clip, and the dot grid is cut at the size the element actually
   is, on the fly. Not a video of the dots. A recording of the effect would be
   a bitmap of squares, and a bitmap of squares is the one thing that cannot
   be resized — scale it up and every dot blurs or doubles unevenly, scale it
   down and the grid moirés against itself. Because the grid is re-cut rather
   than scaled, one file serves a 96px chip and a full-bleed banner with the
   dots the same size in both, and it follows the page's theme, which a baked
   file could never do.

   `bayer` is the method, for two reasons. It is the only one stable under a
   size change — the threshold matrix is fixed, so a clip re-cut at a new
   width dithers the same passage to the same dots. And it is the only one
   stable in TIME: an error-diffusion kernel decides each cell from the error
   carried out of the one before it, so a hair of movement re-decides the
   whole grid and the texture boils between frames, dots crawling in passages
   that never moved.

   Usage — drop it anywhere, size it in CSS, that is the whole interface:

     import clip from "../assets/dither/studio.webm";
     <DitherVideo src={clip} className="w-full aspect-[16/5]" />
     <DitherVideo src={clip} className="size-24 rounded-full" cell={2} />
*/

/* Dot pitch in CSS px — the biggest single look control, and the same value
   the plates use so a clip beside one reads as the same material. */
const CELL = 3;

/* What white and black map to in ink coverage. A floor above zero makes the
   light passages of a frame the faintest field of dots rather than nothing at
   all, so the whole surface carries texture and the picture reads as tonal
   structure within it — the way the plates do. */
const RANGE = [0.08, 0.9];

/* Twelve to fifteen is where a 1-bit texture stops reading as a slideshow and
   starts reading as film. Sixty costs four times as much for a difference
   that is not visible through a dot grid this coarse. */
const FPS = 15;

/* How much of each frame is read back, in px on the long edge, before it is
   averaged down into cells. 480 is the engine's own default and stays the
   default here; it is sized for a player filling a wide box, where 480 is
   the frame and the readback is honest work.

   It is worth setting on a chip. A player 100px wide at `cell` 2 decides
   fifty dots across, and reading 480px to average them down to fifty costs
   nine times the pixels for detail that is thrown away in the same pass —
   every frame, for as long as the clip is on screen. Match it to the source
   and each frame is read at the size it was stored.

   Mount-time only: `grab()` closes over it when the clip opens, so unlike
   every other option here a later change does not take. */
const RASTER = 480;

export default function DitherVideo({
  src,
  className = "",
  cell = CELL,
  fps = FPS,
  raster = RASTER,
  method = "bayer",
  fit = "cover",
  range = RANGE,
  contrast = 1.2,
  brightness = 0,
  steps = 0,
  autoLevels = true,
  style,
  /* Transparent by default, so the clip sits on the page ground rather than
     carrying a rectangle of its own. */
  background = null,
  ...rest
}) {
  const boxRef = useRef(null);
  const playerRef = useRef(null);
  const { theme } = useTheme();

  /* The dither options, as one object — kept out of the mounting effect's
     deps so a theme flip or a changed prop retunes the running player rather
     than tearing the clip down and decoding it again. `range` is spelled out
     into its two numbers because an array literal is a fresh identity on
     every render and would defeat the memo. */
  const [lo, hi] = range;
  const options = useMemo(
    () => ({
      cell,
      fps,
      raster,
      method,
      fit,
      range: [lo, hi],
      contrast,
      brightness,
      steps,
      autoLevels,
      background,
      order: 4, // the classic 4×4 matrix
      ...(style ? { style } : {}),
      palette: paletteFor(theme),
    }),
    [cell, fps, raster, method, fit, lo, hi, contrast, brightness, steps, autoLevels, background, style, theme],
  );

  // Retune in place. Declared first so the ref is current before the mount
  // effect below reads it on the very first pass.
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
    if (playerRef.current) playerRef.current.update(options);
  }, [options]);

  // Mount once per clip. Decoding is the expensive half and it is per-clip,
  // not per-size and not per-theme.
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !src) return;
    const player = ditherVideo(src, optionsRef.current).mount(box);
    playerRef.current = player;
    return () => {
      playerRef.current = null;
      player.destroy();
    };
  }, [src]);

  return <div ref={boxRef} className={`overflow-hidden ${className}`} aria-hidden="true" {...rest} />;
}
