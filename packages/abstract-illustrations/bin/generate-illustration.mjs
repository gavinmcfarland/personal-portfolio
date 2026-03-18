#!/usr/bin/env node

/**
 * Abstract illustration generator.
 *
 * Produces a self-contained JSX component that renders a monochrome,
 * sharp-cornered abstract composition — the same aesthetic used in
 * the portfolio hero section.
 *
 * Usage:
 *   node scripts/generate-illustration.mjs [keywords...] [--seed N] [--name ComponentName] [--dark]
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
const keywords = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--seed' && args[i + 1]) {
    seed = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--name' && args[i + 1]) {
    componentName = args[i + 1];
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

// ─── palette (monochrome, matches portfolio aesthetic) ────────────────────────

const fg = dark ? 'bg-gray-700' : 'bg-gray-200';
const fgSoft = dark ? 'bg-gray-700/60' : 'bg-gray-200/60';
const fgSubtle = dark ? 'bg-gray-800' : 'bg-gray-100';
const border = dark ? 'border-gray-800' : 'border-gray-100';
const borderStrong = dark ? 'border-gray-700' : 'border-gray-200';
const bg = dark ? 'bg-gray-900' : 'bg-white';
const dotBg = dark ? 'bg-gray-700' : 'bg-gray-300';

// ─── element generators ───────────────────────────────────────────────────────

const widthClasses = ['w-8', 'w-10', 'w-12', 'w-14', 'w-16', 'w-20', 'w-24', 'w-28', 'w-32'];

function genCodeLines() {
  const lineCount = randInt(6, 12);
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
  const lineCount = randInt(5, 9);
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
  const rows = randInt(4, 7);
  return { cols, rows };
}

function genChartBars() {
  const count = randInt(5, 8);
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

// ─── choose composition ───────────────────────────────────────────────────────

const ALL_TYPES = ['code', 'terminal', 'data', 'chart', 'layers', 'network', 'grid', 'text'];

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
if (secondaryElements.length === 0 && randBool(0.7)) {
  const decorations = ['grid', 'layers'];
  secondaryElements.push(pick(decorations.filter((d) => d !== mainType)));
}

// floating accent rectangles (0–2)
const floatingRects = [];
const floatCount = randInt(0, 2);
for (let i = 0; i < floatCount; i++) {
  const positions = [
    { top: randInt(4, 16), right: randInt(4, 20) },
    { bottom: randInt(8, 24), left: randInt(4, 16) },
    { top: randInt(20, 40), left: randInt(2, 12) },
    { bottom: randInt(4, 16), right: randInt(4, 16) },
  ];
  const pos = pick(positions);
  floatingRects.push({
    ...pos,
    w: randInt(16, 44),
    h: randInt(16, 44),
    animate: randBool(0.5),
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
            const stroke = dark ? '#374151' : '#e5e7eb';
            lines.push(`${indent(l + 1)}<line x1="${nodes[i].x}" y1="${nodes[i].y}" x2="${nodes[j].x}" y2="${nodes[j].y}" stroke="${stroke}" strokeWidth="0.5" />`);
          }
        }
      }
      // nodes
      for (const node of nodes) {
        const fill = dark ? '#374151' : '#e5e7eb';
        lines.push(`${indent(l + 1)}<rect x="${node.x - node.size / 2}" y="${node.y - node.size / 2}" width="${node.size}" height="${node.size}" fill="${fill}" />`);
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
  }

  return lines.join('\n');
}

function renderSecondary(type, level) {
  switch (type) {
    case 'grid': {
      const { cols, rows } = genDotGrid();
      const lines = [];
      lines.push(`${indent(level)}<div className="grid grid-cols-${cols} gap-3">`);
      for (let i = 0; i < cols * rows; i++) {
        lines.push(`${indent(level + 1)}<div className="w-1 h-1 ${dotBg}" />`);
      }
      lines.push(`${indent(level)}</div>`);
      return lines.join('\n');
    }
    case 'layers': {
      const count = randInt(2, 3);
      const lines = [];
      for (let i = 0; i < count; i++) {
        const w = randInt(16, 40);
        const h = randInt(16, 40);
        lines.push(`${indent(level)}<div className="w-${w > 32 ? 40 : w > 20 ? 24 : 16} h-${h > 32 ? 40 : h > 20 ? 24 : 16} border ${border}" />`);
      }
      return lines.join('\n');
    }
    default:
      return renderMainElement(type, level);
  }
}

// ─── assemble component ───────────────────────────────────────────────────────

const output = [];

output.push(`const ${componentName} = () => {`);
output.push(`  return (`);
output.push(`    <div className="relative w-full h-full">`);

// floating accent rectangles
for (const rect of floatingRects) {
  const posClasses = [];
  if (rect.top !== undefined) posClasses.push(`top-${rect.top}`);
  if (rect.bottom !== undefined) posClasses.push(`bottom-${rect.bottom}`);
  if (rect.left !== undefined) posClasses.push(`left-${rect.left}`);
  if (rect.right !== undefined) posClasses.push(`right-${rect.right}`);
  const animClass = rect.animate ? ' animate-float' : '';
  output.push(`      <div className="absolute ${posClasses.join(' ')} w-${rect.w > 32 ? 44 : rect.w > 20 ? 32 : 20} h-${rect.h > 32 ? 44 : rect.h > 20 ? 32 : 20} border ${border}${animClass}" />`);
}

// main element — centered
output.push('');
output.push(`      {/* Main element: ${mainType} */}`);
output.push(`      <div className="absolute inset-0 m-auto w-[320px] flex items-center justify-center">`);
output.push(renderMainElement(mainType, 4));
output.push(`      </div>`);

// secondary elements — positioned at edges
if (secondaryElements.length > 0) {
  const positions = [
    'absolute bottom-8 left-8',
    'absolute top-8 right-8',
    'absolute bottom-12 right-12',
  ];
  for (let i = 0; i < secondaryElements.length; i++) {
    output.push('');
    output.push(`      {/* Secondary: ${secondaryElements[i]} */}`);
    output.push(`      <div className="${positions[i % positions.length]}">`);
    output.push(renderSecondary(secondaryElements[i], 4));
    output.push(`      </div>`);
  }
}

output.push(`    </div>`);
output.push(`  );`);
output.push(`};`);
output.push('');
output.push(`export default ${componentName};`);

// ─── print ────────────────────────────────────────────────────────────────────

const metadata = [
  `// Generated by generate-illustration.mjs`,
  `// Seed: ${seed} | Keywords: ${keywords.length > 0 ? keywords.join(', ') : '(random)'} | Main: ${mainType}`,
  `// Dark mode: ${dark}`,
  `//`,
  `// Drop this component into your project and render it inside a container`,
  `// with a defined height (e.g. h-[400px] or h-full).`,
  ``,
];

console.log(metadata.join('\n'));
console.log(output.join('\n'));
