const Intro = () => {
  return (
    <header className="pt-24 sm:pt-28">
      {/* Monogram — swap for a real photo when you have one */}
      <div
        className="mark rise"
        aria-hidden="true"
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: "9999px",
          fontSize: "0.9375rem",
        }}
      >
        GM
      </div>

      <h1 className="rise d1 mt-5 text-[2.25rem] font-bold leading-[1.05] tracking-[-0.01em] text-ink sm:text-[2.75rem]">
        Gavin McFarland
      </h1>
      <p className="rise d1 mt-2 font-sans text-[0.9375rem] text-muted">
        Developer &amp; product designer
      </p>

      <div className="rise d2 mt-7 max-w-[48ch] space-y-4 text-pretty text-[1.0625rem] leading-relaxed text-muted">
        <p>
          I build tools that take the friction out of building things —
          developer tooling, Figma plugins and interactive products. Full-stack,
          with a background in product design and user research.
        </p>
        <p>
          Currently freelancing and building{" "}
          <a
            href="https://awenate.com"
            target="_blank"
            rel="noopener noreferrer"
            className="ulink font-medium"
          >
            Awenate
          </a>
          . Previously, I worked at{" "}
          <a
            href="https://lovable.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="ulink font-medium"
          >
            Lovable
          </a>
          .
        </p>
      </div>
    </header>
  );
};

export default Intro;
