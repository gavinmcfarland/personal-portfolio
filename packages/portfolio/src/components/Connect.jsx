/* The tail of the manual: SEE ALSO cross-references. Section numbers follow the
   man tradition — (1) is where the commands live, (7) is conventions and
   everything social. AUTHOR (the address to report issues to) used to close the
   section; it was removed from Home and is archived on /backup. */

const socials = [
  { label: "github", href: "https://github.com/gavinmcfarland", sec: 1 },
  { label: "x", href: "https://x.com/gavinmcfarland", sec: 7 },
  { label: "linkedin", href: "https://www.linkedin.com/in/gavinmcfarland", sec: 7 },
];

const Connect = () => (
  <>
    <h2 id="connect" className="section-label reveal">
      See also
    </h2>
    <p className="lede indent reveal max-w-measure text-muted">
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
          <span className="xref__sec">({s.sec})</span>
          {i < socials.length - 1 ? <span className="text-faint">, </span> : null}
        </span>
      ))}
    </p>
  </>
);

export default Connect;
