/* ══════════════════════════════════════════════════════════════════
   WORKSTATION — abstract cover art
   ------------------------------------------------------------------
   Every project gets an abstract cover, generated rather than drawn.
   Two rules keep it inside the design system:

     1. Colour comes only from the 16-colour VGA palette the rest of
        the system is built from. No blends, no gradients, no alpha.
     2. Shading is dithering, not opacity — a 2×2 checkerboard of two
        palette colours, the way a 256-colour display would have
        faked a third colour.

   The composition is seeded from the project slug, so a given
   project always gets the same cover. Nothing is random at runtime.

   `shape-rendering: crispEdges` keeps the diagonals aliased, which
   is the point — antialiasing is the one thing that would give it
   away as modern.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  /* mulberry32 — small, fast, and good enough for composition */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const hash = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  /* Palettes are chosen, not randomised — each is a combination that
     actually held together on a 16-colour display. */
  const SCHEMES = [
    { bg:'#000080', ink:['#00FFFF','#C0C0C0','#FFFFFF','#0000FF'] },   // navy / aqua
    { bg:'#008080', ink:['#FFFF00','#FFFFFF','#C0C0C0','#008000'] },   // teal / yellow
    { bg:'#800000', ink:['#FF0000','#FFFF00','#C0C0C0','#808000'] },   // maroon / red
    { bg:'#000000', ink:['#00FF00','#008000','#C0C0C0','#FFFFFF'] },   // black / lime
    { bg:'#800080', ink:['#FF00FF','#FFFFFF','#00FFFF','#C0C0C0'] },   // purple / fuchsia
    { bg:'#808000', ink:['#FFFF00','#FFFFFF','#800000','#C0C0C0'] },   // olive / yellow
  ];

  const W = 160, H = 120;

  /* A 2×2 dither of two colours, declared once per pattern id. */
  function ditherDef(id, a, b) {
    return `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="${a}"/>
      <rect width="2" height="2" fill="${b}"/>
      <rect x="2" y="2" width="2" height="2" fill="${b}"/>
    </pattern>`;
  }

  function shape(r, ink, defs, uid) {
    const c = () => ink[Math.floor(r() * ink.length)];
    const pick = Math.floor(r() * 5);
    const x = Math.round(r() * W * 0.7), y = Math.round(r() * H * 0.6);
    const w = 24 + Math.round(r() * 70), h = 20 + Math.round(r() * 60);

    if (pick === 0) {                                   // dithered block
      const id = `d${uid}`;
      defs.push(ditherDef(id, c(), c()));
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})"/>`;
    }
    if (pick === 1) {                                   // hard rectangle
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c()}"/>`;
    }
    if (pick === 2) {                                   // quarter arc
      const rad = 30 + Math.round(r() * 50);
      return `<path d="M${x} ${y} h${rad} a${rad} ${rad} 0 0 1 -${rad} ${rad} z" fill="${c()}"/>`;
    }
    if (pick === 3) {                                   // triangle
      return `<path d="M${x} ${y + h} L${x + w / 2} ${y} L${x + w} ${y + h} z" fill="${c()}"/>`;
    }
    // diagonal rule band
    const n = 3 + Math.floor(r() * 4), col = c();
    let out = '';
    for (let i = 0; i < n; i++) {
      const off = x + i * 6;
      out += `<path d="M${off} ${y + h} L${off + h} ${y}" stroke="${col}" stroke-width="2" fill="none"/>`;
    }
    return out;
  }

  /* Returns an SVG string. Deterministic for a given slug. */
  window.coverArt = function coverArt(slug) {
    const r = rng(hash(slug));
    const scheme = SCHEMES[hash(slug) % SCHEMES.length];
    const defs = [];
    const body = [];

    /* a dithered ground, so the background is never one flat colour */
    const groundId = `g${hash(slug) % 9999}`;
    defs.push(ditherDef(groundId, scheme.bg, scheme.ink[3]));
    body.push(`<rect width="${W}" height="${H}" fill="${scheme.bg}"/>`);
    body.push(`<rect y="${Math.round(H * 0.55)}" width="${W}" height="${Math.round(H * 0.45)}" fill="url(#${groundId})"/>`);

    const count = 3 + Math.floor(r() * 3);
    for (let i = 0; i < count; i++) body.push(shape(r, scheme.ink, defs, `${hash(slug) % 9999}-${i}`));

    /* a 1px inner rule, so every cover crops the same way */
    body.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="#000000" stroke-opacity=".5"/>`);

    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
      aria-label="Abstract cover for ${slug}" style="shape-rendering:crispEdges">
      <defs>${defs.join('')}</defs>${body.join('')}</svg>`;
  };
})();
