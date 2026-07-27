/* The opening of the manual: NAME, then DESCRIPTION. SYNOPSIS (the invocation
   with its optional flags) still stands out of the page and is archived on
   /backup.

   NAME is back, but not the way it left. The archived copy set the name in
   `.wordmark` — 36px, the one rule allowed to break the site's flat-type ceiling
   — and it read as a hero banner rather than a manual. This is body text, and
   the name alone: no `gavin —` command alias, no whatis gloss. DESCRIPTION says
   what the work is on the very next line, so a gloss here only said it twice. */

const Intro = () => (
  <header className="pt-(--sp-12) sm:pt-(--sp-16)">
    <h2 id="name" className="section-label">
      NAME
    </h2>
    <p className="indent rise d1">Gavin McFarland</p>

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
