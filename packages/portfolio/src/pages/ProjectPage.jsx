import { Link } from "react-router-dom";
import ProjectCanvas from "../components/ProjectCanvas";
import { ArrowLeft, ArrowUpRight } from "../components/ui";

/* Sidebar meta term — small, tracked, sans caps. */
const MetaLabel = ({ children }) => (
  <dt className="font-sans text-[0.6875rem] font-bold uppercase tracking-[0.09em] text-faint">
    {children}
  </dt>
);

export default function ProjectPage({ project }) {
  return (
    <div className="min-h-screen pb-24">
      {/* ── Header: back link, title, tagline, visit button ─────────── */}
      <header className="mx-auto w-full max-w-5xl px-5 sm:px-6 pt-10 sm:pt-14">
        <Link
          to="/"
          className="rise d1 group inline-flex items-center gap-2 font-sans text-[0.9375rem] font-medium text-muted transition-colors duration-200 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back to projects
        </Link>

        <div className="rise d2 mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[2rem] font-bold leading-[1.05] tracking-[-0.01em] text-ink sm:text-[2.75rem]">
              {project.title}
            </h1>
            {project.tagline && (
              <p className="mt-4 max-w-[54ch] text-pretty text-[1.0625rem] leading-relaxed text-muted">
                {project.tagline}
              </p>
            )}
          </div>

          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-line-strong px-4 py-2 font-sans text-[0.875rem] font-medium text-ink transition-colors duration-200 hover:bg-surface sm:self-auto"
            >
              {project.linkLabel || "Visit"}
              <ArrowUpRight className="h-3.5 w-3.5 text-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
            </a>
          )}
        </div>
      </header>

      {/* ── Canvas hero ─────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-5xl px-5 sm:px-6 pt-10">
        <div
          className="rise d3 overflow-hidden rounded-2xl border border-line"
          style={{ height: "min(58vh, 460px)" }}
        >
          <ProjectCanvas project={project} />
        </div>
        <p className="mt-3 text-[0.8125rem] text-faint">
          An interactive board — pan, zoom and rearrange. Rendered with the
          embeddable <code className="font-sans">{"<Canvas />"}</code> component.
        </p>
      </section>

      {/* ── Details grid ────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-5xl px-5 sm:px-6 pt-16">
        <div className="grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-[minmax(0,1fr)_15rem]">
          {/* Main column */}
          <div className="min-w-0">
            <div className="mb-5 flex items-center gap-5">
              <h2 className="section-label whitespace-nowrap">Overview</h2>
              <span className="section-rule flex-1" aria-hidden="true" />
            </div>

            <div className="max-w-[62ch] space-y-4 text-pretty text-[1.0625rem] leading-relaxed text-muted">
              {(project.description || []).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {project.highlights?.length > 0 && (
              <>
                <h3 className="mb-4 mt-10 font-sans text-[0.8125rem] font-bold tracking-[0.02em] text-accent">
                  Highlights
                </h3>
                <ul className="max-w-[62ch] space-y-3">
                  {project.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="relative pl-6 text-[1.0625rem] leading-relaxed text-muted"
                    >
                      <span
                        className="absolute left-0 top-[0.7em] h-1.5 w-1.5 rounded-full bg-accent"
                        aria-hidden="true"
                      />
                      {h}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="md:border-l md:border-line md:pl-8">
            <dl className="grid grid-cols-2 gap-y-7 gap-x-6 md:grid-cols-1">
              {project.role && (
                <div>
                  <MetaLabel>Role</MetaLabel>
                  <dd className="mt-1.5 text-[0.9375rem] text-muted">{project.role}</dd>
                </div>
              )}
              {project.year && (
                <div>
                  <MetaLabel>Year</MetaLabel>
                  <dd className="mt-1.5 tnum text-[0.9375rem] text-muted">{project.year}</dd>
                </div>
              )}
              <div className="col-span-2 md:col-span-1">
                <MetaLabel>Stack</MetaLabel>
                <dd className="mt-2.5 flex flex-wrap gap-1.5">
                  {project.tech.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-line bg-surface px-2 py-1 font-sans text-[0.8125rem] text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </dd>
              </div>
              {project.link && (
                <div className="col-span-2 md:col-span-1">
                  <MetaLabel>Links</MetaLabel>
                  <dd className="mt-2 flex flex-col gap-1.5">
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ulink w-fit font-sans text-[0.9375rem]"
                    >
                      {project.linkLabel || "Live site"}
                    </a>
                    {project.repo && (
                      <a
                        href={project.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ulink w-fit font-sans text-[0.9375rem]"
                      >
                        Source
                      </a>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </div>
      </section>
    </div>
  );
}
