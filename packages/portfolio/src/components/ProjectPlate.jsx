import { useEffect, useRef } from "react";
import { retro } from "@gavinmcfarland/dither";
import { useTheme } from "../contexts/ThemeContext";

/* The abstract plate on a project row — a 1-bit retro pattern grown from the
   project's hardcoded `seed` and `archetype` (see src/data/projects.js). The
   archetype names which of the dither package's retro algorithms draws it
   (Bayer ramp, XOR plaid, maze, plasma, automata…); the seed sets its
   parameters. Same pair, same plate, every render.

   Painted into a <canvas> at the element's own size rather than scaled from a
   fixed bitmap, so every square dot lands on a whole device pixel at any
   column width — the package's whole doctrine is that a dot is never sliced. */

/* The engine paints with named inks, so the plate re-tints with the page by
   handing it an Enamel palette rather than one of the package's own. The ink
   STRENGTHS are the package's (`tx-solid` at ~0.7, the value the dither demo
   renders these patterns at) so a retro pattern reads with the contrast it was
   picked at; only the hues are ours — bone ink on graphite, graphite on steel. */
const PALETTES = {
  light: {
    bg: "#c3c8cd",
    tx: "rgba(22, 25, 28, 0.22)",
    "tx-strong": "rgba(22, 25, 28, 0.38)",
    "tx-ground": "rgba(22, 25, 28, 0.10)",
    "tx-solid": "rgba(22, 25, 28, 0.70)",
  },
  dark: {
    bg: "#111110",
    tx: "rgba(235, 231, 220, 0.22)",
    "tx-strong": "rgba(235, 231, 220, 0.40)",
    "tx-ground": "rgba(235, 231, 220, 0.085)",
    "tx-solid": "rgba(235, 231, 220, 0.72)",
  },
};

export default function ProjectPlate({ seed, archetype, className = "" }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;

    let frame = 0;
    const draw = () => {
      const width = Math.round(box.clientWidth);
      const height = Math.round(box.clientHeight);
      if (!width || !height) return;
      retro(seed, {
        archetype,
        width,
        height,
        palette: PALETTES[theme] || PALETTES.dark,
        // Transparent, so the plate sits on the page ground the way the
        // mockup's bordered plate does.
        background: null,
      }).render(canvas);
    };

    draw();

    // Re-cut the pattern when the column resizes — coalesced to one paint per
    // frame, since each render walks every pixel.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    });
    observer.observe(box);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [seed, archetype, theme]);

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
