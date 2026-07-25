/* The opening of the manual: NAME, SYNOPSIS and DESCRIPTION, stacked the way
   roff lays them out. The wordmark stands in for the page's identity (a real
   man page leans on the running header for that); the NAME line glosses it as a
   command, and the SYNOPSIS states the invocation with its optional flags. */

/* The capability flags, reused verbatim by the EXAMPLES below — a project's
   `kind` maps to one of these. Kept here so SYNOPSIS and EXAMPLES never drift. */
const FLAGS = ["--tool", "--library", "--plugin"];

const Intro = () => (
  <header className="pt-16 sm:pt-20">
    <section id="name" className="scroll-mt-24">
      <h2 className="section-label mb-4">NAME</h2>
      <div className="indent">
        <p className="wordmark rise d1 text-[2rem] sm:text-[2.5rem]">
          Gavin McFarland
        </p>
        <p className="rise d1 mt-3 text-muted">
          <span className="font-bold text-ink">gavin</span> &mdash; designer and
          engineer; builds the tool that was missing
        </p>
      </div>
    </section>

    <section id="synopsis" className="mt-12 scroll-mt-24 sm:mt-16">
      <h2 className="section-label mb-4">SYNOPSIS</h2>
      <p className="indent rise d2 leading-[2.1]">
        <span className="font-bold text-ink">gavin</span>{" "}
        {FLAGS.map((f) => (
          <span key={f} className="whitespace-nowrap">
            <span className="bracket">[</span>
            <span className="flag">{f}</span>
            <span className="bracket">]</span>{" "}
          </span>
        ))}
        <span className="whitespace-nowrap">
          <span className="bracket">[</span>
          <span className="flag">problem ...</span>
          <span className="bracket">]</span>
        </span>
      </p>
    </section>

    <section id="description" className="mt-12 scroll-mt-24 sm:mt-16">
      <h2 className="section-label mb-4">DESCRIPTION</h2>
      <div className="indent rise d3 max-w-[64ch] space-y-4 text-muted">
        <p>
          <span className="font-bold text-ink">gavin</span> operates in the gap
          between a design file and a shipped product &mdash; design systems, the
          front-end that carries them into production, and the tooling that holds
          it together. Background in product design and user research.
        </p>
        <p>
          Currently freelancing and building{" "}
          <a
            href="https://awenate.com"
            target="_blank"
            rel="noopener noreferrer"
            className="xref"
          >
            awenate
          </a>
          . Previously at{" "}
          <a
            href="https://lovable.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="xref"
          >
            lovable
          </a>
          . When the tool doesn&rsquo;t exist yet, it gets built &mdash; see{" "}
          <a href="#examples" className="xref">
            EXAMPLES
          </a>
          .
        </p>
      </div>
    </section>
  </header>
);

export default Intro;
