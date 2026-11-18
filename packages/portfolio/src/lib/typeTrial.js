/* Shared by the dev-only type trial (FontPicker, TextTuner) and the dev
   server's commit endpoint (vite-plugin-tweaks.js), so what is previewed in the
   browser and what gets written into the source are built by the same code.
   Plain JS, no JSX or DOM, so Node can import it too. */

import DEFAULTS from "../data/tweakDefaults.json" with { type: "json" };

/* What the stylesheet says today, per setting (and per font target). Written
   by the commit endpoint along with the stylesheet itself; an option equal to
   its default writes no override. */
export { DEFAULTS };

export const STORE_KEYS = {
  tweaks: "portfolio:text-trial",
  body: "portfolio:font-trial",
  heading: "portfolio:font-trial:heading",
};

export const SANS_FALLBACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const MONO_FALLBACK =
  'ui-monospace, SFMono-Regular, Menlo, "JetBrains Mono", monospace';

/* `axes` is the Google Fonts css2 axis spec. Families without an italic must not
   ask for one — the API rejects the whole request — so each is spelled out. */
// Variable families load as a weight range, so in-between weights (the Tweaks
// panel's 425/450/475) are real rather than snapped to the nearest cut. Every
// family below takes it except the four static monos, checked against the
// css2 API.
const VARIABLE = "ital,wght@0,400..700;1,400..700";
const WITH_ITALIC = "ital,wght@0,400;0,500;0,700;1,400";

// The odd ones out: DM Mono stops at 500, Space Mono and Ubuntu Mono have no
// 500, so asking for a missing cut would fail the request.
const NO_BOLD = "ital,wght@0,400;0,500;1,400";
const NO_MEDIUM = "ital,wght@0,400;0,700;1,400";

export const GROUPS = [
  {
    label: "Sans serif",
    fonts: [
      { name: "Geist", axes: VARIABLE },
      { name: "Figtree", axes: VARIABLE },
      { name: "IBM Plex Sans", axes: VARIABLE },
      { name: "Inter", axes: VARIABLE },
      { name: "Instrument Sans", axes: VARIABLE },
      { name: "DM Sans", axes: VARIABLE },
      { name: "Hanken Grotesk", axes: VARIABLE },
      { name: "Schibsted Grotesk", axes: VARIABLE },
      { name: "Work Sans", axes: VARIABLE },
      { name: "Public Sans", axes: VARIABLE },
      { name: "Source Sans 3", axes: VARIABLE },
      { name: "Albert Sans", axes: VARIABLE },
      { name: "Manrope", axes: VARIABLE },
      { name: "Onest", axes: VARIABLE },
      { name: "Space Grotesk", axes: VARIABLE },
      { name: "System UI", system: true },
    ],
  },
  {
    label: "Mono",
    fonts: [
      // The site's original face, from before the move to a proportional sans.
      { name: "Spline Sans Mono", axes: VARIABLE, mono: true, original: true },
      { name: "Geist Mono", axes: VARIABLE, mono: true },
      { name: "JetBrains Mono", axes: VARIABLE, mono: true },
      { name: "IBM Plex Mono", axes: WITH_ITALIC, mono: true },
      { name: "DM Mono", axes: NO_BOLD, mono: true },
      { name: "Space Mono", axes: NO_MEDIUM, mono: true },
      { name: "Fira Code", axes: VARIABLE, mono: true },
      { name: "Roboto Mono", axes: VARIABLE, mono: true },
      { name: "Source Code Pro", axes: VARIABLE, mono: true },
      { name: "Red Hat Mono", axes: VARIABLE, mono: true },
      { name: "Martian Mono", axes: VARIABLE, mono: true },
      { name: "Azeret Mono", axes: VARIABLE, mono: true },
      { name: "Sometype Mono", axes: VARIABLE, mono: true },
      { name: "Ubuntu Mono", axes: NO_MEDIUM, mono: true },
      { name: "System mono", system: true, mono: true },
    ],
  },
];
export const FONTS = GROUPS.flatMap((g) => g.fonts);

export const stackFor = (font) => {
  const fallback = font.mono ? MONO_FALLBACK : SANS_FALLBACK;
  return font.system ? fallback : `"${font.name}", ${fallback}`;
};

export const SETTINGS = [
  {
    key: "size",
    label: "Body size",
    note: "--text-4; line height and spacing follow it",
    options: [
      { label: "12", value: "0.75rem" },
      { label: "13", value: "0.8125rem" },
      { label: "14", value: "0.875rem" },
      { label: "15", value: "0.9375rem" },
      { label: "16", value: "1rem" },
    ],
    css: (v) => `:root:root { --text-4: ${v}; }`,
  },
  {
    key: "weight",
    label: "Weight",
    note: "body text; bold and medium are unchanged",
    options: [
      { label: "400", value: "400" },
      { label: "425", value: "425" },
      { label: "450", value: "450" },
      { label: "475", value: "475" },
      { label: "500", value: "500" },
    ],
    css: (v) => `body { font-weight: ${v}; }`,
  },
  {
    key: "grey",
    label: "Grey text",
    note: "--muted: − toward background, + toward ink",
    // Negative steps mix toward the page ground (lower contrast, in either
    // theme); positive ones toward ink.
    options: [
      { label: "−60", value: "-60%" },
      { label: "−40", value: "-40%" },
      { label: "−20", value: "-20%" },
      { label: "0", value: "0%" },
      { label: "25", value: "25%" },
      { label: "50", value: "50%" },
      { label: "75", value: "75%" },
      { label: "Ink", value: "100%" },
    ],
    // The theme's own primitives, not var(--muted) — a token can't be
    // defined in terms of itself. ThemeContext puts `.dark` on <body> as well
    // as <html>, and app.css's `.dark` re-declares --muted on each, so the
    // dark rule has to reach every `.dark` element (doubled to outrank it),
    // not just the root.
    css: (v) => {
      const faint = v.startsWith("-");
      const pct = faint ? v.slice(1) : v;
      const light = faint ? "var(--steel-200)" : "var(--steel-950)"; // --bg / --ink
      const dark = faint ? "var(--galley-ground)" : "var(--galley-ink)";
      return `:root:root { --muted: color-mix(in oklab, var(--steel-600), ${light} ${pct}); }
       .dark.dark { --muted: color-mix(in oklab, var(--galley-mid), ${dark} ${pct}); }`;
    },
  },
  {
    key: "smoothing",
    label: "Smoothing",
    note: "macOS only; off draws heavier",
    options: [
      { label: "Thin", value: "antialiased" },
      { label: "Off", value: "auto" },
    ],
    css: (v) =>
      `body { -webkit-font-smoothing: ${v}; -moz-osx-font-smoothing: ${
        v === "antialiased" ? "grayscale" : v
      }; }`,
  },
  {
    key: "buttonSize",
    label: "Button size",
    note: "outer height in px; icon buttons stay square",
    options: [
      { label: "38", value: "38px" },
      { label: "36", value: "36px" },
      { label: "34", value: "34px" },
      { label: "32", value: "32px" },
      { label: "30", value: "30px" },
    ],
    // Every control is one height, measured outside in like the corners: a
    // standalone button (the project prev/next links, the specimen samples)
    // is the height itself, and a frame round buttons — `.button-panel`, the
    // canvas zoom bar, top bar (page menu) and Edit frame, each 4px padding +
    // 1px border — is too, so the buttons inside it are the height less 10px. Icon buttons (an svg
    // alone, or the type-trial triggers) take that as their width as well, so
    // they stay square; buttons with a label keep their side padding.
    // `--btn-h` carries the height to app.css, which keeps the dev tool column
    // under the toggle and its popovers still.
    //
    // The popovers' own controls are left out, so hovering a size never
    // resizes the panel you are hovering in.
    css: (v) => `
      :root:root { --btn-h: ${v}; }
      body :is(.button-panel, .cv-edit-fab, [data-cv-part="zoom"], [data-cv-part="topbar"]) {
        box-sizing: border-box !important;
        height: ${v} !important;
      }
      body :is(.button-panel, .cv-edit-fab, [data-cv-part="zoom"], [data-cv-part="topbar"]) button:not(.text-tuner *, .font-picker-pop *) {
        box-sizing: border-box !important;
        height: calc(${v} - 10px) !important;
      }
      body :is(.button-panel, .cv-edit-fab, [data-cv-part="zoom"], [data-cv-part="topbar"]) button:is(.type-trial-trigger, :has(> svg:only-child)):not(.text-tuner *, .font-picker-pop *) {
        width: calc(${v} - 10px) !important;
        min-width: 0 !important;
        padding: 0 !important;
      }
      body :is(a, button).border:not(:is(.button-panel, .cv-edit-fab, [data-cv-part="zoom"], [data-cv-part="topbar"], [data-cv-part="node"], .text-tuner, .font-picker-pop) *) {
        box-sizing: border-box !important;
        height: ${v} !important;
      }`,
  },
  {
    key: "corners",
    label: "Button corners",
    note: "buttons, canvas controls and row hovers; off is square",
    options: [
      { label: "Off", value: "0" },
      { label: "2", value: "2px" },
      { label: "4", value: "4px" },
      { label: "6", value: "6px" },
      { label: "8", value: "8px" },
      { label: "12", value: "12px" },
      { label: "Pill", value: "999px" },
    ],
    // app.css squares everything with `body :not(.canvas-root …) { border-radius:
    // 0 !important }` (the enamel doctrine), so this has to be !important too and
    // out-specify it. Buttons, plus the one link drawn as a bordered button (the
    // project page's prev/next); the tweak panels' own controls stay square.
    //
    // The canvas's enamel skin squares its chrome the same way
    // (`.enamel * { border-radius: 0 !important }`), so its controls are
    // reached explicitly: buttons and chips inside the canvas, and its chrome
    // panels — zoom bar, minimap, page menu, context menus, the Edit frame.
    // What the canvas *draws* (nodes: cards, stickies, screenshots, and any
    // buttons inside them) is content, not UI, and is left alone.
    //
    // Worked outside in: the chosen radius is the *outer* curve. A frame
    // round buttons — `.button-panel` (the enamel frame round the corner icon
    // buttons) and the canvas panels, all 4px-padded — takes it as given, and
    // a button inside one takes it less that 4px (never below 0), so the two
    // curves run parallel and every control's outside edge matches a
    // standalone button's. The nested rule out-specifies the general one.
    // `.hover-row` — the list rows that fill on hover (projects, writing,
    // ListRow links) — takes the radius too, so the wash matches the buttons.
    css: (v) => `
      body :is(button, [role="button"], a.border, .cv-chip):not([data-cv-part="node"] *, .text-tuner *, .font-picker-pop *) {
        border-radius: ${v} !important;
      }
      body :is(.button-panel, .cv-panel, .cv-ui, .cv-edit-fab, .hover-row):not([data-cv-part="node"], [data-cv-part="node"] *) {
        border-radius: ${v} !important;
      }
      body :is(.button-panel, .cv-panel, .cv-ui, .cv-edit-fab):not([data-cv-part="node"] *) :is(button, [role="button"], .cv-chip):not([data-cv-part="node"] *, .text-tuner *, .font-picker-pop *) {
        border-radius: max(0px, ${v} - 4px) !important;
      }`,
  },
];
