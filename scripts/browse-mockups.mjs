#!/usr/bin/env node
// Zero-dependency browser for the design-mockups/ gallery.
// Serves every mockup folder statically and generates a live gallery
// (scaled iframe previews) at "/". Run with: pnpm mockups

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "design-mockups");
const EXCLUDE = new Set(["screenshots", "node_modules"]);
// NB: keep this off 4321 — that's the portfolio (Astro/Vite) dev port. If both
// bind 4321, Astro's specific [::1] bind wins over our wildcard one and the
// browser shows the portfolio instead of the gallery.
const START_PORT = Number(process.env.PORT) || 4400;

const CONTENT_TYPES = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".webp": "image/webp",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".txt": "text/plain; charset=utf-8",
	".md": "text/plain; charset=utf-8",
};

const esc = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
	);

const titleCase = (s) =>
	s
		.replace(/^\d+[-_]?/, "")
		.replace(/[-_]+/g, " ")
		.trim()
		.replace(/\b\w/g, (c) => c.toUpperCase());

// Read README.md (if any) for a nicer label + short description.
function readMeta(dir) {
	const readme = path.join(dir, "README.md");
	let heading = null;
	let description = null;
	if (fs.existsSync(readme)) {
		const text = fs.readFileSync(readme, "utf8");
		const lines = text.split(/\r?\n/);
		for (const line of lines) {
			const m = line.match(/^#\s+(.*)$/);
			if (m) {
				heading = m[1].trim();
				break;
			}
		}
		// First non-empty, non-heading, non-rule paragraph.
		const para = [];
		let seenHeading = false;
		for (const line of lines) {
			if (/^#\s+/.test(line)) {
				seenHeading = true;
				continue;
			}
			if (!seenHeading) continue;
			if (/^[-*=_]{3,}\s*$/.test(line)) continue;
			if (line.trim() === "") {
				if (para.length) break;
				continue;
			}
			para.push(line.trim());
		}
		if (para.length)
			description = para
				.join(" ")
				.replace(/\*\*(.*?)\*\*/g, "$1")
				.replace(/\*(.*?)\*/g, "$1")
				.replace(/`(.*?)`/g, "$1");
	}
	return { heading, description };
}

function scanMockups() {
	const entries = fs
		.readdirSync(ROOT, { withFileTypes: true })
		.filter((e) => e.isDirectory() && !e.name.startsWith(".") && !EXCLUDE.has(e.name))
		.map((e) => e.name)
		.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

	const mockups = [];
	for (const name of entries) {
		const dir = path.join(ROOT, name);
		if (!fs.existsSync(path.join(dir, "index.html"))) continue;
		const pages = fs
			.readdirSync(dir)
			.filter((f) => f.endsWith(".html") && f !== "index.html")
			.sort();
		const meta = readMeta(dir);
		mockups.push({
			name,
			label: meta.heading || titleCase(name),
			description: meta.description || "",
			numbered: /^\d/.test(name),
			pages,
		});
	}
	return mockups;
}

function galleryHtml() {
	const mockups = scanMockups();
	const cards = mockups
		.map((m) => {
			const preview = `/${encodeURIComponent(m.name)}/index.html`;
			const href = `/view#${encodeURIComponent(m.name)}`;
			const subpages = m.pages
				.map(
					(p) =>
						`<a class="chip" href="/view#${encodeURIComponent(m.name)}/${encodeURIComponent(
							p
						)}" target="mockup">${esc(p.replace(/\.html$/, ""))}</a>`
				)
				.join("");
			return `
      <article class="card" data-search="${esc(
			(m.name + " " + m.label + " " + m.description).toLowerCase()
		)}">
        <a class="thumb" href="${href}" target="mockup" title="Open ${esc(m.label)}">
          <div class="thumb-scale"><iframe src="${preview}" loading="lazy" scrolling="no" tabindex="-1"></iframe></div>
          <span class="folder">${esc(m.name)}</span>
        </a>
        <div class="meta">
          <h2><a href="${href}" target="mockup">${esc(m.label)}</a></h2>
          ${m.description ? `<p>${esc(m.description)}</p>` : ""}
          ${subpages ? `<div class="chips">${subpages}</div>` : ""}
        </div>
      </article>`;
		})
		.join("\n");

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Mockups · ${mockups.length} designs</title>
<style>
  :root {
    --bg: #0e0f12; --panel: #16181d; --line: #262a31; --text: #e8eaed;
    --muted: #9aa0aa; --accent: #6ea8fe;
  }
  @media (prefers-color-scheme: light) {
    :root { --bg:#f5f6f8; --panel:#fff; --line:#e2e5ea; --text:#1a1c20; --muted:#616772; --accent:#2563eb; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
    font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  header { position:sticky; top:0; z-index:5; background:color-mix(in srgb,var(--bg) 88%,transparent);
    backdrop-filter:blur(10px); border-bottom:1px solid var(--line);
    display:flex; align-items:center; gap:16px; padding:14px 24px; }
  header h1 { font-size:16px; font-weight:650; margin:0; letter-spacing:-.01em; }
  header .count { color:var(--muted); font-size:13px; }
  header .spacer { flex:1; }
  #search { background:var(--panel); border:1px solid var(--line); color:var(--text);
    border-radius:8px; padding:8px 12px; width:260px; font-size:14px; outline:none; }
  #search:focus { border-color:var(--accent); }
  main { padding:24px; display:grid; gap:22px;
    grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); max-width:1600px; margin:0 auto; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:12px;
    overflow:hidden; display:flex; flex-direction:column; transition:border-color .15s, transform .15s; }
  .card:hover { border-color:var(--accent); transform:translateY(-2px); }
  .thumb { position:relative; display:block; aspect-ratio:16/10; overflow:hidden;
    background:#fff; border-bottom:1px solid var(--line); }
  .thumb-scale { position:absolute; top:0; left:0; width:1280px; height:800px;
    transform:scale(.2344); transform-origin:top left; pointer-events:none; }
  .thumb iframe { width:1280px; height:800px; border:0; background:#fff; }
  .thumb .folder { position:absolute; bottom:8px; left:8px; font-size:11px; font-weight:600;
    padding:3px 8px; border-radius:6px; background:rgba(0,0,0,.66); color:#fff;
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
  .meta { padding:14px 16px 16px; display:flex; flex-direction:column; gap:8px; }
  .meta h2 { font-size:15px; font-weight:640; margin:0; letter-spacing:-.01em; }
  .meta h2 a, .thumb { text-decoration:none; color:inherit; }
  .meta p { margin:0; color:var(--muted); font-size:13px;
    display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
  .chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:2px; }
  .chip { font-size:11px; padding:3px 8px; border-radius:999px; border:1px solid var(--line);
    color:var(--muted); text-decoration:none; font-family:ui-monospace,Menlo,monospace; }
  .chip:hover { border-color:var(--accent); color:var(--accent); }
  .empty { grid-column:1/-1; text-align:center; color:var(--muted); padding:60px; }
</style>
</head>
<body>
<header>
  <h1>Design Mockups</h1>
  <span class="count">${mockups.length} designs</span>
  <div class="spacer"></div>
  <input id="search" type="search" placeholder="Filter designs…" autocomplete="off" />
</header>
<main id="grid">
${cards}
  <p class="empty" hidden>No designs match your filter.</p>
</main>
<script>
  const search = document.getElementById('search');
  const cards = [...document.querySelectorAll('.card')];
  const empty = document.querySelector('.empty');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let visible = 0;
    for (const c of cards) {
      const match = !q || c.dataset.search.includes(q);
      c.hidden = !match;
      if (match) visible++;
    }
    empty.hidden = visible !== 0;
  });
  search.focus();
</script>
</body>
</html>`;
}

function viewerHtml() {
	const mockups = scanMockups();
	const data = mockups.map((m) => ({
		name: m.name,
		label: m.label,
		pages: m.pages,
	}));
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Mockup viewer</title>
<style>
  :root {
    --bg:#0e0f12; --panel:#16181d; --line:#262a31; --text:#e8eaed;
    --muted:#9aa0aa; --accent:#6ea8fe; --active:#1f2530;
  }
  @media (prefers-color-scheme: light) {
    :root { --bg:#f5f6f8; --panel:#fff; --line:#e2e5ea; --text:#1a1c20; --muted:#616772; --accent:#2563eb; --active:#eef2fb; }
  }
  * { box-sizing:border-box; }
  html,body { height:100%; margin:0; }
  body { display:flex; background:var(--bg); color:var(--text);
    font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  aside { width:264px; flex:none; height:100%; display:flex; flex-direction:column;
    background:var(--panel); border-right:1px solid var(--line); }
  .side-top { padding:12px 14px; border-bottom:1px solid var(--line); display:flex; flex-direction:column; gap:10px; }
  .side-head { display:flex; align-items:center; gap:8px; }
  .side-head a.back { color:var(--muted); text-decoration:none; font-size:13px; display:flex; align-items:center; gap:5px; }
  .side-head a.back:hover { color:var(--accent); }
  .side-head .count { margin-left:auto; color:var(--muted); font-size:12px; }
  #filter { background:var(--bg); border:1px solid var(--line); color:var(--text);
    border-radius:7px; padding:7px 10px; font-size:13px; outline:none; width:100%; }
  #filter:focus { border-color:var(--accent); }
  nav { flex:1; overflow-y:auto; padding:6px; }
  .item { display:block; text-decoration:none; color:var(--text); border-radius:7px; padding:7px 9px; }
  .item:hover { background:var(--active); }
  .item.active { background:var(--active); }
  .item .label { font-size:13px; font-weight:550; letter-spacing:-.01em; }
  .item .folder { font-size:11px; color:var(--muted); font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
  .item.active .label { color:var(--accent); }
  .pages { margin:2px 0 4px 10px; padding-left:8px; border-left:1px solid var(--line); display:flex; flex-direction:column; gap:1px; }
  .page { text-decoration:none; color:var(--muted); font-size:12px; padding:4px 8px; border-radius:6px;
    font-family:ui-monospace,Menlo,monospace; }
  .page:hover { background:var(--active); color:var(--text); }
  .page.active { color:var(--accent); }
  main { flex:1; height:100%; position:relative; background:#fff; }
  main iframe { width:100%; height:100%; border:0; background:#fff; }
  .bar { position:absolute; inset:0 0 auto 0; height:0; }
  .empty { color:var(--muted); font-size:12px; padding:14px; }
</style>
</head>
<body>
<aside>
  <div class="side-top">
    <div class="side-head">
      <a class="back" href="/" title="Back to gallery">← Gallery</a>
      <span class="count" id="count"></span>
    </div>
    <input id="filter" type="search" placeholder="Filter designs…" autocomplete="off" />
  </div>
  <nav id="nav"></nav>
</aside>
<main><iframe id="frame" name="mockupframe" src="about:blank"></iframe></main>
<script>
  const DESIGNS = ${JSON.stringify(data)};
  const nav = document.getElementById('nav');
  const frame = document.getElementById('frame');
  const filter = document.getElementById('filter');
  document.getElementById('count').textContent = DESIGNS.length + ' designs';

  function parseHash() {
    const raw = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    if (!raw) return { name: DESIGNS[0] && DESIGNS[0].name, page: 'index.html' };
    const slash = raw.indexOf('/');
    if (slash === -1) return { name: raw, page: 'index.html' };
    return { name: raw.slice(0, slash), page: raw.slice(slash + 1) || 'index.html' };
  }

  function render() {
    const { name, page } = parseHash();
    const src = '/' + encodeURIComponent(name) + '/' + encodeURIComponent(page);
    if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
    document.title = (DESIGNS.find(d => d.name === name)?.label || name) + ' · Mockup viewer';

    const q = filter.value.trim().toLowerCase();
    nav.innerHTML = '';
    let shown = 0;
    for (const d of DESIGNS) {
      if (q && !((d.name + ' ' + d.label).toLowerCase().includes(q))) continue;
      shown++;
      const active = d.name === name;
      const a = document.createElement('a');
      a.className = 'item' + (active ? ' active' : '');
      a.href = '#' + encodeURIComponent(d.name);
      a.innerHTML = '<div class="label">' + escapeHtml(d.label) + '</div><div class="folder">' + escapeHtml(d.name) + '</div>';
      nav.appendChild(a);
      if (active && d.pages.length) {
        const wrap = document.createElement('div');
        wrap.className = 'pages';
        for (const p of ['index.html', ...d.pages]) {
          const pa = document.createElement('a');
          pa.className = 'page' + (p === page ? ' active' : '');
          pa.href = '#' + encodeURIComponent(d.name) + '/' + encodeURIComponent(p);
          pa.textContent = p.replace(/\\.html$/, '');
          wrap.appendChild(pa);
        }
        nav.appendChild(wrap);
      }
    }
    if (!shown) nav.innerHTML = '<p class="empty">No designs match.</p>';
    const activeEl = nav.querySelector('.item.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  }

  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function step(delta) {
    const { name } = parseHash();
    const i = DESIGNS.findIndex(d => d.name === name);
    const next = DESIGNS[(i + delta + DESIGNS.length) % DESIGNS.length];
    if (next) location.hash = '#' + encodeURIComponent(next.name);
  }

  window.addEventListener('hashchange', render);
  filter.addEventListener('input', render);
  document.addEventListener('keydown', (e) => {
    if (e.target === filter) { if (e.key === 'Escape') filter.blur(); return; }
    if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (e.key === '/') { e.preventDefault(); filter.focus(); }
  });

  if (!location.hash && DESIGNS[0]) location.replace('#' + encodeURIComponent(DESIGNS[0].name));
  render();
</script>
</body>
</html>`;
}

function serveStatic(req, res, urlPath) {
	let rel = decodeURIComponent(urlPath.split("?")[0]);
	const target = path.normalize(path.join(ROOT, rel));
	if (!target.startsWith(ROOT)) {
		res.writeHead(403).end("Forbidden");
		return;
	}
	fs.stat(target, (err, stat) => {
		if (err) {
			res.writeHead(404, { "content-type": "text/plain" }).end("Not found: " + rel);
			return;
		}
		let file = target;
		if (stat.isDirectory()) {
			file = path.join(target, "index.html");
			if (!fs.existsSync(file)) {
				res.writeHead(404).end("No index.html in " + rel);
				return;
			}
		}
		const type = CONTENT_TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
		res.writeHead(200, { "content-type": type });
		fs.createReadStream(file).pipe(res);
	});
}

const server = http.createServer((req, res) => {
	const urlPath = req.url || "/";
	const clean = urlPath.split("?")[0].split("#")[0];
	if (clean === "/" || clean === "/index.html") {
		res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
		res.end(galleryHtml());
		return;
	}
	if (clean === "/view" || clean === "/view/") {
		res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
		res.end(viewerHtml());
		return;
	}
	serveStatic(req, res, urlPath);
});

function listen(port, attempt = 0) {
	server.once("error", (err) => {
		if (err.code === "EADDRINUSE" && attempt < 15) {
			listen(port + 1, attempt + 1);
		} else {
			console.error(err);
			process.exit(1);
		}
	});
	server.listen(port, () => {
		const url = `http://localhost:${port}/`;
		const count = scanMockups().length;
		console.log(`\n  ▸ Design mockups browser`);
		console.log(`    ${count} designs · serving ${path.relative(process.cwd(), ROOT)}/`);
		console.log(`    ${url}\n`);
		const opener =
			process.platform === "darwin"
				? "open"
				: process.platform === "win32"
				? "start"
				: "xdg-open";
		spawn(opener, [url], { stdio: "ignore", detached: true, shell: process.platform === "win32" }).unref();
	});
}

listen(START_PORT);
