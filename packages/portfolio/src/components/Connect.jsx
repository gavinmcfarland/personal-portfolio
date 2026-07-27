/* The tail of the manual: SEE ALSO cross-references. The man-style section
   suffixes — (1), (7) — were dropped; the labels stand on their own. AUTHOR
   (the address to report issues to) used to close the section; it was removed
   from Home and is archived on /backup. */

const socials = [
  { label: "github", href: "https://github.com/gavinmcfarland" },
  { label: "figma", href: "https://www.figma.com/@gavinmcfarland" },
  { label: "x", href: "https://x.com/gavinmcfarland" },
  { label: "linkedin", href: "https://www.linkedin.com/in/gavinmcfarland" },
];

const Connect = () => (
  <>
    <h2 id="connect" className="section-label reveal">
      See also
    </h2>
    {/* Not a `.lede` — what follows is a run of cross-references set as prose,
        not a block that needs introducing, so the pair takes the ordinary
        `p.indent + p.indent` step rather than .lede's wider one. */}
    <p className="indent reveal max-w-measure text-muted">
      Looking for the next interesting thing to build.
    </p>

    <p className="indent reveal">
      {socials.map((s, i) => (
        <span key={s.label}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="xref"
          >
            {s.label}
          </a>
          {i < socials.length - 1 ? <span className="text-faint">, </span> : null}
        </span>
      ))}
    </p>
  </>
);

export default Connect;
