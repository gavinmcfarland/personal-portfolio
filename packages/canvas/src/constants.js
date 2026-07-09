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
};
