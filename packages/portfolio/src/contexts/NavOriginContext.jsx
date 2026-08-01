import { createContext, useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { isIndexRoute } from "../data/nav";

/* Where a page's Back link goes.
 *
 * Every non-home route opens in the sliding panel, and the panel holds one
 * route at a time — so leaving a project means navigating somewhere, and the
 * somewhere used to be Home no matter how the reader arrived. A project opened
 * from /work sent them to Home; so did a post opened from /writing.
 *
 * What Back should return to is the list the item was opened from, so the
 * origin is tracked here: the last *index* route visited (see src/data/nav.js
 * for which routes those are). Only the indexes are recorded, so a detail page
 * never overwrites the list behind it — which is also what makes prev/next
 * work. Walking from one project to the next leaves the origin alone, and Back
 * still returns to the list the reader came in through rather than to the
 * project before this one (the browser's own Back does that, and does it
 * better).
 *
 * A ref rather than state: nothing needs to re-render when the origin changes.
 * It is read while a detail page renders, which happens after the navigation
 * that set it, and it cannot change while that page is on screen — reaching an
 * index route means the detail page is already gone. */
const NavOriginContext = createContext(null);

export function NavOriginProvider({ children }) {
  const { pathname } = useLocation();
  const origin = useRef("/");

  useEffect(() => {
    if (isIndexRoute(pathname)) origin.current = pathname;
  }, [pathname]);

  return (
    <NavOriginContext.Provider value={origin}>
      {children}
    </NavOriginContext.Provider>
  );
}

/* The route this page's Back link should point at.
 *
 * An index page is itself an origin, so its own Back goes up to Home rather
 * than to whichever list preceded it — "back" from the writing archive is the
 * site's front page, not the work index the reader happened to pass through.
 * Everything else returns to the list it was opened from, defaulting to Home
 * for a page loaded cold from a URL, where there is no route in front of it. */
export function useBackTarget() {
  const { pathname } = useLocation();
  const origin = useContext(NavOriginContext);
  if (!origin || isIndexRoute(pathname)) return "/";
  return origin.current;
}
