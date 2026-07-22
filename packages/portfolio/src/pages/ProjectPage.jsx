import { Link } from "react-router-dom";
import ProjectCanvas from "../components/ProjectCanvas";
import { ArrowLeft, ArrowUpRight } from "../components/ui";

/* Full-screen project view. Below `lg` a compact header sits above the canvas;
   from `lg` up the same info becomes a full-height sidebar on the left, with
   the interactive canvas filling every remaining pixel beside it. The whole
   view locks to the viewport (fixed inset-0) so nothing scrolls; you pan the
   canvas instead. */
export default function ProjectPage({ project }) {
  /* The visit pill renders in two spots: below `lg` it shares the top row with
     the back link so the title and tagline can span the full width (the right
     margin keeps it clear of the fixed theme toggle in the corner); from `lg`
     up it sits below the text block in the sidebar. */
  const visitPill = (visibility, label) =>
    project.link && (
      <a
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`group shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 font-sans text-[0.8125rem] font-medium text-ink transition-colors duration-200 hover:bg-surface sm:text-[0.875rem] ${visibility}`}
      >
        {label}
        <ArrowUpRight className="h-3.5 w-3.5 text-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
      </a>
    );

  return (
    <div className="absolute inset-0 flex flex-col bg-base lg:flex-row">
      {/* ── Header (top bar below lg, left sidebar from lg up) ───────── */}
      <header className="shrink-0 border-b border-line bg-base lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r xl:w-96">
        <div className="flex flex-col px-5 pb-6 pt-4 sm:px-8 sm:pt-6 lg:min-h-full lg:py-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="group inline-flex items-center gap-2 font-sans text-[0.875rem] font-medium text-muted transition-colors duration-200 hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
              Back
            </Link>
            {visitPill("inline-flex lg:hidden mr-12", "Visit")}
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

          {/* Visit link below the text block (lg+ only) */}
          {visitPill(
            "hidden lg:inline-flex lg:mt-6 lg:self-start",
            project.linkLabel || "Visit",
          )}
        </div>
      </header>
      {/* ── Full-screen canvas ───────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1 lg:min-w-0">
        <ProjectCanvas project={project} />
      </div>
    </div>
  );
}
