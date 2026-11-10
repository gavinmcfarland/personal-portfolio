#!/usr/bin/env node
/* List every password-protected private page in public/private/.

   Records are ciphertext only, so there is no title to show — each page is
   identified by its slug/URL. Also shows when the record was last saved, its
   size, and whether it is committed (an uncommitted page isn't live yet).

   Usage:
     pnpm --filter portfolio private:list [--base-url <url>] [--json]  */

import { readdir, readFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, "..");
const publicPrivateDir = join(pkgDir, "public", "private");

function getArg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const baseUrl = (getArg("base-url") || "").replace(/\/$/, "");
const asJson = process.argv.includes("--json");

let files = [];
try {
  files = (await readdir(publicPrivateDir)).filter((f) => f.endsWith(".json"));
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}

// Git status per file: "" = committed & clean, "M" = modified, "??" = untracked.
function gitStatus(path) {
  try {
    const out = execFileSync(
      "git",
      ["status", "--porcelain", "--", relative(pkgDir, path)],
      { cwd: pkgDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    if (!out) return "committed";
    return out.startsWith("??") ? "untracked" : "modified";
  } catch {
    return "unknown";
  }
}

const pages = await Promise.all(
  files.map(async (file) => {
    const path = join(publicPrivateDir, file);
    const slug = file.replace(/\.json$/, "");
    const [info, raw] = await Promise.all([stat(path), readFile(path, "utf8")]);
    let valid = true;
    try {
      const rec = JSON.parse(raw);
      valid = Boolean(rec.ct && rec.iv && rec.salt);
    } catch {
      valid = false;
    }
    return {
      slug,
      url: `${baseUrl}/private/${slug}`,
      file: relative(pkgDir, path),
      modified: info.mtime,
      bytes: info.size,
      git: gitStatus(path),
      valid,
    };
  }),
);

pages.sort((a, b) => b.modified - a.modified);

if (asJson) {
  console.log(JSON.stringify(pages, null, 2));
  process.exit(0);
}

if (pages.length === 0) {
  console.log("\n  No private pages yet. Create one with `pnpm --filter portfolio private:new`.\n");
  process.exit(0);
}

const fmtSize = (n) =>
  n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`;
const fmtDate = (d) =>
  d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const rows = pages.map((p) => [
  p.url,
  fmtDate(p.modified),
  fmtSize(p.bytes),
  p.git + (p.valid ? "" : "  (malformed record)"),
]);
const header = ["URL", "Last saved", "Size", "Git"];
const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
const line = (cols) => "  " + cols.map((c, i) => c.padEnd(widths[i])).join("   ").trimEnd();

console.log(`\n  ${pages.length} private page${pages.length === 1 ? "" : "s"}\n`);
console.log(line(header));
console.log(line(widths.map((w) => "─".repeat(w))));
for (const r of rows) console.log(line(r));
console.log(
  baseUrl ? "" : "\n  Paths are relative — pass --base-url https://yoursite.com for full URLs.",
);
console.log("  Passwords aren't stored, so they can't be listed.\n");
