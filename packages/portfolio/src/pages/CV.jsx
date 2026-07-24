import { Link } from "react-router-dom";
import { ArrowLeft, Section, Sep } from "../components/ui";

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
const CV = () => (
  <>
    <main className="mr-auto w-full max-w-5xl pl-8 pr-5 sm:pl-14 sm:pr-6 lg:pl-24">
      <header className="pt-24 sm:pt-28">
        <Link
          to="/"
          className="group inline-flex w-fit items-center gap-2 font-sans text-[0.875rem] font-medium text-muted transition-colors duration-200 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back
        </Link>

        <h1 className="mt-8 text-[1.75rem] font-bold leading-[1.1] tracking-[-0.01em] text-ink sm:text-[2rem]">
          Gavin McFarland
        </h1>
        <p className="mt-2 font-sans text-[1rem] text-faint">
          Designer &amp; full-stack engineer
          <Sep />
          London, UK
        </p>

        <p className="mt-7 max-w-[48ch] text-pretty text-[1.0625rem] leading-relaxed text-muted">
          Freelance since 2014, building tools, products and web applications for
          teams across finance, government and e-commerce. Four years full-time in
          frontend design before that.
        </p>
      </header>

      <Section id="career" label="Career">
        <div className="space-y-8 sm:space-y-9">
          {eras.map((e) => (
            <Row
              key={e.range}
              token={e.range}
              tokenClass="font-sans tnum text-[0.9375rem] font-bold text-ink sm:pt-0.5"
            >
              <div className="font-sans text-[1.0625rem] font-bold text-ink">{e.title}</div>
              <p className="mt-1 max-w-[44ch] text-pretty text-[1rem] leading-relaxed text-muted">
                {e.note}
              </p>
            </Row>
          ))}
        </div>
      </Section>

      <Section id="clients" label="Selected clients">
        <div className="space-y-6">
          {clients.map((c) => (
            <Row
              key={c.field}
              token={c.field}
              tokenClass="font-sans text-[0.8125rem] font-bold tracking-[0.02em] text-accent sm:pt-1"
            >
              <p className="text-pretty text-[1rem] leading-relaxed text-muted">
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

        <p className="mt-10 text-[0.9375rem] text-faint">
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
      </Section>
    </main>

    <footer className="mr-auto w-full max-w-5xl pl-8 pr-5 sm:pl-14 sm:pr-6 lg:pl-24 pt-16 pb-16">
      <p className="text-[0.8125rem] text-faint">© 2026 Gavin McFarland</p>
    </footer>
  </>
);

export default CV;
