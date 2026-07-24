import { Link } from "react-router-dom";
import { visibleProjects as projects } from "../data/projects";
import { Section, blurOnPointerClick } from "./ui";

/* Work, as a list: each item is a numbered entry with its title, kind and the
   full description shown inline, so the whole selection reads top to bottom
   without hovering. Each row links to the project's page. */

const KINDS = {
  tool: { label: "Tool", tone: "blue" },
  library: { label: "Library", tone: "lime" },
  plugin: { label: "Plugin", tone: "teal" },
};

/* The four enamels, as CSS vars that flip with the theme (see app.css). */
const TONE_VAR = {
  vermilion: "var(--tone-vermilion)",
  blue: "var(--tone-blue)",
  lime: "var(--tone-lime)",
  teal: "var(--tone-teal)",
};

const pad2 = (n) => String(n).padStart(2, "0");

function KindTag({ kind }) {
  const k = KINDS[kind] || { label: kind, tone: "teal" };
  return (
    <span className="inline-flex items-center gap-[0.4rem] border border-line px-[0.45rem] py-[0.1rem] font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-muted">
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
  <Section id="projects" label="Projects">
    <p className="mb-8 max-w-2xl text-pretty text-[1.0625rem] leading-relaxed text-muted">
      A selection of work I've designed and built end to end. Each one reflects a
      problem I wanted to solve and the craft that went into making it feel
      effortless to use.
    </p>

    <div style={{ borderTop: "2px solid var(--line-strong)" }}>
      {projects.map((p, i) => (
        <Link
          key={p.id}
          to={`/projects/${p.id}`}
          className="group block border-b border-line py-6 transition-colors duration-150 hover:bg-surface"
          onClick={blurOnPointerClick}
        >
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[0.75rem] font-bold tabular-nums text-accent">
              {pad2(i + 1)}
            </span>
            <span className="font-mono text-[0.875rem] font-semibold text-ink transition-colors duration-150 group-hover:text-accent">
              {p.title}
            </span>
            <span className="ml-auto flex-none">
              <KindTag kind={p.kind} />
            </span>
          </div>

          <p className="mt-2 max-w-2xl font-sans text-[0.9375rem] leading-relaxed text-muted">
            {p.summary}
          </p>
        </Link>
      ))}
    </div>

    <p className="mt-3 font-mono text-[0.75rem] text-faint">
      {pad2(projects.length)} items · tools, plugins and libraries
    </p>
  </Section>
);

export default Projects;
