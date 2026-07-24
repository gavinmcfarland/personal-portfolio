import { Link } from "react-router-dom";
import ProjectCanvas from "../components/ProjectCanvas";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "../components/ui";
import { visibleProjects } from "../data/projects";

/* Full-screen project view. Below `lg` a compact header sits above the canvas;
   from `lg` up the same info becomes a full-height sidebar on the left, with
   the interactive canvas filling every remaining pixel beside it. The whole
   view locks to the viewport (fixed inset-0) so nothing scrolls; you pan the
   canvas instead. */
export default function ProjectPage({ project }) {
  /* The visit link shares the top row with the back link on every breakpoint,
     sitting in the top-right corner of the header/sidebar. */
  const visitPill = (visibility, label) =>
    project.link && (
      <a
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`group shrink-0 items-center gap-1 font-sans text-[0.8125rem] font-medium text-muted transition-colors duration-200 hover:text-ink sm:text-[0.875rem] ${visibility}`}
      >
        {label}
        <ArrowUpRight className="h-3.5 w-3.5 text-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
      </a>
    );

  /* Previous/next neighbours in the published list. No wrap-around: the first
     project has no previous and the last has no next, so those controls hide. */
  const index = visibleProjects.findIndex((p) => p.id === project.id);
  const prev = index > 0 ? visibleProjects[index - 1] : null;
  const next =
    index < visibleProjects.length - 1 ? visibleProjects[index + 1] : null;

  const navLink = (target, direction) => {
    const isPrev = direction === "prev";
    return (
      <Link
        to={`/projects/${target.id}`}
        aria-label={`${isPrev ? "Previous" : "Next"} project: ${target.title}`}
        title={`${isPrev ? "Previous" : "Next"}: ${target.title}`}
        className={`flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-[8px] border border-line px-2 font-sans text-[0.875rem] font-medium text-muted transition-colors duration-150 hover:bg-hover hover:text-ink lg:w-[calc(50%-0.25rem)] lg:px-3 ${
          isPrev ? "lg:mr-auto lg:justify-start" : "lg:ml-auto lg:justify-end"
        }`}
      >
        {isPrev && <ArrowLeft className="h-4 w-4 shrink-0" />}
        <span className="hidden truncate lg:inline">{target.title}</span>
        {!isPrev && <ArrowRight className="h-4 w-4 shrink-0" />}
      </Link>
    );
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-base lg:flex-row">
      {/* ── Header (top bar below lg, left sidebar from lg up) ───────── */}
      <header className="order-last shrink-0 border-t border-line bg-base lg:order-0 lg:w-80 lg:overflow-y-auto lg:border-t-0 lg:border-r xl:w-96">
        <div className="flex flex-col px-5 pb-10 pt-4 sm:px-8 sm:pt-6 lg:min-h-full lg:py-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="group inline-flex items-center gap-2 font-sans text-[0.875rem] font-medium text-muted transition-colors duration-200 hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
              Back
            </Link>
            {visitPill("inline-flex", "Visit")}
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:mt-8 lg:flex-col lg:items-start lg:gap-y-2">
            <h1 className="text-[1.375rem] font-bold leading-tight tracking-[-0.01em] text-ink sm:text-[1.75rem]">
              {project.title}
            </h1>
            <span className="tnum font-sans text-[0.8125rem] text-faint">
              {project.tech.join(" · ")}
            </span>
          </div>

          {project.tagline && (
            <p className="mt-1.5 max-w-[68ch] text-pretty text-[0.9375rem] leading-relaxed text-muted sm:text-[1rem] lg:mt-3">
              {project.tagline}
            </p>
          )}

          {/* Previous / next project. Flows after the text on mobile; pinned to
              the bottom of the full-height sidebar from lg up. */}
          {(prev || next) && (
            <nav
              aria-label="Project navigation"
              className="mt-8 flex items-center justify-end gap-2 lg:mt-auto lg:justify-between"
            >
              {prev && navLink(prev, "prev")}
              {next && navLink(next, "next")}
            </nav>
          )}
        </div>
      </header>
      {/* ── Full-screen canvas ───────────────────────────────────────── */}
      <div className="project-canvas relative min-h-0 flex-1 lg:min-w-0">
        <ProjectCanvas project={project} />
      </div>
    </div>
  );
}
