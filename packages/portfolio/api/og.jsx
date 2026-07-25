import { ImageResponse } from "@vercel/og";

/* Dynamic Open Graph image, rendered on the edge.
 *
 * Generic template, dynamic content: every page shares the same layout —
 * the favicon mark and site name on a black card — while `title` and
 * `subtitle` come in as query params so each page gets its own image.
 *
 *   /api/og?title=Figlet&subtitle=A%20browser-based%20IDE…
 *
 * Colours mirror the SVG favicon (public/favicon.svg): white marks and text
 * on the site's near-black ink. */
export const config = { runtime: "edge" };

// Favicon palette — keep in sync with public/favicon.svg and app.css `--ink`.
const INK = "#16161A"; // background (the favicon's "black")
const WHITE = "#ffffff";
const MUTED = "rgba(255,255,255,0.62)";

// The favicon notch mark, recoloured solid white, as an inline SVG data URI.
// (Satori renders SVG reliably through <img>, not as inline elements.)
const MARK = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<mask id="n"><rect width="32" height="32" fill="#fff"/>` +
    `<circle cx="28" cy="6" r="9" fill="#000"/></mask>` +
    `<rect x="3" y="3" width="26" height="26" rx="9" fill="#fff" mask="url(#n)"/></svg>`,
)}`;

const SITE = "gavinmcfarland.co.uk";
const DEFAULT_TITLE = "Gavin McFarland";
const DEFAULT_SUBTITLE =
  "Designer and full-stack engineer building tools and web applications.";

// Load a Google font as raw bytes so the card uses the site's typeface (Chivo)
// rather than Satori's fallback. Subset to the glyphs we actually draw so the
// download stays tiny.
async function loadFont(weight, text) {
  const url = `https://fonts.googleapis.com/css2?family=Chivo:wght@${weight}&text=${encodeURIComponent(
    text,
  )}`;
  const css = await (await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  })).text();
  const src = css.match(/src: url\((.+?)\) format/);
  if (!src) throw new Error("Chivo font URL not found");
  return await (await fetch(src[1])).arrayBuffer();
}

// Keep the card from overflowing when a page passes a very long value.
const clamp = (value, max) =>
  value && value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const title = clamp(searchParams.get("title") || DEFAULT_TITLE, 60);
  const subtitle = clamp(
    searchParams.get("subtitle") || DEFAULT_SUBTITLE,
    140,
  );

  // Only the glyphs on this card need to be in the font subset.
  const glyphs = `${title}${subtitle}${SITE}`;

  let fonts;
  try {
    const [regular, bold] = await Promise.all([
      loadFont(400, glyphs),
      loadFont(700, title),
    ]);
    fonts = [
      { name: "Chivo", data: regular, weight: 400, style: "normal" },
      { name: "Chivo", data: bold, weight: 700, style: "normal" },
    ];
  } catch {
    // Font fetch failed (e.g. offline build/preview) — fall back to Satori's
    // built-in typeface rather than failing the whole image.
    fonts = undefined;
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: INK,
          padding: "80px",
          fontFamily: "Chivo",
        }}
      >
        {/* Mark, top-left */}
        <img src={MARK} width={92} height={92} alt="" />

        {/* Title + subtitle, sitting on the baseline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 32 ? 68 : 84,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: WHITE,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              maxWidth: 900,
              fontSize: 32,
              fontWeight: 400,
              lineHeight: 1.4,
              color: MUTED,
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Site name, bottom-left */}
        <div
          style={{
            display: "flex",
            marginTop: 48,
            fontSize: 26,
            fontWeight: 400,
            color: MUTED,
          }}
        >
          {SITE}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      headers: {
        "Cache-Control":
          "public, immutable, no-transform, s-maxage=31536000, max-age=31536000",
      },
    },
  );
}
