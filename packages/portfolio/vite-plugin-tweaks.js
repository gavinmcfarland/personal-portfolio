import fs from "node:fs";
import path from "node:path";
import { FONTS, SETTINGS, stackFor } from "./src/lib/typeTrial.js";

/* Dev only: the "Save as defaults" button in the Tweaks panel (TextTuner.jsx)
   posts the current tweaks and font picks here, and they are written into the
   source as the new defaults:

     src/app.css               --font-sans / --font-heading, --text-4, both
                               --muted lines, body weight and smoothing, and a
                               marked block holding button size and corners
     index.html                the Google Fonts link carries the picked faces
     src/data/tweakDefaults.json   what the panel and font picker treat as the
                               default from now on

   Every value is checked against the panel's own option lists (lib/
   typeTrial.js), so the endpoint can only ever write what the panel offers,
   and every edit must find exactly one target or nothing is written. */

const BLOCK_START = "/* tweaks:start";
const BLOCK_END = "/* tweaks:end */";

// Families the trial manages in index.html. JetBrains Mono stays regardless —
// it is the mono fallback in --font-mono, not a trial pick.
const KEEP_FAMILIES = new Set(["JetBrains Mono"]);

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function validate(values) {
  const out = {};
  for (const key of ["body", "heading"]) {
    const font = FONTS.find((f) => f.name === values[key]);
    if (!font) throw new Error(`unknown ${key} font "${values[key]}"`);
    out[key] = font;
  }
  for (const s of SETTINGS) {
    if (!s.options.some((o) => o.value === values[s.key]))
      throw new Error(`"${values[s.key]}" is not a ${s.label} option`);
    out[s.key] = values[s.key];
  }
  return out;
}

// Replace exactly one match, or throw — a stylesheet that has drifted from what
// this expects should stop the commit, not be half-edited.
function replaceOnce(text, re, replacement, what) {
  const matches = text.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"));
  if (!matches || matches.length !== 1)
    throw new Error(`expected one ${what} in app.css, found ${matches ? matches.length : 0}`);
  return text.replace(re, replacement);
}

const muted = (v, base, toward) => {
  if (v === "0%") return `var(${base})`;
  const faint = v.startsWith("-");
  return `color-mix(in oklab, var(${base}), var(${toward[faint ? 0 : 1]}) ${faint ? v.slice(1) : v})`;
};

// A font stack as app.css writes them: on its own lines under the property,
// indented four, wrapped before 80 columns.
function wrapStack(stack) {
  const lines = [];
  let line = "";
  for (const part of stack.split(", ")) {
    const next = line ? `${line}, ${part}` : part;
    if (line && 4 + next.length + 1 > 80) {
      lines.push(line + ",");
      line = part;
    } else line = next;
  }
  lines.push(line);
  return lines.map((l) => `    ${l}`).join("\n");
}

// The panel's CSS is written for a <style> tag; re-indent it to sit in app.css
// like hand-written rules (selectors flush, declarations two in, a blank line
// between rules).
function tidy(css) {
  return css
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (l.endsWith("{") || l === "}" || /\{.*\}$/.test(l) ? l : `  ${l}`))
    .join("\n")
    .replace(/\}\n(?!$)/g, "}\n\n");
}

function rewriteCss(css, v) {
  css = replaceOnce(css, /--font-sans:\s*[^;]+;/, `--font-sans:\n${wrapStack(stackFor(v.body))};`, "--font-sans");
  css = replaceOnce(css, /--font-heading:\s*[^;]+;/, `--font-heading:\n${wrapStack(stackFor(v.heading))};`, "--font-heading");

  const px = Math.round(parseFloat(v.size) * 16 * 100) / 100;
  css = replaceOnce(css, /--text-4: [0-9.]+rem; \/\* [0-9.]+px/, `--text-4: ${v.size}; /* ${px}px`, "--text-4");

  css = replaceOnce(
    css,
    /--muted: [^;]*--steel-600[^;]*;/,
    `--muted: ${muted(v.grey, "--steel-600", ["--steel-200", "--steel-950"])};`,
    "light --muted",
  );
  css = replaceOnce(
    css,
    /--muted: [^;]*--galley-mid[^;]*;/,
    `--muted: ${muted(v.grey, "--galley-mid", ["--galley-ground", "--galley-ink"])};`,
    "dark --muted",
  );

  const moz = v.smoothing === "antialiased" ? "grayscale" : v.smoothing;
  css = replaceOnce(
    css,
    /-webkit-font-smoothing: \w+;\n(\s*)-moz-osx-font-smoothing: \w+;/,
    `-webkit-font-smoothing: ${v.smoothing};\n$1-moz-osx-font-smoothing: ${moz};`,
    "body smoothing pair",
  );

  // Body weight: one marked line in the body rule, present only off 400.
  css = css.replace(/\n {2}font-weight: \d+; \/\* tweaks: body weight \*\//g, "");
  if (v.weight !== "400") {
    css = replaceOnce(
      css,
      // `^body {` with the m flag — a bare `body` rule at the start of a line,
      // not one of the many classes that merely end in "body".
      /(^body \{\n {2}margin: 0;[\s\S]*?\n {2}line-height: var\(--leading\);)/m,
      `$1\n  font-weight: ${v.weight}; /* tweaks: body weight */`,
      "body line-height (to anchor the weight)",
    );
  }

  // Button size and corners are cross-cutting overrides (they have to beat the
  // enamel doctrine's `border-radius: 0 !important`), so they live in one
  // marked block at the end, built by the same functions the panel previews.
  const start = css.indexOf(BLOCK_START);
  if (start !== -1) {
    const end = css.indexOf(BLOCK_END, start);
    if (end === -1) throw new Error("tweaks:start without tweaks:end in app.css");
    css = css.slice(0, start).replace(/\n+$/, "\n") + css.slice(end + BLOCK_END.length).replace(/^\n+/, "");
  }
  // 38px and square are what the stylesheet does with no block at all.
  const cssFor = (k) => tidy(SETTINGS.find((s) => s.key === k).css(v[k]));
  const parts = [];
  if (v.buttonSize !== "38px") parts.push(cssFor("buttonSize"));
  if (v.corners !== "0") parts.push(cssFor("corners"));
  if (parts.length) {
    css =
      css.replace(/\n*$/, "\n\n") +
      `${BLOCK_START} — written by the dev Tweaks panel's "Save as defaults"
   (vite-plugin-tweaks.js). Button size and corners, built by the same code
   the panel previews with (src/lib/typeTrial.js). Edit them from the panel,
   not by hand: the next save replaces this whole block. */
${parts.join("\n\n")}
${BLOCK_END}\n`;
  }
  return css;
}

function familyName(param) {
  return decodeURIComponent(param.split(":")[0]).replace(/\+/g, " ");
}

function rewriteHtml(html, v) {
  const re = /(https:\/\/fonts\.googleapis\.com\/css2\?)([^"]+)/;
  const m = html.match(re);
  if (!m) throw new Error("no Google Fonts css2 link in index.html");
  const params = m[2].split("&");
  const families = params.filter((p) => p.startsWith("family="));
  const rest = params.filter((p) => !p.startsWith("family="));
  const trialNames = new Set(FONTS.map((f) => f.name));
  const wanted = [v.body, v.heading].filter((f) => !f.system);

  // Keep every family the trial doesn't manage (Caveat etc.), JetBrains Mono,
  // and a picked face already in the link (its axis spec may be richer than
  // the list's — Figtree is loaded as a variable range). Drop other trial
  // faces, then add any picked face that's missing.
  const kept = families.filter((p) => {
    const name = familyName(p.slice("family=".length));
    return !trialNames.has(name) || KEEP_FAMILIES.has(name) || wanted.some((f) => f.name === name);
  });
  for (const font of wanted) {
    if (kept.some((p) => familyName(p.slice("family=".length)) === font.name)) continue;
    kept.unshift(`family=${font.name.replace(/ /g, "+")}:${font.axes}`);
  }
  return html.replace(re, `$1${[...kept, ...rest].join("&")}`);
}

export function tweaks() {
  return {
    name: "portfolio-tweaks",
    apply: "serve",
    configureServer(server) {
      const root = server.config.root;
      const files = {
        css: path.join(root, "src/app.css"),
        html: path.join(root, "index.html"),
        defaults: path.join(root, "src/data/tweakDefaults.json"),
      };

      /* POST { body, heading, size, weight, grey, smoothing, buttonSize,
         corners } → { ok, written: [files] } */
      server.middlewares.use("/__tweaks/commit", (req, res, next) => {
        if (req.method !== "POST") return next();
        res.setHeader("content-type", "application/json");
        const reply = (status, payload) => {
          res.statusCode = status;
          res.end(JSON.stringify(payload));
        };
        readBody(req).then((text) => {
          try {
            const values = JSON.parse(text);
            const v = validate(values);

            // Build everything first, write only if all three succeed.
            const css = fs.readFileSync(files.css, "utf8");
            const html = fs.readFileSync(files.html, "utf8");
            const next = {
              css: rewriteCss(css, v),
              html: rewriteHtml(html, v),
              defaults:
                JSON.stringify(
                  {
                    body: v.body.name,
                    heading: v.heading.name,
                    ...Object.fromEntries(SETTINGS.map((s) => [s.key, v[s.key]])),
                  },
                  null,
                  2,
                ) + "\n",
            };
            const written = [];
            for (const [k, content] of Object.entries(next)) {
              const current = k === "css" ? css : k === "html" ? html : fs.readFileSync(files[k], "utf8");
              if (content !== current) {
                fs.writeFileSync(files[k], content);
                written.push(path.relative(root, files[k]));
              }
            }
            server.config.logger.info(`  tweaks saved → ${written.join(", ") || "(no changes)"}`);
            reply(200, { ok: true, written });
          } catch (err) {
            reply(400, { ok: false, error: String((err && err.message) || err) });
          }
        });
      });
    },
  };
}
