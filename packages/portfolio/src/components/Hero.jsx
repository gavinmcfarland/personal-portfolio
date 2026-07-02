const Hero = () => {
  return (
    <section id="top" className="px-4 pt-32 pb-16 sm:px-6 md:pt-40 md:pb-24">
      <div className="mx-auto max-w-[1200px]">
        {/* Headline */}
        <h1 className="rise d1 mt-6 max-w-[15ch] text-balance font-display font-bold leading-[1.03] tracking-[-0.03em] text-ink text-[clamp(2.75rem,7vw,4.75rem)]">I make tools that take the friction out of <span className="text-accent">building things</span>.</h1>
        <p className="rise d3 mt-8 max-w-xl text-pretty text-lg leading-relaxed text-muted">Fullstack Engineer with a background in Product Design.</p>
        {/* Metrics */}
      </div>
    </section>
  );
};

export default Hero;
