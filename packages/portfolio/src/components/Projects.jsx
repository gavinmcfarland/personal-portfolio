import { Link } from "react-router-dom";
import { visibleProjects as projects } from "../data/projects";
import ProjectPlate from "./ProjectPlate";
import { Section, blurOnPointerClick } from "./ui";

/* The work, set as a man page's EXAMPLES: each project is an invocation — a $
   prompt and the project's name — with its kind chipped out to the right and the
   summary hanging beneath as the description. The prompt is part of the conceit;
   no such command exists, but the projects and links are real. Each block links
   through to the project's own page. */

/* Kind chip — the four enamels as flat square swatches beside an uppercase
   label. `tone` points at a --tone-* token, so the colour flips with the
   theme (see app.css). */
const KINDS = {
  tool: { label: "Tool", tone: "blue" },
  library: { label: "Library", tone: "lime" },
  plugin: { label: "Plugin", tone: "teal" },
};

const TONE_VAR = {
  vermilion: "var(--tone-vermilion)",
  blue: "var(--tone-blue)",
  lime: "var(--tone-lime)",
  teal: "var(--tone-teal)",
};

function KindTag({ kind }) {
  const k = KINDS[kind] || { label: kind, tone: "teal" };
  return (
    <span className="inline-flex items-center gap-[0.4rem] border border-line px-[0.45rem] py-[0.1rem] text-[0.6875rem] uppercase tracking-[0.08em] text-muted">
      <span
        className="h-2 w-2 flex-none"
        style={{ background: TONE_VAR[k.tone] }}
        aria-hidden="true"
      />
      {k.label}
    </span>
  );
}

const Projects = () => (
  <Section id="examples" label="Examples">
    <p className="mb-8 max-w-[64ch] text-muted">
      A selection of work, designed and built end to end. Each began as a
      recurring problem rather than an idea &mdash; run one to read the full case.
    </p>

    <div className="space-y-1">
      {projects.map((p) => (
        <Link
          key={p.id}
          to={`/projects/${p.id}`}
          className="group -mx-4 block px-4 py-3 transition-colors duration-150 hover:bg-surface"
          onClick={blurOnPointerClick}
        >
          <p className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <span className="font-bold text-ink transition-colors duration-150 group-hover:text-accent">
              <span className="prompt">$</span> {p.title}
            </span>
            <KindTag kind={p.kind} />
          </p>
          {/* Plate left, description right — the entry shape from the Dither
              sheet: a 30rem × 13rem plate, stacking above the text on narrow
              screens where there is no room to set them side by side. */}
          <div className="mt-3 grid gap-4 pl-4 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-10">
            <ProjectPlate seed={p.seed} archetype={p.archetype} className="h-[10rem] lg:h-[13rem]" />
            <p className="max-w-[62ch] text-muted">{p.summary}</p>
          </div>
        </Link>
      ))}
    </div>

    <p className="mt-9 text-[0.8rem] text-faint">
      {projects.length} examples &middot; tools, plugins and libraries
    </p>
  </Section>
);

export default Projects;
