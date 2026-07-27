import DitherVideo from "./DitherVideo";
import clip from "../assets/dither-source-2.webm";

/* The opening of the manual: NAME, then DESCRIPTION. SYNOPSIS (the invocation
   with its optional flags) still stands out of the page and is archived on
   /backup.

   NAME is back, but not the way it left. The archived copy set the name in
   `.wordmark` — 36px, the one rule allowed to break the site's flat-type ceiling
   — and it read as a hero banner rather than a manual. This is body text, and
   the name alone: no `gavin —` command alias, no whatis gloss. DESCRIPTION says
   what the work is on the very next line, so a gloss here only said it twice. */

/* The clip beside the name. What ships is the SOURCE recording; the dither is
   re-cut live at the size this box is, every frame (see DitherVideo.jsx), so
   the dots stay square at 100px and would stay square at any other size. */

const Intro = () => (
  <header className="pt-(--sp-12) sm:pt-(--sp-16)">
    {/* No NAME label, and flush to the content column rather than hung at the
        indent stop — the clip and the name are the masthead, not a section
        body. The `id` moves here off the deleted heading so CONTENTS' §1 link
        still lands, and takes the scroll offset the label used to carry. */}
    <div
      id="name"
      className="rise d1 flex items-center gap-(--sp-4) scroll-mt-(--sp-16)"
    >
      <DitherVideo
        src={clip}
        className="size-[100px] shrink-0 -scale-x-100"
        cell={2}
        method="floyd"
        fit="cover"
        fps={8}
        contrast={1.2}
        range={[0.12, 0.92]}
        autoLevels
      />
      <p>Gavin McFarland</p>
    </div>

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
