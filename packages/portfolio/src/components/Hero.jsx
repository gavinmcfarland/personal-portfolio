const Hero = () => {
  return (
    <section id="top" className="px-4 pt-32 pb-16 sm:px-6 md:pt-40 md:pb-24">
      <div className="mx-auto max-w-[1200px]">
        {/* Headline */}
        <h1 className="rise d1 mt-6 max-w-[15ch] text-balance font-display font-bold leading-[1.03] tracking-[-0.03em] text-ink text-[clamp(2.75rem,7vw,4.75rem)]">I build tools that take the friction out of <span className="text-accent">building things</span>.</h1>
        <p className="rise d3 mt-8 max-w-xl text-pretty text-lg leading-relaxed text-muted">I'm a Fullstack Enginineer with a background in Product Design.</p>
        {/* Metrics */}
        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
          {/* Primary CTA tile */}
          <a
            href="#work"
            className="rise d4 group col-span-2 flex flex-col justify-between overflow-hidden rounded-[1.25rem] bg-accent pt-9 pr-9 pb-9 pl-9"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[color:var(--accent-ink)]/70">
              Selected work
            </span>
            <span className="mt-10 flex items-end justify-between">
              <span className="font-display text-2xl font-bold leading-none text-[color:var(--accent-ink)] md:text-3xl">See my work</span>
              <svg
                className="h-8 w-8 text-[color:var(--accent-ink)] transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M7 17L17 7M17 7H8M17 7v9"
                />
              </svg>
            </span>
          </a>

          {/* Stat tiles */}
          <div className="rise d4 tile flex flex-col justify-between gap-6 pt-9 pr-9 pb-9 pl-9 rounded-2xl">
            <span className="kicker">Reach</span>
            <div>
              <div className="font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">
                100K+
              </div>
              <div className="mt-1 text-[13px] text-muted">users worldwide</div>
            </div>
          </div>

          <div className="rise d5 tile flex flex-col justify-between gap-6 pt-9 pr-9 pb-9 pl-9 rounded-2xl">
            <span className="kicker rotate-[0deg]">Shipped</span>
            <div>
              <div className="font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">
                10+
              </div>
              <div className="mt-1 text-[13px] text-muted">
                open-source projects
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
