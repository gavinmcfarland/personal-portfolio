import { Link } from "react-router-dom";
import { visibleProjects as projects } from "../data/projects";
import { Section, blurOnPointerClick } from "./ui";

/* The work, set as a man page's EXAMPLES: each project is an invocation of the
   `gavin` command — a $ prompt, the capability flag its `kind` maps to, and the
   project name as the argument — with its year set out to the right and the
   summary hanging beneath as the description. `cmd` is part of the conceit; no
   such command exists, but the projects, years and links are real. Each block
   still links through to the project's own page. */

const KIND_FLAG = {
  tool: "--tool",
  library: "--library",
  plugin: "--plugin",
};

const Projects = () => (
  <Section id="examples" label="Examples">
    <p className="mb-8 max-w-[64ch] text-muted">
      A selection of work, designed and built end to end. Each began as a
      recurring problem rather than an idea &mdash; run one to read the full case.
    </p>

    <div className="space-y-7">
      {projects.map((p) => (
        <Link
          key={p.id}
          to={`/projects/${p.id}`}
          className="group block"
          onClick={blurOnPointerClick}
        >
          <p className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <span className="font-bold text-ink transition-colors duration-150 group-hover:text-accent">
              <span className="prompt">$</span> gavin{" "}
              <span className="flag not-italic text-muted">
                {KIND_FLAG[p.kind] || "--tool"}
              </span>{" "}
              {p.id}
            </span>
            <span className="text-[0.8rem] tabular-nums text-faint">
              {p.year}
            </span>
          </p>
          <p className="mt-1.5 max-w-[62ch] pl-4 text-muted">{p.summary}</p>
          {p.linkLabel ? (
            <p className="mt-1.5 pl-4 text-[0.8rem]">
              <span className="text-faint">see</span>{" "}
              <span className="text-ink underline decoration-(--line-strong) underline-offset-2 transition-colors group-hover:decoration-accent group-hover:text-accent">
                {p.linkLabel.toLowerCase()}
              </span>{" "}
              <span className="text-faint">&rarr;</span>
            </p>
          ) : null}
        </Link>
      ))}
    </div>

    <p className="mt-9 text-[0.8rem] text-faint">
      {projects.length} examples &middot; tools, plugins and libraries
    </p>
  </Section>
);

export default Projects;
