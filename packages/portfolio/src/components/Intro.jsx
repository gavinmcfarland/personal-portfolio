/* The opening of the manual: DESCRIPTION. NAME and SYNOPSIS used to stand above
   it (the wordmark, its whatis gloss, and the invocation with its optional
   flags); both were removed from Home and are archived on /backup. */

const Intro = () => (
  <header className="pt-16 sm:pt-20">
    <section id="description" className="scroll-mt-24">
      <h2 className="section-label mb-4">DESCRIPTION</h2>
      <div className="indent rise d1 max-w-[64ch] text-muted">
        <p>
          Designer and full-stack engineer building tools and web applications.
          Background in product design and user research.
        </p>
        <p>
          Currently freelancing and building{" "}
          <a
            href="https://awenate.com"
            target="_blank"
            rel="noopener noreferrer"
            className="xref"
          >
            Awenate
          </a>
          . Previously, at{" "}
          <a
            href="https://lovable.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="xref"
          >
            Lovable
          </a>
          .
        </p>
      </div>
    </section>
  </header>
);

export default Intro;
