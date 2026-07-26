import Seo from "../../components/Seo";
import DocShell from "../../components/DocShell";

/* Example: a colophon / "uses" page — the one page where an index over a small
   set still reads as intentional, because a colophon is a reference list. The
   build is a hierarchical outline; typography/colour are hanging pairs; credits
   are footnotes. */

const BUILD = [
  { level: 1, mark: "1", term: "Interface" },
  { level: 2, mark: "a", body: "React + React Router" },
  { level: 2, mark: "b", body: "Vite — build and dev server" },
  { level: 2, mark: "c", body: "Tailwind CSS on a small set of design tokens" },
  { level: 1, mark: "2", term: "Type" },
  { level: 2, mark: "a", body: "Spline Sans Mono — the whole document, man-page style" },
  { level: 1, mark: "3", term: "Canvas" },
  { level: 2, mark: "a", body: "A custom embeddable canvas engine (the Scratch board)" },
  { level: 1, mark: "4", term: "Hosting" },
  { level: 2, mark: "a", body: "Static build on a CDN" },
];

const SPEC = [
  { t: "TYPEFACE", d: "Spline Sans Mono — one face for prose, code and headings" },
  { t: "MEASURE", d: "~64 characters; 1.7 line height" },
  { t: "ACCENT", d: "Vermilion #c8341a (light) / #e0563c (dark)" },
  { t: "GROUND", d: "Cool steel (light) / warm graphite (dark)" },
];

const LEVEL_CLASS = { 1: "", 2: "man-outline--2", 3: "man-outline--3" };

export default function Colophon() {
  return (
    <DocShell>
      <Seo
        title="Colophon"
        description="How this site is built, set out as a manual's colophon."
      />

      <header className="pt-(--sp-8)">
        <h2 className="section-label">NAME</h2>
        <p className="indent wordmark">Colophon</p>
        <p className="indent max-w-measure text-muted">
          What this site is made of. The whole thing is set as a manual: one
          monospace face, flat fills, hairline rules, and a single working
          accent. The system is called <span className="text-ink">Enamel</span>
          <sup className="fn-ref">3</sup> &mdash; vitreous enamel on steel.
        </p>
      </header>

      <h2 id="build" className="section-label reveal">
        Built with
      </h2>
      <div className="indent reveal man-outline max-w-measure">
        {BUILD.map((r, i) => (
          <div key={i} className={`man-outline__row ${LEVEL_CLASS[r.level]}`}>
            <span className="man-outline__mk">{r.mark}</span>
            <span>{r.term ? <b>{r.term}</b> : r.body}</span>
          </div>
        ))}
      </div>

      <h2 id="typography" className="section-label reveal">
        Typography &amp; colour
      </h2>
      <dl className="indent reveal max-w-measure space-y-(--sp-2)">
        {SPEC.map((s) => (
          <div key={s.t} className="tp">
            <dt>{s.t}</dt>
            <dd className="text-muted">{s.d}</dd>
          </div>
        ))}
      </dl>

      <h2 id="credits" className="section-label reveal">
        Credits
      </h2>
      <div className="indent reveal footnotes max-w-measure">
        <div className="footnotes__rule" aria-hidden="true" />
        <p className="footnote">
          <sup>1</sup> <span className="text-ink">Spline Sans Mono</span> — SIL
          Open Font License.
        </p>
        <p className="footnote">
          <sup>2</sup> <span className="text-ink">Canvas engine</span> — the same
          component published as{" "}
          <span className="text-ink">@gavinmcfarland/canvas</span>.
        </p>
        <p className="footnote">
          <sup>3</sup> <span className="text-ink">Enamel</span> — the design
          system for this site: flat fills, hairline edges, a graphite ground and
          vermilion as the single accent.
        </p>
      </div>

      <h2 id="seealso" className="section-label reveal">
        See also
      </h2>
      <p className="indent reveal">
        <a
          href="https://github.com/gavinmcfarland"
          target="_blank"
          rel="noopener noreferrer"
          className="xref"
        >
          source
        </a>
        <span className="xref__sec">(1)</span>
      </p>
    </DocShell>
  );
}
