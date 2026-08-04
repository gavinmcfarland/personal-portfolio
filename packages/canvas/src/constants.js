/* Tunables for the canvas viewport & tools. */

/* Join class-name fragments, dropping falsy ones. Used to merge a consumer's
   per-part `classNames` overrides onto the built-in chrome classes. */
export const cx = (...parts) => parts.filter(Boolean).join(' ');

export const ZOOM = {
	min: 0.08,
	max: 8,
	sensitivity: 0.015,
	deltaClamp: 24,
	lerp: 0.6,
	doneScale: 0.0012,
	donePan: 0.12,
};
export const PAN = { wheelSpeed: 1.4 }; // multiplier for scroll-wheel / trackpad panning
/* Height (world px) of each device frame's chrome bar, keyed by style. Toggling
   a frame grows / shrinks the node box by this so the media keeps its size; a
   switch between styles adjusts by the delta. Kept in sync with the per-style
   `--cv-df-bar` CSS tokens in canvas.css. */
export const FRAME_BARS = { browser: 36, plugin: 36, terminal: 36 };
export const frameBarH = (style) => FRAME_BARS[style] || FRAME_BARS.browser;
export const GRID = 28;

export const clampScale = (s) => Math.min(ZOOM.max, Math.max(ZOOM.min, s));

/* On-board height of a section, for grouping sections into rows. Auto-height
   nodes (text, markdown, links) carry no `h` — they band on their top edge alone. */
const sectionH = (n) => (+n.h > 0 ? +n.h : 0) * (+n.scale > 0 ? +n.scale : 1);
/* Vertical slack (world px) for the row test, so sections whose tops differ by a
   hair still share a row even when neither carries a height. */
const ROW_EPS = 24;

/* Section anchors on a board, in navigation order: frames and anchored nodes.
   Shared by the page/section menu and the keyboard section stepper so both agree
   on what "next section" means.

   Sections dragged into an explicit order in the page menu carry an `order` and
   lead the list in it. Everything else falls back to reading order: rows top to
   bottom, left to right within a row. Sorting on `y` alone (what this used to do)
   let a few px of vertical jitter scramble sections laid out side by side — a
   row placed by eye is never pixel-aligned, so a horizontal board came out
   shuffled. Grouping into rows first makes the walk follow the layout. */
export const sectionNodes = (nodes) => {
	const secs = nodes.filter((n) => n.type === 'frame' || n.anchor);
	const ranked = secs
		.filter((n) => Number.isFinite(n.order))
		.sort((a, b) => a.order - b.order || a.y - b.y || a.x - b.x);
	const rows = [];
	let floor = 0; // deepest midline of the row being built
	for (const n of secs.filter((n) => !Number.isFinite(n.order)).sort((a, b) => a.y - b.y || a.x - b.x)) {
		// A section joins the row above until its top clears that row's deepest
		// midline: a genuinely stacked section does, a jittery neighbour doesn't.
		const mid = n.y + Math.max(sectionH(n) / 2, ROW_EPS);
		if (!rows.length || n.y >= floor) { rows.push([n]); floor = mid; }
		else { rows[rows.length - 1].push(n); floor = Math.max(floor, mid); }
	}
	return [...ranked, ...rows.flatMap((r) => r.sort((a, b) => a.x - b.x || a.y - b.y))];
};

export const DRAW_TOOLS = ['pen', 'line', 'arrow', 'rect', 'ellipse'];
/* Shapes with an interior that can take a fill colour. */
export const FILLABLE_SHAPES = ['rect', 'ellipse'];

/* Font families offered for text blocks. Each key maps to a CSS design token
   (--sans / --serif / --mono / --hand) via `.tblock[data-font="…"]` rules. */
export const FONTS = [
	['sans', 'Sans'],
	['serif', 'Serif'],
	['mono', 'Mono'],
	['script', 'Script'],
];

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

/* Preset board background tints offered by the edit-mode picker. These are
   saturated hues (paired with the stroke/fill palette), not pale paper colours:
   they're blended a short way into the board's base — exactly like a shape fill
   composites over the board — so one value reads as a soft paper in light mode
   and a dark, hue-tinted board in dark mode, never a washed-out light hue.
   The blend amount is the per-theme `--bg-tint` token (see canvas.css). */
export const BG_COLORS = ['#787880', '#7C2D91', '#E5484D', '#2E7D32', '#1565C0', '#F5A524'];

/* The palette's "black" stroke and fill are the only colours tied to the board's
   ink: on a dark board they'd vanish, so they flip to white. Every other hue
   reads fine in both themes and passes through unchanged. Rather than rewrite the
   stored value (which stays the light-mode black, so swatches still match), map it
   at render time to the theme-reactive --ink / --ink-fill tokens (canvas.css) —
   the flip then follows a live theme toggle with no re-render. */
export const INK_STROKE = '#141417';
export const INK_FILL = '#1414174D';
export function themeInk(color) {
	if (!color) return color;
	const c = color.toLowerCase();
	if (c === INK_STROKE.toLowerCase()) return 'var(--cv-ink)';
	if (c === INK_FILL.toLowerCase()) return 'var(--cv-ink-fill)';
	return color;
}
