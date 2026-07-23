/* ══════════════════════════════════════════════════════════════════
   CONSOLE — shared behaviour
   Theme, grid overlay, nav, rail tracking, and the row renderers.
   Every template calls the same functions, so a row on the index and
   a row on a detail page cannot drift apart.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  window.esc = esc;

  /* ── Theme ───────────────────────────────────────────────────── */
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('gm-theme', dark ? 'dark' : 'light');
    themeBtn.setAttribute('aria-pressed', String(dark));
  });

  /* ── Grid overlay ────────────────────────────────────────────
     Mirrors .sheet's box exactly, so the bands measure the grid the
     content is actually on. */
  const lines = document.getElementById('gridlines');
  const gridBtn = document.getElementById('grid-toggle');
  function toggleGrid() {
    if (!lines) return;
    const on = lines.dataset.on !== 'true';
    lines.dataset.on = String(on);
    if (gridBtn) gridBtn.setAttribute('aria-pressed', String(on));
  }
  window.toggleGrid = toggleGrid;
  if (gridBtn) gridBtn.addEventListener('click', toggleGrid);

  addEventListener('keydown', (e) => {
    if (e.key !== 'g' && e.key !== 'G') return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey) return;
    toggleGrid();
  });

  /* ── Nav ─────────────────────────────────────────────────────
     Built from DATA.nav so a new page appears everywhere at once. */
  const nav = document.getElementById('nav');
  if (nav && window.DATA) {
    const here = document.body.dataset.page;
    nav.innerHTML = DATA.nav.map((n) => `
      <a href="${esc(n.href)}"${n.id === here ? ' aria-current="page"' : ''}>
        ${icon(n.icon)}<span>${esc(n.name)}</span>
      </a>`).join('');
  }

  /* ── Rail tracking ──────────────────────────────────────────── */
  const railLinks = new Map();
  document.querySelectorAll('.rail a[href^="#"]').forEach((a) => railLinks.set(a.getAttribute('href').slice(1), a));
  if (railLinks.size && 'IntersectionObserver' in window) {
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id));
      const current = [...railLinks.keys()].find((id) => visible.has(id));
      railLinks.forEach((a, id) => id === current
        ? a.setAttribute('aria-current','true') : a.removeAttribute('aria-current'));
    }, { rootMargin:'-10% 0px -70% 0px' });
    document.querySelectorAll('.sec').forEach((s) => io.observe(s));
  }

  /* ── Renderers ─────────────────────────────────────────────── */
  const kindOf = (p) => (DATA.kinds[p.kind] || { label:p.kind, colour:'var(--c-gray)' });

  window.render = {
    projectRow(p) {
      const k = kindOf(p), ext = p.href.startsWith('http');
      return `
        <a class="list__row" href="${esc(p.href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>
          <span class="c-name">${icon(p.icon)}${esc(p.name)}${ext ? ' ↗' : ''}</span>
          <span class="c-desc">${esc(p.desc)}</span>
          <span class="c-meta">
            <span class="swatch" style="background:${k.colour}"></span>
            <span class="dim">${esc(k.label)}</span>
          </span>
        </a>`;
    },

    projectTile(p) {
      const k = kindOf(p), ext = p.href.startsWith('http');
      return `
        <a class="tile" href="${esc(p.href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>
          <span class="tile__top">
            ${icon(p.icon, p.name + ' icon').replace('class="ico"','class="ico ico--lg"')}
            <span class="swatch" style="background:${k.colour}"></span>
          </span>
          <span class="tile__name">${esc(p.name)}${ext ? ' ↗' : ''}</span>
          <span class="tile__desc">${esc(p.desc)}</span>
          <span class="tile__meta">${esc(k.label)} · ${esc(p.year)}</span>
        </a>`;
    },

    into(id, items, how) {
      const el = document.getElementById(id);
      if (el) el.insertAdjacentHTML('beforeend', items.map(how).join(''));
    },
  };

  /* ── Footer counts ───────────────────────────────────────────
     Computed, never typed — a hardcoded count is one edit away from
     being a lie about the list above it. */
  const counts = document.getElementById('counts');
  if (counts && window.DATA) {
    const byKind = DATA.projects.reduce((m, p) => (m[p.kind] = (m[p.kind] || 0) + 1, m), {});
    const parts = Object.entries(byKind)
      .map(([k, n]) => `${n} ${(DATA.kinds[k] || { label:k }).label.toLowerCase()}${n > 1 ? 's' : ''}`);
    counts.textContent = `${DATA.projects.length} projects — ${parts.join(', ')}`;
  }
})();
