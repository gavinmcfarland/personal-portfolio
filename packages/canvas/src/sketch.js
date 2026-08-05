/* Hand-drawn stroke rendering — the second of the two shape styles.

   A shape drawn in the `sketch` style is re-plotted as a wobbly, double-inked
   path in the spirit of rough.js / tldraw's draw style: every edge is stroked
   twice with independent deviations, so it reads as a line gone over a second
   time by hand rather than one machined vector. Fillable shapes get a separate
   (barely wobbled) closed path underneath, because the outline of a sketched
   rect is four disjoint edges — filling that directly would paint slivers.

   The deviations come from a PRNG seeded on the shape's id, not Math.random:
   the same shape must sketch identically on every render, so the wobble holds
   still while the shape is being drawn, dragged or resized (an unseeded source
   makes a shape crawl under the cursor). A duplicated shape carries a new id
   and so draws its own hand — which is what you'd want anyway. */

const r2 = (v) => Math.round(v * 100) / 100;

export const isSketch = (s) => !!s && s.style === 'sketch';

/* Widest a stroke may wander from the true edge, world px. Deliberately small:
   the double pass is what sells the look, not the size of the wobble. */
const AMP = 1.6;
/* How far a long edge bows away from straight, as a multiple of AMP per 200px
   of span — a hand drawing a long line curves it, a short one barely at all. */
const BOW = 1.4;
/* Anchor points around an ellipse. Nine is enough for the curve through them to
   read as round while leaving each point's offset visible as a wobble. */
const STEPS = 9;
const HEAD = 6; // arrowhead length, in stroke widths
const SPREAD = 0.45; // arrowhead half-angle, radians

/* ── seeded randomness ────────────────────────────────────────── */

/* FNV-1a over the shape id → a 32-bit seed, so 's7' and 's8' start far apart. */
function seedOf(id) {
  let h = 2166136261;
  const s = String(id || 's');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* mulberry32 — a few lines, good enough distribution for jitter, and (unlike
   Math.random) reproducible from the seed on every call. */
function rngFor(id) {
  let a = seedOf(id);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dev = (r, m) => (r() * 2 - 1) * m; // uniform in ±m

/* ── path pieces ──────────────────────────────────────────────── */

const cubic = (a, b, c, d, e, f) => `C${a} ${b} ${c} ${d} ${e} ${f}`;

/* One pencil stroke from (x1,y1) to (x2,y2): both ends land a little off the
   true corner and the span bows out through two control points, so the edge
   reads as a single movement of the hand. `amp` is the widest it may wander —
   scaled down on a short edge (len/10) so a 12px side doesn't wobble as hard
   as a 400px one, which would just look broken. */
function stroke(x1, y1, x2, y2, r, amp) {
  const off = Math.min(amp, Math.hypot(x2 - x1, y2 - y1) / 10);
  const half = off / 2;
  const t = 0.2 + r() * 0.2; // where along the span the control points sit
  const bx = dev(r, (BOW * off * (y2 - y1)) / 200);
  const by = dev(r, (BOW * off * (x1 - x2)) / 200);
  const p = (v, o) => r2(v + dev(r, o));
  // Evaluated left to right, so the random draws stay in a fixed order and the
  // same shape always comes out the same.
  const m = `M${p(x1, half)} ${p(y1, half)}`;
  return (
    m +
    cubic(
      p(bx + x1 + (x2 - x1) * t, off),
      p(by + y1 + (y2 - y1) * t, off),
      p(bx + x1 + (x2 - x1) * 2 * t, off),
      p(by + y1 + (y2 - y1) * 2 * t, off),
      p(x2, half),
      p(y2, half)
    )
  );
}

/* The same edge inked twice — the whole trick of the style. */
const doubleStroke = (x1, y1, x2, y2, r, amp) =>
  stroke(x1, y1, x2, y2, r, amp) + stroke(x1, y1, x2, y2, r, amp);

/* A Catmull-Rom curve through `pts` as cubic Béziers. Used for the ellipse and
   the pen, where the wobble lives in the anchor points and the curve through
   them has to stay smooth — a polyline of jittered points reads as a mistake,
   a curve through them reads as a hand. */
function curveThrough(pts, closed) {
  const n = pts.length;
  if (n < 2) return '';
  if (n === 2) return `M${r2(pts[0][0])} ${r2(pts[0][1])}L${r2(pts[1][0])} ${r2(pts[1][1])}`;
  const at = closed
    ? (i) => pts[((i % n) + n) % n]
    : (i) => pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += cubic(
      r2(p1[0] + (p2[0] - p0[0]) / 6), r2(p1[1] + (p2[1] - p0[1]) / 6),
      r2(p2[0] - (p3[0] - p1[0]) / 6), r2(p2[1] - (p3[1] - p1[1]) / 6),
      r2(p2[0]), r2(p2[1])
    );
  }
  return closed ? d + 'Z' : d;
}

/* ── per-shape geometry ───────────────────────────────────────── */

const boxOf = (s) => ({
  x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2),
  w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1),
});

const cornersOf = (s) => {
  const b = boxOf(s);
  return [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
};

/* Anchor points around an ellipse, each pushed in or out by a random amount, so
   the curve through them is round but never machine-round. The starting angle
   is randomised too — otherwise every ellipse on the board would have its
   flat spot in the same place. */
function ellipsePoints(cx, cy, rx, ry, r, amp) {
  const a0 = r() * Math.PI * 2;
  const inc = (Math.PI * 2) / STEPS;
  const pts = [];
  for (let i = 0; i < STEPS; i++) {
    const a = a0 + i * inc;
    pts.push([cx + (rx + dev(r, amp)) * Math.cos(a), cy + (ry + dev(r, amp)) * Math.sin(a)]);
  }
  return pts;
}

/* An arrowhead as two strokes back from the tip, rather than the filled
   triangle the plain style hangs off a marker — a drawn arrow has an open
   head. Sized off the stroke width (matching the marker it replaces) and
   capped at half the shaft, so a short arrow isn't all head. */
function arrowHead(s, r, amp) {
  const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
  const shaft = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
  const len = Math.min(HEAD * (s.width || 3), shaft / 2);
  if (!(len > 0)) return '';
  let d = '';
  for (const a of [ang + Math.PI - SPREAD, ang + Math.PI + SPREAD]) {
    d += doubleStroke(s.x2, s.y2, s.x2 + len * Math.cos(a), s.y2 + len * Math.sin(a), r, amp);
  }
  return d;
}

/* ── public API ───────────────────────────────────────────────── */

/* The `d` of a shape's sketched outline — what the stroked <path> draws. */
export function sketchStroke(s) {
  const r = rngFor(s.id);
  if (s.type === 'pen') {
    const pts = s.points || [];
    if (pts.length < 2) return pts.length ? `M${pts[0][0]} ${pts[0][1]}` : '';
    // A freehand stroke is already hand-drawn, so it keeps its own path — the
    // style shows as the second inking, each pass nudged off the recorded
    // points and smoothed, the way a pen re-traced never lands twice.
    const amp = AMP * 0.35;
    let d = '';
    for (let pass = 0; pass < 2; pass++) {
      d += curveThrough(pts.map((p) => [p[0] + dev(r, amp), p[1] + dev(r, amp)]), false);
    }
    return d;
  }
  if (s.type === 'line' || s.type === 'arrow') {
    const d = doubleStroke(s.x1, s.y1, s.x2, s.y2, r, AMP);
    return s.type === 'arrow' ? d + arrowHead(s, r, AMP) : d;
  }
  if (s.type === 'rect') {
    // Each side is its own stroke, so the corners overshoot and gap the way a
    // hand-drawn box does. (This is also why a filled rect needs the separate
    // closed path below: four loose edges have no interior to fill.)
    const c = cornersOf(s);
    let d = '';
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[(i + 1) % 4];
      d += doubleStroke(a[0], a[1], b[0], b[1], r, AMP);
    }
    return d;
  }
  if (s.type === 'ellipse') {
    const b = boxOf(s);
    const rx = b.w / 2, ry = b.h / 2;
    const amp = Math.min(AMP, Math.min(rx, ry) / 4);
    let d = '';
    for (let pass = 0; pass < 2; pass++) {
      d += curveThrough(ellipsePoints(b.x + rx, b.y + ry, rx, ry, r, amp), true);
    }
    return d;
  }
  return '';
}

/* The `d` of the closed path that carries a sketched shape's fill — and, for a
   hollow one, its clickable interior (the outline alone is only hit-testable on
   the line). Follows the shape's true edge with a hint of wobble, so it sits
   under the outline instead of poking through it. Null for shapes with no
   interior. */
export function sketchFill(s) {
  const r = rngFor(s.id + 'f');
  if (s.type === 'rect') {
    const amp = AMP * 0.4;
    const pts = cornersOf(s).map((p) => [r2(p[0] + dev(r, amp)), r2(p[1] + dev(r, amp))]);
    return `M${pts[0][0]} ${pts[0][1]}` + pts.slice(1).map((p) => `L${p[0]} ${p[1]}`).join('') + 'Z';
  }
  if (s.type === 'ellipse') {
    const b = boxOf(s);
    const rx = b.w / 2, ry = b.h / 2;
    const amp = Math.min(AMP * 0.4, Math.min(rx, ry) / 8);
    return curveThrough(ellipsePoints(b.x + rx, b.y + ry, rx, ry, r, amp), true);
  }
  return null;
}
