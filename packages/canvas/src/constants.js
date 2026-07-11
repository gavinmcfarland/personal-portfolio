/* Tunables for the canvas viewport & tools. */

export const ZOOM = {
  min: 0.08,
  max: 8,
  sensitivity: 0.015,
  deltaClamp: 24,
  lerp: 0.3,
  doneScale: 0.0012,
  donePan: 0.12,
};
export const PAN = { wheelSpeed: 1.4 }; // multiplier for scroll-wheel / trackpad panning
export const RASTER = { blur: 1.1 }; // re-rasterize once the composited layer drifts past this
export const GRID = 26;

export const clampScale = (s) => Math.min(ZOOM.max, Math.max(ZOOM.min, s));

export const DRAW_TOOLS = ['pen', 'line', 'arrow', 'rect', 'ellipse'];
/* Shapes with an interior that can take a fill colour. */
export const FILLABLE_SHAPES = ['rect', 'ellipse'];

export const COLORS = {
  note: [
    ['#FFE27A', 'yellow'],
    ['#FFB4C6', 'pink'],
    ['#A9D3FF', 'blue'],
    ['#B7E6A5', 'green'],
    ['#D9B8FF', 'purple'],
    ['#FFC98A', 'orange'],
  ],
  stroke: [
    ['#141417', ''],
    ['#7C2D91', ''],
    ['#E5484D', ''],
    ['#2E7D32', ''],
    ['#1565C0', ''],
    ['#F5A524', ''],
  ],
  // First entry is the "no fill" option; the rest are semi-transparent tints
  // (8-digit #RRGGBBAA) so a single value composites correctly over both light
  // and dark boards — no per-mode variants needed. Hues pair with the strokes.
  fill: [
    ['none', 'No fill'],
    ['#1414174D', ''], // black
    ['#7878804D', ''], // neutral grey
    ['#7C2D914D', ''], // purple
    ['#E5484D4D', ''], // red
    ['#2E7D324D', ''], // green
    ['#1565C04D', ''], // blue
    ['#F5A5244D', ''], // orange
  ],
};

/* Preset board background colours offered by the edit-mode picker. */
export const BG_COLORS = ['#FFFFFF', '#FDF6E3', '#EEF2F7', '#EAF3EC', '#FBEEF3', '#1B1B22'];
