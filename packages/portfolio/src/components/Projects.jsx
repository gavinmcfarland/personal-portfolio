import { Link } from "react-router-dom";
import { visibleProjects as projects } from "../data/projects";
// import ProjectPlate from "./ProjectPlate"; // TEMP: plates commented out
import { blurOnPointerClick } from "./ui";

/* The work, set as a man page's EXAMPLES: each project is its name, with its kind
   chipped out to the right and the summary hanging beneath as the description.
   Each block links through to the project's own page. */

/* Kind chip — the four enamels as flat square swatches beside an uppercase
   label. `tone` points at a --tone-* token, so the colour flips with the
   theme (see app.css). */
const KINDS = {
  tool: { label: "Tool", tone: "blue" },
  library: { label: "Library", tone: "lime" },
  plugin: { label: "Plugin", tone: "teal" },
};

const TONE_VAR = {
  vermilion: "var(--tone-vermilion)",
  blue: "var(--tone-blue)",
  lime: "var(--tone-lime)",
  teal: "var(--tone-teal)",
};

function KindTag({ kind }) {
  const k = KINDS[kind] || { label: kind, tone: "teal" };
  return (
    <span className="inline-flex items-center gap-[0.4rem] border border-line px-[0.45rem] py-[0.1rem] text-1 uppercase tracking-micro text-muted">
      <span
        className="h-2 w-2 flex-none"
        style={{ background: TONE_VAR[k.tone] }}
        aria-hidden="true"
      />
      {k.label}
    </span>
  );
}

/* The go-there mark at the right edge of a row. Faint until the row is pointed
   at, then vermilion and nudged one step right — the same hover register the
   title takes, so the whole row reacts as one target rather than two. Square
   caps and a mitred vertex keep it in the flat-square family the kind swatch
   and the plates belong to.

   Touch widths only (`lg:hidden` — phone and tablet, the same breakpoint the
   plate grid uses to go side by side). On a pointer device the row already
   announces itself as a target by lighting the title and filling its background
   on hover; the chevron is there for touch, where there is no hover to say so. */
function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      className="h-4 w-4 flex-none text-faint transition duration-150 group-hover:translate-x-1 group-hover:text-accent lg:hidden"
      aria-hidden="true"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

const Projects = () => (
  <>
    <h2 id="examples" className="section-label reveal">
      Examples
    </h2>
    <p className="lede indent reveal max-w-measure text-muted">
      A selection of work, designed and built end to end. Each began as a
      recurring problem rather than an idea &mdash; run one to read the full case.
    </p>

    <div className="indent reveal space-y-(--sp-1)">
      {projects.map((p) => (
        <Link
          key={p.id}
          to={`/projects/${p.id}`}
          className="group -mx-4 block px-4 py-3 transition-colors duration-150 hover:bg-surface"
          onClick={blurOnPointerClick}
        >
          {/* Title row spans the full width, so the kind chip stays hard against
              the entry's right edge — the chevron rides the row below it rather
              than sitting beside the chip and insetting it. */}
          <p className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <span className="font-bold text-ink transition-colors duration-150 group-hover:text-accent">
              {p.title}
            </span>
            <KindTag kind={p.kind} />
          </p>
          {/* Plate left, description right — the entry shape from the Dither
              sheet: a 30rem × 13rem plate, stacking above the text on narrow
              screens where there is no room to set them side by side. */}
          {/* TEMP: plates commented out — restore the grid classes below with
              `grid gap-4 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-10`
              when the <ProjectPlate> goes back in. */}
          <div className="mt-(--sp-1) flex items-center justify-between gap-4 pl-4">
            {/* <ProjectPlate id={p.id} className="h-[10rem] lg:h-[13rem]" /> */}
            <p className="min-w-0 max-w-measure text-muted">{p.summary}</p>
            <Chevron />
          </div>
        </Link>
      ))}
    </div>
  </>
);

export default Projects;
