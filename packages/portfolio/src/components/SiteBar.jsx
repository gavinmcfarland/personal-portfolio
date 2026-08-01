import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { blurOnPointerClick } from "./ui";
import { NAV_ITEMS, sectionFor } from "../data/nav";

/* The bar from the Enamel sheet (design-mockups/12-enamel): three links at the
   left, the theme toggle hard right, a hairline underneath. Fixed, and rendered
   once at the root of the app — it is the one piece of chrome that belongs to
   both Home and the sliding route panel, which is why the toggle no longer has
   to be floated separately over each of them.

   Its padding matches the content column's (pl-8 sm:pl-14 lg:pl-24 / pr-5
   sm:pr-6) so the first link's text sets on the same left edge as the page's
   flush headings, and the toggle's right edge lines up with the text below it.
   See `.bar` in app.css for the rest.

   Which link is lit comes from the section table (src/data/nav.js), not from
   <NavLink>, which can only light a link on its own href — a reader inside a
   project is in the work section even though the URL says /projects/:id, and
   should be able to see that. */
const SiteBar = () => {
  const { pathname } = useLocation();
  const current = sectionFor(pathname);

  return (
    <header className="bar pl-8 pr-5 sm:pl-14 sm:pr-6 lg:pl-24">
      <nav aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={blurOnPointerClick}
            /* The filled current-page state is keyed off aria-current in
               app.css, so the styling and what a screen reader announces
               cannot come apart. */
            aria-current={item === current ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {/* Static in the bar's flow rather than fixed to the viewport — the bar is
          already fixed, and `ml-auto` puts the toggle at its right edge. It gives
          up its enamel panel here: the bar is already a filled surface. */}
      <ThemeToggle className="-mr-1 ml-auto" panel={false} />
    </header>
  );
};

export default SiteBar;
