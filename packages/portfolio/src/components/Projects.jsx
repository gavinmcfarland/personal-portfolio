import { projects } from "../data/projects";
import { useReveal } from "../hooks/useReveal";

const ArrowUpRight = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M7 17L17 7M17 7H8M17 7v9"
    />
  </svg>
);

/* ── Abstract motifs (pure CSS/SVG, per project category) ──────────
   Each one is a quiet, on-brand illustration of what the tool does —
   no external assets, fully theme-reactive. Work in progress; easy to
   swap or extend per project. */

const TerminalMotif = () => (
  <div className="motif h-full min-h-[200px]">
    <div className="motif-grid" />
    <div className="relative flex h-full flex-col justify-center gap-1.5 p-6 font-mono text-[12px]">
      <div><span className="text-accent">$</span> <span className="text-ink">npx plugma dev</span></div>
      <div className="text-accent">✓ hmr connected</div>
      <div className="text-faint">▸ localhost:4000</div>
      <div className="text-faint">▸ watching for changes<span className="caret" /></div>
    </div>
  </div>
);

const MappingMotif = () => (
  <div className="motif h-full min-h-[200px]">
    <div className="motif-grid" />
    <svg
      className="relative h-full w-full"
      viewBox="0 0 200 120"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect x="24" y="26" width="70" height="46" rx="6" stroke="var(--line-strong)" />
      <rect x="118" y="44" width="58" height="14" rx="3" fill="var(--accent)" opacity="0.9" />
      <line x1="94" y1="49" x2="118" y2="51" stroke="var(--accent)" strokeDasharray="3 3" />
      <circle cx="94" cy="49" r="3" fill="var(--accent)" />
      <circle cx="118" cy="51" r="3" fill="var(--accent)" />
      <path d="M40 44 h20 M40 52 h30 M40 60 h14" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </div>
);

const TableMotif = () => (
  <div className="motif h-full min-h-[200px]">
    <div className="motif-grid" />
    <div className="relative grid h-full grid-cols-4 grid-rows-3 gap-px p-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[3px]"
          style={{
            background:
              i === 0 || i === 5
                ? "color-mix(in srgb, var(--accent) 80%, transparent)"
                : "var(--line)",
          }}
        />
      ))}
    </div>
  </div>
);

const PromptMotif = () => (
  <div className="motif h-full min-h-[200px]">
    <div className="motif-grid" />
    <div className="relative flex h-full flex-col justify-center gap-3 p-7 font-mono text-[12px]">
      {[
        { on: false, label: "text prompt" },
        { on: true, label: "radio select" },
        { on: false, label: "multi-select" },
      ].map((r) => (
        <div key={r.label} className="flex items-center gap-2.5">
          <span
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full border"
            style={{
              borderColor: r.on ? "var(--accent)" : "var(--line-strong)",
            }}
          >
            {r.on && (
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            )}
          </span>
          <span className={r.on ? "text-ink" : "text-faint"}>{r.label}</span>
        </div>
      ))}
    </div>
  </div>
);

const BrowserMotif = () => (
  <div className="motif h-full min-h-[200px]">
    <div className="motif-grid" />
    <div className="relative flex h-full flex-col p-6">
      <div className="flex items-center gap-1.5 rounded-t-md border border-line bg-surface-2 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[color:var(--faint)]" />
        <span className="h-2 w-2 rounded-full bg-[color:var(--faint)]" />
        <span className="ml-2 h-2 flex-1 rounded-full bg-[color:var(--line-strong)]" />
      </div>
      <div className="flex flex-1 items-center justify-center rounded-b-md border border-t-0 border-line font-mono text-[11px] text-accent">
        &lt;/&gt; run instantly
      </div>
    </div>
  </div>
);

/* Richer terminal for the featured card — fills the taller panel. */
const FeaturedMotif = () => (
  <div className="motif flex h-full min-h-[280px] flex-col">
    <div className="terminal-bar shrink-0 !border-b-0" style={{ background: "transparent" }}>
      <span className="tdot" style={{ background: "#FF5F57" }} />
      <span className="tdot" style={{ background: "#FEBC2E" }} />
      <span className="tdot" style={{ background: "#28C840" }} />
      <span className="ml-2 font-mono text-[11px] tracking-[0.08em] text-faint">
        my-plugin — plugma
      </span>
    </div>
    <div className="motif-grid" />
    <div className="relative flex flex-1 flex-col justify-center gap-1.5 px-7 pb-8 font-mono text-[13px] leading-relaxed">
      <div><span className="text-accent">$</span> <span className="text-ink">npm create plugma@latest</span></div>
      <div className="text-faint">✔ framework · <span className="text-ink">React</span></div>
      <div className="text-faint">✔ scaffolding project</div>
      <div className="mt-2"><span className="text-accent">$</span> <span className="text-ink">npx plugma dev</span></div>
      <div className="text-accent">✓ bundled in 214ms</div>
      <div className="text-accent">✓ hot module reloading connected</div>
      <div className="text-faint">▸ preview   localhost:4000</div>
      <div className="text-faint">▸ watching for changes<span className="caret" /></div>
    </div>
  </div>
);

const motifs = {
  plugma: TerminalMotif,
  awenate: MappingMotif,
  "table-creator": TableMotif,
  "table-widget": TableMotif,
  askeroo: PromptMotif,
  figlet: BrowserMotif,
};

const Motif = ({ id }) => {
  const Component = motifs[id] || TerminalMotif;
  return <Component />;
};

const CardChrome = ({ index }) => (
  <div className="flex items-center justify-between">
    <span className="font-mono text-sm text-faint transition-colors duration-300 group-hover:text-accent">
      {String(index).padStart(2, "0")}
    </span>
    <ArrowUpRight className="h-4 w-4 text-faint transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
  </div>
);

const Projects = () => {
  const ref = useReveal();

  const featured = projects.find((p) => p.id === "plugma");
  const rest = projects.filter((p) => p.id !== "plugma");

  return (
    <section id="work" className="scroll-mt-24 px-4 py-20 sm:px-6 md:py-28" ref={ref}>
      <div className="mx-auto max-w-[1200px]">
        {/* Section header */}
        <div className="reveal flex items-end justify-between gap-6">
          <div>
            <span className="kicker">Selected work</span>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-[-0.025em] text-ink md:text-5xl">
              Tools &amp; plugins
            </h2>
          </div>
          <span className="hidden font-mono text-[12px] text-faint sm:block">
            {projects.length} projects
          </span>
        </div>

        {/* ── Featured (Plugma) ── */}
        {featured && (
          <a
            href={featured.link}
            target="_blank"
            rel="noopener noreferrer"
            className="reveal group glow-hover tile mt-12 grid grid-cols-1 overflow-hidden rounded-3xl md:grid-cols-2"
          >
            <div className="order-2 flex flex-col p-8 md:order-1 md:p-11">
              <CardChrome index={1} />
              <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--accent-ink)]">
                Flagship · 100K+ users
              </span>
              <h3 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">
                {featured.title}
              </h3>
              <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.1em] text-accent">
                {featured.tagline}
              </p>
              <p className="mt-5 max-w-md text-pretty leading-relaxed text-muted">
                {featured.description}
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {featured.tech.map((tech) => (
                  <span key={tech} className="chip">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2">
              <FeaturedMotif />
            </div>
          </a>
        )}

        {/* ── Grid — the rest ── */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((project, index) => {
            const CardTag = project.link ? "a" : "div";
            return (
              <CardTag
                key={project.id}
                {...(project.link
                  ? {
                      href: project.link,
                      target: "_blank",
                      rel: "noopener noreferrer",
                    }
                  : {})}
                className="reveal group glow-hover tile flex flex-col overflow-hidden rounded-2xl"
              >
                <Motif id={project.id} />
                <div className="flex flex-1 flex-col p-6">
                  <CardChrome index={index + 2} />
                  <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-ink">
                    {project.title}
                  </h3>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-accent">
                    {project.tagline}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {project.tech.map((tech) => (
                      <span key={tech} className="chip">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </CardTag>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Projects;
