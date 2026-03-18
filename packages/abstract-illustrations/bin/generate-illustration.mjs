#!/usr/bin/env node

/**
 * Abstract illustration generator.
 *
 * Produces a self-contained JSX component that renders a monochrome,
 * sharp-cornered abstract composition — the same aesthetic used in
 * the portfolio hero section.
 *
 * Usage:
 *   node bin/generate-illustration.mjs [keywords...] [--seed N] [--name ComponentName] [--dark] [--colors "#hex1,#hex2,#hex3"]
 *
 * Keywords influence the composition:
 *   code       — editor window with code-like lines
 *   terminal   — command prompt with output lines
 *   data       — table / spreadsheet grid
 *   chart      — abstract bar chart
 *   layers     — stacked offset rectangles
 *   network    — connected node diagram
 *   grid       — dot or square grid pattern
 *   text       — paragraph-like block lines
 *   kanban     — board with columns and cards
 *   timeline   — vertical timeline with events
 *   form       — input fields and controls
 *   music      — player with track list
 *   calendar   — month grid with highlighted days
 *   mail       — inbox message list
 *   files      — file tree with folders
 *   dashboard  — widget grid with mini charts
 *   wave       — sine wave curves made of dots
 *   orbit      — concentric arc paths of dots
 *   spiral     — spiral pattern of dots
 *   scatter    — clustered dots along a curved path
 *
 * If no keywords are given a random mix is chosen.
 *
 * Output is printed to stdout — pipe it to a file or paste it where needed.
 */

// ─── helpers ──────────────────────────────────────────────────────────────────

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ─── parse args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let seed = null;
let componentName = 'Illustration';
let dark = false;
let customColors = null;     // [c1, c2, c3] — light mode: strongest, medium, lightest
let customColorsDark = null;  // [c1, c2, c3] — dark mode: strongest, medium, lightest
const keywords = [];

function parseColorArg(value) {
  const parts = value.split(',').map((c) => c.trim());
  if (parts.length === 3 && parts.every((c) => /^#[0-9a-fA-F]{3,8}$/.test(c))) {
    return parts;
  }
  return null;
}

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--seed' && args[i + 1]) {
    seed = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--name' && args[i + 1]) {
    componentName = args[i + 1];
    i++;
  } else if (args[i] === '--colors' && args[i + 1]) {
    customColors = parseColorArg(args[i + 1]);
    i++;
  } else if (args[i] === '--colors-dark' && args[i + 1]) {
    customColorsDark = parseColorArg(args[i + 1]);
    i++;
  } else if (args[i] === '--dark') {
    dark = true;
  } else if (!args[i].startsWith('--')) {
    keywords.push(args[i].toLowerCase());
  }
}

if (seed === null) {
  seed = Date.now() % 2147483647;
}

const rand = seededRandom(seed);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const randBool = (p = 0.5) => rand() < p;

// ─── palette ─────────────────────────────────────────────────────────────────
// Always outputs dual light/dark classes so components work in both modes.
// Three roles: c1 (strongest), c2 (medium), c3 (lightest/background)

// Light defaults
const lightC1 = customColors ? customColors[0] : null;
const lightC2 = customColors ? customColors[1] : null;
const lightC3 = customColors ? customColors[2] : null;

// Dark defaults
const darkC1 = customColorsDark ? customColorsDark[0] : null;
const darkC2 = customColorsDark ? customColorsDark[1] : null;
const darkC3 = customColorsDark ? customColorsDark[2] : null;

const hasCustomLight = !!customColors;
const hasCustomDark = !!customColorsDark;

function dual(lightClass, darkClass) {
  return `${lightClass} dark:${darkClass}`;
}

const fg = dual(
  hasCustomLight ? `bg-[${lightC1}]` : 'bg-gray-200',
  hasCustomDark ? `bg-[${darkC1}]` : 'bg-gray-700'
);
const fgSoft = dual(
  hasCustomLight ? `bg-[${lightC2}]` : 'bg-gray-200/60',
  hasCustomDark ? `bg-[${darkC2}]` : 'bg-gray-700/60'
);
const fgSubtle = dual(
  hasCustomLight ? `bg-[${lightC3}]` : 'bg-gray-100',
  hasCustomDark ? `bg-[${darkC3}]` : 'bg-gray-800'
);
const border = dual(
  hasCustomLight ? `border-[${lightC3}]` : 'border-gray-100',
  hasCustomDark ? `border-[${darkC3}]` : 'border-gray-800'
);
const borderStrong = dual(
  hasCustomLight ? `border-[${lightC2}]` : 'border-gray-200',
  hasCustomDark ? `border-[${darkC2}]` : 'border-gray-700'
);
const bg = 'bg-white dark:bg-gray-900';
const dotBg = dual(
  hasCustomLight ? `bg-[${lightC2}]` : 'bg-gray-300',
  hasCustomDark ? `bg-[${darkC2}]` : 'bg-gray-700'
);

// SVG fills — dual-mode via Tailwind fill-/stroke- classes
const svgFillClass = dual(
  hasCustomLight ? `fill-[${lightC2}]` : 'fill-gray-300',
  hasCustomDark ? `fill-[${darkC2}]` : 'fill-gray-700'
);
const svgFillStrongClass = dual(
  hasCustomLight ? `fill-[${lightC1}]` : 'fill-gray-400',
  hasCustomDark ? `fill-[${darkC1}]` : 'fill-gray-600'
);
const svgStrokeClass = dual(
  hasCustomLight ? `stroke-[${lightC3}]` : 'stroke-gray-200',
  hasCustomDark ? `stroke-[${darkC3}]` : 'stroke-gray-800'
);

// ─── element generators ───────────────────────────────────────────────────────

const widthClasses = ['w-8', 'w-10', 'w-12', 'w-14', 'w-16', 'w-20', 'w-24', 'w-28', 'w-32'];

function genCodeLines() {
  const lineCount = randInt(8, 12);
  const lines = [];
  let indent = 0;

  for (let i = 0; i < lineCount; i++) {
    // occasionally change indent
    if (randBool(0.25) && indent < 3) indent++;
    if (randBool(0.15) && indent > 0) indent--;

    // blank line
    if (randBool(0.15)) {
      lines.push({ type: 'blank' });
      continue;
    }

    const segCount = randInt(1, 3);
    const segs = [];
    for (let j = 0; j < segCount; j++) {
      segs.push({
        width: pick(widthClasses),
        color: j === 0 ? (randBool(0.3) ? fgSoft : fg) : fgSubtle,
      });
    }
    lines.push({ type: 'code', indent: indent * 4, segs });
  }
  return lines;
}

function genTerminalLines() {
  const lineCount = randInt(7, 10);
  const lines = [];

  for (let i = 0; i < lineCount; i++) {
    if (i === 0 || randBool(0.3)) {
      // prompt line
      lines.push({
        type: 'prompt',
        segs: [
          { width: 'w-3', color: fg },
          { width: pick(widthClasses), color: fgSubtle },
        ],
      });
    } else if (randBool(0.1)) {
      lines.push({ type: 'blank' });
    } else {
      // output line
      const segCount = randInt(1, 4);
      const segs = [];
      for (let j = 0; j < segCount; j++) {
        segs.push({ width: pick(widthClasses.slice(0, 5)), color: fgSubtle });
      }
      lines.push({ type: 'output', segs });
    }
  }
  return lines;
}

function genDataRows() {
  const cols = randInt(3, 5);
  const rows = randInt(5, 7);
  return { cols, rows };
}

function genChartBars() {
  const count = randInt(6, 10);
  const bars = [];
  for (let i = 0; i < count; i++) {
    bars.push({ height: randInt(20, 100) });
  }
  return bars;
}

function genLayerStack() {
  const count = randInt(3, 5);
  const layers = [];
  for (let i = 0; i < count; i++) {
    layers.push({
      offsetX: i * randInt(6, 12),
      offsetY: i * randInt(6, 12),
      width: randInt(140, 200),
      height: randInt(80, 120),
    });
  }
  return layers;
}

function genNetworkNodes() {
  const count = randInt(4, 7);
  const nodes = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      x: randInt(10, 90),
      y: randInt(10, 90),
      size: randInt(6, 14),
    });
  }
  return nodes;
}

function genDotGrid() {
  const cols = randInt(4, 8);
  const rows = randInt(3, 6);
  return { cols, rows };
}

function genTextBlock() {
  const lineCount = randInt(4, 8);
  const lines = [];
  for (let i = 0; i < lineCount; i++) {
    if (randBool(0.2) && i > 0) {
      lines.push({ type: 'blank' });
    } else {
      const fullWidth = randBool(0.6);
      lines.push({ type: 'text', full: fullWidth, width: pick(widthClasses.slice(3)) });
    }
  }
  return lines;
}

function genKanbanBoard() {
  const colCount = randInt(3, 4);
  const cols = [];
  for (let i = 0; i < colCount; i++) {
    const cardCount = randInt(1, 4);
    const cards = [];
    for (let j = 0; j < cardCount; j++) {
      cards.push({ lines: randInt(1, 3) });
    }
    cols.push({ cards });
  }
  return cols;
}

function genTimeline() {
  const count = randInt(4, 7);
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      labelWidth: pick(widthClasses.slice(1, 5)),
      contentWidth: pick(widthClasses.slice(3)),
      hasSecondLine: randBool(0.4),
    });
  }
  return items;
}

function genFormFields() {
  const count = randInt(4, 7);
  const fields = [];
  for (let i = 0; i < count; i++) {
    const type = pick(['input', 'input', 'input', 'textarea', 'toggle', 'select']);
    fields.push({ type, labelWidth: pick(widthClasses.slice(1, 4)) });
  }
  return fields;
}

function genMusicPlayer() {
  const trackCount = randInt(3, 6);
  const tracks = [];
  for (let i = 0; i < trackCount; i++) {
    tracks.push({
      titleWidth: pick(widthClasses.slice(2, 6)),
      artistWidth: pick(widthClasses.slice(1, 4)),
      duration: pick(widthClasses.slice(0, 3)),
    });
  }
  return tracks;
}

function genCalendar() {
  const filledDays = new Set();
  const total = randInt(4, 10);
  while (filledDays.size < total) {
    filledDays.add(randInt(0, 34));
  }
  return { filledDays };
}

function genMail() {
  const count = randInt(5, 7);
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      fromWidth: pick(widthClasses.slice(1, 4)),
      subjectWidth: pick(widthClasses.slice(3, 7)),
      previewWidth: pick(widthClasses.slice(2, 5)),
      unread: randBool(0.3),
    });
  }
  return items;
}

function genFileTree() {
  const items = [];
  const depths = [0];
  const count = randInt(8, 12);
  for (let i = 0; i < count; i++) {
    const depth = pick(depths);
    const isFolder = randBool(0.35);
    items.push({
      depth,
      isFolder,
      nameWidth: pick(widthClasses.slice(1, 5)),
    });
    if (isFolder && depth < 3 && !depths.includes(depth + 1)) {
      depths.push(depth + 1);
    }
  }
  return items;
}

function genDashboard() {
  // A grid of small widget panels
  const widgets = [];
  const count = randInt(4, 6);
  for (let i = 0; i < count; i++) {
    widgets.push({
      type: pick(['number', 'minibar', 'line', 'list']),
    });
  }
  return widgets;
}

// ─── curve dot generators ────────────────────────────────────────────────────

function genWaveDots() {
  const waves = randInt(1, 3);
  const result = [];
  for (let w = 0; w < waves; w++) {
    const amplitude = randInt(10, 25);
    const frequency = 0.5 + rand() * 1.5;
    const phase = rand() * Math.PI * 2;
    const yOffset = 20 + w * (60 / waves);
    const dotCount = randInt(20, 35);
    const dots = [];
    for (let i = 0; i < dotCount; i++) {
      const t = i / (dotCount - 1);
      const x = 5 + t * 90;
      const y = yOffset + Math.sin(t * Math.PI * 2 * frequency + phase) * amplitude;
      const size = 1.5 + rand() * 1.5;
      dots.push({ x, y: Math.max(2, Math.min(98, y)), size });
    }
    result.push(dots);
  }
  return result;
}

function genOrbitDots() {
  const rings = randInt(2, 4);
  const result = [];
  const cx = 50, cy = 50;
  for (let r = 0; r < rings; r++) {
    const rx = 12 + r * (35 / rings);
    const ry = rx * (0.6 + rand() * 0.4);
    const dotCount = randInt(12, 24);
    const startAngle = rand() * Math.PI * 2;
    const arcSpan = Math.PI * (1.2 + rand() * 0.8); // partial or full arc
    const dots = [];
    for (let i = 0; i < dotCount; i++) {
      const t = i / (dotCount - 1);
      const angle = startAngle + t * arcSpan;
      const x = cx + Math.cos(angle) * rx;
      const y = cy + Math.sin(angle) * ry;
      if (x >= 1 && x <= 99 && y >= 1 && y <= 99) {
        const size = 1 + rand() * 2;
        dots.push({ x, y, size });
      }
    }
    result.push(dots);
  }
  return result;
}

function genSpiralDots() {
  const dotCount = randInt(30, 60);
  const cx = 50, cy = 50;
  const maxRadius = randInt(30, 42);
  const turns = 1.5 + rand() * 2;
  const direction = randBool(0.5) ? 1 : -1;
  const dots = [];
  for (let i = 0; i < dotCount; i++) {
    const t = i / (dotCount - 1);
    const angle = t * Math.PI * 2 * turns * direction;
    const radius = t * maxRadius;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (x >= 1 && x <= 99 && y >= 1 && y <= 99) {
      const size = 1 + t * 2;
      dots.push({ x, y, size });
    }
  }
  return dots;
}

function genScatterDots() {
  // clustered scatter — dots grouped along a curved path with jitter
  const dotCount = randInt(40, 70);
  const cx = 50, cy = 50;
  const dots = [];
  // base curve: a gentle arc
  const curveType = pick(['arc', 'diagonal', 'bloom']);
  for (let i = 0; i < dotCount; i++) {
    let x, y;
    const t = i / (dotCount - 1);
    const jitterX = (rand() - 0.5) * 16;
    const jitterY = (rand() - 0.5) * 16;
    if (curveType === 'arc') {
      const angle = -0.8 + t * (Math.PI + 0.6);
      x = cx + Math.cos(angle) * 35 + jitterX;
      y = cy + Math.sin(angle) * 25 + jitterY;
    } else if (curveType === 'diagonal') {
      x = 10 + t * 80 + jitterX;
      y = 15 + t * 70 + jitterY;
    } else {
      // bloom — dots radiating from center with varying angle
      const angle = rand() * Math.PI * 2;
      const r = 5 + rand() * 38;
      x = cx + Math.cos(angle) * r;
      y = cy + Math.sin(angle) * r;
    }
    x = Math.max(2, Math.min(98, x));
    y = Math.max(2, Math.min(98, y));
    const size = 1 + rand() * 2;
    dots.push({ x, y, size });
  }
  return dots;
}

// ─── choose composition ───────────────────────────────────────────────────────

const ALL_TYPES = [
  'code', 'terminal', 'data', 'chart', 'layers', 'network', 'grid', 'text',
  'kanban', 'timeline', 'form', 'music', 'calendar', 'mail', 'files', 'dashboard',
  'wave', 'orbit', 'spiral', 'scatter',
];

let mainType;
let secondaryElements = [];

if (keywords.length > 0) {
  const validKeywords = keywords.filter((k) => ALL_TYPES.includes(k));
  mainType = validKeywords.length > 0 ? validKeywords[0] : pick(ALL_TYPES);
  // add remaining keywords as secondary
  secondaryElements = validKeywords.slice(1);
} else {
  mainType = pick(ALL_TYPES);
}

// always add a secondary decoration if we don't have one
if (secondaryElements.length === 0) {
  const decorations = ['grid', 'layers', 'lines', 'grid'];
  secondaryElements.push(pick(decorations.filter((d) => d !== mainType)));
}

// add a second secondary for better balance (50% chance)
if (secondaryElements.length === 1 && randBool(0.5)) {
  const extras = ['grid', 'layers', 'lines'].filter((d) => !secondaryElements.includes(d) && d !== mainType);
  if (extras.length > 0) secondaryElements.push(pick(extras));
}

// floating accent rectangles (1–3, always at least one for balance)
const floatingRects = [];
const floatCount = randInt(1, 3);
// use opposing corner pairs so the composition feels balanced
const cornerPairs = [
  [{ top: randInt(4, 12), right: randInt(4, 16) }, { bottom: randInt(8, 16), left: randInt(4, 12) }],
  [{ top: randInt(8, 20), left: randInt(2, 10) }, { bottom: randInt(4, 12), right: randInt(4, 12) }],
];
const chosenPair = pick(cornerPairs);
for (let i = 0; i < floatCount; i++) {
  const pos = i < chosenPair.length ? chosenPair[i] : pick(chosenPair);
  floatingRects.push({
    ...pos,
    w: randInt(24, 48),
    h: randInt(24, 48),
    animate: randBool(0.6),
  });
}

// ─── render JSX ───────────────────────────────────────────────────────────────

const I = '  '; // indent unit

function indent(level) {
  return I.repeat(level);
}

function renderLine(seg, level) {
  if (seg.type === 'blank') {
    return `${indent(level)}<div className="h-2.5" />`;
  }
  const ml = seg.indent ? ` ml-${seg.indent}` : '';
  const segsJsx = seg.segs
    .map((s) => `<div className="${s.width} h-2.5 ${s.color}" />`)
    .join('\n' + indent(level + 1));
  return `${indent(level)}<div className="flex gap-2${ml}">\n${indent(level + 1)}${segsJsx}\n${indent(level)}</div>`;
}

function renderMainElement(type, level) {
  const lines = [];
  const l = level;

  switch (type) {
    case 'code': {
      const codeLines = genCodeLines();
      // window chrome + code
      lines.push(`${indent(l)}<div className="${bg} border ${border} shadow-2xl shadow-black/[0.04] overflow-hidden">`);
      lines.push(`${indent(l + 1)}<div className="p-6 flex flex-col">`);
      // chrome
      lines.push(`${indent(l + 2)}<div className="flex gap-2 mb-6">`);
      lines.push(`${indent(l + 3)}<div className="w-2.5 h-2.5 ${fg}" />`);
      lines.push(`${indent(l + 3)}<div className="w-2.5 h-2.5 ${fg}" />`);
      lines.push(`${indent(l + 3)}<div className="w-2.5 h-2.5 ${fg}" />`);
      lines.push(`${indent(l + 2)}</div>`);
      // lines
      lines.push(`${indent(l + 2)}<div className="space-y-3">`);
      for (const cl of codeLines) {
        lines.push(renderLine(cl, l + 3));
      }
      lines.push(`${indent(l + 2)}</div>`);
      // bottom rule
      lines.push(`${indent(l + 2)}<div className="h-px w-full ${fg} mt-6" />`);
      lines.push(`${indent(l + 1)}</div>`);
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'terminal': {
      const termLines = genTerminalLines();
      lines.push(`${indent(l)}<div className="${bg} border ${border} shadow-2xl shadow-black/[0.04] overflow-hidden">`);
      lines.push(`${indent(l + 1)}<div className="p-6 flex flex-col">`);
      // title bar
      lines.push(`${indent(l + 2)}<div className="flex items-center gap-2 mb-6">`);
      lines.push(`${indent(l + 3)}<div className="w-2.5 h-2.5 ${fg}" />`);
      lines.push(`${indent(l + 3)}<div className="w-2.5 h-2.5 ${fg}" />`);
      lines.push(`${indent(l + 3)}<div className="w-2.5 h-2.5 ${fg}" />`);
      lines.push(`${indent(l + 3)}<div className="flex-1" />`);
      lines.push(`${indent(l + 3)}<div className="w-16 h-2.5 ${fgSubtle}" />`);
      lines.push(`${indent(l + 2)}</div>`);
      // lines
      lines.push(`${indent(l + 2)}<div className="space-y-3">`);
      for (const tl of termLines) {
        if (tl.type === 'blank') {
          lines.push(`${indent(l + 3)}<div className="h-2.5" />`);
        } else if (tl.type === 'prompt') {
          const segsJsx = tl.segs.map((s) => `<div className="${s.width} h-2.5 ${s.color}" />`).join(`\n${indent(l + 4)}`);
          lines.push(`${indent(l + 3)}<div className="flex gap-2">`);
          lines.push(`${indent(l + 4)}${segsJsx}`);
          lines.push(`${indent(l + 3)}</div>`);
        } else {
          const segsJsx = tl.segs.map((s) => `<div className="${s.width} h-2.5 ${s.color}" />`).join(`\n${indent(l + 4)}`);
          lines.push(`${indent(l + 3)}<div className="flex gap-2 ml-5">`);
          lines.push(`${indent(l + 4)}${segsJsx}`);
          lines.push(`${indent(l + 3)}</div>`);
        }
      }
      lines.push(`${indent(l + 2)}</div>`);
      lines.push(`${indent(l + 1)}</div>`);
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'data': {
      const { cols, rows } = genDataRows();
      lines.push(`${indent(l)}<div className="${bg} border ${border} shadow-2xl shadow-black/[0.04] overflow-hidden">`);
      lines.push(`${indent(l + 1)}<div className="p-6">`);
      // header row
      lines.push(`${indent(l + 2)}<div className="grid grid-cols-${cols} gap-3 mb-4 pb-4 border-b ${border}">`);
      for (let c = 0; c < cols; c++) {
        lines.push(`${indent(l + 3)}<div className="${pick(widthClasses.slice(1, 4))} h-2.5 ${fg}" />`);
      }
      lines.push(`${indent(l + 2)}</div>`);
      // data rows
      lines.push(`${indent(l + 2)}<div className="space-y-3">`);
      for (let r = 0; r < rows; r++) {
        lines.push(`${indent(l + 3)}<div className="grid grid-cols-${cols} gap-3">`);
        for (let c = 0; c < cols; c++) {
          lines.push(`${indent(l + 4)}<div className="${pick(widthClasses.slice(0, 5))} h-2.5 ${fgSubtle}" />`);
        }
        lines.push(`${indent(l + 3)}</div>`);
      }
      lines.push(`${indent(l + 2)}</div>`);
      lines.push(`${indent(l + 1)}</div>`);
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'chart': {
      const bars = genChartBars();
      lines.push(`${indent(l)}<div className="${bg} border ${border} shadow-2xl shadow-black/[0.04] overflow-hidden">`);
      lines.push(`${indent(l + 1)}<div className="p-6">`);
      // label
      lines.push(`${indent(l + 2)}<div className="flex gap-2 mb-6">`);
      lines.push(`${indent(l + 3)}<div className="w-20 h-2.5 ${fg}" />`);
      lines.push(`${indent(l + 3)}<div className="flex-1" />`);
      lines.push(`${indent(l + 3)}<div className="w-10 h-2.5 ${fgSubtle}" />`);
      lines.push(`${indent(l + 2)}</div>`);
      // bars
      lines.push(`${indent(l + 2)}<div className="flex items-end gap-3 h-32">`);
      for (const bar of bars) {
        const color = bar.height > 70 ? fg : fgSubtle;
        lines.push(`${indent(l + 3)}<div className="flex-1 ${color}" style={{ height: '${bar.height}%' }} />`);
      }
      lines.push(`${indent(l + 2)}</div>`);
      // axis
      lines.push(`${indent(l + 2)}<div className="h-px w-full ${fg} mt-4" />`);
      lines.push(`${indent(l + 1)}</div>`);
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'layers': {
      const stack = genLayerStack();
      lines.push(`${indent(l)}<div className="relative" style={{ width: '${stack[stack.length - 1].width + stack[stack.length - 1].offsetX}px', height: '${stack[stack.length - 1].height + stack[stack.length - 1].offsetY}px' }}>`);
      for (const layer of stack) {
        lines.push(`${indent(l + 1)}<div className="absolute border ${border} ${bg}" style={{ top: '${layer.offsetY}px', left: '${layer.offsetX}px', width: '${layer.width}px', height: '${layer.height}px' }} />`);
      }
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'network': {
      const nodes = genNetworkNodes();
      lines.push(`${indent(l)}<svg viewBox="0 0 100 100" className="w-full h-full" fill="none">`);
      // edges between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 45) {
            lines.push(`${indent(l + 1)}<line x1="${nodes[i].x}" y1="${nodes[i].y}" x2="${nodes[j].x}" y2="${nodes[j].y}" className="${svgStrokeClass}" strokeWidth="0.5" />`);
          }
        }
      }
      // nodes
      for (const node of nodes) {
        lines.push(`${indent(l + 1)}<rect x="${node.x - node.size / 2}" y="${node.y - node.size / 2}" width="${node.size}" height="${node.size}" className="${svgFillClass}" />`);
      }
      lines.push(`${indent(l)}</svg>`);
      break;
    }
    case 'grid': {
      const { cols, rows } = genDotGrid();
      lines.push(`${indent(l)}<div className="grid grid-cols-${cols} gap-3">`);
      for (let i = 0; i < cols * rows; i++) {
        lines.push(`${indent(l + 1)}<div className="w-1.5 h-1.5 ${dotBg}" />`);
      }
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'text': {
      const textLines = genTextBlock();
      lines.push(`${indent(l)}<div className="space-y-3">`);
      for (const tl of textLines) {
        if (tl.type === 'blank') {
          lines.push(`${indent(l + 1)}<div className="h-2.5" />`);
        } else if (tl.full) {
          lines.push(`${indent(l + 1)}<div className="w-full h-2.5 ${fgSubtle}" />`);
        } else {
          lines.push(`${indent(l + 1)}<div className="${tl.width} h-2.5 ${fgSubtle}" />`);
        }
      }
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'kanban': {
      const cols = genKanbanBoard();
      lines.push(`${indent(l)}<div className="${bg} border ${border} shadow-2xl shadow-black/[0.04] overflow-hidden">`);
      lines.push(`${indent(l + 1)}<div className="p-6">`);
      lines.push(`${indent(l + 2)}<div className="flex gap-4">`);
      for (const col of cols) {
        lines.push(`${indent(l + 3)}<div className="flex-1">`);
        // column header
        lines.push(`${indent(l + 4)}<div className="${pick(widthClasses.slice(1, 4))} h-2.5 ${fg} mb-4" />`);
        // cards
        lines.push(`${indent(l + 4)}<div className="space-y-3">`);
        for (const card of col.cards) {
          lines.push(`${indent(l + 5)}<div className="border ${border} p-3 space-y-2">`);
          for (let li = 0; li < card.lines; li++) {
            const w = li === 0 ? pick(widthClasses.slice(2, 6)) : pick(widthClasses.slice(0, 4));
            const c = li === 0 ? fg : fgSubtle;
            lines.push(`${indent(l + 6)}<div className="${w} h-2 ${c}" />`);
          }
          lines.push(`${indent(l + 5)}</div>`);
        }
        lines.push(`${indent(l + 4)}</div>`);
        lines.push(`${indent(l + 3)}</div>`);
      }
      lines.push(`${indent(l + 2)}</div>`);
      lines.push(`${indent(l + 1)}</div>`);
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'timeline': {
      const items = genTimeline();
      lines.push(`${indent(l)}<div className="${bg} border ${border} shadow-2xl shadow-black/[0.04] overflow-hidden">`);
      lines.push(`${indent(l + 1)}<div className="p-6">`);
      lines.push(`${indent(l + 2)}<div className="space-y-0">`);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isLast = i === items.length - 1;
        lines.push(`${indent(l + 3)}<div className="flex gap-4">`);
        // timeline track
        lines.push(`${indent(l + 4)}<div className="flex flex-col items-center">`);
        lines.push(`${indent(l + 5)}<div className="w-2 h-2 ${fg}" />`);
        if (!isLast) {
          lines.push(`${indent(l + 5)}<div className="w-px flex-1 ${fgSubtle}" />`);
        }
        lines.push(`${indent(l + 4)}</div>`);
        // content
        lines.push(`${indent(l + 4)}<div className="pb-6 flex-1">`);
        lines.push(`${indent(l + 5)}<div className="${item.labelWidth} h-2.5 ${fg} mb-2" />`);
        lines.push(`${indent(l + 5)}<div className="${item.contentWidth} h-2.5 ${fgSubtle}" />`);
        if (item.hasSecondLine) {
          lines.push(`${indent(l + 5)}<div className="${pick(widthClasses.slice(2, 5))} h-2.5 ${fgSubtle} mt-2" />`);
        }
        lines.push(`${indent(l + 4)}</div>`);
        lines.push(`${indent(l + 3)}</div>`);
      }
      lines.push(`${indent(l + 2)}</div>`);
      lines.push(`${indent(l + 1)}</div>`);
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'form': {
      const fields = genFormFields();
      lines.push(`${indent(l)}<div className="${bg} border ${border} shadow-2xl shadow-black/[0.04] overflow-hidden">`);
      lines.push(`${indent(l + 1)}<div className="p-6 space-y-5">`);
      // form title
      lines.push(`${indent(l + 2)}<div className="${pick(widthClasses.slice(3, 6))} h-3 ${fg} mb-2" />`);
      for (const field of fields) {
        lines.push(`${indent(l + 2)}<div>`);
        lines.push(`${indent(l + 3)}<div className="${field.labelWidth} h-2 ${fg} mb-2" />`);
        if (field.type === 'textarea') {
          lines.push(`${indent(l + 3)}<div className="w-full h-16 border ${border}" />`);
        } else if (field.type === 'toggle') {
          lines.push(`${indent(l + 3)}<div className="flex items-center gap-2">`);
          lines.push(`${indent(l + 4)}<div className="w-8 h-4 ${fgSubtle}" />`);
          lines.push(`${indent(l + 4)}<div className="${pick(widthClasses.slice(1, 4))} h-2.5 ${fgSubtle}" />`);
          lines.push(`${indent(l + 3)}</div>`);
        } else if (field.type === 'select') {
          lines.push(`${indent(l + 3)}<div className="w-full h-8 border ${border} flex items-center px-2">`);
          lines.push(`${indent(l + 4)}<div className="${pick(widthClasses.slice(1, 4))} h-2.5 ${fgSubtle}" />`);
          lines.push(`${indent(l + 3)}</div>`);
        } else {
          lines.push(`${indent(l + 3)}<div className="w-full h-8 border ${border}" />`);
        }
        lines.push(`${indent(l + 2)}</div>`);
      }
      // submit button
      lines.push(`${indent(l + 2)}<div className="w-20 h-8 ${fg}" />`);
      lines.push(`${indent(l + 1)}</div>`);
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'music': {
      const tracks = genMusicPlayer();
      lines.push(`${indent(l)}<div className="${bg} border ${border} shadow-2xl shadow-black/[0.04] overflow-hidden">`);
      lines.push(`${indent(l + 1)}<div className="p-6">`);
      // now playing
      lines.push(`${indent(l + 2)}<div className="mb-6">`);
      lines.push(`${indent(l + 3)}<div className="w-full aspect-square ${fgSubtle} mb-4" />`);
      lines.push(`${indent(l + 3)}<div className="${pick(widthClasses.slice(3, 6))} h-3 ${fg} mb-1" />`);
      lines.push(`${indent(l + 3)}<div className="${pick(widthClasses.slice(1, 4))} h-2.5 ${fgSubtle} mb-3" />`);
      // progress bar
      lines.push(`${indent(l + 3)}<div className="w-full h-1 ${fgSubtle}">`);
      lines.push(`${indent(l + 4)}<div className="h-full ${fg}" style={{ width: '${randInt(20, 80)}%' }} />`);
      lines.push(`${indent(l + 3)}</div>`);
      // controls
      lines.push(`${indent(l + 3)}<div className="flex justify-center gap-4 mt-4">`);
      lines.push(`${indent(l + 4)}<div className="w-4 h-4 ${fgSubtle}" />`);
      lines.push(`${indent(l + 4)}<div className="w-5 h-5 ${fg}" />`);
      lines.push(`${indent(l + 4)}<div className="w-4 h-4 ${fgSubtle}" />`);
      lines.push(`${indent(l + 3)}</div>`);
      lines.push(`${indent(l + 2)}</div>`);
      // track list
      lines.push(`${indent(l + 2)}<div className="space-y-0">`);
      for (const track of tracks) {
        lines.push(`${indent(l + 3)}<div className="flex items-center gap-3 py-2 border-b ${border}">`);
        lines.push(`${indent(l + 4)}<div className="w-3 h-3 ${fgSubtle}" />`);
        lines.push(`${indent(l + 4)}<div className="flex-1 flex flex-col gap-1">`);
        lines.push(`${indent(l + 5)}<div className="${track.titleWidth} h-2.5 ${fg}" />`);
        lines.push(`${indent(l + 5)}<div className="${track.artistWidth} h-2 ${fgSubtle}" />`);
        lines.push(`${indent(l + 4)}</div>`);
        lines.push(`${indent(l + 4)}<div className="${track.duration} h-2 ${fgSubtle}" />`);
        lines.push(`${indent(l + 3)}</div>`);
      }
      lines.push(`${indent(l + 2)}</div>`);
      lines.push(`${indent(l + 1)}</div>`);
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'calendar': {
      const { filledDays } = genCalendar();
      lines.push(`${indent(l)}<div className="${bg} border ${border} shadow-2xl shadow-black/[0.04] overflow-hidden">`);
      lines.push(`${indent(l + 1)}<div className="p-6">`);
      // month header
      lines.push(`${indent(l + 2)}<div className="flex items-center justify-between mb-4">`);
      lines.push(`${indent(l + 3)}<div className="w-4 h-4 ${fgSubtle}" />`);
      lines.push(`${indent(l + 3)}<div className="w-20 h-3 ${fg}" />`);
      lines.push(`${indent(l + 3)}<div className="w-4 h-4 ${fgSubtle}" />`);
      lines.push(`${indent(l + 2)}</div>`);
      // day headers
      lines.push(`${indent(l + 2)}<div className="grid grid-cols-7 gap-2 mb-2">`);
      for (let d = 0; d < 7; d++) {
        lines.push(`${indent(l + 3)}<div className="h-2 ${fgSubtle} mx-auto w-4" />`);
      }
      lines.push(`${indent(l + 2)}</div>`);
      // day grid
      lines.push(`${indent(l + 2)}<div className="grid grid-cols-7 gap-2">`);
      for (let d = 0; d < 35; d++) {
        const filled = filledDays.has(d);
        const color = filled ? fg : fgSubtle;
        lines.push(`${indent(l + 3)}<div className="aspect-square ${color} flex items-center justify-center">`);
        lines.push(`${indent(l + 4)}<div className="w-1.5 h-1.5 ${filled ? bg : ''}" />`);
        lines.push(`${indent(l + 3)}</div>`);
      }
      lines.push(`${indent(l + 2)}</div>`);
      lines.push(`${indent(l + 1)}</div>`);
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'mail': {
      const items = genMail();
      lines.push(`${indent(l)}<div className="${bg} border ${border} shadow-2xl shadow-black/[0.04] overflow-hidden">`);
      lines.push(`${indent(l + 1)}<div className="p-6">`);
      // toolbar
      lines.push(`${indent(l + 2)}<div className="flex items-center gap-3 mb-5 pb-4 border-b ${border}">`);
      lines.push(`${indent(l + 3)}<div className="w-4 h-4 ${fgSubtle}" />`);
      lines.push(`${indent(l + 3)}<div className="flex-1" />`);
      lines.push(`${indent(l + 3)}<div className="w-32 h-7 border ${border}" />`);
      lines.push(`${indent(l + 2)}</div>`);
      // mail items
      lines.push(`${indent(l + 2)}<div className="space-y-0">`);
      for (const item of items) {
        lines.push(`${indent(l + 3)}<div className="flex items-start gap-3 py-3 border-b ${border}">`);
        // unread indicator
        if (item.unread) {
          lines.push(`${indent(l + 4)}<div className="w-1.5 h-1.5 ${fg} mt-1.5 shrink-0" />`);
        } else {
          lines.push(`${indent(l + 4)}<div className="w-1.5 h-1.5 mt-1.5 shrink-0" />`);
        }
        lines.push(`${indent(l + 4)}<div className="flex-1 space-y-1.5">`);
        lines.push(`${indent(l + 5)}<div className="flex items-center gap-2">`);
        lines.push(`${indent(l + 6)}<div className="${item.fromWidth} h-2.5 ${item.unread ? fg : fgSoft}" />`);
        lines.push(`${indent(l + 6)}<div className="flex-1" />`);
        lines.push(`${indent(l + 6)}<div className="w-8 h-2 ${fgSubtle}" />`);
        lines.push(`${indent(l + 5)}</div>`);
        lines.push(`${indent(l + 5)}<div className="${item.subjectWidth} h-2.5 ${fgSubtle}" />`);
        lines.push(`${indent(l + 5)}<div className="${item.previewWidth} h-2 ${fgSubtle}" />`);
        lines.push(`${indent(l + 4)}</div>`);
        lines.push(`${indent(l + 3)}</div>`);
      }
      lines.push(`${indent(l + 2)}</div>`);
      lines.push(`${indent(l + 1)}</div>`);
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'files': {
      const items = genFileTree();
      lines.push(`${indent(l)}<div className="${bg} border ${border} shadow-2xl shadow-black/[0.04] overflow-hidden">`);
      lines.push(`${indent(l + 1)}<div className="p-6">`);
      // header
      lines.push(`${indent(l + 2)}<div className="flex items-center gap-2 mb-5 pb-4 border-b ${border}">`);
      lines.push(`${indent(l + 3)}<div className="w-4 h-4 ${fg}" />`);
      lines.push(`${indent(l + 3)}<div className="${pick(widthClasses.slice(2, 5))} h-2.5 ${fg}" />`);
      lines.push(`${indent(l + 2)}</div>`);
      // tree
      lines.push(`${indent(l + 2)}<div className="space-y-2">`);
      for (const item of items) {
        const ml = item.depth > 0 ? ` ml-${item.depth * 4}` : '';
        lines.push(`${indent(l + 3)}<div className="flex items-center gap-2${ml}">`);
        if (item.isFolder) {
          lines.push(`${indent(l + 4)}<div className="w-3 h-2.5 ${fg}" />`);
        } else {
          lines.push(`${indent(l + 4)}<div className="w-3 h-3 ${fgSubtle}" />`);
        }
        lines.push(`${indent(l + 4)}<div className="${item.nameWidth} h-2.5 ${item.isFolder ? fg : fgSubtle}" />`);
        lines.push(`${indent(l + 3)}</div>`);
      }
      lines.push(`${indent(l + 2)}</div>`);
      lines.push(`${indent(l + 1)}</div>`);
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'dashboard': {
      const widgets = genDashboard();
      const colCount = widgets.length <= 4 ? 2 : 3;
      lines.push(`${indent(l)}<div className="${bg} border ${border} shadow-2xl shadow-black/[0.04] overflow-hidden">`);
      lines.push(`${indent(l + 1)}<div className="p-6">`);
      // header
      lines.push(`${indent(l + 2)}<div className="flex items-center gap-2 mb-5">`);
      lines.push(`${indent(l + 3)}<div className="${pick(widthClasses.slice(3, 6))} h-3 ${fg}" />`);
      lines.push(`${indent(l + 3)}<div className="flex-1" />`);
      lines.push(`${indent(l + 3)}<div className="w-8 h-2.5 ${fgSubtle}" />`);
      lines.push(`${indent(l + 2)}</div>`);
      // widget grid
      lines.push(`${indent(l + 2)}<div className="grid grid-cols-${colCount} gap-4">`);
      for (const widget of widgets) {
        lines.push(`${indent(l + 3)}<div className="border ${border} p-3">`);
        lines.push(`${indent(l + 4)}<div className="${pick(widthClasses.slice(1, 3))} h-2 ${fgSubtle} mb-3" />`);
        switch (widget.type) {
          case 'number':
            lines.push(`${indent(l + 4)}<div className="${pick(widthClasses.slice(3, 6))} h-5 ${fg} mb-1" />`);
            lines.push(`${indent(l + 4)}<div className="${pick(widthClasses.slice(1, 3))} h-2 ${fgSubtle}" />`);
            break;
          case 'minibar': {
            lines.push(`${indent(l + 4)}<div className="flex items-end gap-1 h-10">`);
            for (let b = 0; b < randInt(4, 6); b++) {
              lines.push(`${indent(l + 5)}<div className="flex-1 ${randBool(0.4) ? fg : fgSubtle}" style={{ height: '${randInt(20, 100)}%' }} />`);
            }
            lines.push(`${indent(l + 4)}</div>`);
            break;
          }
          case 'line':
            // fake sparkline with stacked bars
            lines.push(`${indent(l + 4)}<div className="flex items-end gap-px h-10">`);
            for (let b = 0; b < randInt(8, 14); b++) {
              lines.push(`${indent(l + 5)}<div className="flex-1 ${fgSubtle}" style={{ height: '${randInt(15, 95)}%' }} />`);
            }
            lines.push(`${indent(l + 4)}</div>`);
            break;
          case 'list':
            for (let li = 0; li < randInt(2, 3); li++) {
              lines.push(`${indent(l + 4)}<div className="flex items-center gap-2 ${li > 0 ? 'mt-2' : ''}">`);
              lines.push(`${indent(l + 5)}<div className="w-1.5 h-1.5 ${fg}" />`);
              lines.push(`${indent(l + 5)}<div className="${pick(widthClasses.slice(2, 5))} h-2 ${fgSubtle}" />`);
              lines.push(`${indent(l + 4)}</div>`);
            }
            break;
        }
        lines.push(`${indent(l + 3)}</div>`);
      }
      lines.push(`${indent(l + 2)}</div>`);
      lines.push(`${indent(l + 1)}</div>`);
      lines.push(`${indent(l)}</div>`);
      break;
    }
    case 'wave': {
      const waves = genWaveDots();
      lines.push(`${indent(l)}<svg viewBox="0 0 100 100" className="w-full h-full" fill="none">`);
      for (let w = 0; w < waves.length; w++) {
        const cls = w === 0 ? svgFillStrongClass : svgFillClass;
        for (const dot of waves[w]) {
          lines.push(`${indent(l + 1)}<rect x="${dot.x.toFixed(1)}" y="${dot.y.toFixed(1)}" width="${dot.size.toFixed(1)}" height="${dot.size.toFixed(1)}" className="${cls}" />`);
        }
      }
      lines.push(`${indent(l)}</svg>`);
      break;
    }
    case 'orbit': {
      const rings = genOrbitDots();
      lines.push(`${indent(l)}<svg viewBox="0 0 100 100" className="w-full h-full" fill="none">`);
      // center marker
      lines.push(`${indent(l + 1)}<rect x="48" y="48" width="4" height="4" className="${svgFillStrongClass}" />`);
      for (let r = 0; r < rings.length; r++) {
        const cls = r === 0 ? svgFillStrongClass : svgFillClass;
        for (const dot of rings[r]) {
          lines.push(`${indent(l + 1)}<rect x="${dot.x.toFixed(1)}" y="${dot.y.toFixed(1)}" width="${dot.size.toFixed(1)}" height="${dot.size.toFixed(1)}" className="${cls}" />`);
        }
      }
      lines.push(`${indent(l)}</svg>`);
      break;
    }
    case 'spiral': {
      const dots = genSpiralDots();
      lines.push(`${indent(l)}<svg viewBox="0 0 100 100" className="w-full h-full" fill="none">`);
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        const cls = i > dots.length * 0.6 ? svgFillStrongClass : svgFillClass;
        lines.push(`${indent(l + 1)}<rect x="${dot.x.toFixed(1)}" y="${dot.y.toFixed(1)}" width="${dot.size.toFixed(1)}" height="${dot.size.toFixed(1)}" className="${cls}" />`);
      }
      lines.push(`${indent(l)}</svg>`);
      break;
    }
    case 'scatter': {
      const dots = genScatterDots();
      lines.push(`${indent(l)}<svg viewBox="0 0 100 100" className="w-full h-full" fill="none">`);
      for (const dot of dots) {
        const cls = dot.size > 2 ? svgFillStrongClass : svgFillClass;
        lines.push(`${indent(l + 1)}<rect x="${dot.x.toFixed(1)}" y="${dot.y.toFixed(1)}" width="${dot.size.toFixed(1)}" height="${dot.size.toFixed(1)}" className="${cls}" />`);
      }
      lines.push(`${indent(l)}</svg>`);
      break;
    }
  }

  return lines.join('\n');
}

function renderSecondary(type, level) {
  switch (type) {
    case 'grid': {
      const cols = randInt(5, 8);
      const rows = randInt(4, 6);
      const lines = [];
      lines.push(`${indent(level)}<div className="grid grid-cols-${cols} gap-2">`);
      for (let i = 0; i < cols * rows; i++) {
        // vary dot intensity for visual interest
        const dotClass = randBool(0.3) ? fg : dotBg;
        lines.push(`${indent(level + 1)}<div className="w-1 h-1 ${dotClass}" />`);
      }
      lines.push(`${indent(level)}</div>`);
      return lines.join('\n');
    }
    case 'layers': {
      const count = randInt(2, 4);
      const lines = [];
      lines.push(`${indent(level)}<div className="relative">`);
      for (let i = 0; i < count; i++) {
        const w = pick(['w-20', 'w-24', 'w-28', 'w-32']);
        const h = pick(['h-16', 'h-20', 'h-24']);
        const offset = i * 6;
        lines.push(`${indent(level + 1)}<div className="absolute ${w} ${h} border ${border}" style={{ top: '${offset}px', left: '${offset}px' }} />`);
      }
      // size the container to fit
      lines.push(`${indent(level + 1)}<div className="w-40 h-32" />`);
      lines.push(`${indent(level)}</div>`);
      return lines.join('\n');
    }
    case 'lines': {
      // horizontal ruled lines — like a subtle notepad or separator
      const count = randInt(4, 7);
      const lines = [];
      lines.push(`${indent(level)}<div className="space-y-2 w-24">`);
      for (let i = 0; i < count; i++) {
        const w = randBool(0.6) ? 'w-full' : pick(['w-16', 'w-20', 'w-12']);
        lines.push(`${indent(level + 1)}<div className="${w} h-px ${randBool(0.4) ? fg : fgSubtle}" />`);
      }
      lines.push(`${indent(level)}</div>`);
      return lines.join('\n');
    }
    default:
      return renderMainElement(type, level);
  }
}

// ─── assemble component ───────────────────────────────────────────────────────

const output = [];

output.push(`import { useRef, useEffect, useState } from 'react';`);
output.push('');
output.push(`const ${componentName} = () => {`);
output.push(`  const containerRef = useRef(null);`);
output.push(`  const [scale, setScale] = useState(1);`);
output.push('');
output.push(`  useEffect(() => {`);
output.push(`    const el = containerRef.current;`);
output.push(`    if (!el) return;`);
output.push(`    const observer = new ResizeObserver(([entry]) => {`);
output.push(`      const { width, height } = entry.contentRect;`);
output.push(`      setScale(Math.min(width / 480, height / 480));`);
output.push(`    });`);
output.push(`    observer.observe(el);`);
output.push(`    return () => observer.disconnect();`);
output.push(`  }, []);`);
output.push('');
output.push(`  return (`);
output.push(`    <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden">`);
output.push(`      <div className="relative w-[480px] h-[480px] shrink-0 origin-center" style={{ transform: \`scale(\${scale})\` }}>`);

// floating accent rectangles
for (const rect of floatingRects) {
  const posClasses = [];
  if (rect.top !== undefined) posClasses.push(`top-${rect.top}`);
  if (rect.bottom !== undefined) posClasses.push(`bottom-${rect.bottom}`);
  if (rect.left !== undefined) posClasses.push(`left-${rect.left}`);
  if (rect.right !== undefined) posClasses.push(`right-${rect.right}`);
  const animClass = rect.animate ? ' animate-float' : '';
  output.push(`        <div className="absolute ${posClasses.join(' ')} w-${rect.w > 32 ? 44 : rect.w > 20 ? 32 : 20} h-${rect.h > 32 ? 44 : rect.h > 20 ? 32 : 20} border ${border}${animClass}" />`);
}

// main element — centered
output.push('');
output.push(`        {/* Main element: ${mainType} */}`);
output.push(`        <div className="absolute inset-0 m-auto w-[320px] flex items-center justify-center">`);
output.push(renderMainElement(mainType, 5));
output.push(`        </div>`);

// secondary elements — positioned in opposing corners for balance
if (secondaryElements.length > 0) {
  const cornerSets = [
    ['absolute bottom-6 left-6', 'absolute top-6 right-6'],
    ['absolute bottom-6 right-6', 'absolute top-6 left-6'],
    ['absolute bottom-8 left-8', 'absolute top-10 right-10'],
  ];
  const corners = pick(cornerSets);
  for (let i = 0; i < secondaryElements.length; i++) {
    output.push('');
    output.push(`        {/* Secondary: ${secondaryElements[i]} */}`);
    output.push(`        <div className="${corners[i % corners.length]}">`);
    output.push(renderSecondary(secondaryElements[i], 5));
    output.push(`        </div>`);
  }
}

output.push(`      </div>`);
output.push(`    </div>`);
output.push(`  );`);
output.push(`};`);
output.push('');
output.push(`export default ${componentName};`);

// ─── print ────────────────────────────────────────────────────────────────────

const metadata = [
  `// Generated by generate-illustration.mjs`,
  `// Seed: ${seed} | Keywords: ${keywords.length > 0 ? keywords.join(', ') : '(random)'} | Main: ${mainType}`,
  `// Dark mode: ${dark}${customColors ? ' | Colors (light): ' + customColors.join(', ') : ''}${customColorsDark ? ' | Colors (dark): ' + customColorsDark.join(', ') : ''}`,
  `//`,
  `// Drop this component into your project. It renders at a fixed 480x480`,
  `// internal size and scales automatically to fit its container.`,
  ``,
];

console.log(metadata.join('\n'));
console.log(output.join('\n'));
