import { Link } from "react-router-dom";
import { ArrowLeft, blurOnPointerClick } from "./ui";

/* Shared shell for the /examples/* prototype pages: the same content column as
   Home (so the man-page indent stops line up), a Back link to Home, and room at
   the foot. These pages render inside the sliding route panel like any other
   non-home route. */
export default function DocShell({ children }) {
  return (
    <main className="mr-auto w-full max-w-5xl pb-28 pl-8 pr-5 sm:pl-14 sm:pr-6 lg:pl-24">
      <div className="pt-6">
        <Link
          to="/"
          onClick={blurOnPointerClick}
          className="group inline-flex items-center gap-2 font-sans text-[0.875rem] font-medium text-muted transition-colors duration-200 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back
        </Link>
      </div>
      {children}
    </main>
  );
}
