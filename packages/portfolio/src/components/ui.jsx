import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';

/* onClick handler for navigation links/buttons: after a *mouse* activation, drop
   focus from the element. Without this, a clicked link keeps DOM focus with no
   visible ring (pointer modality), and the next keypress — e.g. the canvas
   `g`/tool shortcuts on the project page — flips the browser into keyboard
   modality and paints a stray :focus-visible ring on that link. Keyboard
   activations (Enter/Space, where `detail === 0`) are left untouched, so real
   keyboard navigation keeps its focus ring. */
export const blurOnPointerClick = (e) => {
  if (e.detail) e.currentTarget.blur();
};

/* Section demarcated by a full-bleed hairline above its label. The <section>
   breaks out of the parent <main>'s width cap (w-screen + a negative margin that
   matches main's left gutter) so the rule spans the whole viewport, while an inner
   wrapper re-establishes the same content column so the label and content stay
   aligned with the rest of the page. Assumes a `pl-8 sm:pl-14 lg:pl-24` parent. */
export function Section({ label, children, id }) {
  const ref = useReveal();
  return (
    <section
      id={id}
      ref={ref}
      className="reveal scroll-mt-20 mt-16 w-screen -ml-8 border-t border-line sm:mt-24 sm:-ml-14 lg:-ml-24"
    >
      <div className="mr-auto w-full max-w-5xl pl-8 pr-5 pt-10 sm:pl-14 sm:pr-6 sm:pt-16 lg:pl-24">
        <h2 className="section-label mb-4">{label}</h2>
        {children}
      </div>
    </section>
  );
}

/* A two-column list row: bold sans index token on the left, serif content on
   the right. Renders an internal router link when `to` is set, an external
   anchor when `href` is set (both add the hover wash + arrow), else a plain row. */
export function ListRow({ index, href, to, external, children }) {
  // -mx-3 px-3 on every row so link and non-link rows share the same left edge.
  const cls =
    'group relative -mx-3 grid grid-cols-1 gap-y-1 rounded-[0.5rem] px-3 py-3 sm:grid-cols-[8.5rem_1fr] sm:gap-x-6';
  const linkCls = `${cls} transition-colors duration-200 hover:bg-surface`;
  const body = (
    <>
      <div className="font-sans tnum text-[0.9375rem] font-bold text-ink">{index}</div>
      <div className="min-w-0">{children}</div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={linkCls}>
        {body}
      </Link>
    );
  }
  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={linkCls}
      >
        {body}
      </a>
    );
  }
  return <div className={cls}>{body}</div>;
}

/* Purple sub-heading within a section (e.g. "Freelance" / "Perm"). Bold sans,
   accent-coloured, lightly tracked — mirrors the CV's group labels. */
export function SubLabel({ children }) {
  return (
    <h3 className="mb-1 mt-8 px-3 font-sans text-[0.8125rem] font-bold tracking-[0.02em] text-accent first:mt-0">
      {children}
    </h3>
  );
}

/* The bullet separator between a primary and secondary term (neutral, CV-style). */
export const Sep = () => (
  <span className="px-[0.45em] text-faint" aria-hidden="true">•</span>
);

export const ArrowUpRight = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M7 17L17 7M17 7H8M17 7v9" />
  </svg>
);

export const ArrowLeft = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M19 12H5M5 12l6-6M5 12l6 6" />
  </svg>
);

export const ArrowRight = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
