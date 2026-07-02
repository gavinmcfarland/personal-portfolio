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

/* Layered isometric planes — an abstract "system / build stack".
   Slow ambient float + a breathing lime glow. No skeuomorphism. */
const HeroMark = () => {
  const A = 132; // half-width of each plane
  const B = 66; // half-height (2:1 isometric)
  const cx = 200;
  const layers = [96, 176, 256, 336]; // vertical centres
  const accentIndex = 2;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      <div className="hv-glow" />
      <svg
        viewBox="0 0 400 452"
        className="hv-float relative h-full w-full overflow-visible"
        aria-hidden="true"
      >
        {/* Vertical connectors — frame the stack as one extruded object */}
        <g stroke="var(--line)" strokeDasharray="2 6" strokeWidth="1">
          <line x1={cx - A} y1={layers[0]} x2={cx - A} y2={layers[3]} />
          <line x1={cx + A} y1={layers[0]} x2={cx + A} y2={layers[3]} />
          <line x1={cx} y1={layers[0] - B} x2={cx} y2={layers[3] + B} />
        </g>

        {layers.map((cy, i) => {
          const pts = `${cx},${cy - B} ${cx + A},${cy} ${cx},${cy + B} ${cx - A},${cy}`;
          const isAccent = i === accentIndex;
          return (
            <g key={cy}>
              <polygon
                points={pts}
                className={isAccent ? "hv-pulse" : undefined}
                fill={isAccent ? "var(--accent)" : "var(--surface)"}
                fillOpacity={isAccent ? 0.16 : 0.35}
                stroke={isAccent ? "var(--accent)" : "var(--line-strong)"}
                strokeWidth={isAccent ? 1.5 : 1}
                strokeLinejoin="round"
              />
              {/* corner + centre nodes */}
              <circle cx={cx} cy={cy} r={isAccent ? 4 : 2.5} fill={isAccent ? "var(--accent)" : "var(--faint)"} />
              <circle cx={cx - A} cy={cy} r="2" fill="var(--faint)" />
              <circle cx={cx + A} cy={cy} r="2" fill="var(--faint)" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const stats = [
  { value: "100K+", label: "users worldwide" },
  { value: "10+", label: "open-source projects" },
  { value: "5", label: "Figma plugins & widgets" },
];

const Hero = () => {
  return (
    <section id="top" className="px-4 pt-32 pb-20 sm:px-6 md:pt-40 md:pb-28">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
        {/* ── Left: statement ── */}
        <div>
          <span className="rise d1 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/60 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Fullstack Engineer × Product Design
          </span>

          <h1 className="rise d2 mt-7 max-w-[15ch] text-balance font-display font-bold leading-[1.02] tracking-[-0.03em] text-ink text-[clamp(2.75rem,6.5vw,4.75rem)]">
            I build tools that take the friction out of{" "}
            <span className="text-accent">building things</span>.
          </h1>

          <p className="rise d3 mt-7 max-w-md text-pretty text-lg leading-relaxed text-muted">
            Developer &amp; design tooling — CLIs, Figma plugins and npm packages
            used by thousands. Less setup, more shipping.
          </p>

          <div className="rise d4 mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#work"
              className="group inline-flex items-center gap-2.5 rounded-full bg-accent pl-6 pr-5 py-3.5 font-display text-base font-bold text-[color:var(--accent-ink)] transition-transform duration-300 hover:-translate-y-0.5"
            >
              See my work
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3.5 font-display text-base font-semibold text-ink transition-colors duration-300 hover:border-line-strong hover:bg-surface"
            >
              Get in touch
            </a>
          </div>

          {/* Stat strip — figures, not boxes */}
          <dl className="rise d5 mt-12 flex flex-wrap gap-x-10 gap-y-6 border-t border-line pt-8">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">
                  {s.value}
                </dt>
                <dd className="mt-1 max-w-[12ch] text-[13px] leading-snug text-faint">
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ── Right: the mark ── */}
        <div className="rise d3">
          <HeroMark />
        </div>
      </div>
    </section>
  );
};

export default Hero;
