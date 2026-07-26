/* INDEX — a back-of-book index: alphabetical entries with sub-entries, flowed
   into columns, each pointing at the section (§n) where the term appears. The
   locators match CONTENTS. The entries are illustrative rather than exhaustive —
   enough to show the finding-aid at work. */

const GROUPS = [
  {
    letter: "A",
    entries: [
      { t: "Askeroo", href: "#examples", loc: "§4" },
      { t: "awenate", href: "#description", loc: "§3" },
    ],
  },
  {
    letter: "D",
    entries: [
      { t: "Design", href: "#capabilities", loc: "§5", subs: [{ t: "design systems", loc: "§5e" }] },
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
      { t: "Figlet", href: "#examples", loc: "§4" },
      { t: "Figma", href: "#capabilities", loc: "§5" },
      { t: "freelance", href: "#description", loc: "§3" },
    ],
  },
  {
    letter: "I",
    entries: [{ t: "Icon Preview", href: "#examples", loc: "§4" }],
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
      { t: "Scratch", href: "#playground", loc: "§6" },
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

const PageIndex = () => (
  <>
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
  </>
);

export default PageIndex;
