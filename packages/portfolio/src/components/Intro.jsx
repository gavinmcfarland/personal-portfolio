const Intro = () => {
  return (
    <header className="pt-24 sm:pt-28">
      {/* Monogram — swap for a real photo when you have one */}
      <h1 className="rise d1 mt-5 text-[2.25rem] font-bold leading-[1.05] tracking-[-0.01em] text-ink sm:text-[2.75rem]">
        Gavin McFarland
      </h1>
      <div className="test rise d2 mt-7 max-w-lg space-y-4 text-pretty text-[1.0625rem] leading-relaxed text-muted pb-[20px]">
        <p>Designer and full-stack engineer building tools and web applications. Background in product design and user research.</p>
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
          . Previously, at{" "}
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
