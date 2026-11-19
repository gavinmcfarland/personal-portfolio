/* Saves the home page's prose from the in-page editor (src/components/
   HomeEditor.jsx) back to src/content/home.md. Dev server only.

     POST /__home/save { base, raw, force? } → { ok, raw }
       or 409 { ok: false, conflict: true } when the file is no longer `base`

   The file is rewritten only if it still says what the editor loaded, so an
   edit made in a text editor meanwhile is never silently overwritten. A save
   must not hot-update the page it was made on — the page already shows the
   text, and the update would throw away the caret — so Vite's update for a
   file this plugin just wrote is dropped. */
import fs from "node:fs";
import path from "node:path";

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export function homeContent({ file = "src/content/home.md" } = {}) {
  let target = null;
  let lastWrite = null;

  return {
    name: "home-content",
    apply: "serve",

    configResolved(config) {
      target = path.resolve(config.root, file);
    },

    handleHotUpdate({ file: changed, read }) {
      if (changed !== target || lastWrite == null) return undefined;
      return read().then((text) => (text === lastWrite ? [] : undefined));
    },

    configureServer(server) {
      server.middlewares.use("/__home/save", (req, res, next) => {
        if (req.method !== "POST") return next();
        res.setHeader("content-type", "application/json");
        const reply = (status, payload) => {
          res.statusCode = status;
          res.end(JSON.stringify(payload));
        };
        readBody(req).then((text) => {
          try {
            const { base, raw, force } = JSON.parse(text);
            if (typeof raw !== "string") throw new Error("expected a `raw` string");
            const current = fs.readFileSync(target, "utf8");
            if (!force && current !== base) return reply(409, { ok: false, conflict: true });
            if (raw !== current) {
              lastWrite = raw;
              fs.writeFileSync(target, raw);
              server.config.logger.info(`  home saved → ${file}`);
            }
            reply(200, { ok: true, raw });
          } catch (err) {
            reply(400, { ok: false, error: String((err && err.message) || err) });
          }
        });
      });
    },
  };
}
