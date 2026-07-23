import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { visibleProjects as projects } from '../data/projects';
import { Section } from './ui';

/* Work, as the Enamel table (design-mockups/12-enamel/index.html): tracked mono
   structure, a Chivo description column, and a flat enamel swatch + tag for the
   Kind. Each row links to the project's page. */

const KINDS = {
  tool: { label: 'Tool', tone: 'blue' },
  library: { label: 'Library', tone: 'lime' },
  plugin: { label: 'Plugin', tone: 'teal' },
};

/* The four enamels, as CSS vars that flip with the theme (see app.css). */
const TONE_VAR = {
  vermilion: 'var(--tone-vermilion)',
  blue: 'var(--tone-blue)',
  lime: 'var(--tone-lime)',
  teal: 'var(--tone-teal)',
};

const pad2 = (n) => String(n).padStart(2, '0');

/* Shared column track so the header row and every body row line up. */
const GRID =
  'grid grid-cols-[2.75rem_10rem_minmax(0,1fr)_7.5rem] items-baseline gap-x-3 px-3';

function KindTag({ kind }) {
  const k = KINDS[kind] || { label: kind, tone: 'teal' };
  return (
    <span className="inline-flex items-center gap-[0.4rem] border border-line px-[0.45rem] py-[0.1rem] font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-muted">
      <span className="h-2 w-2 flex-none" style={{ background: TONE_VAR[k.tone] }} aria-hidden="true" />
      {k.label}
    </span>
  );
}

/* Max width of the shared description tooltip (px). It sizes to its content up
   to this cap, and is used as the pre-paint fallback when measuring for flips. */
const TIP_W = 400;

const Projects = () => {
  // One shared tooltip drives every row: it stays mounted while the pointer is
  // anywhere over the list and just re-points / re-fills as a new row is hovered
  // (so moving between rows updates the text without the popover closing).
  const [tip, setTip] = useState(null); // { summary, left, top } | null
  const tipRef = useRef(null);

  const GAP = 14; // offset from the cursor
  const MARGIN = 8; // keep this far from the viewport edges

  const followCursor = (e, p) => {
    // Touch devices synthesize mouse events on tap/scroll but never fire a
    // matching mouseleave (there's no cursor to move away), so the tooltip
    // would appear "randomly" on load and stick. Only drive it from a real
    // hover-capable pointer.
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    )
      return;

    // Measure the actual popover so we only flip when it genuinely won't fit —
    // not against a fixed guess. Falls back to the max width before first paint.
    const el = tipRef.current;
    const w = el ? el.offsetWidth : TIP_W;
    const h = el ? el.offsetHeight : 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Default: bottom-right of the cursor (extends right and down).
    let left = e.clientX + GAP;
    if (left + w > vw - MARGIN) left = e.clientX - GAP - w; // no room on the right → flip to the left
    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));

    let top = e.clientY + GAP;
    if (top + h > vh - MARGIN) top = e.clientY - GAP - h; // no room below → flip above
    top = Math.max(MARGIN, top);

    setTip({ summary: p.summary, left, top });
  };

  // The popover is position: fixed, so it would freeze in place while the page
  // scrolls out from under it. Clear it on any scroll so it doesn't detach from
  // the row it describes.
  useEffect(() => {
    if (!tip) return;
    const clear = () => setTip(null);
    window.addEventListener('scroll', clear, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', clear, { capture: true });
  }, [tip]);

  return (
    <Section id="projects" label="Projects">
      <div className="overflow-x-auto" onMouseLeave={() => setTip(null)}>
        <div className="min-w-[44rem]">
          {/* Column header — 11px tracked mono marks over a drawn rule. */}
          <div
            className={`${GRID} pb-[0.5rem] font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-faint`}
            style={{ borderBottom: '2px solid var(--line-strong)' }}
          >
            <span>No.</span>
            <span>Item</span>
            <span>Description</span>
            <span>Kind</span>
          </div>

          {projects.map((p, i) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className={`group ${GRID} border-b border-line py-[0.6rem] transition-colors duration-150 hover:bg-surface`}
              onMouseEnter={(e) => followCursor(e, p)}
              onMouseMove={(e) => followCursor(e, p)}
            >
              <span className="font-mono text-[0.75rem] font-bold tabular-nums text-accent">
                {pad2(i + 1)}
              </span>
              <span className="font-mono text-[0.75rem] font-semibold text-ink transition-colors duration-150 group-hover:text-accent">
                {p.title}
              </span>
              <span data-desc className="block min-w-0 truncate font-sans text-[0.9375rem] text-muted">
                {p.summary}
              </span>
              <span>
                <KindTag kind={p.kind} />
              </span>
            </Link>
          ))}
        </div>
      </div>

      <p className="mt-3 px-3 font-mono text-[0.75rem] text-faint">
        {pad2(projects.length)} items · tools, plugins and libraries
      </p>

      {/* Portaled to <body>: the Projects section carries a `transform` (the
          scroll-reveal), which would otherwise trap this `position: fixed`
          popover inside the section's box rather than the viewport. */}
      {tip &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            className="tip-in pointer-events-none fixed z-50 border border-line bg-surface px-3 py-2"
            style={{
              left: tip.left,
              top: tip.top,
              width: 'max-content',
              maxWidth: `min(${TIP_W}px, calc(100vw - 2rem))`,
            }}
          >
            <span className="block font-sans text-[0.875rem] leading-snug text-ink">
              {tip.summary}
            </span>
          </div>,
          document.body
        )}
    </Section>
  );
};

export default Projects;
