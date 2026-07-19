/* ══════════════════════════════════════════════════════════════════
   PLATE·CONSOLE — shared behaviour
   Theme, grid overlay, nav, rail tracking, renderers, and the live
   filter used by the index. Every template calls the same functions.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  window.esc = esc;

  /* ── Theme ─────────────────────────────────────────────────── */
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.setAttribute('aria-pressed', String(document.documentElement.classList.contains('dark')));
    themeBtn.addEventListener('click', () => {
      const dark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('gm-theme', dark ? 'dark' : 'light');
      themeBtn.setAttribute('aria-pressed', String(dark));
    });
  }

  /* ── Grid overlay — button or G ────────────────────────────── */
  const lines = document.getElementById('gridlines');
  const gridBtn = document.getElementById('grid-toggle');
  function toggleGrid() {
    if (!lines) return;
    const on = lines.dataset.on !== 'true';
    lines.dataset.on = String(on);
    if (gridBtn) gridBtn.setAttribute('aria-pressed', String(on));
  }
  if (gridBtn) gridBtn.addEventListener('click', toggleGrid);
  addEventListener('keydown', (e) => {
    if (e.key !== 'g' && e.key !== 'G') return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey) return;
    toggleGrid();
  });

  /* ── Nav ───────────────────────────────────────────────────── */
  const nav = document.getElementById('nav');
  if (nav && window.DATA) {
    const here = document.body.dataset.page;
    nav.innerHTML = DATA.nav.map((n) =>
      `<a href="${esc(n.href)}"${n.id === here ? ' aria-current="page" style="color:var(--ink);font-weight:600"' : ''}>${esc(n.name)}</a>`
    ).join('<span class="strip__sep">·</span>');
  }

  /* ── Rail tracking ─────────────────────────────────────────── */
  const railLinks = new Map();
  document.querySelectorAll('.rail a[href^="#"]').forEach((a) => railLinks.set(a.getAttribute('href').slice(1), a));
  if (railLinks.size && 'IntersectionObserver' in window) {
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id));
      const current = [...railLinks.keys()].find((id) => visible.has(id));
      railLinks.forEach((a, id) => id === current
        ? a.setAttribute('aria-current','true') : a.removeAttribute('aria-current'));
    }, { rootMargin:'-8% 0px -70% 0px' });
    document.querySelectorAll('.module').forEach((s) => io.observe(s));
  }

  /* ── Renderers ─────────────────────────────────────────────── */
  const kindOf = (p) => (DATA.kinds[p.kind] || { label:p.kind, colour:'var(--c-gray)' });

  window.render = {
    projectRow(p) {
      const k = kindOf(p), ext = p.href.startsWith('http');
      return `
        <a class="tbl__row" data-kind="${esc(p.kind)}" data-name="${esc(p.name + ' ' + p.desc)}"
           href="${esc(p.href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>
          <span class="c-ico">${icon(p.icon, { size:32, label:'' })}</span>
          <span class="c-name">${esc(p.name)}${ext ? ' ↗' : ''}</span>
          <span class="c-desc">${esc(p.desc)}</span>
          <span class="c-meta">
            <span class="swatch" style="background:${k.colour}"></span>${esc(k.label)} · ${esc(p.year)}
          </span>
        </a>`;
    },
    into(id, items, how) {
      const el = document.getElementById(id);
      if (el) el.insertAdjacentHTML('beforeend', items.map(how).join(''));
    },
  };

  /* ── Live filter ───────────────────────────────────────────────
     Used by the index. Filters the rows already in the DOM, reports
     the count, and shows an explicit empty state rather than an
     empty table. Falls back to a plain full list without JS. */
  const filter = document.getElementById('filter');
  if (filter) {
    const rows = () => [...document.querySelectorAll('#project-list .tbl__row')];
    const count = document.getElementById('filter-count');
    const empty = document.getElementById('filter-empty');

    function run() {
      const q = filter.value.trim().toLowerCase();
      const kind = (document.querySelector('[name=kindfilter]:checked') || {}).value || 'all';
      let shown = 0;
      rows().forEach((r) => {
        const matchQ = !q || r.dataset.name.toLowerCase().includes(q);
        const matchK = kind === 'all' || r.dataset.kind === kind;
        const on = matchQ && matchK;
        r.style.display = on ? '' : 'none';
        if (on) shown++;
      });
      if (count) count.textContent = `${shown} of ${rows().length}`;
      if (empty) empty.hidden = shown > 0;
    }

    filter.addEventListener('input', run);
    document.querySelectorAll('[name=kindfilter]').forEach((r) => r.addEventListener('change', run));
    run();
  }

  /* ── Counts — computed, never typed ────────────────────────── */
  const counts = document.getElementById('counts');
  if (counts && window.DATA) {
    const byKind = DATA.projects.reduce((m, p) => (m[p.kind] = (m[p.kind] || 0) + 1, m), {});
    counts.textContent = Object.entries(byKind)
      .map(([k, n]) => `${n} ${(DATA.kinds[k] || { label:k }).label.toLowerCase()}${n > 1 ? 's' : ''}`)
      .join(', ');
  }
})();
