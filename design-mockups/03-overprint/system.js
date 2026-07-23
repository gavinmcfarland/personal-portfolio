/* ══════════════════════════════════════════════════════════════════
   OVERPRINT — shared behaviour
   Theme, grid overlay, rail tracking, and the list renderers. Every
   template calls the same renderers, which is why a row on the cover
   and a row in the archive cannot drift apart.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  window.esc = esc;

  /* ── Theme ─────────────────────────────────────────────────────
     The pre-paint script in each <head> sets the class; this only
     persists the flip. */
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const dark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('gm-theme', dark ? 'dark' : 'light');
    });
  }

  /* ── Grid overlay — button or G ────────────────────────────────
     The overlay mirrors .sheet's box exactly (see system.css), so
     what it draws is the grid the page is actually on. */
  const lines = document.getElementById('gridlines');
  const gbtn = document.getElementById('grid-toggle');
  if (lines) {
    const set = (on) => {
      lines.dataset.on = String(on);
      if (gbtn) gbtn.setAttribute('aria-pressed', String(on));
    };
    if (gbtn) gbtn.addEventListener('click', () => set(lines.dataset.on !== 'true'));
    addEventListener('keydown', (e) => {
      if (e.key !== 'g' && e.key !== 'G') return;
      if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey) return;
      set(lines.dataset.on !== 'true');
    });
  }

  /* ── Rail tracking ────────────────────────────────────────────
     Marks the topmost section on screen. Links keep working as
     plain anchors if this never runs. */
  const railLinks = new Map();
  document.querySelectorAll('.rail a[href^="#"]').forEach((a) => railLinks.set(a.getAttribute('href').slice(1), a));

  if (railLinks.size && 'IntersectionObserver' in window) {
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id));
      const current = [...railLinks.keys()].find((id) => visible.has(id));
      railLinks.forEach((a, id) => id === current
        ? a.setAttribute('aria-current','true')
        : a.removeAttribute('aria-current'));
    }, { rootMargin:'-8% 0px -70% 0px' });
    document.querySelectorAll('.sec').forEach((s) => io.observe(s));
  }

  /* ── Renderers ────────────────────────────────────────────────
     One row shape per kind of thing, used by every template. */

  const rowLink = (href) => href.startsWith('http')
    ? ` target="_blank" rel="noopener noreferrer"` : '';
  const arrow = (item) => item.local ? '→' : (item.href.startsWith('http') ? '↗' : '·');

  function pieceRow(p, i) {
    return `
      <a class="list__row" href="${esc(p.href)}"${rowLink(p.href)}>
        <span class="c-idx">${String(i + 1).padStart(2,'0')}</span>
        <span class="c-key">${esc(p.name)} ${arrow(p)}</span>
        <span class="c-desc">${esc(p.desc)}</span>
        <span class="c-meta">${esc(p.year)}</span>
      </a>`;
  }

  function noteRow(n, i) {
    return `
      <a class="list__row" href="${esc(n.href)}"${rowLink(n.href)}>
        <span class="c-idx">${String(i + 1).padStart(2,'0')}</span>
        <span class="c-key">${esc(n.name)} ${arrow(n)}</span>
        <span class="c-desc">${esc(n.desc)}</span>
        <span class="c-meta">${esc(n.date)}</span>
      </a>`;
  }

  window.render = {
    /* target: element id · items: array · how: row renderer */
    into(id, items, how) {
      const el = document.getElementById(id);
      if (!el) return;
      el.insertAdjacentHTML('beforeend', items.map(how).join(''));
    },
    pieceRow, noteRow,
  };

  /* ── Colophon ─────────────────────────────────────────────────
     Printed on every page from one array. */
  const colo = document.getElementById('colophon');
  if (colo && window.DATA) {
    colo.innerHTML = window.DATA.colophon.map((c) => `
      <div class="col-cell">
        <span class="col-k">${esc(c.k)}</span>
        <span class="col-v">${c.href ? `<a href="${esc(c.href)}">${esc(c.v)}</a>` : esc(c.v)}</span>
      </div>`).join('');
  }
})();
