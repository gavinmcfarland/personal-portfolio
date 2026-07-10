import { Link } from "react-router-dom";
import ProjectCanvas from "../components/ProjectCanvas";
import { ArrowLeft, ArrowUpRight } from "../components/ui";

/* Full-screen project view: a compact, fixed header carrying the back link,
   title, a short description and the project link — with the interactive canvas
   filling every remaining pixel below it. The whole view locks to the viewport
   (fixed inset-0) so nothing scrolls; you pan the canvas instead. */
export default function ProjectPage({ project }) {
  /* The visit pill renders in two spots: on phones it shares the top row with
     the back link so the title and tagline can span the full width; from `sm`
     up it sits to the right of the text block. The right margin keeps it clear
     of the fixed theme toggle in the corner. */
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
    <div className="fixed inset-0 flex flex-col bg-base">
      {/* ── Fixed header ─────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-line bg-base">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 pb-6 pt-6 max-sm:pt-4">
          <div className="flex items-start justify-between gap-4 sm:gap-6">
            {/* Left: back (+ visit on phones), title, short description */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <Link
                  to="/"
                  className="group inline-flex items-center gap-2 font-sans text-[0.875rem] font-medium text-muted transition-colors duration-200 hover:text-ink"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  Back
                </Link>
                {visitPill("inline-flex sm:hidden mr-12", "Visit")}
              </div>

              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-[1.375rem] font-bold leading-tight tracking-[-0.01em] text-ink sm:text-[1.75rem]">
                  {project.title}
                </h1>
                <span className="tnum font-sans text-[0.8125rem] text-faint">
                  {project.tech.join(" · ")}
                </span>
              </div>

              {project.tagline && (
                <p className="mt-1.5 max-w-[68ch] text-pretty text-[0.9375rem] leading-relaxed text-muted sm:text-[1rem]">
                  {project.tagline}
                </p>
              )}
            </div>

            {/* Right (sm+): visit link beside the text block */}
            {visitPill("hidden sm:inline-flex sm:mr-12", project.linkLabel || "Visit")}
          </div>
        </div>
      </header>
      {/* ── Full-screen canvas ───────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        <ProjectCanvas project={project} />
      </div>
    </div>
  );
}
