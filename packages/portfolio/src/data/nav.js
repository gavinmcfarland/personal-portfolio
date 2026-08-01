/* The site's three sections, and what belongs to each.
 *
 * One table, because two things read it and they must not disagree: the bar
 * lights the section the reader is in (<SiteBar>), and a detail page's Back
 * link returns to the section it was opened from (NavOriginContext). Both
 * questions are "which of these lists does this path belong to", asked from
 * different ends.
 *
 * `match` is declared per section rather than inferred from `to`, because a
 * section's pages are not all under its own URL — a project lives at
 * /projects/:id, not /work/:id. The order matters: the first match wins, and
 * "/" is exact so it does not claim everything.
 *
 * Adding a section means adding a row here — the bar, the current-page fill and
 * the back targets all follow from it. */
export const NAV_ITEMS = [
  { label: "Index", to: "/", match: (p) => p === "/" },
  {
    label: "Writing",
    to: "/writing",
    // The archive and every post under it.
    match: (p) => p === "/writing" || p.startsWith("/writing/"),
  },
  {
    label: "Work",
    to: "/work",
    // The index and every project page it lists.
    match: (p) => p === "/work" || p.startsWith("/projects/"),
  },
];

/* The section a path belongs to, or undefined for a page that belongs to none
   — /backup, a 404. Those light nothing in the bar. */
export const sectionFor = (pathname) =>
  NAV_ITEMS.find((item) => item.match(pathname));

/* An index is a section's own list page: the three routes the bar links to.
   These are the routes a Back link can return to. */
export const isIndexRoute = (pathname) =>
  NAV_ITEMS.some((item) => item.to === pathname);
