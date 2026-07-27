import { useEffect } from "react";
import {
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  ogImageUrl,
} from "../lib/seo";

/* Per-page document head, no dependency.
 *
 * Drop <Seo …/> anywhere in a route and it keeps the document title and the
 * social meta (Open Graph + Twitter) in sync with that page. The OG image is
 * the generic card from `api/og.jsx`, fed this page's title and description —
 * so every page shares one template but ships its own image. Pass `image` to
 * override with a fully-formed URL (absolute, or a root-relative path).
 *
 * Note: these tags are written client-side, so crawlers that execute JS (and
 * the browser tab) see the per-page values; the static tags in index.html are
 * the fallback for crawlers that don't. */
export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  image,
  type = "website",
  noindex = false,
}) {
  // A bare page title (e.g. "Figlet") gets the site name appended for the tab;
  // the home page passes no title and shows the site name alone.
  const fullTitle = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;

  // The OG card's big line is the page's own title (or the site name on home).
  const ogPath =
    image || ogImageUrl({ title: title || SITE_NAME, subtitle: description });

  useEffect(() => {
    const origin = window.location.origin;
    const absolute = (url) => (/^https?:\/\//.test(url) ? url : origin + url);
    const url = window.location.href;
    const imageUrl = absolute(ogPath);

    // Save the title alongside the meta tags below: Home stays mounted for the
    // life of the app, so its <Seo> never re-runs when an overlay route closes.
    // Without restoring here the tab would keep the overlay's title.
    const previousTitle = document.title;
    document.title = fullTitle;

    const tags = [
      { name: "description", content: description },
      { property: "og:type", content: type },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: imageUrl },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: imageUrl },
      // Keep private/utility pages out of search indexes.
      ...(noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    ];

    // Upsert one <meta> per tag, keying on name/property so we update in place
    // rather than piling up duplicates across navigations.
    const nodes = tags.map(({ name, property, content }) => {
      const attr = name ? "name" : "property";
      const key = name || property;
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      // Remember whether this tag pre-existed (from index.html) so we can
      // restore it on unmount instead of deleting a static fallback tag.
      const previous = el.getAttribute("content");
      el.setAttribute("content", content);
      return { el, previous };
    });

    return () => {
      // On unmount, restore the title and each tag's prior value so leaving a
      // route doesn't strip the document down — and where the page underneath
      // is already mounted (Home), its values come back rather than lingering.
      document.title = previousTitle;
      for (const { el, previous } of nodes) {
        if (previous === null) el.remove();
        else el.setAttribute("content", previous);
      }
    };
  }, [fullTitle, description, ogPath, type, noindex]);

  return null;
}
