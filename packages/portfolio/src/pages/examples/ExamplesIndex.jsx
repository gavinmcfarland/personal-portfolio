import { Link } from "react-router-dom";
import Seo from "../../components/Seo";
import DocShell from "../../components/DocShell";

/* The entry point for the prototype pages — itself a demonstration of the dotted
   leader lines, used here as a navigational contents list. */

const PAGES = [
  { label: "Case study — Plugma", to: "/examples/plugma", sec: "1" },
  { label: "Changelog — Plugma", to: "/examples/changelog", sec: "5" },
  { label: "Colophon — this site", to: "/examples/colophon", sec: "7" },
];

export default function ExamplesIndex() {
  return (
    <DocShell>
      <Seo
        title="Examples"
        description="Prototype pages exploring printed-manual content patterns with real content."
      />
      <header className="pt-(--sp-8)">
        <h2 className="section-label">NAME</h2>
        <p className="indent wordmark">Examples</p>
        <p className="indent max-w-measure text-muted">
          Prototype pages that put the printed-manual patterns to work on real
          content &mdash; a case study, a changelog and a colophon. Rough drafts
          to judge the fit, not finished pages.
        </p>
      </header>

      <h2 id="pages" className="section-label reveal">
        Contents
      </h2>
      <ul className="indent reveal leaders max-w-measure-narrow">
        {PAGES.map((p) => (
          <li key={p.to} className="leader">
            <Link to={p.to} className="xref">
              {p.label}
            </Link>
            <span className="leader__dots" aria-hidden="true" />
            <span className="leader__pg">
              <span className="sec">§</span>
              {p.sec}
            </span>
          </li>
        ))}
      </ul>
    </DocShell>
  );
}
