import Seo from "../components/Seo";
import DocShell from "../components/DocShell";
import { ListRow, Sep } from "../components/ui";

/* SPECIMEN — the reference sheet for Enamel, the system this site is set in.
 *
 * Every sample below is drawn with the *live* tokens and the *live* utility
 * classes from app.css — nothing here re-declares a colour or a size of its own.
 * That is the point: if a token is retuned in app.css this page moves with it,
 * so it can never drift into documenting a system the site no longer uses. The
 * only literal values written here are the hex columns in COLOUR, which exist
 * precisely to record what the tokens resolve to in each theme.
 *
 * Unlisted: nothing links here and <Seo noindex> keeps it out of search.
 * Reachable by typing /specimen.
 */

/* ── Semantic tokens ───────────────────────────────────────────────
   The role layer — the only tokens components reference. Rendered as live
   swatches (so they flip with the theme toggle) plus the pair of primitives
   each one resolves to. */
const SEMANTIC = [
  { token: "--bg", role: "ground", light: "#c3c8cd", dark: "#111110" },
  { token: "--surface", role: "panel / raised fill", light: "#d0d4d8", dark: "#1c1b18" },
  { token: "--hover", role: "icon-button hover fill", light: "#c3c8cd", dark: "#2c2b27" },
  { token: "--ink", role: "primary text", light: "#16191c", dark: "#ebe7dc" },
  { token: "--muted", role: "secondary prose", light: "#4a4f55", dark: "#97948b" },
  { token: "--faint", role: "meta / captions", light: "#767c83", dark: "#63615a" },
  { token: "--line", role: "hairline edge", light: "#a6acb2", dark: "#2c2b27" },
  { token: "--line-strong", role: "link underline at rest", light: "#767c83", dark: "#45433d" },
  { token: "--rule", role: "the drawn line", light: "#16191c", dark: "#ebe7dc" },
  { token: "--accent", role: "the one accent", light: "#c8341a", dark: "#e0563c" },
  { token: "--scrim", role: "dims Home behind the panel", light: "#a6acb2", dark: "#2c2b27" },
];

/* ── Primitive ramps ───────────────────────────────────────────────
   Named for the material, not the role, and identical in both themes. Light
   pulls its greys from the cool steel ramp; dark pulls from the warm galley
   ramp, so the graphite ground never reads blue. */
const STEEL = [
  ["50", "#e7eaed"],
  ["100", "#d0d4d8"],
  ["200", "#c3c8cd"],
  ["300", "#a6acb2"],
  ["400", "#9aa1a9"],
  ["500", "#767c83"],
  ["550", "#6b727a"],
  ["600", "#4a4f55"],
  ["700", "#3a4048"],
  ["800", "#2c3138"],
  ["900", "#24282d"],
  ["950", "#16191c"],
];

const GALLEY = [
  ["ink", "#ebe7dc"],
  ["mid", "#97948b"],
  ["faint", "#63615a"],
  ["edge", "#45433d"],
  ["hair", "#2c2b27"],
  ["panel", "#1c1b18"],
  ["ground", "#111110"],
  ["vermilion", "#e0563c"],
];

/* The four enamels, each a light-ground / graphite-ground pair. Only vermilion
   is load-bearing; the other three are flat tags. */
const ENAMELS = [
  { name: "vermilion", light: "#c8341a", dark: "#ff6a4d", tone: "--tone-vermilion" },
  { name: "blue", light: "#1e4fd8", dark: "#3b6dff", tone: "--tone-blue" },
  { name: "lime", light: "#a8cc1f", dark: "#c9f23a", tone: "--tone-lime" },
  { name: "teal", light: "#12897f", dark: "#24bdb8", tone: "--tone-teal" },
];

/* ── Type ──────────────────────────────────────────────────────────
   Spline Sans Mono is loaded at exactly these four cuts (index.html); anything
   else on this page would be a browser-synthesised fake. */
const CUTS = [
  { label: "400 · regular", style: { fontWeight: 400 } },
  { label: "400 · italic", style: { fontWeight: 400, fontStyle: "italic" } },
  { label: "500 · medium", style: { fontWeight: 500 } },
  { label: "700 · bold", style: { fontWeight: 700 } },
];

/* The scale, smallest first. Every step is a registered `@theme` token, so each
   row's `cls` is the live Tailwind utility that sets it — `text-4` really is the
   class the body uses. */
const SCALE = [
  { size: "0.6875rem", px: "11px", role: "chips, release tags, lettermark", cls: "text-1" },
  { size: "0.75rem", px: "12px", role: "footnotes, meta, captions, table heads", cls: "text-2" },
  { size: "0.8125rem", px: "13px", role: "section labels, sub-labels, index entries", cls: "text-3" },
  { size: "0.875rem", px: "14px", role: "body — running text, panels, transcripts", cls: "text-4" },
  { size: "0.9375rem", px: "15px", role: "the one emphatic step (list-row token)", cls: "text-5" },
  { size: "1.375rem", px: "22px", role: "page title in a narrow column", cls: "text-6" },
  { size: "1.75rem", px: "28px", role: "page title", cls: "text-7" },
  { size: "2.25rem", px: "36px", role: "page title, sm and up", cls: "text-8" },
];

/* The vertical rhythm, in the order it steps. Every value is a fraction or
   multiple of one line of body text (--lh), which is what makes them relate. */
const RHYTHM = [
  { token: "--sp-1", val: "¼ line · 5.95px", role: "list gaps, stacked pairs" },
  { token: "--sp-2", val: "½ line · 11.9px", role: "dense groups, label → list" },
  { token: "--sp-3", val: "¾ line · 17.85px", role: "the paragraph step (--para)" },
  { token: "--sp-4", val: "1 line · 23.8px", role: "heading → body, block step" },
  { token: "--sp-6", val: "1½ lines · 35.7px", role: "sub-head top, between blocks" },
  { token: "--sp-8", val: "2 lines · 47.6px", role: "section head top, back-link → title" },
  { token: "--sp-12", val: "3 lines · 71.4px", role: "section head top (sm+)" },
  { token: "--sp-16", val: "4 lines · 95.2px", role: "page edges" },
];

/* ── Small page-local primitives ───────────────────────────────────
   Deliberately not promoted into ui.jsx: they exist to draw the specimen, and
   nothing else on the site needs a colour chip or a sample row. */

/* A sub-heading inside a section body — the shared `.sub-label`, which ui.jsx's
   <SubLabel> also uses. This one omits <SubLabel>'s `px-3`: that padding lines
   up with <ListRow>'s inset, and would push these headings off the column
   everywhere else on this page.

   These carry `.indent` themselves: with the sections flattened there is no
   wrapper hanging the body at the stop, so each body element does it. */
const Sub = ({ children, flush }) => (
  <h3 className={`sub-label indent reveal ${flush ? "is-flush" : ""}`}>
    {children}
  </h3>
);

/* One colour chip: a flat fill over a hairline, its name, and whatever it
   resolves to. `fill` takes any CSS colour — a var() for the live semantic
   swatches, a hex for the primitive ramps. */
const Swatch = ({ fill, name, meta }) => (
  <div className="border border-line">
    <div className="h-16 border-b border-line" style={{ background: fill }} />
    <div className="px-2.5 py-2">
      <div className="font-bold tracking-micro text-ink">{name}</div>
      {meta ? <div className="tnum text-2 text-faint">{meta}</div> : null}
    </div>
  </div>
);

const SwatchGrid = ({ children }) => (
  <div className="indent reveal grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3">
    {children}
  </div>
);

/* A labelled sample row: the tag in a fixed column, the specimen beside it, and
   an optional value pinned right. Stacks below sm, like every other pair on the
   site (.tp does the same). */
const SpecRow = ({ tag, value, children, flush }) => (
  <div
    className={`indent reveal grid grid-cols-1 items-baseline gap-x-6 gap-y-(--sp-1) py-(--sp-2) sm:grid-cols-[11rem_1fr_auto] ${
      flush ? "" : "border-t border-line"
    }`}
  >
    <div className="text-2 uppercase tracking-micro text-faint">{tag}</div>
    <div className="min-w-0 text-ink">{children}</div>
    {value ? <div className="tnum text-2 text-faint sm:text-right">{value}</div> : null}
  </div>
);

const PANGRAM = "The quick brown fox jumps over the lazy dog — 0123456789";

export default function Specimen() {
  return (
    <DocShell>
      <Seo
        title="Specimen"
        description="Type, colour and component specimen for Enamel — the design system this site is set in."
        noindex
      />

      <header className="pt-(--sp-8)">
        {/* The same treatment a project page gives its title: the wordmark in
            its narrow cut, as an <h1>. This page has no NAME heading above the
            title (the other document pages do), so the title is the page's own
            top-level heading rather than the body of a NAME section. */}
        <h1 className="wordmark wordmark--narrow">Specimen</h1>
        {/* The intro deliberately runs flush to the column — no `.indent` —
            so the paragraph step that `.indent > p + p` would have supplied is
            set here from the same token.

            `mt-(--sp-6)` is the title gap, and it has to be the *whole* gap
            rather than the project page's `--sp-2` top-up. There, the title is a
            flex item, so its own 23.8px bottom margin cannot collapse with the
            text below and the two add up to 35.7px. Here the title and this
            paragraph are adjacent siblings in normal flow, so their margins
            collapse to the larger of the two — which means naming 1½ lines
            outright is what lands on the same 35.7px. */}
        <p className="man-body mt-(--sp-6) text-muted">
          One monospace face at one size, flat fills, hairline edges and a
          single working accent. <span className="text-ink">Enamel</span> is
          vitreous enamel on steel: it cannot round a corner or cast a shadow,
          so nothing here does. Every sample on this page is drawn with the live
          tokens and utility classes — retune a token in{" "}
          <span className="text-ink">app.css</span> and this sheet moves with
          it.
        </p>
        <p className="man-body mt-(--para) text-muted">
          The whole document borrows man-page discipline: a flush section
          heading with its body hung at a fixed three-character stop, and one
          paragraph step doing the separating. Register does the work, not new
          colour.
        </p>
      </header>

      {/* ── Colour ──────────────────────────────────────────────────── */}
      <h2 id="colour" className="section-label reveal">
        Colour
      </h2>
        <p className="lede indent reveal man-body text-muted">
          Two tiers. Primitives are the only place a raw value is written and
          never change between themes; the semantic tokens below carry the roles
          and are all a component ever names. To retune a colour, edit the
          primitive once.
        </p>

        <Sub>Semantic — live, flips with the theme toggle</Sub>
        <SwatchGrid>
          {SEMANTIC.map((s) => (
            <Swatch key={s.token} fill={`var(${s.token})`} name={s.token} meta={s.role} />
          ))}
        </SwatchGrid>

        <Sub>Primitive — steel ramp (light ground)</Sub>
        <SwatchGrid>
          {STEEL.map(([step, hex]) => (
            <Swatch key={step} fill={hex} name={`--steel-${step}`} meta={hex} />
          ))}
        </SwatchGrid>

        <Sub>Primitive — galley ramp (graphite ground)</Sub>
        <SwatchGrid>
          {GALLEY.map(([name, hex]) => (
            <Swatch key={name} fill={hex} name={`--galley-${name}`} meta={hex} />
          ))}
        </SwatchGrid>

        <Sub>Primitive — the four enamels</Sub>
        <p className="lede indent reveal man-body text-muted">
          Vermilion is the only load-bearing one: prompt, accent, focus, hover.
          The other three are flat tags. Each is a pair — the lifted{" "}
          <span className="text-ink">-400</span> cut is what sits on the dark
          ground.
        </p>
        <SwatchGrid>
          {ENAMELS.map((e) => (
            <div key={e.name}>
              <div className="border border-line">
                <div className="flex h-16">
                  <div className="flex-1" style={{ background: e.light }} />
                  <div className="flex-1" style={{ background: e.dark }} />
                </div>
                <div className="border-t border-line px-2.5 py-2">
                  <div className="font-bold tracking-micro text-ink">{e.name}</div>
                  <div className="tnum text-2 text-faint">
                    {e.light} <Sep /> {e.dark}
                  </div>
                </div>
              </div>
              <p className="mt-(--sp-1) text-2 text-faint">{e.tone}</p>
            </div>
          ))}
        </SwatchGrid>

        {/* The resolution table closes the section: every swatch above has been
            seen by now, so this reads as the reference you check afterwards
            rather than something to get through before the colours. */}
        <Sub>Semantic — what each resolves to</Sub>
        <div className="indent reveal max-w-measure-wide">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 border-b border-line pb-(--sp-1) text-2 uppercase tracking-micro text-faint">
            <span>token</span>
            <span className="text-right">light</span>
            <span className="text-right">dark</span>
          </div>
          {SEMANTIC.map((s) => (
            <div
              key={s.token}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b border-line py-(--sp-1)"
            >
              <span className="text-ink">{s.token}</span>
              <span className="tnum flex items-center justify-end gap-2 text-muted">
                <span
                  className="inline-block h-3 w-3 border border-line"
                  style={{ background: s.light }}
                  aria-hidden="true"
                />
                {s.light}
              </span>
              <span className="tnum flex items-center justify-end gap-2 text-muted">
                <span
                  className="inline-block h-3 w-3 border border-line"
                  style={{ background: s.dark }}
                  aria-hidden="true"
                />
                {s.dark}
              </span>
            </div>
          ))}
          <p className="mt-(--sp-1) text-2 text-faint">
            <span className="text-muted">--accent-soft</span> is not a value but
            a mix — the accent at 14% (light) / 16% (dark) over transparent.{" "}
            <span className="text-muted">--on-accent</span> is #ffffff in both.
          </p>
        </div>

      {/* ── Type ────────────────────────────────────────────────────── */}
      <h2 id="type" className="section-label reveal">
        Type
      </h2>
        <p className="lede indent reveal man-body text-muted">
          One family carries prose, headings and code alike:{" "}
          <span className="text-ink">Spline Sans Mono</span>, loaded at four
          cuts. There is no serif and no grotesque beside it —{" "}
          <span className="text-ink">--font-sans</span> and{" "}
          <span className="text-ink">--font-serif</span> are kept only as
          aliases pointing back at the mono face, so a stray{" "}
          <span className="text-ink">font-sans</span> in the markup can never
          summon a second typeface.
        </p>
        {/* Shown at body size, not blown up: the point of a flat-type sheet is
            what the face looks like where it actually does its work. */}
        {CUTS.map((c) => (
          <SpecRow key={c.label} tag={c.label}>
            <span style={c.style}>{PANGRAM}</span>
          </SpecRow>
        ))}

      {/* ── Type scale ──────────────────────────────────────────────── */}
      <h2 id="scale" className="section-label reveal">
        Type scale
      </h2>
        <p className="lede indent reveal man-body text-muted">
          <span className="text-ink">Flat type.</span> Body is 14px and headings
          are the same 14px given weight, tracking and uppercase — never a
          bigger number. Only the page title breaks the ceiling, and it does so
          at three cuts because the site has two column widths: a document page
          takes 28/36px, a project page&rsquo;s ~256px sidebar stays at 22px
          rather than wrapping a mono title after nine characters.
        </p>
        <p className="lede indent reveal man-body text-muted">
          Eight steps, and nothing between them. They are registered as{" "}
          <span className="text-ink">@theme</span> tokens, so every row below is
          a real utility — the scale is enforced by the stylesheet rather than
          being a convention this page merely records. It replaces eleven
          literal sizes that were spread across the 10&ndash;14px band, several
          of them half a pixel apart.
        </p>
        {SCALE.map((s) => (
          <SpecRow key={s.cls} tag={s.cls} value={`${s.size} · ${s.px}`}>
            <span style={{ fontSize: s.size }}>{s.role}</span>
          </SpecRow>
        ))}

      {/* ── Structure ───────────────────────────────────────────────── */}
      <h2 id="structure" className="section-label reveal">
        Structure
      </h2>
        <p className="lede indent reveal man-body text-muted">
          One measurement holds the page horizontally and one holds it
          vertically. <span className="text-ink">--stop</span> is the indent
          every section body hangs at, measured in{" "}
          <span className="text-ink">ch</span> so it is three monospace
          characters at every width rather than a different distance per
          breakpoint. <span className="text-ink">--lh</span> — one line of body
          text — is the vertical unit: in a document set entirely in one face at
          one size, the line box is the only interval a reader can actually
          perceive, so every vertical step is a fraction or multiple of it.
        </p>
        <SpecRow tag="--stop" value="3ch of body">
          the indent stop — <span className="text-muted">.indent</span>. A
          registered <span className="text-muted">&lt;length&gt;</span> declared
          on <span className="text-muted">body</span>, so the{" "}
          <span className="text-ink">ch</span> resolves once against the body
          size and inherits as an absolute length — otherwise a{" "}
          <span className="text-muted">.sub-label</span> or{" "}
          <span className="text-muted">.footnotes</span> block would hang three
          characters of <em>its own</em> smaller size and miss the stop
        </SpecRow>
        <SpecRow tag="--lh" value="1.4875rem · 23.8px">
          one line — <span className="text-muted">--text-4 × --leading</span>
        </SpecRow>
        <SpecRow tag="--leading" value="1.7">
          set on <span className="text-muted">body</span>; the only line-height
          prose takes, and the display exceptions (
          <span className="text-muted">.wordmark</span>,{" "}
          <span className="text-muted">.synopsis</span>) are the only rules that
          name another
        </SpecRow>
        <SpecRow tag="--container-measure" value="64ch">
          the prose column — <span className="text-muted">max-w-measure</span>,{" "}
          <span className="text-muted">.man-body</span>
        </SpecRow>
        <SpecRow tag="…-measure-narrow" value="52ch">
          contents lists, term/description pairs
        </SpecRow>
        <SpecRow tag="…-measure-wide" value="74ch">
          tables, transcripts, panels
        </SpecRow>

        <Sub>The vertical rhythm — every step in lines</Sub>
        {RHYTHM.map((r) => (
          <SpecRow key={r.token} tag={r.token} value={r.val}>
            {r.role}
          </SpecRow>
        ))}
        <SpecRow tag="--para" value="¾ line · 17.85px">
          the paragraph step, aliased to{" "}
          <span className="text-muted">--sp-3</span> —{" "}
          <span className="text-muted">.indent &gt; p + p</span>
        </SpecRow>

        <Sub>Tracking</Sub>
        <SpecRow tag="--tracking-label" value="0.14em">
          the section label — <span className="text-muted">.section-label</span>
        </SpecRow>
        <SpecRow tag="--tracking-micro" value="0.08em">
          every other uppercase micro-label: chips, release tags, table heads,
          lettermark
        </SpecRow>
        <SpecRow tag="--tracking-sub" value="0.02em">
          sub-labels — <span className="text-muted">.sub-label</span>
        </SpecRow>
        <SpecRow tag="--tracking-tight" value="-0.01em">
          display only — <span className="text-muted">.wordmark</span>
        </SpecRow>

      {/* ── Inline marks ────────────────────────────────────────────── */}
      <h2 id="marks" className="section-label reveal">
        Inline marks
      </h2>
        <SpecRow tag=".prompt / .flag" flush>
          <span className="prompt">$</span> gavin{" "}
          <span className="flag">--tool</span>{" "}
          <span className="bracket">[--library]</span>
        </SpecRow>
        <SpecRow tag=".xref">
          Cross-references read as manual entries:{" "}
          <a className="xref" href="#marks">
            plugma
          </a>
          <span className="xref__sec">(1)</span>,{" "}
          <a className="xref" href="#marks">
            colophon
          </a>
          <span className="xref__sec">(7)</span>
        </SpecRow>
        <SpecRow tag=".ulink">
          An underline that{" "}
          <a className="ulink" href="#marks">
            turns vermilion
          </a>{" "}
          on hover
        </SpecRow>
        <SpecRow tag=".fn-ref">
          A superscript marker into the notes below
          <sup className="fn-ref">1</sup>
        </SpecRow>
        <SpecRow tag=".tnum">
          <span className="tnum">2019 2024 1111 0000</span> — tabular figures,
          so columns of years line up
        </SpecRow>
        <SpecRow tag="selection">
          Drag across this line: selection paints{" "}
          <span className="text-ink">--accent</span> under{" "}
          <span className="text-ink">--on-accent</span>
        </SpecRow>

        <div className="indent reveal footnotes mt-(--sp-6)">
          <div className="footnotes__rule" />
          <p className="footnote">
            <sup>1</sup>The note sits under a short rule at the foot of its
            section, set small and faint — roff&rsquo;s .FS/.FE.
          </p>
        </div>

      {/* ── Blocks ──────────────────────────────────────────────────── */}
      <h2 id="blocks" className="section-label reveal">
        Blocks
      </h2>
        <Sub flush>.tp — hanging term/description pairs</Sub>
        <dl className="indent reveal tp max-w-measure-narrow">
          <dt>ROLE</dt>
          <dd className="text-muted">Design engineer, contract</dd>
          <dt>YEAR</dt>
          <dd className="text-muted">2023 — present</dd>
          <dt>STACK</dt>
          <dd className="text-muted">TypeScript, Svelte, Node.js, Figma API</dd>
        </dl>

        <Sub>.leaders — dotted contents lines</Sub>
        <ul className="indent reveal leaders max-w-measure-narrow">
          {[
            ["Colour", "2"],
            ["Type", "3"],
            ["Components", "7"],
          ].map(([label, sec]) => (
            <li key={sec} className="leader">
              <span className="text-ink">{label}</span>
              <span className="leader__dots" aria-hidden="true" />
              <span className="leader__pg">
                <span className="sec">§</span>
                {sec}
              </span>
            </li>
          ))}
        </ul>

        <Sub>.man-outline — stepped 1 / a / i outline</Sub>
        <div className="indent reveal man-outline max-w-measure-narrow">
          <div className="man-outline__row">
            <span className="man-outline__mk">1</span>
            <span>
              <b>Interface</b>
            </span>
          </div>
          <div className="man-outline__row man-outline--2">
            <span className="man-outline__mk">a</span>
            <span>React + React Router</span>
          </div>
          <div className="man-outline__row man-outline--2">
            <span className="man-outline__mk">b</span>
            <span>Tailwind CSS on a small set of design tokens</span>
          </div>
        </div>

        <Sub>.usage — shell transcript in a hairline panel</Sub>
        <div className="indent reveal usage max-w-measure-wide">
          <div>
            <span className="prompt">$</span> npm create plugma@latest
          </div>
          <div className="c"># scaffolds, then watches</div>
          <div className="usage__gap" />
          <div>
            <span className="prompt">$</span> plugma dev
          </div>
        </div>

        <Sub>.rel — versioned release block</Sub>
        <div className="indent reveal max-w-measure-wide">
          <div className="rel">
            <div className="rel__head">
              <span className="rel__v">1.2.0</span>
              <span className="rel__t">Hot reload</span>
              <span className="rel__d">2024-08-11</span>
            </div>
            <ul className="rel__list">
              <li>
                <span className="rel__tag add">add</span>
                <span>Watch mode rebuilds the plugin in place</span>
              </li>
              <li>
                <span className="rel__tag chg">chg</span>
                <span>Config moved into the manifest</span>
              </li>
              <li>
                <span className="rel__tag fix">fix</span>
                <span>Windows path separators in the bundler</span>
              </li>
              <li>
                <span className="rel__tag brk">brk</span>
                <span>Node 16 dropped</span>
              </li>
            </ul>
          </div>
        </div>

        <Sub>.section-rule — the drawn line</Sub>
        <div className="indent reveal section-rule max-w-measure-wide" />

      {/* ── Components ──────────────────────────────────────────────── */}
      <h2 id="components" className="section-label reveal">
        Components
      </h2>
        <Sub flush>&lt;ListRow&gt; — the two-column list primitive</Sub>
        <p className="lede indent reveal man-body text-muted">
          A bold index token in a fixed left column, content on the right.
          Linked rows take a hover wash; plain rows share their left edge.
        </p>
        <div className="indent reveal max-w-measure-wide">
          <ListRow index="01" to="/examples/colophon">
            <p className="text-ink">Colophon</p>
            <p className="text-muted">A linked row — hover for the wash</p>
          </ListRow>
          <ListRow index="02">
            <p className="text-ink">Specimen</p>
            <p className="text-muted">A plain row — same left edge, no wash</p>
          </ListRow>
        </div>

        <Sub>.mark — lettermark tile</Sub>
        <div className="indent reveal flex items-center gap-3">
          <span className="mark">GM</span>
          <span className="text-muted">Initials in place of a photo</span>
        </div>

        <Sub>Pill — bordered action</Sub>
        <div className="indent reveal flex flex-wrap gap-2">
          <button
            type="button"
            className="flex items-center justify-center border border-line px-3 font-sans text-4 font-medium text-muted transition-colors duration-150 hover:bg-hover hover:text-ink h-[38px]"
          >
            Visit
          </button>
          <button
            type="button"
            className="flex items-center justify-center border border-line bg-surface px-3 font-sans text-4 font-medium text-ink h-[38px]"
          >
            On surface
          </button>
        </div>

        <Sub>Doctrine</Sub>
        <p className="indent reveal man-body text-muted">
          Enamel cannot round a corner or cast a shadow, so app.css squares
          every corner and strips every shadow site-wide — the Tailwind{" "}
          <span className="text-ink">rounded-*</span> and{" "}
          <span className="text-ink">shadow-*</span> utilities are overridden
          rather than policed in the markup. Two things are exempt: the embedded
          canvas, which carries its own visual system, and the sliding route
          panel, which needs a shadow to lift a project page off Home.
        </p>

      {/* ── See also ────────────────────────────────────────────────── */}
      <h2 id="see-also" className="section-label reveal">
        See also
      </h2>
        <p className="indent reveal text-ink">
          <a className="xref" href="/">
            gavin
          </a>
          <span className="xref__sec">(1)</span>,{" "}
          <a className="xref" href="/examples/colophon">
            colophon
          </a>
          <span className="xref__sec">(7)</span>,{" "}
          <a className="xref" href="/examples">
            examples
          </a>
          <span className="xref__sec">(7)</span>
        </p>
    </DocShell>
  );
}
