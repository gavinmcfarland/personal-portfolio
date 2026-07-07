/* Canvas layout — turns the portfolio data files into positioned cards, plus
   the seed annotations (sticky notes, text, markdown, drawings) that decorate
   the board. This is the single source of truth for the board's initial state;
   in development your edits are saved to localStorage on top of it. */
import { profile } from './profile';
import { projects } from './projects';
import { freelance } from './experience';
import { awards } from './awards';
import { education } from './education';

/* ── Derive condensed list rows from the full data ─────────────── */
const experienceRows = freelance.slice(0, 6).map((group) => ({
  yr: group.year,
  rt: group.entries.map((e) => e.primary).join(' · '),
  rp: [...new Set(group.entries.map((e) => e.meta[0]))].join(' · '),
}));

const awardRows = awards.map((a) => ({
  yr: a.year.replace(/\s*–\s*/, '–').replace(/^20(\d\d)–20(\d\d)$/, '$1–$2'),
  rt: a.title,
  rp: a.place,
}));

const educationRows = education.map((e) => ({
  yr: e.year,
  rt: e.title,
  rp: e.place,
}));

/* Grid step for the two-row project columns (470, 850, …). */
const projectPos = (i) => ({ x: 470 + Math.floor(i / 2) * 380, y: i % 2 ? 290 : -40 });

/* ── Cards (data-driven) ───────────────────────────────────────── */
function cardNodes() {
  const cards = [
    { id: 'hero', card: 'hero', x: -40, y: -40 },
    { id: 'about', card: 'about', x: -40, y: 300 },
    ...projects.map((p, i) => ({
      id: `p-${p.id}`,
      card: 'project',
      project: p,
      kicker: `Work ${String(i + 1).padStart(2, '0')}`,
      ...projectPos(i),
    })),
    {
      id: 'experience',
      card: 'list',
      kicker: 'Selected Experience',
      heading: "Where I've worked",
      rows: experienceRows,
      x: -40,
      y: 560,
    },
    {
      id: 'education',
      card: 'list',
      kicker: 'Education',
      heading: 'Early on',
      rows: educationRows,
      x: 470,
      y: 560,
    },
    {
      id: 'awards',
      card: 'list',
      kicker: 'Recognition',
      heading: 'Awards',
      rows: awardRows,
      x: 850,
      y: 560,
    },
    { id: 'connect', card: 'connect', x: 1240, y: -40 },
  ];
  return cards.map((c) => ({ ...c, type: 'card' }));
}

/* ── Seed annotations (decoration; editable in dev) ────────────── */
const seedAnnotations = [
  {
    id: 'seed-note-1',
    type: 'sticky',
    color: 'yellow',
    x: 1240,
    y: 330,
    text: 'This is a canvas!\nPan, zoom, and\nannotate anything ↓',
  },
  {
    id: 'seed-note-2',
    type: 'sticky',
    color: 'blue',
    x: 470,
    y: -330,
    text: 'My favourite\nproject — try the\nhot reload 🔥',
  },
  { id: 'seed-text-1', type: 'tblock', x: -40, y: -140, text: '↓ drag me around' },
  {
    id: 'seed-md-1',
    type: 'md',
    x: 1300,
    y: 560,
    w: 340,
    text: '# Markdown note\n-- Selected Work\nType **markdown** — it *highlights* as you write.\n\n[Node.js] [TypeScript] [Vite]\n\n- lists & `inline code`\n- [links](https://www.plugma.dev/)\n\n> Double-click to edit it again.',
  },
];

const seedShapes = [
  { id: 'seed-shape-1', type: 'arrow', stroke: '#7C2D91', width: 3, x1: 1300, y1: 300, x2: 1150, y2: 180 },
  {
    id: 'seed-shape-2',
    type: 'pen',
    stroke: '#F5A524',
    width: 4,
    points: [[450, 100], [430, 150], [452, 205], [448, 260], [458, 300]],
  },
];

/* ── Build the initial board ───────────────────────────────────── */
export function buildInitialState() {
  let z = 0;
  const nodes = [...cardNodes(), ...seedAnnotations].map((n) => ({
    anchor: false,
    ...n,
    z: ++z,
  }));
  const shapes = seedShapes.map((s) => ({ ...s, z: ++z }));
  return { nodes, shapes, brand: { title: profile.name, subtitle: 'canvas portfolio' } };
}
