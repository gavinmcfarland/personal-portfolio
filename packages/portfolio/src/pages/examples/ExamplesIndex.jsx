import { Link } from "react-router-dom";
import Seo from "../../components/Seo";
import DocShell from "../../components/DocShell";
import { Section } from "../../components/ui";

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
      <header className="pt-10">
        <h2 className="section-label mb-4">NAME</h2>
        <div className="indent">
          <p className="wordmark text-[1.75rem] sm:text-[2.25rem]">Examples</p>
          <p className="mt-3 max-w-[60ch] text-muted">
            Prototype pages that put the printed-manual patterns to work on real
            content &mdash; a case study, a changelog and a colophon. Rough drafts
            to judge the fit, not finished pages.
          </p>
        </div>
      </header>

      <Section id="pages" label="Contents">
        <ul className="leaders max-w-[52ch]">
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
      </Section>
    </DocShell>
  );
}
