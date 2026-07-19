/* ══════════════════════════════════════════════════════════════════
   WORKSTATION — shared behaviour
   Chrome (taskbar, Start menu, View menu, clock), theme, the grid
   overlay, the list renderers, and the modal dialog. Every template
   calls the same functions, so a row on the document home and a row
   in a project's spec table cannot drift apart.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  window.esc = esc;

  /* ── Icons ─────────────────────────────────────────────────────
     Drawn on a 16×16 grid on whole pixels, so they stay crisp. */
  const ICONS = {
    folder:'<svg class="ico" viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M1 3h5l1 2h8v8H1z" fill="#FFD24A" stroke="#0A0A0A"/></svg>',
    doc:'<svg class="ico" viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M3 1h7l3 3v11H3z" fill="#FFFFFF" stroke="#0A0A0A"/><path d="M5 6h6M5 8h6M5 10h4" stroke="#000080"/></svg>',
    board:'<svg class="ico" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1" y="2" width="14" height="11" fill="#008080" stroke="#0A0A0A"/><rect x="3" y="4" width="4" height="3" fill="#FFFF00"/><rect x="9" y="7" width="4" height="4" fill="#FF00FF"/></svg>',
    mail:'<svg class="ico" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1" y="3" width="14" height="10" fill="#FFFFFF" stroke="#0A0A0A"/><path d="M1 3l7 6 7-6" fill="none" stroke="#0A0A0A"/></svg>',
    app:'<svg class="ico" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="2" width="12" height="12" fill="#C0C0C0" stroke="#0A0A0A"/><rect x="3" y="3" width="10" height="2" fill="#000080"/></svg>',
    grid:'<svg class="ico" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor"/><path d="M6 2v12M10 2v12M2 6h12M2 10h12" stroke="currentColor"/></svg>',
    sun:'<svg class="ico" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="6" y="6" width="4" height="4" fill="currentColor"/><path d="M8 1v3M8 12v3M1 8h3M12 8h3M3 3l2 2M11 11l2 2M13 3l-2 2M5 11l-2 2" stroke="currentColor"/></svg>',
  };
  window.ICONS = ICONS;

  /* ── Theme ─────────────────────────────────────────────────────
     The pre-paint script in each <head> sets the class. */
  function toggleTheme() {
    const dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('gm-theme', dark ? 'dark' : 'light');
    syncTicks();
  }
  window.toggleTheme = toggleTheme;

  /* ── Grid overlay ─────────────────────────────────────────────
     The overlay mirrors .win's padding so the bands measure the grid
     the content is actually on, not an approximation of it. */
  const lines = document.getElementById('gridlines');
  function toggleGrid(force) {
    if (!lines) return;
    const on = force == null ? lines.dataset.on !== 'true' : force;
    lines.dataset.on = String(on);
    syncTicks();
  }
  window.toggleGrid = toggleGrid;

  addEventListener('keydown', (e) => {
    if (e.key !== 'g' && e.key !== 'G') return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey) return;
    toggleGrid();
  });

  /* Menu checkmarks reflect real state rather than being decorative. */
  function syncTicks() {
    document.querySelectorAll('[data-tick="grid"]').forEach((el) => {
      el.textContent = lines && lines.dataset.on === 'true' ? '✓' : '';
    });
    document.querySelectorAll('[data-tick="dark"]').forEach((el) => {
      el.textContent = document.documentElement.classList.contains('dark') ? '✓' : '';
    });
  }

  /* ── Menus ────────────────────────────────────────────────────
     One open at a time; click-away and Escape close. */
  function closeMenus(except) {
    document.querySelectorAll('.menu[data-open="true"], .startmenu[data-open="true"]').forEach((m) => {
      if (m === except) return;
      m.dataset.open = 'false';
      const ctrl = document.querySelector(`[aria-controls="${m.id}"]`);
      if (ctrl) ctrl.setAttribute('aria-expanded', 'false');
    });
  }

  document.querySelectorAll('[aria-controls]').forEach((btn) => {
    const menu = document.getElementById(btn.getAttribute('aria-controls'));
    if (!menu) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.dataset.open !== 'true';
      closeMenus(menu);
      menu.dataset.open = String(open);
      btn.setAttribute('aria-expanded', String(open));
      if (open) syncTicks();
    });
  });

  addEventListener('click', (e) => { if (!e.target.closest('.menu, .startmenu')) closeMenus(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });

  /* ── Chrome: taskbar, Start menu, clock ───────────────────────
     Built from DATA.pages so a new page appears in the navigation
     everywhere at once. */
  function buildChrome() {
    if (!window.DATA) return;
    const here = document.body.dataset.page;

    const tasks = document.getElementById('tasks');
    if (tasks) {
      tasks.innerHTML = DATA.pages.map((p) => `
        <a class="task" href="${esc(p.href)}"${p.id === here ? ' aria-current="page"' : ''}>
          ${ICONS[p.ico] || ICONS.doc}<span>${esc(p.name)}</span>
        </a>`).join('');
    }

    const list = document.getElementById('startlist');
    if (list) {
      list.innerHTML = DATA.pages.map((p) => `
        <li><a href="${esc(p.href)}">${ICONS[p.ico] || ICONS.doc}${esc(p.name)}</a></li>`).join('')
        + `<li><hr /></li>
           <li><a href="mailto:gavin@limitlessloop.com">${ICONS.mail}Send mail…</a></li>`;
    }

    /* A fixed clock. The time is not real — this is a mockup, and a
       ticking clock would be the only live thing on the page. */
    const clock = document.getElementById('clock');
    if (clock) clock.textContent = '11:40';
  }

  /* ── Modal dialog ─────────────────────────────────────────────
     Focus is moved in and restored on close. */
  let lastFocus = null;

  window.dialog = function dialog({ title = 'Message', message = '', kind = 'info', onOk } = {}) {
    const modal = document.getElementById('modal');
    if (!modal) return;
    lastFocus = document.activeElement;

    const art = {
      info:'<svg class="dialog__ico" viewBox="0 0 32 32" shape-rendering="crispEdges"><circle cx="16" cy="16" r="14" fill="#000080"/><rect x="14" y="8" width="4" height="4" fill="#FFF"/><rect x="14" y="14" width="4" height="12" fill="#FFF"/></svg>',
      warn:'<svg class="dialog__ico" viewBox="0 0 32 32" shape-rendering="crispEdges"><path d="M16 2 L31 29 H1 z" fill="#FFFF00" stroke="#0A0A0A"/><rect x="14" y="11" width="4" height="10" fill="#0A0A0A"/><rect x="14" y="23" width="4" height="4" fill="#0A0A0A"/></svg>',
      ok:'<svg class="dialog__ico" viewBox="0 0 32 32" shape-rendering="crispEdges"><circle cx="16" cy="16" r="14" fill="#008000"/><path d="M9 16 l5 5 l9 -11" fill="none" stroke="#FFF" stroke-width="4"/></svg>',
    }[kind] || '';

    modal.innerHTML = `
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t">
        <div class="win__title">
          <span class="name" id="dlg-t">${esc(title)}</span>
          <span class="win__ctrls"><button class="win__ctrl" type="button" data-close aria-label="Close">✕</button></span>
        </div>
        <div class="dialog__body">${art}<div class="dialog__msg">${message}</div></div>
        <div class="dialog__foot"><button class="btn" type="button" data-ok>OK</button></div>
      </div>`;

    modal.dataset.open = 'true';
    const ok = modal.querySelector('[data-ok]');
    ok.focus();

    const close = () => {
      modal.dataset.open = 'false';
      modal.innerHTML = '';
      if (lastFocus) lastFocus.focus();
      if (onOk) onOk();
    };
    ok.addEventListener('click', close);
    modal.querySelector('[data-close]').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { e.preventDefault(); ok.focus(); }   /* two controls, keep focus inside */
    });
  };

  /* ── Renderers ────────────────────────────────────────────────── */
  window.render = {
    projectRow(p) {
      const ext = p.href.startsWith('http');
      return `
        <a class="lv__row" href="${esc(p.href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>
          <span class="c-key">${esc(p.name)}</span>
          <span class="c-desc">${esc(p.desc)}</span>
          <span class="c-meta">${esc(p.kind)}</span>
        </a>`;
    },
    into(id, items, how) {
      const el = document.getElementById(id);
      if (el) el.insertAdjacentHTML('beforeend', items.map(how).join(''));
    },
  };

  buildChrome();
  syncTicks();
})();
