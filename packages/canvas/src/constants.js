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
export const FRAME_BARS = { browser: 36, plugin: 36, terminal: 36, ios: 36, android: 36 };
export const frameBarH = (style) => FRAME_BARS[style] || FRAME_BARS.browser;
export const GRID = 28;

export const clampScale = (s) => Math.min(ZOOM.max, Math.max(ZOOM.min, s));

/* On-board height of a section — its stored height at whatever scale it carries. */
const sectionH = (n) => (+n.h > 0 ? +n.h : 0) * (+n.scale > 0 ? +n.scale : 1);

/* Vertical slack within which two sections count as side by side, as a fraction
   of the board's typical section height — the MEDIAN one, not each pair's own.

   It has to be relative, because "these two line up" is judged by eye against
   the sections on the screen: the same board laid out in world units twice the
   size is misaligned by twice as much and still reads as a row. A fixed number
   of world px is right for exactly one zoom and wrong either side of it.

   And it has to be the median rather than the heights in play, so that one
   outsized section — a frame drawn around the whole board, say — can't widen
   the slack for everything it overlaps and band the lot into one row. */
const ROW_SLACK = 0.15;
/* Floor, for a board whose sections carry no height at all (anchored text
   blocks are sized by their content): tops that differ by a hair still band. */
const ROW_EPS_MIN = 24;

/* The slack for one page's sections. Sections with no height sit the sample
   out rather than dragging the median toward zero. */
const rowSlack = (secs) => {
	const hs = secs.map(sectionH).filter((h) => h > 0).sort((a, b) => a - b);
	if (!hs.length) return ROW_EPS_MIN;
	return Math.max(ROW_EPS_MIN, hs[hs.length >> 1] * ROW_SLACK);
};

/* Section anchors on a board, in navigation order: frames and anchored nodes.
   Shared by the page/section menu, the keyboard section stepper and the phone
   remote, so all three agree on what "next section" means.

   Sections dragged into an explicit order in the page menu carry an `order` and
   lead the list in it. Everything else falls back to reading order: top to
   bottom, left to right across sections whose tops line up. Sorting on `y`
   alone let a few px of vertical jitter scramble sections laid out side by
   side — a row placed by eye is never pixel-aligned — so sections band into a
   row first, and a row is decided on the top edge alone: where a section starts
   is what says whether it reads next to its neighbour or after it. How tall
   either of them is says nothing about that — this used to band a section into
   the row above until it cleared that row's deepest midline, which let one tall
   section swallow everything it overlapped (see ROW_SLACK). */
export const sectionNodes = (nodes) => {
	const secs = nodes.filter((n) => n.type === 'frame' || n.anchor);
	const ranked = secs
		.filter((n) => Number.isFinite(n.order))
		.sort((a, b) => a.order - b.order || a.y - b.y || a.x - b.x);
	const eps = rowSlack(secs);
	const rows = [];
	for (const n of secs.filter((n) => !Number.isFinite(n.order)).sort((a, b) => a.y - b.y || a.x - b.x)) {
		// Measured against the row's own top, not the section that happens to be
		// last in it: a run of sections each a hair below the previous would
		// otherwise creep down the board and stay one endless row.
		const row = rows[rows.length - 1];
		if (row && n.y - row.top < eps) row.items.push(n);
		else rows.push({ top: n.y, items: [n] });
	}
	return [...ranked, ...rows.flatMap((r) => r.items.sort((a, b) => a.x - b.x || a.y - b.y))];
};

/* Display name for a section anchor: frame name, first markdown heading, or the
   node's text/type as a fallback. Shared by the page/section menu, the speaker
   notes drawer and the phone remote, so one section reads the same everywhere. */
export const sectionLabel = (node) => {
	if (node.type === 'frame') return (node.name || '').trim() || 'Untitled';
	if (node.type === 'md') {
		const first = (node.text || '')
			.split('\n')
			.map((l) => l.replace(/^#+\s*/, '').trim())
			.find(Boolean);
		return first ? first.slice(0, 32) : 'Markdown';
	}
	if (node.type === 'code') {
		const first = (node.text || '').split('\n').map((l) => l.trim()).find(Boolean);
		return first ? first.slice(0, 32) : 'Code';
	}
	const txt = (node.text || '').replace(/\s+/g, ' ').trim();
	return txt ? txt.slice(0, 32) : node.type.charAt(0).toUpperCase() + node.type.slice(1);
};

/* Aspect ratios offered for a frame, widest first so the list reads as one
   sweep from ultrawide through square to portrait. Screen ratios only: a frame
   is a section of a talk, so what it wants to match is a projector, a laptop
   lid or a phone held upright — not a paper size. */
export const FRAME_RATIOS = [
	{ label: '21:9', ratio: 21 / 9 },
	{ label: '16:9', ratio: 16 / 9 },
	{ label: '16:10', ratio: 16 / 10 },
	{ label: '3:2', ratio: 3 / 2 },
	{ label: '4:3', ratio: 4 / 3 },
	{ label: '1:1', ratio: 1 },
	{ label: '4:5', ratio: 4 / 5 },
	{ label: '9:16', ratio: 9 / 16 },
];

/* Whether a frame already sits at a ratio, within half a percent — enough
   slack that the rounding setFrameAspect does still reads back as a match, and
   tight enough that a hand-dragged frame doesn't claim to be 16:9. */
export const atRatio = (node, ratio) => {
	const w = node.w || 0;
	const h = node.h || 0;
	return h > 0 && Math.abs(w / h - ratio) / ratio < 0.005;
};

export const DRAW_TOOLS = ['pen', 'line', 'arrow', 'rect', 'ellipse'];
/* Shapes with an interior that can take a fill colour. */
export const FILLABLE_SHAPES = ['rect', 'ellipse'];

/* How a shape's stroke is drawn: the plain vector line, or the hand-drawn
   double stroke plotted by sketch.js. Stored on the shape as `style`; a shape
   saved before the setting existed has none and reads as 'solid'. */
export const SHAPE_STYLES = [
	['solid', 'Solid'],
	['sketch', 'Hand drawn'],
];
export const DEFAULT_SHAPE_STYLE = 'solid';

/* Font families offered for text blocks. Each key maps to a CSS design token
   (--sans / --serif / --mono / --cursive) via `.tblock[data-font="…"]` rules.
   The `script` key is what boards have stored since day one — only its label
   reads "Cursive", so existing text blocks keep their font. */
export const FONTS = [
	['sans', 'Sans'],
	['serif', 'Serif'],
	['mono', 'Mono'],
	['script', 'Cursive'],
];

/* Preset font sizes (px) offered for text blocks, small to huge. `fontSize` is
   otherwise only written by the cmd-drag scale gesture, which lands on arbitrary
   values — the presets give the common sizes one click. Medium matches the
   1.5rem `.cv-tblock` default (at a 16px root), so an unsized block reads as
   Medium in the picker. */
export const TEXT_SIZES = [
	[16, 'S', 'Small'],
	[24, 'M', 'Medium'],
	[36, 'L', 'Large'],
	[56, 'XL', 'Extra large'],
	[88, 'XXL', 'Huge'],
];
export const DEFAULT_TEXT_SIZE = 24;

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
