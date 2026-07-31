import { Link } from "react-router-dom";
import { ArrowLeft, blurOnPointerClick } from "./ui";
import { useReveal } from "../hooks/useReveal";

/* Shared shell for the /examples/* prototype pages: the same content column as
   Home (so the man-page indent stops line up), a Back link to Home, and room at
   the foot. These pages render inside the sliding route panel like any other
   non-home route.

   The shell also owns the reveal-on-scroll observer. It used to sit on each
   <section>, which watched its own contents; with the sections flattened away
   there is no per-section root left, so one observer here picks up every
   `.reveal` element on the page instead. */
export default function DocShell({ children, revealKey }) {
  // `revealKey` is passed by a page whose body is fetched after it mounts (a
  // post): changing it re-scans for `.reveal` blocks that were not there the
  // first time. Static pages leave it undefined and are scanned once.
  const ref = useReveal(revealKey);
  return (
    <main
      ref={ref}
      className="mr-auto w-full max-w-5xl pb-(--sp-16) pl-8 pr-5 sm:pl-14 sm:pr-6 lg:pl-24"
    >
      <div className="pt-(--sp-4)">
        <Link
          to="/"
          onClick={blurOnPointerClick}
          className="group inline-flex items-center gap-2 font-sans text-4 font-medium text-muted transition-colors duration-200 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back
        </Link>
      </div>
      {children}
    </main>
  );
}
