import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import ProjectCanvas from "../components/ProjectCanvas";
import { ArrowLeft, ArrowRight, ArrowUpRight, blurOnPointerClick } from "../components/ui";
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
        onClick={blurOnPointerClick}
        className={`group shrink-0 items-center gap-1 font-sans text-3 font-medium text-muted transition-colors duration-200 hover:text-ink sm:text-4 ${visibility}`}
      >
        {label}
        {/* Sized and coloured like the Back arrow across the row: h-4 w-4, and
            no colour of its own so it inherits the link's muted ink rather than
            sitting a step fainter than its own label. */}
        <ArrowUpRight className="h-4 w-4 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
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
        onClick={blurOnPointerClick}
        className={`flex min-w-0 items-center justify-center gap-1.5 rounded-[8px] border border-line px-2 font-sans text-4 font-medium text-muted transition-colors duration-150 hover:bg-hover hover:text-ink h-[38px] lg:w-[calc(50%-0.25rem)] lg:px-3 ${
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
      {/* Per-project OG card: the project name as the big line, its tagline as
          the supporting text. */}
      <Seo
        title={project.title}
        description={project.tagline || project.summary}
        type="article"
      />
      {/* ── Header (top bar below lg, left sidebar from lg up) ───────── */}
      <header className="order-last shrink-0 border-t border-line bg-base lg:order-0 lg:w-80 lg:overflow-y-auto lg:border-t-0 lg:border-r xl:w-96">
        <div className="flex flex-col px-5 pb-10 pt-4 sm:px-8 sm:pt-6 lg:min-h-full lg:pb-[22px] lg:pt-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              onClick={blurOnPointerClick}
              className="group inline-flex items-center gap-2 font-sans text-4 font-medium text-muted transition-colors duration-200 hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
              Back
            </Link>
            {visitPill("inline-flex", "Visit")}
          </div>

          {/* The project title is the wordmark too, in its narrow-column cut —
              the sidebar is ~256px of content, so it stays at --text-6 rather
              than stepping up at `sm`.

              The title keeps `.wordmark`'s own bottom margin: because it is a
              flex item that margin cannot collapse with the tagline's, so the
              two add to 1½ lines. (A `mb-0` here would be dead code — app.css is
              unlayered, so it outranks any Tailwind margin utility, which live
              in @layer utilities.) */}
          <div className="mt-(--sp-2) flex flex-wrap items-baseline gap-x-3 lg:mt-(--sp-8) lg:flex-col lg:items-start">
            <h1 className="wordmark wordmark--narrow">{project.title}</h1>
            <span className="tnum font-sans text-3 text-faint">
              {project.tech.join(" · ")}
            </span>
          </div>

          {project.tagline && (
            <p className="mt-(--sp-2) max-w-measure text-pretty text-4 text-muted">
              {project.tagline}
            </p>
          )}

          {/* Previous / next project. Flows after the text on mobile; pinned to
              the bottom of the full-height sidebar from lg up. */}
          {(prev || next) && (
            <nav
              aria-label="Project navigation"
              className="mt-(--sp-8) flex items-center justify-end gap-2 lg:mt-auto lg:justify-between"
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
