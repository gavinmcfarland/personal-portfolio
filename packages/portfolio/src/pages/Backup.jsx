import Seo from "../components/Seo";
import DocShell from "../components/DocShell";

/* BACKUP — an archived copy of seven Home sections: NAME, SYNOPSIS, CONTENTS,
 * CAPABILITIES, ENVIRONMENT, INDEX and AUTHOR.
 *
 * Deliberately self-contained. Every section below is a copy of the markup and
 * data that lived in Intro.jsx, Contents.jsx, Capabilities.jsx (plus the
 * `skills` data it read), PastExperience.jsx, PageIndex.jsx and Connect.jsx —
 * not an import of them. That is the point of a backup: editing or deleting any
 * of those components leaves this page standing as it was.
 *
 * The `id`s and in-page `href`s are kept exactly as they were on Home, so a
 * section can be lifted back out of here unchanged. (While this page is open
 * Home is still mounted behind the sliding panel, so those anchors resolve to
 * Home's copies of the ids rather than to these.)
 *
 * Unlisted: no link points here and <Seo noindex> keeps it out of search.
 * Reachable only by typing /backup.
 */

/* ── NAME / SYNOPSIS — from Intro.jsx ──────────────────────────── */
const FLAGS = ["--tool", "--library", "--plugin"];

/* ── CONTENTS — from Contents.jsx ──────────────────────────────── */
const ENTRIES = [
  { label: "Name", href: "#name", sec: "1" },
  { label: "Synopsis", href: "#synopsis", sec: "2" },
  { label: "Description", href: "#description", sec: "3" },
  { label: "Work", href: "#work", sec: "4" },
  { label: "Capabilities", href: "#capabilities", sec: "5" },
  { label: "Staging", href: "#playground", sec: "6" },
  { label: "Environment", href: "#environment", sec: "7" },
  { label: "Index", href: "#index", sec: "8" },
  { label: "See also", href: "#connect", sec: "9" },
  { label: "Author", href: "#author", sec: "10" },
];

/* ── CAPABILITIES — from Capabilities.jsx, with a snapshot of the `skills`
   data it read from src/data/skills.js. ──────────────────────────── */
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

const SKILLS = [
  {
    id: "design",
    label: "Design",
    items: [
      "Product Design",
      "UX & Interaction",
      "User Research",
      "Prototyping",
      "Design Systems",
    ],
  },
  {
    id: "engineering",
    label: "Engineering",
    items: ["TypeScript", "React", "Svelte", "Node.js", "CSS Architecture"],
  },
  {
    id: "tools",
    label: "Tools",
    items: ["Figma", "Plugin Development", "Git", "Vite", "Framer"],
  },
];

/* ── ENVIRONMENT — from PastExperience.jsx ─────────────────────── */
const ENV = [
  {
    name: "STACK",
    value: "TypeScript, Svelte, Node.js, React, Vite, Figma API",
  },
  { name: "BASED", value: "London, United Kingdom" },
  { name: "DOMAINS", value: "Finance, government, retail" },
  {
    name: "HISTORY",
    value:
      "12+ years freelance — Lovable, American Express, Amazon, NatWest, and others",
  },
];

/* ── INDEX — from PageIndex.jsx ────────────────────────────────── */
const GROUPS = [
  {
    letter: "A",
    entries: [
      { t: "Askeroo", href: "#work", loc: "§4" },
      { t: "awenate", href: "#description", loc: "§3" },
    ],
  },
  {
    letter: "D",
    entries: [
      {
        t: "Design",
        href: "#capabilities",
        loc: "§5",
        subs: [{ t: "design systems", loc: "§5e" }],
      },
      { t: "Description", href: "#description", loc: "§3" },
    ],
  },
  {
    letter: "E",
    entries: [
      {
        t: "Engineering",
        href: "#capabilities",
        loc: "§5",
        subs: [
          { t: "front-end", loc: "§5b" },
          { t: "tooling", loc: "§6" },
        ],
      },
      { t: "Environment", href: "#environment", loc: "§7" },
    ],
  },
  {
    letter: "F",
    entries: [
      { t: "Figlet", href: "#work", loc: "§4" },
      { t: "Figma", href: "#capabilities", loc: "§5" },
      { t: "freelance", href: "#description", loc: "§3" },
    ],
  },
  {
    letter: "I",
    entries: [{ t: "Icon Preview", href: "#work", loc: "§4" }],
  },
  {
    letter: "L",
    entries: [
      { t: "London", href: "#environment", loc: "§7" },
      { t: "Lovable", href: "#description", loc: "§3" },
    ],
  },
  {
    letter: "R",
    entries: [
      { t: "React", href: "#capabilities", loc: "§5" },
      { t: "Research", href: "#capabilities", loc: "§5" },
    ],
  },
  {
    letter: "S",
    entries: [
      { t: "Staging", href: "#playground", loc: "§6" },
      { t: "Svelte", href: "#capabilities", loc: "§5" },
    ],
  },
  {
    letter: "T",
    entries: [
      { t: "TypeScript", href: "#capabilities", loc: "§5" },
      { t: "Tools", href: "#capabilities", loc: "§5" },
    ],
  },
];

const Entry = ({ t, href, loc, subs }) => (
  <p className="index-entry">
    {href ? (
      <a href={href} className="xref">
        {t}
      </a>
    ) : (
      t
    )}{" "}
    <span className="loc">{loc}</span>
    {subs?.map((s) => (
      <span key={s.t} className="sub">
        {s.t} <span className="loc">{s.loc}</span>
      </span>
    ))}
  </p>
);

const Backup = () => (
  <DocShell>
    <Seo
      title="Backup"
      description="Archived copies of the NAME, SYNOPSIS, CONTENTS, CAPABILITIES, ENVIRONMENT, INDEX and AUTHOR sections."
      noindex
    />

    {/* The sections are kept in the manual's own reading order rather than the
        order they were listed for backup. */}
    <header className="pt-(--sp-8)">
      <h2 className="section-label">BACKUP</h2>
      <p className="indent max-w-measure text-muted">
        Archived copies of seven sections, kept verbatim so any of them can be
        lifted back into the page it came from. Not linked from anywhere and not
        indexed.
      </p>
    </header>

    {/* ── NAME ────────────────────────────────────────────────────── */}
    <h2 id="name" className="section-label">
      NAME
    </h2>
    <p className="indent wordmark">Gavin McFarland</p>
    <p className="indent text-muted">
      <span className="font-bold text-ink">gavin</span> &mdash; designer and
      engineer; builds the tool that was missing
    </p>

    {/* ── SYNOPSIS — a tighter step than the standard one, as before ── */}
    <h2 id="synopsis" className="section-label mt-(--sp-4)">
      SYNOPSIS
    </h2>
    <p className="indent synopsis">
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

    {/* ── CONTENTS ────────────────────────────────────────────────── */}
    <h2 id="contents" className="section-label reveal">
      Contents
    </h2>
    <ul className="indent reveal leaders max-w-measure-narrow">
      {ENTRIES.map((e) => (
        <li key={e.href} className="leader">
          <a href={e.href} className="xref">
            {e.label}
          </a>
          <span className="leader__dots" aria-hidden="true" />
          <span className="leader__pg">
            <span className="sec">§</span>
            {e.sec}
          </span>
        </li>
      ))}
    </ul>

    {/* ── CAPABILITIES ────────────────────────────────────────────── */}
    <h2 id="capabilities" className="section-label reveal">
      Capabilities
    </h2>
    <div className="indent reveal man-outline max-w-measure">
      {SKILLS.map((group, gi) => (
        <div key={group.id}>
          <div className="man-outline__row">
            <span className="man-outline__mk">{gi + 1}</span>
            <span>
              <b>{group.label}</b>
            </span>
          </div>
          {group.items.map((item, ii) => (
            <div key={item} className="man-outline__row man-outline--2">
              <span className="man-outline__mk">{LETTERS[ii]}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      ))}
    </div>

    {/* ── ENVIRONMENT ─────────────────────────────────────────────── */}
    <h2 id="environment" className="section-label reveal">
      Environment
    </h2>
    <dl className="indent reveal space-y-(--sp-2)">
      {ENV.map((e) => (
        <div key={e.name} className="tp">
          <dt>{e.name}</dt>
          <dd className="text-muted">{e.value}</dd>
        </div>
      ))}
    </dl>

    <p className="note indent reveal">
      Full professional history:{" "}
      <a
        href="https://www.linkedin.com/in/gavinmcfarland"
        target="_blank"
        rel="noopener noreferrer"
        className="xref"
      >
        linkedin
      </a>
      <span className="xref__sec">(7)</span>
    </p>

    {/* ── INDEX ───────────────────────────────────────────────────── */}
    <h2 id="index" className="section-label reveal">
      Index
    </h2>
    <div className="indent reveal index-cols max-w-measure">
      {GROUPS.map((g) => (
        <div key={g.letter} className="index-group">
          <p className="index-letter">{g.letter}</p>
          {g.entries.map((e) => (
            <Entry key={e.t} {...e} />
          ))}
        </div>
      ))}
    </div>

    {/* ── AUTHOR — the tail block from Connect.jsx ────────────────── */}
    <h2 id="author" className="section-label">
      AUTHOR
    </h2>
    <div className="indent text-muted">
      <p>Written by Gavin McFarland.</p>
      <p>
        Report issues to{" "}
        <a href="mailto:gavin@limitlessloop.com" className="xref text-ink">
          gavin@limitlessloop.com
        </a>
      </p>
    </div>
  </DocShell>
);

export default Backup;
