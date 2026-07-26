import { Link } from "react-router-dom";
import Seo from "../../components/Seo";
import DocShell from "../../components/DocShell";
import { Section } from "../../components/ui";

/* Example: a project rendered as a full man page — the treatment proposed for
   case studies. Real Plugma content; the man-page sections carry it, footnotes
   qualify the claims, and the DECISION LOG is a hierarchical outline. */

const META = [
  { t: "ROLE", d: "Creator & maintainer" },
  { t: "YEAR", d: "2024 – present" },
  { t: "STACK", d: "Node.js, TypeScript, Vite" },
  { t: "STATUS", d: "Stable · v1.0" },
];

const COMMANDS = [
  { name: "dev", desc: "Start the plugin in watch mode with hot-module reloading between the UI and the Figma sandbox." },
  { name: "build", desc: "Produce a production bundle ready for the Figma Community." },
  { name: "preview", desc: "Serve the last build to check it before release." },
  { name: "release", desc: "Version, tag and publish in one step." },
];

const OUTLINE = [
  { level: 1, mark: "1", term: "Problem" },
  { level: 2, mark: "a", body: "Config-heavy setup before the first line of plugin code" },
  { level: 2, mark: "b", body: "Full-reload feedback loop loses UI state on every change" },
  { level: 1, mark: "2", term: "Approach" },
  { level: 2, mark: "a", body: "One command; convention over configuration" },
  { level: 2, mark: "b", body: "A dev server bridging the UI and the sandbox for true HMR" },
  { level: 3, mark: "i", body: "Preserve UI state across edits" },
  { level: 3, mark: "ii", body: "Reconnect the sandbox without a manual reload" },
  { level: 1, mark: "3", term: "Trade-offs" },
  { level: 2, mark: "a", body: "Opinionated defaults over maximum flexibility" },
  { level: 1, mark: "4", term: "Outcome" },
  { level: 2, mark: "a", body: "Zero-config start; framework-agnostic; Community-ready builds" },
];

const LEVEL_CLASS = { 1: "", 2: "man-outline--2", 3: "man-outline--3" };

export default function CaseStudy() {
  return (
    <DocShell>
      <Seo
        title="Plugma — case study"
        description="A zero-config CLI for building Figma plugins, written up as a man page."
        type="article"
      />

      <header className="pt-10">
        <section className="scroll-mt-24">
          <h2 className="section-label mb-4">NAME</h2>
          <div className="indent">
            <p className="wordmark text-[1.75rem] sm:text-[2.25rem]">Plugma</p>
            <p className="text-muted">
              <span className="font-bold text-ink">plugma</span> &mdash; a
              zero-config CLI for building Figma plugins
            </p>
          </div>
        </section>

        <section className="mt-12 scroll-mt-24">
          <h2 className="section-label mb-4">SYNOPSIS</h2>
          <p className="indent leading-[2.1]">
            <span className="font-bold text-ink">plugma</span>{" "}
            <span className="bracket">[</span>
            <span className="flag">dev</span> <span className="text-faint">|</span>{" "}
            <span className="flag">build</span> <span className="text-faint">|</span>{" "}
            <span className="flag">preview</span> <span className="text-faint">|</span>{" "}
            <span className="flag">release</span>
            <span className="bracket">]</span>{" "}
            <span className="whitespace-nowrap">
              <span className="bracket">[</span>
              <span className="flag">--framework react|svelte|vue</span>
              <span className="bracket">]</span>
            </span>
          </p>
        </section>
      </header>

      <Section id="manual" label="Manual">
        <dl className="space-y-3">
          {META.map((m) => (
            <div key={m.t} className="tp">
              <dt>{m.t}</dt>
              <dd className="text-muted">{m.d}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="description" label="Description">
        <div className="man-body max-w-[64ch] text-muted">
          <p>
            Building Figma plugins usually means wrestling with bundler config,
            manifest wiring and a slow reload-the-whole-thing feedback loop.{" "}
            <span className="font-bold text-ink">plugma</span> removes that
            friction: a single command scaffolds, runs and builds a plugin, with
            genuine hot-module reloading<sup className="fn-ref">1</sup> between the
            plugin UI and the Figma sandbox.
          </p>
          <p>
            It is framework-agnostic by design<sup className="fn-ref">2</sup>{" "}
            &mdash; the same workflow drops into React, Svelte or Vue projects
            &mdash; and ships production builds ready for the Figma Community with
            no extra setup.
          </p>
          <div className="footnotes">
            <div className="footnotes__rule" aria-hidden="true" />
            <p className="footnote">
              <sup>1</sup> Most plugin setups reload the whole iframe on every
              change; plugma preserves UI state across edits.
            </p>
            <p className="footnote">
              <sup>2</sup> Templates for React, Svelte and Vue ship in the box;
              the build path is identical for each.
            </p>
          </div>
        </div>
      </Section>

      <Section id="commands" label="Commands">
        <dl className="space-y-3">
          {COMMANDS.map((c) => (
            <div key={c.name} className="tp">
              <dt>
                <span className="prompt">$</span> plugma {c.name}
              </dt>
              <dd className="text-muted">{c.desc}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="examples" label="Examples">
        <div className="usage max-w-[64ch]">
          <div className="c"># scaffold and start developing</div>
          <div>
            <span className="prompt">$</span> npm create plugma@latest
          </div>
          <div>
            <span className="prompt">$</span> plugma dev --framework svelte
          </div>
          <div className="usage__gap" aria-hidden="true" />
          <div className="c"># build and publish</div>
          <div>
            <span className="prompt">$</span> plugma build
          </div>
          <div>
            <span className="prompt">$</span> plugma release
          </div>
        </div>
      </Section>

      <Section id="rationale" label="Decision log">
        <p className="mb-5 max-w-[62ch] text-muted">
          Why it is shaped the way it is &mdash; the nested outline is the
          argument.
        </p>
        <div className="man-outline max-w-[62ch]">
          {OUTLINE.map((r, i) => (
            <div key={i} className={`man-outline__row ${LEVEL_CLASS[r.level]}`}>
              <span className="man-outline__mk">{r.mark}</span>
              <span>{r.term ? <b>{r.term}</b> : r.body}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="seealso" label="See also">
        <p className="leading-relaxed">
          <a
            href="https://www.plugma.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="xref"
          >
            plugma.dev
          </a>
          <span className="xref__sec">(1)</span>
          <span className="text-faint">, </span>
          <a
            href="https://github.com/gavinmcfarland/plugma"
            target="_blank"
            rel="noopener noreferrer"
            className="xref"
          >
            github
          </a>
          <span className="xref__sec">(1)</span>
          <span className="text-faint">, </span>
          <Link to="/examples/changelog" className="xref">
            changelog
          </Link>
          <span className="xref__sec">(5)</span>
        </p>
      </Section>
    </DocShell>
  );
}
