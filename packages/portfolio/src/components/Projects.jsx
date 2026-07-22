import { Link } from 'react-router-dom';
import { projects } from '../data/projects';
import { Section } from './ui';
import ProjectCanvasPreview from './ProjectCanvasPreview';

/* Work, as the Enamel table (design-mockups/12-enamel/index.html): tracked mono
   structure, a Chivo description column, and a flat enamel swatch + tag for the
   Kind. Each row keeps the site's own behaviour — it links to the project's page
   and floats the live canvas thumbnail on hover — rather than the mockup's plain
   anchors. */

const KINDS = {
  tool: { label: 'Tool', tone: 'blue' },
  library: { label: 'Library', tone: 'lime' },
  'plug-in': { label: 'Plug-in', tone: 'teal' },
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
  'grid grid-cols-[2.75rem_10rem_minmax(0,1fr)_7.5rem_3.5rem] items-baseline gap-x-3 px-3';

function KindTag({ kind }) {
  const k = KINDS[kind] || { label: kind, tone: 'teal' };
  return (
    <span className="inline-flex items-center gap-[0.4rem] border border-line px-[0.45rem] py-[0.1rem] font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-muted">
      <span className="h-2 w-2 flex-none" style={{ background: TONE_VAR[k.tone] }} aria-hidden="true" />
      {k.label}
    </span>
  );
}

const Projects = () => (
  <Section id="projects" label="Projects">
    <div className="overflow-x-auto">
      <div className="min-w-[44rem]">
        {/* Column header — 11px tracked mono marks over a drawn rule. */}
        <div
          className={`${GRID} pb-[0.5rem] font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-faint`}
          style={{ borderBottom: '2px solid var(--rule)' }}
        >
          <span>No.</span>
          <span>Item</span>
          <span>Description</span>
          <span>Kind</span>
          <span className="text-right">Year</span>
        </div>

        {projects.map((p, i) => (
          <ProjectCanvasPreview key={p.id} project={p}>
            <Link
              to={`/projects/${p.id}`}
              className={`group ${GRID} border-b border-line py-[0.6rem] transition-colors duration-150 hover:bg-surface`}
            >
              <span className="font-mono text-[0.75rem] font-bold tabular-nums text-accent">
                {pad2(i + 1)}
              </span>
              <span className="font-mono text-[0.75rem] font-semibold text-ink transition-colors duration-150 group-hover:text-accent">
                {p.title}
              </span>
              <span
                className="block min-w-0 truncate font-sans text-[0.9375rem] text-muted"
                title={p.summary}
              >
                {p.summary}
              </span>
              <span>
                <KindTag kind={p.kind} />
              </span>
              <span className="text-right font-mono text-[0.75rem] tabular-nums text-faint">
                {p.year}
              </span>
            </Link>
          </ProjectCanvasPreview>
        ))}
      </div>
    </div>

    <p className="mt-3 px-3 font-mono text-[0.75rem] text-faint">
      {pad2(projects.length)} items · tools, plug-ins and libraries
    </p>
  </Section>
);

export default Projects;
