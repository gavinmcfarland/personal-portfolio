/* The opening of the manual: DESCRIPTION. NAME and SYNOPSIS used to stand above
   it (the wordmark, its whatis gloss, and the invocation with its optional
   flags); both were removed from Home and are archived on /backup. */

const Intro = () => (
  <header className="pt-(--sp-12) sm:pt-(--sp-16)">
    <h2 id="description" className="section-label">
      DESCRIPTION
    </h2>
    {/* Both paragraphs carry the same `rise d1` delay, so they still come up as
        one movement without a wrapper to group them; the step between them is
        `p.indent + p.indent`. */}
    <p className="indent rise d1 max-w-measure text-muted">
      Designer and full-stack engineer building tools and web applications.
      Background in product design and user research.
    </p>
    <p className="indent rise d1 max-w-measure text-muted">
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
  </header>
);

export default Intro;
