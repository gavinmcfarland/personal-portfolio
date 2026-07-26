import { Link } from "react-router-dom";
import { ArrowLeft, Sep } from "../components/ui";
import { useReveal } from "../hooks/useReveal";

/* The career in two eras — the whole shape of it, dated, in two lines. The range
   sits in a tabular token column so the two rows read as a mini timeline. */
const eras = [
  {
    range: "2014 — Now",
    title: "Freelance",
    note: "Designing and building tools, products and web apps for teams across finance, government and e-commerce.",
  },
  {
    range: "2009 — 2013",
    title: "Full-time",
    note: "Frontend design and UX at Jobsite and Venntro.",
  },
];

/* Freelance clients, grouped by field and shown as names only. The grouping does
   the work the durations used to — breadth at a glance, no spreadsheet. */
const clients = [
  { field: "Finance", names: ["American Express", "NatWest", "LSEG", "Coutts", "Lloyd's", "Tesco Bank", "AFME"] },
  { field: "Government", names: ["Amazon", "DIT", "Home Office", "BIS"] },
  { field: "Product", names: ["Lovable", "Ecologi", "FigMayo", "John Lewis"] },
  { field: "Research", names: ["WTW", "Atos", "AIMIA"] },
];

/* A two-column row: a token in the left rail (year range or field), content on the
   right. Mirrors the Experience/Skills rhythm so the CV sits in the same system. */
const Row = ({ token, tokenClass, children }) => (
  <div className="grid grid-cols-1 gap-y-1 sm:grid-cols-[9.5rem_1fr] sm:gap-x-8">
    <div className={tokenClass}>{token}</div>
    <div className="min-w-0">{children}</div>
  </div>
);

/* CV — a deliberately lean résumé. A one-breath summary, the career as two dated
   eras, then freelance clients grouped by field. Detail lives on LinkedIn; this
   page is the shape of the career, not the log of it. Rendered in the route panel. */
const CV = () => {
  // The page's single reveal observer — one per page shell since the sections
  // that used to own one each were flattened away.
  const ref = useReveal();
  return (
  <>
    <main
      ref={ref}
      className="mr-auto w-full max-w-5xl pl-8 pr-5 sm:pl-14 sm:pr-6 lg:pl-24"
    >
      {/* The same top rail as every other page in the route panel (DocShell's),
          so the Back link sits level with the theme toggle instead of 96px down. */}
      <header className="pt-(--sp-4)">
        <Link
          to="/"
          className="group inline-flex w-fit items-center gap-2 font-sans text-4 font-medium text-muted transition-colors duration-200 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back
        </Link>

        {/* The page title is the wordmark, like every other page title on the
            site — it used to be a one-off 1.75/2rem heading at its own leading. */}
        <h1 className="wordmark mt-(--sp-8)">Gavin McFarland</h1>
        <p className="font-sans text-4 text-faint">
          Designer &amp; full-stack engineer
          <Sep />
          London, UK
        </p>

        <p className="mt-(--para) max-w-measure-narrow text-pretty text-4 text-muted">
          Freelance since 2014, building tools, products and web applications for
          teams across finance, government and e-commerce. Four years full-time in
          frontend design before that.
        </p>
      </header>

      <h2 id="career" className="section-label reveal">
        Career
      </h2>
      <div className="indent reveal space-y-(--sp-6)">
        {eras.map((e) => (
          <Row
            key={e.range}
            token={e.range}
            tokenClass="font-sans tnum text-5 font-bold text-ink sm:pt-0.5"
          >
            <div className="font-sans text-4 font-bold text-ink">{e.title}</div>
            <p className="mt-(--sp-1) max-w-measure-narrow text-pretty text-4 text-muted">
              {e.note}
            </p>
          </Row>
        ))}
      </div>

      <h2 id="clients" className="section-label reveal">
        Selected clients
      </h2>
      <div className="indent reveal space-y-(--sp-4)">
        {clients.map((c) => (
          <Row
            key={c.field}
            token={c.field}
            tokenClass="font-sans text-3 font-bold tracking-sub text-accent sm:pt-1"
          >
            <p className="text-pretty text-4 text-muted">
              {c.names.map((n, i) => (
                <span key={n}>
                  {i > 0 && <Sep />}
                  {n}
                </span>
              ))}
            </p>
          </Row>
        ))}
      </div>

      <p className="note indent reveal">
        Full work history on{" "}
        <a
          href="https://www.linkedin.com/in/gavinmcfarland"
          target="_blank"
          rel="noopener noreferrer"
          className="ulink font-medium"
        >
          LinkedIn
        </a>
        .
      </p>
    </main>

    <footer className="mr-auto w-full max-w-5xl pb-(--sp-16) pl-8 pr-5 pt-(--sp-16) sm:pl-14 sm:pr-6 lg:pl-24">
      <p className="text-2 text-faint">© 2026 Gavin McFarland</p>
    </footer>
  </>
  );
};

export default CV;
