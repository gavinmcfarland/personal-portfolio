/* ══════════════════════════════════════════════════════════════════
   09 · IMPOSITION — shared behaviour
   Theme, the construction-grid overlay, the rail, and the renderers.
   The renderers matter most here: renderProjects() draws the SAME
   array as a ruled table, a ledger, a bento or an asymmetric spread,
   which is the folder's whole argument — one content source, many
   treatments. Every template loads this same file.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  window.esc = esc;

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const pad2 = (n) => String(n).padStart(2, '0');

  /* ── Theme ───────────────────────────────────────────────────── */
  const themeBtn = $('#theme-toggle');
  if (themeBtn) {
    const sync = () => themeBtn.setAttribute('aria-pressed',
      String(document.documentElement.classList.contains('dark')));
    sync();
    themeBtn.addEventListener('click', () => {
      const dark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('gm-theme', dark ? 'dark' : 'light');
      sync();
    });
  }

  /* ── Construction grid — the button, or G ─────────────────────────
     Built from .sheet > .g12 so it inherits the real grid's box
     model exactly rather than approximating it (02 shipped a version
     that drew ~33px off the real columns; reusing the primitives is
     what prevents that). */
  const lines = $('#gridlines');
  if (lines && !lines.children.length) {
    lines.innerHTML = `<div class="sheet"><div class="g12">${'<i></i>'.repeat(12)}</div></div>`;
  }
  const gridBtn = $('#grid-toggle');
  const toggleGrid = () => {
    if (!lines) return;
    const on = lines.dataset.on !== 'true';
    lines.dataset.on = String(on);
    if (gridBtn) gridBtn.setAttribute('aria-pressed', String(on));
  };
  if (gridBtn) {
    gridBtn.setAttribute('aria-pressed', 'false');
    gridBtn.addEventListener('click', toggleGrid);
  }
  addEventListener('keydown', (e) => {
    if (e.key !== 'g' && e.key !== 'G') return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    toggleGrid();
  });

  /* ── The rail ────────────────────────────────────────────────────
     Numbered from DATA.nav order; the numbering is the hierarchy,
     so it is derived, never typed. */
  const nav = $('#nav');
  if (nav && window.DATA) {
    const here = document.body.dataset.page;
    nav.innerHTML = DATA.nav.map((n, i) =>
      `<a href="${esc(n.href)}"${n.id === here ? ' aria-current="page"' : ''}>` +
      `<span class="rail__n">${pad2(i + 1)}</span>${esc(n.name)}</a>`
    ).join('');
  }

  /* ── Renderers — one array, four treatments ──────────────────── */

  const kindOf = (p) => DATA.kinds[p.kind] || { label: p.kind, tone: 'sage' };
  const isExternal = (href) => /^https?:/.test(href);
  const attrs = (href) => isExternal(href)
    ? ` href="${esc(href)}" target="_blank" rel="noopener noreferrer"`
    : ` href="${esc(href)}"`;
  const arrow = (p) => isExternal(p.href) ? ' ↗' : '';

  const T = {
    /* T1 — the ruled table. NO. / ITEM / DESCRIPTION / KIND / YEAR. */
    table(ps) {
      return `<div class="tbl">
        <div class="tbl__row tbl__head">
          <span>no.</span><span>item</span><span>description</span><span>kind</span><span style="text-align:right">year</span>
        </div>
        ${ps.map((p, i) => `
        <a class="tbl__row"${attrs(p.href)}>
          <span class="tbl__num">${pad2(i + 1)}</span>
          <span class="tbl__item">${esc(p.name)}${arrow(p)}</span>
          <span class="tbl__desc">${esc(p.desc)}</span>
          <span class="tbl__kind chip" data-tone="${esc(kindOf(p).tone)}"><span class="sw" data-tone="${esc(kindOf(p).tone)}"></span>${esc(kindOf(p).label)}</span>
          <span class="tbl__year">${esc(p.year)}</span>
        </a>`).join('')}
      </div>`;
    },

    /* T2 — the ledger. Dense mono rows, year + one-line description. */
    ledger(ps) {
      return `<div class="ledger">
        ${ps.map((p, i) => `
        <a class="ledger__row"${attrs(p.href)}>
          <span class="ledger__date">${esc(p.year)} · ${pad2(i + 1)}</span>
          <span class="ledger__t">${esc(p.name)}${arrow(p)}
            <span class="ledger__lede">— ${esc(p.desc)}</span>
          </span>
          <span class="chip" data-tone="${esc(kindOf(p).tone)}"><span class="sw" data-tone="${esc(kindOf(p).tone)}"></span>${esc(kindOf(p).label)}</span>
          <span class="ledger__mins"></span>
        </a>`).join('')}
      </div>`;
    },

    /* T3 — the bento. Uneven spans; leftover cells hatched and
       labelled reserved, because a silent gap reads as a bug. */
    bento(ps, spans = ['c6', 'c3', 'c3', 'c4', 'c4', 'c4']) {
      return `<div class="bento">
        ${ps.map((p, i) => `
        <a class="bento__cell ${spans[i % spans.length]}"${attrs(p.href)}>
          <span class="micro" style="display:flex;justify-content:space-between;margin-bottom:.5rem">
            <span><span class="num">${pad2(i + 1)}</span> ${esc(p.name)}${arrow(p)}</span><span>${esc(p.year)}</span>
          </span>
          <span class="plate" data-tone="${esc(p.tone)}">
            <span class="tx tx-${esc(p.tx)}"></span>
            <span class="folio" aria-hidden="true">${pad2(i + 1)}</span>
          </span>
          <span class="mono dim" style="margin-top:.5rem">${esc(p.desc)}</span>
        </a>`).join('')}
        <div class="bento__spacer tx-hatch c6" aria-hidden="true"><span class="micro">reserved</span></div>
      </div>`;
    },

    /* T4 — the asymmetric spread. The newest project is argued in
       prose on the wide column; the rest wait in the margin. */
    asym(ps) {
      const [lead, ...rest] = ps;
      return `<div class="asym">
        <div class="asym__main">
          <p class="micro dim" style="margin-bottom:.75rem"><span class="num">01</span> ${esc(lead.name)} · ${esc(lead.year)}</p>
          <p class="display" style="max-width:24ch">${esc(lead.desc)}.</p>
          <p class="dim" style="margin-top:1rem;max-width:52ch">${esc(lead.long)}</p>
          <p class="mono" style="margin-top:1rem"><a class="ln"${attrs(lead.href)}>open ${esc(lead.name)}${arrow(lead)}</a></p>
        </div>
        <div class="asym__side">
          <div class="aside"><span class="micro">and also</span>
            ${rest.map((p, i) => `<a class="ln--bare" style="display:block;padding:.15rem 0;text-decoration:none"${attrs(p.href)}><span class="num">${pad2(i + 2)}</span> ${esc(p.name)}${arrow(p)}</a>`).join('')}
          </div>
        </div>
      </div>`;
    },
  };

  window.renderProjects = (el, mode, ps = (window.DATA ? DATA.projects : []), spans) => {
    if (!el || !T[mode]) return;
    el.innerHTML = T[mode](ps, spans);
  };

  /* Journal ledger — grouped by year inside <details>, open by
     default; collapsing a year is the reader's choice to keep. */
  window.renderPosts = (el) => {
    if (!el || !window.DATA) return;
    const years = [...new Set(DATA.posts.map((p) => p.year))];
    el.innerHTML = years.map((y) => `
      <details class="fold fold--year" open>
        <summary>${esc(y)} <span class="faint" style="font-weight:400">· ${pad2(DATA.posts.filter((p) => p.year === y).length)}</span></summary>
        <div class="fold__body">
          <div class="ledger" style="border-top:0">
            ${DATA.posts.filter((p) => p.year === y).map((p) => `
            <a class="ledger__row" href="${esc(p.href)}">
              <span class="ledger__date">${esc(p.date)}</span>
              <span class="ledger__t">${esc(p.title)}
                <span class="ledger__lede">— ${esc(p.lede)}</span>
              </span>
              <span class="chip"><span class="sw" data-tone="cyan"></span>${esc(p.tag)}</span>
              <span class="ledger__mins">${esc(p.mins)} min</span>
            </a>`).join('')}
          </div>
        </div>
      </details>`).join('');
  };

  /* ── Tabs — the one moving part ──────────────────────────────────
     A tablist whose buttons re-render a stage. The swap is a 120ms
     linear fade; nothing slides. Selection is session-only — theme
     is the only preference this system persists. */
  window.wireTabs = (listEl, stageEl, renderFn) => {
    if (!listEl || !stageEl) return;
    const tabs = $$('[role="tab"]', listEl);
    let busy = false;

    const select = (tab) => {
      if (busy || tab.getAttribute('aria-selected') === 'true') return;
      busy = true;
      tabs.forEach((t) => {
        t.setAttribute('aria-selected', String(t === tab));
        t.tabIndex = t === tab ? 0 : -1;
      });
      stageEl.dataset.fading = 'true';
      setTimeout(() => {
        renderFn(tab.dataset.mode, stageEl);
        stageEl.dataset.fading = 'false';
        busy = false;
      }, 130);
    };

    tabs.forEach((tab) => tab.addEventListener('click', () => select(tab)));
    listEl.addEventListener('keydown', (e) => {
      const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const next = tabs[(i + dir + tabs.length) % tabs.length];
      next.focus();
      select(next);
    });
  };

  /* ── Auto-populated regions ──────────────────────────────────── */
  if (window.DATA) {
    $$('[data-render]').forEach((el) => renderProjects(el, el.dataset.render));
    $$('[data-count="projects"]').forEach((el) => { el.textContent = pad2(DATA.projects.length); });
    $$('[data-count="posts"]').forEach((el) => { el.textContent = pad2(DATA.posts.length); });
    $$('[data-email]').forEach((el) => {
      el.textContent = DATA.who.email;
      if (el.tagName === 'A') el.href = 'mailto:' + DATA.who.email;
    });
  }

  /* ── Contact form ────────────────────────────────────────────────
     Validated here so messages sit in the layout, not in a native
     bubble. There is no endpoint — this is a mockup — so a valid
     submit says so plainly rather than pretending to have sent
     anything. */
  const form = $('#contact-form');
  if (form) {
    const rules = {
      name:    (v) => v.trim().length >= 2 || 'Required — what to call you',
      email:   (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Not a valid address',
      message: (v) => v.trim().length >= 12 || 'Too short — a sentence or two',
    };
    const check = (input) => {
      const field = input.closest('.field');
      const err = $('.err', field);
      const result = rules[input.name] ? rules[input.name](input.value) : true;
      const ok = result === true;
      field.dataset.invalid = String(!ok);
      input.setAttribute('aria-invalid', String(!ok));
      if (err) err.textContent = ok ? '' : result;
      return ok;
    };
    $$('.input', form).forEach((input) => {
      input.addEventListener('blur', () => check(input));
      input.addEventListener('input', () => {
        if (input.closest('.field').dataset.invalid === 'true') check(input);
      });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputs = $$('.input', form);
      const allOk = inputs.map(check).every(Boolean);
      const done = $('#form-done');
      if (!allOk) {
        const first = inputs.find((i) => i.closest('.field').dataset.invalid === 'true');
        if (first) first.focus();
        if (done) done.hidden = true;
        return;
      }
      if (done) { done.hidden = false; done.focus(); }
      form.reset();
      $$('.field', form).forEach((f) => { f.dataset.invalid = 'false'; });
      $$('.err', form).forEach((el) => { el.textContent = ''; });
    });
  }
})();
