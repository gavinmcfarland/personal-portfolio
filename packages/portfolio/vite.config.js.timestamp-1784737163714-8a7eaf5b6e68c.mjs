// vite.config.js
import { awenate } from "file:///Users/gavinmcfarland/Developer/repos/personal-portfolio/node_modules/.pnpm/@awenate+react@0.1.0_vite@5.4.21_lightningcss@1.32.0_/node_modules/@awenate/react/dist/index.js";
import { fileURLToPath } from "node:url";
import { defineConfig } from "file:///Users/gavinmcfarland/Developer/repos/personal-portfolio/node_modules/.pnpm/vite@5.4.21_lightningcss@1.32.0/node_modules/vite/dist/node/index.js";
import react from "file:///Users/gavinmcfarland/Developer/repos/personal-portfolio/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.21_lightningcss@1.32.0_/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///Users/gavinmcfarland/Developer/repos/personal-portfolio/node_modules/.pnpm/@tailwindcss+vite@4.2.2_vite@5.4.21_lightningcss@1.32.0_/node_modules/@tailwindcss/vite/dist/index.mjs";

// vite-plugin-canvas-save.js
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
var BOARD_DIR = path.resolve(process.cwd(), "src/data/canvas");
var ASSET_DIR = path.resolve(process.cwd(), "public/canvas-assets");
var KEY_RE = /^[a-zA-Z0-9_-]+$/;
var EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
  "text/html": "html"
};
function decodeDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!m) return null;
  const ext = EXT[m[1]];
  if (!ext) return null;
  return { ext, buffer: Buffer.from(m[2], "base64") };
}
var ASSET_RE = /^[0-9a-f]{16}\.(?:png|jpg|gif|webp|svg|avif|mp4|webm|ogv|mov|html)$/;
var MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",
  html: "text/html"
};
function allNodes(data) {
  if (Array.isArray(data.pages)) return data.pages.flatMap((p) => Array.isArray(p.nodes) ? p.nodes : []);
  return Array.isArray(data.nodes) ? data.nodes : [];
}
function assetRefs(data) {
  const refs = /* @__PURE__ */ new Set();
  const add = (src) => {
    if (typeof src === "string" && src.startsWith("/canvas-assets/")) refs.add(src.slice("/canvas-assets/".length));
  };
  for (const n of allNodes(data)) {
    if (n && (n.type === "image" || n.type === "video")) {
      add(n.src);
      for (const a of Array.isArray(n.assets) ? n.assets : []) {
        if (a) {
          add(a.src);
          add(a.srcDark);
        }
      }
    }
    if (n && n.type === "html") add(n.src);
    if (n && n.type === "link" && typeof n.image === "string" && n.image.startsWith("/canvas-assets/")) {
      refs.add(n.image.slice("/canvas-assets/".length));
    }
  }
  return refs;
}
function readBoard(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
function pruneAssets(prevRefs) {
  if (!prevRefs.size || !fs.existsSync(ASSET_DIR)) return [];
  const referenced = /* @__PURE__ */ new Set();
  if (fs.existsSync(BOARD_DIR)) {
    for (const file of fs.readdirSync(BOARD_DIR)) {
      if (!file.endsWith(".json")) continue;
      const data = readBoard(path.join(BOARD_DIR, file));
      if (data) assetRefs(data).forEach((name) => referenced.add(name));
    }
  }
  const removed = [];
  for (const name of prevRefs) {
    if (ASSET_RE.test(name) && !referenced.has(name) && fs.existsSync(path.join(ASSET_DIR, name))) {
      fs.unlinkSync(path.join(ASSET_DIR, name));
      removed.push(name);
    }
  }
  return removed;
}
var UNFURL_UA = "Mozilla/5.0 (compatible; PortfolioCanvasBot/1.0; +https://limitlessloop.com)";
function decodeEntities(s) {
  return (s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#x27;/gi, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, d) => {
    try {
      return String.fromCodePoint(+d);
    } catch {
      return "";
    }
  }).replace(/&#x([0-9a-f]+);/gi, (_, h) => {
    try {
      return String.fromCodePoint(parseInt(h, 16));
    } catch {
      return "";
    }
  }).trim();
}
function metaContent(html, keys) {
  for (const key of keys) {
    const re = new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${key}["'][^>]*>`, "i");
    const tag = re.exec(html);
    if (tag) {
      const c = /content\s*=\s*["']([^"']*)["']/i.exec(tag[0]);
      if (c && c[1].trim()) return decodeEntities(c[1]);
    }
  }
  return "";
}
function pageTitle(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? decodeEntities(m[1]) : "";
}
function faviconUrl(html, baseUrl) {
  const re = /<link[^>]+>/gi;
  let m, href = "";
  while (m = re.exec(html)) {
    if (!/rel\s*=\s*["'][^"']*icon[^"']*["']/i.test(m[0])) continue;
    const h = /href\s*=\s*["']([^"']+)["']/i.exec(m[0]);
    if (h && h[1] && !/^data:/i.test(h[1].trim())) {
      href = h[1];
      break;
    }
  }
  try {
    return new URL(href || "/favicon.ico", baseUrl).href;
  } catch {
    return "";
  }
}
async function downloadImageAsset(imageUrl) {
  try {
    const res = await fetch(imageUrl, { redirect: "follow", headers: { "user-agent": UNFURL_UA }, signal: AbortSignal.timeout(1e4) });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const ext = EXT[ct];
    if (!ext || !ct.startsWith("image/")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) return null;
    const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 16);
    const name = `${hash}.${ext}`;
    const file = path.join(ASSET_DIR, name);
    if (!fs.existsSync(file)) {
      fs.mkdirSync(ASSET_DIR, { recursive: true });
      fs.writeFileSync(file, buffer);
    }
    return `/canvas-assets/${name}`;
  } catch {
    return null;
  }
}
async function unfurl(rawUrl) {
  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error("invalid URL");
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") throw new Error("unsupported protocol");
  const res = await fetch(target.href, {
    redirect: "follow",
    headers: { "user-agent": UNFURL_UA, accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(1e4)
  });
  const finalUrl = res.url || target.href;
  const html = (await res.text()).slice(0, 5e5);
  const title = metaContent(html, ["og:title", "twitter:title"]) || pageTitle(html) || target.hostname;
  const description = metaContent(html, ["og:description", "twitter:description", "description"]);
  const siteName = metaContent(html, ["og:site_name"]);
  let image = metaContent(html, ["og:image:secure_url", "og:image:url", "og:image", "twitter:image", "twitter:image:src"]);
  if (image) {
    try {
      image = new URL(image, finalUrl).href;
    } catch {
      image = "";
    }
  }
  const localImage = image ? await downloadImageAsset(image) : null;
  return {
    url: finalUrl,
    title,
    description,
    siteName,
    image: localImage || image || "",
    favicon: faviconUrl(html, finalUrl)
  };
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
function canvasSave() {
  return {
    name: "canvas-save",
    apply: "serve",
    /* Don't let saving a snapshot trigger an HMR reload — the live board
       already reflects these edits, so a reload only jars the view. The files
       matter on the next fresh load and in the production build.
       (Dropped images under public/canvas-assets are intentionally NOT ignored:
       Vite won't serve files whose path is in the watch-ignore list.) */
    config() {
      return { server: { watch: { ignored: ["**/src/data/canvas/**"] } } };
    },
    configureServer(server) {
      server.middlewares.use("/canvas-assets", (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        let name;
        try {
          name = decodeURIComponent((req.url || "").split("?")[0]).replace(/^\/+/, "");
        } catch {
          return next();
        }
        if (!ASSET_RE.test(name)) return next();
        const file = path.join(ASSET_DIR, name);
        let stat;
        try {
          stat = fs.statSync(file);
        } catch {
          return next();
        }
        const ext = name.slice(name.lastIndexOf(".") + 1);
        res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Accept-Ranges", "bytes");
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
        if (range) {
          const start = range[1] ? parseInt(range[1], 10) : 0;
          const end = range[2] ? parseInt(range[2], 10) : stat.size - 1;
          if (start > end || end >= stat.size) {
            res.statusCode = 416;
            res.setHeader("Content-Range", `bytes */${stat.size}`);
            return res.end();
          }
          res.statusCode = 206;
          res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
          res.setHeader("Content-Length", end - start + 1);
          if (req.method === "HEAD") return res.end();
          return fs.createReadStream(file, { start, end }).pipe(res);
        }
        res.statusCode = 200;
        res.setHeader("Content-Length", stat.size);
        if (req.method === "HEAD") return res.end();
        return fs.createReadStream(file).pipe(res);
      });
      server.middlewares.use("/__canvas/asset", (req, res, next) => {
        if (req.method !== "POST") return next();
        res.setHeader("content-type", "application/json");
        readBody(req).then((body) => {
          try {
            const { dataUrl } = JSON.parse(body);
            const decoded = decodeDataUrl(dataUrl);
            if (!decoded) throw new Error("unsupported or missing media data URL");
            const hash = crypto.createHash("sha1").update(decoded.buffer).digest("hex").slice(0, 16);
            const name = `${hash}.${decoded.ext}`;
            const file = path.join(ASSET_DIR, name);
            if (!fs.existsSync(file)) {
              fs.mkdirSync(ASSET_DIR, { recursive: true });
              fs.writeFileSync(file, decoded.buffer);
              server.config.logger.info(`  canvas image \u2192 public/canvas-assets/${name}`);
            }
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, url: `/canvas-assets/${name}` }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
          }
        });
      });
      server.middlewares.use("/__canvas/unfurl", (req, res, next) => {
        if (req.method !== "POST") return next();
        res.setHeader("content-type", "application/json");
        readBody(req).then(async (body) => {
          try {
            const { url } = JSON.parse(body);
            const data = await unfurl(url);
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, data }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
          }
        });
      });
      server.middlewares.use("/__canvas/save", (req, res, next) => {
        if (req.method !== "POST") return next();
        readBody(req).then((body) => {
          res.setHeader("content-type", "application/json");
          try {
            const { key, snapshot } = JSON.parse(body);
            if (!KEY_RE.test(key || "")) throw new Error("missing or unsafe board key");
            if (!snapshot || !(Array.isArray(snapshot.pages) || Array.isArray(snapshot.nodes))) {
              throw new Error("expected snapshot with { pages: [...] } or { nodes: [...] }");
            }
            fs.mkdirSync(BOARD_DIR, { recursive: true });
            const target = path.join(BOARD_DIR, `${key}.json`);
            const prev = fs.existsSync(target) ? readBoard(target) : null;
            fs.writeFileSync(target, JSON.stringify(snapshot, null, 2) + "\n");
            server.config.logger.info(`  canvas saved \u2192 ${path.relative(process.cwd(), target)}`);
            const removed = pruneAssets(prev ? assetRefs(prev) : /* @__PURE__ */ new Set());
            if (removed.length) server.config.logger.info(`  pruned ${removed.length} orphaned asset(s)`);
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, pruned: removed.length }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
          }
        });
      });
    }
  };
}

// vite.config.js
var __vite_injected_original_import_meta_url = "file:///Users/gavinmcfarland/Developer/repos/personal-portfolio/packages/portfolio/vite.config.js";
var canvasSrc = fileURLToPath(new URL("../canvas/src/index.js", __vite_injected_original_import_meta_url));
var canvasCss = fileURLToPath(new URL("../canvas/src/styles.css", __vite_injected_original_import_meta_url));
var vite_config_default = defineConfig({
  resolve: {
    alias: [
      { find: /^@gavinmcfarland\/canvas$/, replacement: canvasSrc },
      { find: /^@gavinmcfarland\/canvas\/styles\.css$/, replacement: canvasCss }
    ]
  },
  plugins: [
    awenate(),
    tailwindcss(),
    react(),
    canvasSave()
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAidml0ZS1wbHVnaW4tY2FudmFzLXNhdmUuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZ2F2aW5tY2ZhcmxhbmQvRGV2ZWxvcGVyL3JlcG9zL3BlcnNvbmFsLXBvcnRmb2xpby9wYWNrYWdlcy9wb3J0Zm9saW9cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9nYXZpbm1jZmFybGFuZC9EZXZlbG9wZXIvcmVwb3MvcGVyc29uYWwtcG9ydGZvbGlvL3BhY2thZ2VzL3BvcnRmb2xpby92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZ2F2aW5tY2ZhcmxhbmQvRGV2ZWxvcGVyL3JlcG9zL3BlcnNvbmFsLXBvcnRmb2xpby9wYWNrYWdlcy9wb3J0Zm9saW8vdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBhd2VuYXRlIH0gZnJvbSBcIkBhd2VuYXRlL3JlYWN0XCI7XG5cbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tIFwibm9kZTp1cmxcIjtcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSBcIkB0YWlsd2luZGNzcy92aXRlXCI7XG5pbXBvcnQgeyBjYW52YXNTYXZlIH0gZnJvbSBcIi4vdml0ZS1wbHVnaW4tY2FudmFzLXNhdmUuanNcIjtcblxuLy8gQ29uc3VtZSB0aGUgY2FudmFzIHBhY2thZ2UgYXMgc291cmNlIHNvIGl0cyBKU1ggaXMgdHJhbnNmb3JtZWQgYnlcbi8vIEB2aXRlanMvcGx1Z2luLXJlYWN0IChhIHN5bWxpbmtlZCBub2RlX21vZHVsZXMgZGVwIHdvdWxkIGJlIHNraXBwZWQpLiBFeGFjdFxuLy8gcmVnZXhlcyBzbyB0aGUgYmFyZSBzcGVjaWZpZXIgYW5kIHRoZSAuL3N0eWxlcy5jc3Mgc3VicGF0aCByZXNvbHZlIGNsZWFubHkuXG5jb25zdCBjYW52YXNTcmMgPSBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoXCIuLi9jYW52YXMvc3JjL2luZGV4LmpzXCIsIGltcG9ydC5tZXRhLnVybCkpO1xuY29uc3QgY2FudmFzQ3NzID0gZmlsZVVSTFRvUGF0aChuZXcgVVJMKFwiLi4vY2FudmFzL3NyYy9zdHlsZXMuY3NzXCIsIGltcG9ydC5tZXRhLnVybCkpO1xuXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG5cdHJlc29sdmU6IHtcblx0XHRhbGlhczogW1xuXHRcdFx0eyBmaW5kOiAvXkBnYXZpbm1jZmFybGFuZFxcL2NhbnZhcyQvLCByZXBsYWNlbWVudDogY2FudmFzU3JjIH0sXG5cdFx0XHR7IGZpbmQ6IC9eQGdhdmlubWNmYXJsYW5kXFwvY2FudmFzXFwvc3R5bGVzXFwuY3NzJC8sIHJlcGxhY2VtZW50OiBjYW52YXNDc3MgfSxcblx0XHRdLFxuXHR9LFxuXHRwbHVnaW5zOiBbXG4gICAgYXdlbmF0ZSgpLFxuXHRcdHRhaWx3aW5kY3NzKCksIHJlYWN0KCksIGNhbnZhc1NhdmUoKV0sXG59KTtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2dhdmlubWNmYXJsYW5kL0RldmVsb3Blci9yZXBvcy9wZXJzb25hbC1wb3J0Zm9saW8vcGFja2FnZXMvcG9ydGZvbGlvXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvZ2F2aW5tY2ZhcmxhbmQvRGV2ZWxvcGVyL3JlcG9zL3BlcnNvbmFsLXBvcnRmb2xpby9wYWNrYWdlcy9wb3J0Zm9saW8vdml0ZS1wbHVnaW4tY2FudmFzLXNhdmUuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2dhdmlubWNmYXJsYW5kL0RldmVsb3Blci9yZXBvcy9wZXJzb25hbC1wb3J0Zm9saW8vcGFja2FnZXMvcG9ydGZvbGlvL3ZpdGUtcGx1Z2luLWNhbnZhcy1zYXZlLmpzXCI7LyogRGV2LW9ubHkgZW5kcG9pbnRzIHRoYXQgYmFrZSBhIGxpdmUgY2FudmFzIGludG8gYSBjb21taXR0ZWQgZGF0YSBmaWxlLlxuICAgVGhlIFwiU2F2ZVwiIGJ1dHRvbiBQT1NUcyB7IGtleSwgc25hcHNob3QgfSBoZXJlOyB3ZSB3cml0ZSBpdCB0b1xuICAgc3JjL2RhdGEvY2FudmFzLzxrZXk+Lmpzb24sIHdoaWNoIHRoZSBhcHAgbG9hZHMgYXMgdGhhdCBib2FyZCdzIHB1Ymxpc2hlZFxuICAgc3RhdGUgaW4gYm90aCBkZXYgYW5kIHByb2R1Y3Rpb24uIE9ubHkgcmVnaXN0ZXJlZCBieSBgdml0ZSBzZXJ2ZWAgXHUyMDE0IG5ldmVyXG4gICBpbiB0aGUgYnVpbGQuICovXG5pbXBvcnQgZnMgZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IGNyeXB0byBmcm9tICdub2RlOmNyeXB0byc7XG5cbmNvbnN0IEJPQVJEX0RJUiA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnc3JjL2RhdGEvY2FudmFzJyk7XG5jb25zdCBBU1NFVF9ESVIgPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ3B1YmxpYy9jYW52YXMtYXNzZXRzJyk7XG5cbi8qIEJvYXJkIGtleXMgbWlycm9yIHRoZSA8Q2FudmFzIHN0b3JhZ2VLZXk+IHRoZXkgY2FtZSBmcm9tIFx1MjAxNCBrZWVwIHRoZW0gdG8gYVxuICAgZmlsZW5hbWUtc2FmZSBhbHBoYWJldCBzbyB0aGUga2V5IGNhbiBuZXZlciBlc2NhcGUgQk9BUkRfRElSLiAqL1xuY29uc3QgS0VZX1JFID0gL15bYS16QS1aMC05Xy1dKyQvO1xuXG4vKiBkYXRhOmltYWdlL3BuZztiYXNlNjQsXHUyMDI2IFx1MjE5MiB7IGV4dCwgYnVmZmVyIH0uIFJldHVybnMgbnVsbCBpZiBub3QgYSBkYXRhIFVSTC4gKi9cbmNvbnN0IEVYVCA9IHtcbiAgJ2ltYWdlL3BuZyc6ICdwbmcnLCAnaW1hZ2UvanBlZyc6ICdqcGcnLCAnaW1hZ2UvZ2lmJzogJ2dpZicsICdpbWFnZS93ZWJwJzogJ3dlYnAnLCAnaW1hZ2Uvc3ZnK3htbCc6ICdzdmcnLCAnaW1hZ2UvYXZpZic6ICdhdmlmJyxcbiAgJ3ZpZGVvL21wNCc6ICdtcDQnLCAndmlkZW8vd2VibSc6ICd3ZWJtJywgJ3ZpZGVvL29nZyc6ICdvZ3YnLCAndmlkZW8vcXVpY2t0aW1lJzogJ21vdicsXG4gICd0ZXh0L2h0bWwnOiAnaHRtbCcsXG59O1xuZnVuY3Rpb24gZGVjb2RlRGF0YVVybChkYXRhVXJsKSB7XG4gIGNvbnN0IG0gPSAvXmRhdGE6KFteO10rKTtiYXNlNjQsKC4rKSQvcy5leGVjKGRhdGFVcmwgfHwgJycpO1xuICBpZiAoIW0pIHJldHVybiBudWxsO1xuICBjb25zdCBleHQgPSBFWFRbbVsxXV07XG4gIGlmICghZXh0KSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHsgZXh0LCBidWZmZXI6IEJ1ZmZlci5mcm9tKG1bMl0sICdiYXNlNjQnKSB9O1xufVxuXG4vKiBPbmx5IG91ciBjb250ZW50LWhhc2gtbmFtZWQgZmlsZXMgYXJlIGVsaWdpYmxlIGZvciBwcnVuaW5nIFx1MjAxNCBhbnl0aGluZyBlbHNlIGluXG4gICB0aGUgZm9sZGVyIChtYW51YWxseSBhZGRlZCBpbWFnZXMpIGlzIGxlZnQgdW50b3VjaGVkLiAqL1xuY29uc3QgQVNTRVRfUkUgPSAvXlswLTlhLWZdezE2fVxcLig/OnBuZ3xqcGd8Z2lmfHdlYnB8c3ZnfGF2aWZ8bXA0fHdlYm18b2d2fG1vdnxodG1sKSQvO1xuXG4vKiBDb250ZW50IHR5cGVzIGZvciBhc3NldHMgd2Ugc2VydmUgZGlyZWN0bHkgKHNlZSB0aGUgL2NhbnZhcy1hc3NldHMgaGFuZGxlcikuICovXG5jb25zdCBNSU1FID0ge1xuICBwbmc6ICdpbWFnZS9wbmcnLCBqcGc6ICdpbWFnZS9qcGVnJywgZ2lmOiAnaW1hZ2UvZ2lmJywgd2VicDogJ2ltYWdlL3dlYnAnLCBzdmc6ICdpbWFnZS9zdmcreG1sJywgYXZpZjogJ2ltYWdlL2F2aWYnLFxuICBtcDQ6ICd2aWRlby9tcDQnLCB3ZWJtOiAndmlkZW8vd2VibScsIG9ndjogJ3ZpZGVvL29nZycsIG1vdjogJ3ZpZGVvL3F1aWNrdGltZScsXG4gIGh0bWw6ICd0ZXh0L2h0bWwnLFxufTtcblxuLyogRXZlcnkgbm9kZSBhY3Jvc3MgYSBzbmFwc2hvdCwgd2hldGhlciBpdCdzIHRoZSBsZWdhY3kgc2luZ2xlLWJvYXJkIHNoYXBlXG4gICAoe25vZGVzfSkgb3IgdGhlIG11bHRpLXBhZ2Ugc2hhcGUgKHtwYWdlczpbe25vZGVzfV19KS4gKi9cbmZ1bmN0aW9uIGFsbE5vZGVzKGRhdGEpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YS5wYWdlcykpIHJldHVybiBkYXRhLnBhZ2VzLmZsYXRNYXAoKHApID0+IChBcnJheS5pc0FycmF5KHAubm9kZXMpID8gcC5ub2RlcyA6IFtdKSk7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGRhdGEubm9kZXMpID8gZGF0YS5ub2RlcyA6IFtdO1xufVxuXG4vKiBBc3NldCBmaWxlbmFtZXMgYSBzbmFwc2hvdCdzIG1lZGlhIG5vZGVzIHJlZmVyZW5jZS4gKi9cbmZ1bmN0aW9uIGFzc2V0UmVmcyhkYXRhKSB7XG4gIGNvbnN0IHJlZnMgPSBuZXcgU2V0KCk7XG4gIGNvbnN0IGFkZCA9IChzcmMpID0+IHtcbiAgICBpZiAodHlwZW9mIHNyYyA9PT0gJ3N0cmluZycgJiYgc3JjLnN0YXJ0c1dpdGgoJy9jYW52YXMtYXNzZXRzLycpKSByZWZzLmFkZChzcmMuc2xpY2UoJy9jYW52YXMtYXNzZXRzLycubGVuZ3RoKSk7XG4gIH07XG4gIGZvciAoY29uc3QgbiBvZiBhbGxOb2RlcyhkYXRhKSkge1xuICAgIGlmIChuICYmIChuLnR5cGUgPT09ICdpbWFnZScgfHwgbi50eXBlID09PSAndmlkZW8nKSkge1xuICAgICAgYWRkKG4uc3JjKTsgLy8gbGVnYWN5IHNpbmdsZS1zcmMgbm9kZXNcbiAgICAgIC8vIEN1cnJlbnQgbm9kZXMgaG9sZCBhbiBhc3NldHMgYXJyYXk7IGVhY2ggYXNzZXQgbWF5IGFsc28gY2FycnkgYVxuICAgICAgLy8gZGFyay1tb2RlIHZhcmlhbnQgKHNyY0RhcmspIFx1MjAxNCBib3RoIGFyZSBsaXZlIHJlZmVyZW5jZXMuXG4gICAgICBmb3IgKGNvbnN0IGEgb2YgQXJyYXkuaXNBcnJheShuLmFzc2V0cykgPyBuLmFzc2V0cyA6IFtdKSB7XG4gICAgICAgIGlmIChhKSB7IGFkZChhLnNyYyk7IGFkZChhLnNyY0RhcmspOyB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEhUTUwgbm9kZXMgcmVmZXJlbmNlIHRoZWlyIGRvY3VtZW50IGFzIGEgY29tbWl0dGVkIGFzc2V0LlxuICAgIGlmIChuICYmIG4udHlwZSA9PT0gJ2h0bWwnKSBhZGQobi5zcmMpO1xuICAgIC8vIExpbmsgY2FyZHMgYmFrZSB0aGVpciB1bmZ1cmxlZCBPRyBpbWFnZSBpbiBhcyBhIGNvbW1pdHRlZCBhc3NldC5cbiAgICBpZiAobiAmJiBuLnR5cGUgPT09ICdsaW5rJyAmJiB0eXBlb2Ygbi5pbWFnZSA9PT0gJ3N0cmluZycgJiYgbi5pbWFnZS5zdGFydHNXaXRoKCcvY2FudmFzLWFzc2V0cy8nKSkge1xuICAgICAgcmVmcy5hZGQobi5pbWFnZS5zbGljZSgnL2NhbnZhcy1hc3NldHMvJy5sZW5ndGgpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlZnM7XG59XG5cbmZ1bmN0aW9uIHJlYWRCb2FyZChmaWxlKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JykpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKiBEZWxldGUgZ2VuZXJhdGVkIGFzc2V0cyBvcnBoYW5lZCBieSB0aGlzIHNhdmUuIE9ubHkgZmlsZXMgdGhlIFBSRVZJT1VTXG4gICBjb21taXR0ZWQgdmVyc2lvbiBvZiB0aGUgc2F2ZWQgYm9hcmQgcmVmZXJlbmNlZCBhcmUgY2FuZGlkYXRlcyBcdTIwMTQgYSBzd2VlcCBvZlxuICAgZXZlcnl0aGluZyB1bnJlZmVyZW5jZWQgd291bGQgYWxzbyBkZWxldGUgbWVkaWEganVzdCBkcm9wcGVkIG9udG8gYVxuICAgZGlmZmVyZW50IGJvYXJkLCB3aGljaCBsaXZlcyBvbmx5IGluIHRoYXQgYm9hcmQncyBsb2NhbFN0b3JhZ2UgYXV0b3NhdmVcbiAgIHVudGlsIGl0cyBvd24gU2F2ZS4gQSBjYW5kaWRhdGUgc3Vydml2ZXMgaWYgYW55IGNvbW1pdHRlZCBib2FyZCAoaW5jbHVkaW5nXG4gICB0aGUgb25lIGp1c3Qgd3JpdHRlbikgc3RpbGwgcmVmZXJlbmNlcyBpdC4gKi9cbmZ1bmN0aW9uIHBydW5lQXNzZXRzKHByZXZSZWZzKSB7XG4gIGlmICghcHJldlJlZnMuc2l6ZSB8fCAhZnMuZXhpc3RzU3luYyhBU1NFVF9ESVIpKSByZXR1cm4gW107XG4gIGNvbnN0IHJlZmVyZW5jZWQgPSBuZXcgU2V0KCk7XG4gIGlmIChmcy5leGlzdHNTeW5jKEJPQVJEX0RJUikpIHtcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZnMucmVhZGRpclN5bmMoQk9BUkRfRElSKSkge1xuICAgICAgaWYgKCFmaWxlLmVuZHNXaXRoKCcuanNvbicpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGRhdGEgPSByZWFkQm9hcmQocGF0aC5qb2luKEJPQVJEX0RJUiwgZmlsZSkpO1xuICAgICAgaWYgKGRhdGEpIGFzc2V0UmVmcyhkYXRhKS5mb3JFYWNoKChuYW1lKSA9PiByZWZlcmVuY2VkLmFkZChuYW1lKSk7XG4gICAgfVxuICB9XG4gIGNvbnN0IHJlbW92ZWQgPSBbXTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIHByZXZSZWZzKSB7XG4gICAgaWYgKEFTU0VUX1JFLnRlc3QobmFtZSkgJiYgIXJlZmVyZW5jZWQuaGFzKG5hbWUpICYmIGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKEFTU0VUX0RJUiwgbmFtZSkpKSB7XG4gICAgICBmcy51bmxpbmtTeW5jKHBhdGguam9pbihBU1NFVF9ESVIsIG5hbWUpKTtcbiAgICAgIHJlbW92ZWQucHVzaChuYW1lKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlbW92ZWQ7XG59XG5cbi8qIFx1MjUwMFx1MjUwMCBMaW5rIHVuZnVybGluZyAoZGV2IG9ubHkpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgRmV0Y2ggYSBwYXN0ZWQgVVJMIHNlcnZlci1zaWRlIChubyBicm93c2VyIENPUlMpLCBwYXJzZSBpdHMgT3BlbiBHcmFwaFxuICAgbWV0YWRhdGEsIGFuZCBkb3dubG9hZCB0aGUgT0cgaW1hZ2UgaW50byBwdWJsaWMvY2FudmFzLWFzc2V0cyBzbyB0aGUgbGlua1xuICAgY2FyZCdzIHBpY3R1cmUgaXMgYSBjb21taXR0ZWQgZmlsZSBcdTIwMTQgdGhlIHNhdmVkIGJvYXJkIHRoZW4gcmVuZGVycyBvZmZsaW5lXG4gICBhbmQgbmV2ZXIgcmUtZmV0Y2hlcy4gKi9cbmNvbnN0IFVORlVSTF9VQSA9XG4gICdNb3ppbGxhLzUuMCAoY29tcGF0aWJsZTsgUG9ydGZvbGlvQ2FudmFzQm90LzEuMDsgK2h0dHBzOi8vbGltaXRsZXNzbG9vcC5jb20pJztcblxuZnVuY3Rpb24gZGVjb2RlRW50aXRpZXMocykge1xuICByZXR1cm4gKHMgfHwgJycpXG4gICAgLnJlcGxhY2UoLyZhbXA7L2csICcmJylcbiAgICAucmVwbGFjZSgvJmx0Oy9nLCAnPCcpXG4gICAgLnJlcGxhY2UoLyZndDsvZywgJz4nKVxuICAgIC5yZXBsYWNlKC8mcXVvdDsvZywgJ1wiJylcbiAgICAucmVwbGFjZSgvJiMwPzM5O3wmYXBvczt8JiN4Mjc7L2dpLCBcIidcIilcbiAgICAucmVwbGFjZSgvJm5ic3A7L2csICcgJylcbiAgICAucmVwbGFjZSgvJiMoXFxkKyk7L2csIChfLCBkKSA9PiB7IHRyeSB7IHJldHVybiBTdHJpbmcuZnJvbUNvZGVQb2ludCgrZCk7IH0gY2F0Y2ggeyByZXR1cm4gJyc7IH0gfSlcbiAgICAucmVwbGFjZSgvJiN4KFswLTlhLWZdKyk7L2dpLCAoXywgaCkgPT4geyB0cnkgeyByZXR1cm4gU3RyaW5nLmZyb21Db2RlUG9pbnQocGFyc2VJbnQoaCwgMTYpKTsgfSBjYXRjaCB7IHJldHVybiAnJzsgfSB9KVxuICAgIC50cmltKCk7XG59XG5cbi8qIEZpcnN0IDxtZXRhIHByb3BlcnR5fG5hbWU9XCI8a2V5PlwiPiBjb250ZW50IGZvciBhbnkgb2YgYGtleXNgLCBpbiBvcmRlci4gKi9cbmZ1bmN0aW9uIG1ldGFDb250ZW50KGh0bWwsIGtleXMpIHtcbiAgZm9yIChjb25zdCBrZXkgb2Yga2V5cykge1xuICAgIGNvbnN0IHJlID0gbmV3IFJlZ0V4cChgPG1ldGFbXj5dKyg/OnByb3BlcnR5fG5hbWUpXFxcXHMqPVxcXFxzKltcIiddJHtrZXl9W1wiJ11bXj5dKj5gLCAnaScpO1xuICAgIGNvbnN0IHRhZyA9IHJlLmV4ZWMoaHRtbCk7XG4gICAgaWYgKHRhZykge1xuICAgICAgY29uc3QgYyA9IC9jb250ZW50XFxzKj1cXHMqW1wiJ10oW15cIiddKilbXCInXS9pLmV4ZWModGFnWzBdKTtcbiAgICAgIGlmIChjICYmIGNbMV0udHJpbSgpKSByZXR1cm4gZGVjb2RlRW50aXRpZXMoY1sxXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiAnJztcbn1cblxuZnVuY3Rpb24gcGFnZVRpdGxlKGh0bWwpIHtcbiAgY29uc3QgbSA9IC88dGl0bGVbXj5dKj4oW1xcc1xcU10qPyk8XFwvdGl0bGU+L2kuZXhlYyhodG1sKTtcbiAgcmV0dXJuIG0gPyBkZWNvZGVFbnRpdGllcyhtWzFdKSA6ICcnO1xufVxuXG5mdW5jdGlvbiBmYXZpY29uVXJsKGh0bWwsIGJhc2VVcmwpIHtcbiAgY29uc3QgcmUgPSAvPGxpbmtbXj5dKz4vZ2k7XG4gIGxldCBtLCBocmVmID0gJyc7XG4gIHdoaWxlICgobSA9IHJlLmV4ZWMoaHRtbCkpKSB7XG4gICAgaWYgKCEvcmVsXFxzKj1cXHMqW1wiJ11bXlwiJ10qaWNvblteXCInXSpbXCInXS9pLnRlc3QobVswXSkpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGggPSAvaHJlZlxccyo9XFxzKltcIiddKFteXCInXSspW1wiJ10vaS5leGVjKG1bMF0pO1xuICAgIC8vIFNpdGVzIHN1cHByZXNzIHRoZSBkZWZhdWx0IGZhdmljb24gd2l0aCBgaHJlZj1cImRhdGE6LFwiYDsgaWdub3JlIHRob3NlIGFuZFxuICAgIC8vIGZhbGwgYmFjayB0byAvZmF2aWNvbi5pY28gcmF0aGVyIHRoYW4gcmVuZGVyaW5nIGFuIGVtcHR5IGltYWdlLlxuICAgIGlmIChoICYmIGhbMV0gJiYgIS9eZGF0YTovaS50ZXN0KGhbMV0udHJpbSgpKSkgeyBocmVmID0gaFsxXTsgYnJlYWs7IH1cbiAgfVxuICB0cnkgeyByZXR1cm4gbmV3IFVSTChocmVmIHx8ICcvZmF2aWNvbi5pY28nLCBiYXNlVXJsKS5ocmVmOyB9IGNhdGNoIHsgcmV0dXJuICcnOyB9XG59XG5cbi8qIERvd25sb2FkIGEgcmVtb3RlIGltYWdlIGludG8gdGhlIGNvbW1pdHRlZCBhc3NldCBkaXIsIHJldHVybiBpdHMgcHVibGljIFVSTFxuICAgKG51bGwgb24gYW55IGZhaWx1cmUgXHUyMDE0IHRoZSBjYWxsZXIgZmFsbHMgYmFjayB0byBob3RsaW5raW5nIHRoZSByZW1vdGUgVVJMKS4gKi9cbmFzeW5jIGZ1bmN0aW9uIGRvd25sb2FkSW1hZ2VBc3NldChpbWFnZVVybCkge1xuICB0cnkge1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGltYWdlVXJsLCB7IHJlZGlyZWN0OiAnZm9sbG93JywgaGVhZGVyczogeyAndXNlci1hZ2VudCc6IFVORlVSTF9VQSB9LCBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoMTAwMDApIH0pO1xuICAgIGlmICghcmVzLm9rKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBjdCA9IChyZXMuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpIHx8ICcnKS5zcGxpdCgnOycpWzBdLnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuICAgIGNvbnN0IGV4dCA9IEVYVFtjdF07XG4gICAgaWYgKCFleHQgfHwgIWN0LnN0YXJ0c1dpdGgoJ2ltYWdlLycpKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuZnJvbShhd2FpdCByZXMuYXJyYXlCdWZmZXIoKSk7XG4gICAgaWYgKCFidWZmZXIubGVuZ3RoIHx8IGJ1ZmZlci5sZW5ndGggPiA4ICogMTAyNCAqIDEwMjQpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMScpLnVwZGF0ZShidWZmZXIpLmRpZ2VzdCgnaGV4Jykuc2xpY2UoMCwgMTYpO1xuICAgIGNvbnN0IG5hbWUgPSBgJHtoYXNofS4ke2V4dH1gO1xuICAgIGNvbnN0IGZpbGUgPSBwYXRoLmpvaW4oQVNTRVRfRElSLCBuYW1lKTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZmlsZSkpIHtcbiAgICAgIGZzLm1rZGlyU3luYyhBU1NFVF9ESVIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyhmaWxlLCBidWZmZXIpO1xuICAgIH1cbiAgICByZXR1cm4gYC9jYW52YXMtYXNzZXRzLyR7bmFtZX1gO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiB1bmZ1cmwocmF3VXJsKSB7XG4gIGxldCB0YXJnZXQ7XG4gIHRyeSB7IHRhcmdldCA9IG5ldyBVUkwocmF3VXJsKTsgfSBjYXRjaCB7IHRocm93IG5ldyBFcnJvcignaW52YWxpZCBVUkwnKTsgfVxuICBpZiAodGFyZ2V0LnByb3RvY29sICE9PSAnaHR0cDonICYmIHRhcmdldC5wcm90b2NvbCAhPT0gJ2h0dHBzOicpIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgcHJvdG9jb2wnKTtcbiAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2godGFyZ2V0LmhyZWYsIHtcbiAgICByZWRpcmVjdDogJ2ZvbGxvdycsXG4gICAgaGVhZGVyczogeyAndXNlci1hZ2VudCc6IFVORlVSTF9VQSwgYWNjZXB0OiAndGV4dC9odG1sLGFwcGxpY2F0aW9uL3hodG1sK3htbCcgfSxcbiAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoMTAwMDApLFxuICB9KTtcbiAgY29uc3QgZmluYWxVcmwgPSByZXMudXJsIHx8IHRhcmdldC5ocmVmO1xuICBjb25zdCBodG1sID0gKGF3YWl0IHJlcy50ZXh0KCkpLnNsaWNlKDAsIDUwMDAwMCk7IC8vIG1ldGEgdGFncyBsaXZlIGluIDxoZWFkPlxuICBjb25zdCB0aXRsZSA9IG1ldGFDb250ZW50KGh0bWwsIFsnb2c6dGl0bGUnLCAndHdpdHRlcjp0aXRsZSddKSB8fCBwYWdlVGl0bGUoaHRtbCkgfHwgdGFyZ2V0Lmhvc3RuYW1lO1xuICBjb25zdCBkZXNjcmlwdGlvbiA9IG1ldGFDb250ZW50KGh0bWwsIFsnb2c6ZGVzY3JpcHRpb24nLCAndHdpdHRlcjpkZXNjcmlwdGlvbicsICdkZXNjcmlwdGlvbiddKTtcbiAgY29uc3Qgc2l0ZU5hbWUgPSBtZXRhQ29udGVudChodG1sLCBbJ29nOnNpdGVfbmFtZSddKTtcbiAgbGV0IGltYWdlID0gbWV0YUNvbnRlbnQoaHRtbCwgWydvZzppbWFnZTpzZWN1cmVfdXJsJywgJ29nOmltYWdlOnVybCcsICdvZzppbWFnZScsICd0d2l0dGVyOmltYWdlJywgJ3R3aXR0ZXI6aW1hZ2U6c3JjJ10pO1xuICBpZiAoaW1hZ2UpIHsgdHJ5IHsgaW1hZ2UgPSBuZXcgVVJMKGltYWdlLCBmaW5hbFVybCkuaHJlZjsgfSBjYXRjaCB7IGltYWdlID0gJyc7IH0gfVxuICBjb25zdCBsb2NhbEltYWdlID0gaW1hZ2UgPyBhd2FpdCBkb3dubG9hZEltYWdlQXNzZXQoaW1hZ2UpIDogbnVsbDtcbiAgcmV0dXJuIHtcbiAgICB1cmw6IGZpbmFsVXJsLFxuICAgIHRpdGxlLFxuICAgIGRlc2NyaXB0aW9uLFxuICAgIHNpdGVOYW1lLFxuICAgIGltYWdlOiBsb2NhbEltYWdlIHx8IGltYWdlIHx8ICcnLFxuICAgIGZhdmljb246IGZhdmljb25VcmwoaHRtbCwgZmluYWxVcmwpLFxuICB9O1xufVxuXG5mdW5jdGlvbiByZWFkQm9keShyZXEpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgYm9keSA9ICcnO1xuICAgIHJlcS5vbignZGF0YScsIChjaHVuaykgPT4geyBib2R5ICs9IGNodW5rOyB9KTtcbiAgICByZXEub24oJ2VuZCcsICgpID0+IHJlc29sdmUoYm9keSkpO1xuICAgIHJlcS5vbignZXJyb3InLCByZWplY3QpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbnZhc1NhdmUoKSB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ2NhbnZhcy1zYXZlJyxcbiAgICBhcHBseTogJ3NlcnZlJyxcbiAgICAvKiBEb24ndCBsZXQgc2F2aW5nIGEgc25hcHNob3QgdHJpZ2dlciBhbiBITVIgcmVsb2FkIFx1MjAxNCB0aGUgbGl2ZSBib2FyZFxuICAgICAgIGFscmVhZHkgcmVmbGVjdHMgdGhlc2UgZWRpdHMsIHNvIGEgcmVsb2FkIG9ubHkgamFycyB0aGUgdmlldy4gVGhlIGZpbGVzXG4gICAgICAgbWF0dGVyIG9uIHRoZSBuZXh0IGZyZXNoIGxvYWQgYW5kIGluIHRoZSBwcm9kdWN0aW9uIGJ1aWxkLlxuICAgICAgIChEcm9wcGVkIGltYWdlcyB1bmRlciBwdWJsaWMvY2FudmFzLWFzc2V0cyBhcmUgaW50ZW50aW9uYWxseSBOT1QgaWdub3JlZDpcbiAgICAgICBWaXRlIHdvbid0IHNlcnZlIGZpbGVzIHdob3NlIHBhdGggaXMgaW4gdGhlIHdhdGNoLWlnbm9yZSBsaXN0LikgKi9cbiAgICBjb25maWcoKSB7XG4gICAgICByZXR1cm4geyBzZXJ2ZXI6IHsgd2F0Y2g6IHsgaWdub3JlZDogWycqKi9zcmMvZGF0YS9jYW52YXMvKionXSB9IH0gfTtcbiAgICB9LFxuICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcbiAgICAgIC8qIFNlcnZlIGNvbW1pdHRlZCBhc3NldHMgc3RyYWlnaHQgZnJvbSBkaXNrLiBWaXRlJ3MgcHVibGljLWRpciBzZXJ2aW5nXG4gICAgICAgICBvbmx5IHBpY2tzIHVwIGZpbGVzIGl0cyBmaWxlLXdhdGNoZXIgYWxyZWFkeSBrbm93cyBhYm91dCwgc28gYW4gYXNzZXRcbiAgICAgICAgIHJlcXVlc3RlZCBpbiB0aGUgc2FtZSB0aWNrIGl0IHdhcyBqdXN0IHdyaXR0ZW4gKGEgZnJlc2hseSBkcm9wcGVkXG4gICAgICAgICBpbWFnZS9zdmcvdmlkZW8pIHJhY2VzIHRoZSB3YXRjaGVyIGFuZCBmYWxscyB0aHJvdWdoIHRvIHRoZSBTUEEgSFRNTFxuICAgICAgICAgZmFsbGJhY2sgXHUyMDE0IHRoZSA8aW1nPi88dmlkZW8+IHRoZW4gbG9hZHMgdGhhdCBIVE1MLCBzaG93cyBicm9rZW4sIGFuZFxuICAgICAgICAgdGhlIGJyb3dzZXIgY2FjaGVzIHRoZSBmYWlsdXJlIHVudGlsIGEgcmVsb2FkIHJlY3JlYXRlcyB0aGUgZWxlbWVudC5cbiAgICAgICAgIFJlYWRpbmcgZnJvbSBkaXNrIGhlcmUgcmVtb3ZlcyB0aGUgcmFjZTsgb24gYSBtaXNzIHdlIGZhbGwgdGhyb3VnaCB0b1xuICAgICAgICAgVml0ZSdzIG5vcm1hbCBzZXJ2aW5nICh3aGljaCBhbHNvIGhhbmRsZXMgUmFuZ2UgcmVxdWVzdHMgb25jZSB3YXJtKS4gKi9cbiAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoJy9jYW52YXMtYXNzZXRzJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICAgIGlmIChyZXEubWV0aG9kICE9PSAnR0VUJyAmJiByZXEubWV0aG9kICE9PSAnSEVBRCcpIHJldHVybiBuZXh0KCk7XG4gICAgICAgIGxldCBuYW1lO1xuICAgICAgICB0cnkgeyBuYW1lID0gZGVjb2RlVVJJQ29tcG9uZW50KChyZXEudXJsIHx8ICcnKS5zcGxpdCgnPycpWzBdKS5yZXBsYWNlKC9eXFwvKy8sICcnKTsgfVxuICAgICAgICBjYXRjaCB7IHJldHVybiBuZXh0KCk7IH1cbiAgICAgICAgaWYgKCFBU1NFVF9SRS50ZXN0KG5hbWUpKSByZXR1cm4gbmV4dCgpO1xuICAgICAgICBjb25zdCBmaWxlID0gcGF0aC5qb2luKEFTU0VUX0RJUiwgbmFtZSk7XG4gICAgICAgIGxldCBzdGF0O1xuICAgICAgICB0cnkgeyBzdGF0ID0gZnMuc3RhdFN5bmMoZmlsZSk7IH0gY2F0Y2ggeyByZXR1cm4gbmV4dCgpOyB9XG4gICAgICAgIGNvbnN0IGV4dCA9IG5hbWUuc2xpY2UobmFtZS5sYXN0SW5kZXhPZignLicpICsgMSk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsIE1JTUVbZXh0XSB8fCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NhY2hlLUNvbnRyb2wnLCAnbm8tY2FjaGUnKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXB0LVJhbmdlcycsICdieXRlcycpO1xuICAgICAgICAvKiBIb25vdXIgYSBzaW5nbGUgUmFuZ2Ugc28gPHZpZGVvPiBzZWVraW5nIHdvcmtzIGJlZm9yZSBWaXRlIGlzIHdhcm0uICovXG4gICAgICAgIGNvbnN0IHJhbmdlID0gL15ieXRlcz0oXFxkKiktKFxcZCopJC8uZXhlYyhyZXEuaGVhZGVycy5yYW5nZSB8fCAnJyk7XG4gICAgICAgIGlmIChyYW5nZSkge1xuICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gcmFuZ2VbMV0gPyBwYXJzZUludChyYW5nZVsxXSwgMTApIDogMDtcbiAgICAgICAgICBjb25zdCBlbmQgPSByYW5nZVsyXSA/IHBhcnNlSW50KHJhbmdlWzJdLCAxMCkgOiBzdGF0LnNpemUgLSAxO1xuICAgICAgICAgIGlmIChzdGFydCA+IGVuZCB8fCBlbmQgPj0gc3RhdC5zaXplKSB7XG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQxNjtcbiAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtUmFuZ2UnLCBgYnl0ZXMgKi8ke3N0YXQuc2l6ZX1gKTtcbiAgICAgICAgICAgIHJldHVybiByZXMuZW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjA2O1xuICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtUmFuZ2UnLCBgYnl0ZXMgJHtzdGFydH0tJHtlbmR9LyR7c3RhdC5zaXplfWApO1xuICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtTGVuZ3RoJywgZW5kIC0gc3RhcnQgKyAxKTtcbiAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ0hFQUQnKSByZXR1cm4gcmVzLmVuZCgpO1xuICAgICAgICAgIHJldHVybiBmcy5jcmVhdGVSZWFkU3RyZWFtKGZpbGUsIHsgc3RhcnQsIGVuZCB9KS5waXBlKHJlcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSAyMDA7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtTGVuZ3RoJywgc3RhdC5zaXplKTtcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdIRUFEJykgcmV0dXJuIHJlcy5lbmQoKTtcbiAgICAgICAgcmV0dXJuIGZzLmNyZWF0ZVJlYWRTdHJlYW0oZmlsZSkucGlwZShyZXMpO1xuICAgICAgfSk7XG5cbiAgICAgIC8qIFBlcnNpc3QgZHJvcHBlZCBtZWRpYSBhcyBhIGNvbW1pdHRlZCBzdGF0aWMgYXNzZXQsIGtleWVkIGJ5IGNvbnRlbnRcbiAgICAgICAgIGhhc2ggKGlkZW50aWNhbCBkcm9wcyBkZWR1cGUgdG8gb25lIGZpbGUpLiBSZXR1cm5zIGl0cyBwdWJsaWMgVVJMLiAqL1xuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL19fY2FudmFzL2Fzc2V0JywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICAgIGlmIChyZXEubWV0aG9kICE9PSAnUE9TVCcpIHJldHVybiBuZXh0KCk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ2NvbnRlbnQtdHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgIHJlYWRCb2R5KHJlcSkudGhlbigoYm9keSkgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRhdGFVcmwgfSA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICAgICAgICBjb25zdCBkZWNvZGVkID0gZGVjb2RlRGF0YVVybChkYXRhVXJsKTtcbiAgICAgICAgICAgIGlmICghZGVjb2RlZCkgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBvciBtaXNzaW5nIG1lZGlhIGRhdGEgVVJMJyk7XG4gICAgICAgICAgICBjb25zdCBoYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTEnKS51cGRhdGUoZGVjb2RlZC5idWZmZXIpLmRpZ2VzdCgnaGV4Jykuc2xpY2UoMCwgMTYpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGAke2hhc2h9LiR7ZGVjb2RlZC5leHR9YDtcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBwYXRoLmpvaW4oQVNTRVRfRElSLCBuYW1lKTtcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhmaWxlKSkge1xuICAgICAgICAgICAgICBmcy5ta2RpclN5bmMoQVNTRVRfRElSLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhmaWxlLCBkZWNvZGVkLmJ1ZmZlcik7XG4gICAgICAgICAgICAgIHNlcnZlci5jb25maWcubG9nZ2VyLmluZm8oYCAgY2FudmFzIGltYWdlIFx1MjE5MiBwdWJsaWMvY2FudmFzLWFzc2V0cy8ke25hbWV9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDIwMDtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBvazogdHJ1ZSwgdXJsOiBgL2NhbnZhcy1hc3NldHMvJHtuYW1lfWAgfSkpO1xuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDA7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgb2s6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGVyciAmJiBlcnIubWVzc2FnZSB8fCBlcnIpIH0pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIC8qIFVuZnVybCBhIHBhc3RlZCBVUkw6IGZldGNoIGl0cyBwYWdlLCBwYXJzZSBPRyBtZXRhZGF0YSwgYmFrZSB0aGUgaW1hZ2VcbiAgICAgICAgIGludG8gYSBjb21taXR0ZWQgYXNzZXQsIGFuZCByZXR1cm4gdGhlIGNhcmQncyBkYXRhLiAqL1xuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL19fY2FudmFzL3VuZnVybCcsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICBpZiAocmVxLm1ldGhvZCAhPT0gJ1BPU1QnKSByZXR1cm4gbmV4dCgpO1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdjb250ZW50LXR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICByZWFkQm9keShyZXEpLnRoZW4oYXN5bmMgKGJvZHkpID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyB1cmwgfSA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgdW5mdXJsKHVybCk7XG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDIwMDtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBvazogdHJ1ZSwgZGF0YSB9KSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMDtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBvazogZmFsc2UsIGVycm9yOiBTdHJpbmcoZXJyICYmIGVyci5tZXNzYWdlIHx8IGVycikgfSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL19fY2FudmFzL3NhdmUnLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgIT09ICdQT1NUJykgcmV0dXJuIG5leHQoKTtcbiAgICAgICAgcmVhZEJvZHkocmVxKS50aGVuKChib2R5KSA9PiB7XG4gICAgICAgICAgcmVzLnNldEhlYWRlcignY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBrZXksIHNuYXBzaG90IH0gPSBKU09OLnBhcnNlKGJvZHkpO1xuICAgICAgICAgICAgaWYgKCFLRVlfUkUudGVzdChrZXkgfHwgJycpKSB0aHJvdyBuZXcgRXJyb3IoJ21pc3Npbmcgb3IgdW5zYWZlIGJvYXJkIGtleScpO1xuICAgICAgICAgICAgaWYgKCFzbmFwc2hvdCB8fCAhKEFycmF5LmlzQXJyYXkoc25hcHNob3QucGFnZXMpIHx8IEFycmF5LmlzQXJyYXkoc25hcHNob3Qubm9kZXMpKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2V4cGVjdGVkIHNuYXBzaG90IHdpdGggeyBwYWdlczogWy4uLl0gfSBvciB7IG5vZGVzOiBbLi4uXSB9Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcy5ta2RpclN5bmMoQk9BUkRfRElSLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IHBhdGguam9pbihCT0FSRF9ESVIsIGAke2tleX0uanNvbmApO1xuICAgICAgICAgICAgY29uc3QgcHJldiA9IGZzLmV4aXN0c1N5bmModGFyZ2V0KSA/IHJlYWRCb2FyZCh0YXJnZXQpIDogbnVsbDtcbiAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmModGFyZ2V0LCBKU09OLnN0cmluZ2lmeShzbmFwc2hvdCwgbnVsbCwgMikgKyAnXFxuJyk7XG4gICAgICAgICAgICBzZXJ2ZXIuY29uZmlnLmxvZ2dlci5pbmZvKGAgIGNhbnZhcyBzYXZlZCBcdTIxOTIgJHtwYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHRhcmdldCl9YCk7XG4gICAgICAgICAgICBjb25zdCByZW1vdmVkID0gcHJ1bmVBc3NldHMocHJldiA/IGFzc2V0UmVmcyhwcmV2KSA6IG5ldyBTZXQoKSk7XG4gICAgICAgICAgICBpZiAocmVtb3ZlZC5sZW5ndGgpIHNlcnZlci5jb25maWcubG9nZ2VyLmluZm8oYCAgcHJ1bmVkICR7cmVtb3ZlZC5sZW5ndGh9IG9ycGhhbmVkIGFzc2V0KHMpYCk7XG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDIwMDtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBvazogdHJ1ZSwgcHJ1bmVkOiByZW1vdmVkLmxlbmd0aCB9KSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMDtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBvazogZmFsc2UsIGVycm9yOiBTdHJpbmcoZXJyICYmIGVyci5tZXNzYWdlIHx8IGVycikgfSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuICB9O1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFtWixTQUFTLGVBQWU7QUFFM2EsU0FBUyxxQkFBcUI7QUFDOUIsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxXQUFXO0FBQ2xCLE9BQU8saUJBQWlCOzs7QUNBeEIsT0FBTyxRQUFRO0FBQ2YsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sWUFBWTtBQUVuQixJQUFNLFlBQVksS0FBSyxRQUFRLFFBQVEsSUFBSSxHQUFHLGlCQUFpQjtBQUMvRCxJQUFNLFlBQVksS0FBSyxRQUFRLFFBQVEsSUFBSSxHQUFHLHNCQUFzQjtBQUlwRSxJQUFNLFNBQVM7QUFHZixJQUFNLE1BQU07QUFBQSxFQUNWLGFBQWE7QUFBQSxFQUFPLGNBQWM7QUFBQSxFQUFPLGFBQWE7QUFBQSxFQUFPLGNBQWM7QUFBQSxFQUFRLGlCQUFpQjtBQUFBLEVBQU8sY0FBYztBQUFBLEVBQ3pILGFBQWE7QUFBQSxFQUFPLGNBQWM7QUFBQSxFQUFRLGFBQWE7QUFBQSxFQUFPLG1CQUFtQjtBQUFBLEVBQ2pGLGFBQWE7QUFDZjtBQUNBLFNBQVMsY0FBYyxTQUFTO0FBQzlCLFFBQU0sSUFBSSw4QkFBOEIsS0FBSyxXQUFXLEVBQUU7QUFDMUQsTUFBSSxDQUFDLEVBQUcsUUFBTztBQUNmLFFBQU0sTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ3BCLE1BQUksQ0FBQyxJQUFLLFFBQU87QUFDakIsU0FBTyxFQUFFLEtBQUssUUFBUSxPQUFPLEtBQUssRUFBRSxDQUFDLEdBQUcsUUFBUSxFQUFFO0FBQ3BEO0FBSUEsSUFBTSxXQUFXO0FBR2pCLElBQU0sT0FBTztBQUFBLEVBQ1gsS0FBSztBQUFBLEVBQWEsS0FBSztBQUFBLEVBQWMsS0FBSztBQUFBLEVBQWEsTUFBTTtBQUFBLEVBQWMsS0FBSztBQUFBLEVB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
