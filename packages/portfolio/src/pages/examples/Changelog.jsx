import { Link } from "react-router-dom";
import Seo from "../../components/Seo";
import DocShell from "../../components/DocShell";
import { Section } from "../../components/ui";

/* Example: a changelog page — versioned release blocks in the manual's register.
   Categories (Added / Changed / Fixed / Breaking) tag each line; a breaking
   change carries a footnote to its migration note. Content is illustrative. */

const RELEASES = [
  {
    v: "v1.0.0",
    t: "Stable",
    d: "2024-11-02",
    changes: [
      { tag: "add", label: "Added", text: "Vue template alongside React and Svelte." },
      { tag: "chg", label: "Changed", text: "Configuration consolidated into a single plugma.config file." },
      { tag: "fix", label: "Fixed", text: "Hot-reload reconnect race on Windows sandboxes." },
      { tag: "brk", label: "Breaking", text: "Renamed the manifest `main` key to `entry`.", note: 1 },
    ],
  },
  {
    v: "v0.6.0",
    t: "",
    d: "2024-08-14",
    changes: [
      { tag: "add", label: "Added", text: "A release command that versions, tags and publishes in one step." },
      { tag: "chg", label: "Improved", text: "Cold-start time reduced by roughly 40%." },
    ],
  },
  {
    v: "v0.4.0",
    t: "",
    d: "2024-05-03",
    changes: [
      { tag: "add", label: "Added", text: "Svelte template." },
      { tag: "fix", label: "Fixed", text: "Sandbox failed to reconnect after a runtime error in plugin code." },
    ],
  },
  {
    v: "v0.1.0",
    t: "Initial",
    d: "2024-02-10",
    changes: [
      { tag: "add", label: "Added", text: "First public release: dev and build for React plugins." },
    ],
  },
];

export default function Changelog() {
  return (
    <DocShell>
      <Seo
        title="Plugma — changelog"
        description="A versioned changelog for the Plugma CLI, set in the manual's register."
      />

      <header className="pt-10">
        <h2 className="section-label mb-4">NAME</h2>
        <div className="indent">
          <p className="wordmark text-[1.75rem] sm:text-[2.25rem]">
            plugma <span className="text-faint">— changelog</span>
          </p>
          <p className="max-w-[60ch] text-muted">
            Notable changes to the Plugma CLI, newest first. Dates are release
            dates; versions follow semantic versioning.
          </p>
        </div>
      </header>

      <Section id="releases" label="History">
        <div className="max-w-[64ch]">
          {RELEASES.map((r) => (
            <div key={r.v} className="rel">
              <div className="rel__head">
                <span className="rel__v">{r.v}</span>
                {r.t && <span className="rel__t">{r.t}</span>}
                <span className="rel__d">{r.d}</span>
              </div>
              <ul className="rel__list">
                {r.changes.map((c, i) => (
                  <li key={i}>
                    <span className={`rel__tag ${c.tag}`}>{c.label}</span>
                    <span>
                      {c.text}
                      {c.note ? <sup className="fn-ref">{c.note}</sup> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="footnotes mt-8">
            <div className="footnotes__rule" aria-hidden="true" />
            <p className="footnote">
              <sup>1</sup> Migration: rename <span className="text-ink">main</span>{" "}
              to <span className="text-ink">entry</span> in your manifest. A
              codemod ships with the release.
            </p>
          </div>
        </div>
      </Section>

      <Section id="seealso" label="See also">
        <p className="leading-relaxed">
          <Link to="/examples/plugma" className="xref">
            case study
          </Link>
          <span className="xref__sec">(1)</span>
          <span className="text-faint">, </span>
          <a
            href="https://github.com/gavinmcfarland/plugma/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="xref"
          >
            releases
          </a>
          <span className="xref__sec">(1)</span>
        </p>
      </Section>
    </DocShell>
  );
}
