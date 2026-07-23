/* ══════════════════════════════════════════════════════════════════
   10 · BROADSHEET — shared behaviour
   The masthead bar, the theme, the construction grid — and LAYOUT,
   which is what this variation is for. `renderLayout(el, id)` draws
   the same six projects through any of the twelve structures in §3
   of system.css. Every sheet in the folder calls it; layouts.html
   calls it twelve times.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  window.esc = esc;

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const pad2 = (n) => String(n).padStart(2, '0');
  window.pad2 = pad2;

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

  /* ── Construction grid — the button, or G ────────────────────────
     Built from .sheet > .g12 so it inherits the real grid's box
     model rather than approximating it. */
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

  /* ── The bar ─────────────────────────────────────────────────── */
  const nav = $('#nav');
  if (nav && window.DATA) {
    const here = document.body.dataset.page;
    nav.innerHTML = DATA.nav.map((n) =>
      `<a href="${esc(n.href)}"${n.id === here ? ' aria-current="page"' : ''}>${esc(n.name)}</a>`
    ).join('');
  }

  /* ── The entry: the atom every layout rearranges ─────────────────
     Each structure below receives this same markup, so what differs
     between them on layouts.html really is only the shape. */
  const kindOf = (p) => (DATA.kinds[p.kind] || { label: p.kind, tone: 'slate' });
  const isExternal = (href) => /^https?:/.test(href);
  const attrs = (href) => isExternal(href)
    ? ` href="${esc(href)}" target="_blank" rel="noopener noreferrer"`
    : ` href="${esc(href)}"`;
  const arrow = (p) => isExternal(p.href) ? ' ↗' : '';

  const entry = (p, i, opts = {}) => `
    <a class="entry"${attrs(p.href)}>
      <span class="entry__k">
        <span class="num">${pad2(i + 1)}</span>
        <span class="entry__t">${esc(p.name)}${arrow(p)}</span>
        <span class="entry__y">${esc(p.year)}</span>
      </span>
      <span class="entry__d">${esc(opts.long ? p.long : p.desc)}</span>
    </a>`;

  /* A panel with a printed plate on it — used by the structures
     that need visual weight rather than just a line of text. */
  const card = (p, i, opts = {}) => `
    <a class="panel"${attrs(p.href)}>
      <span class="micro dim" style="display:flex;justify-content:space-between;margin-bottom:.5rem">
        <span><span class="num">${pad2(i + 1)}</span> ${esc(p.name)}${arrow(p)}</span>
        <span>${esc(p.year)}</span>
      </span>
      <span class="plate" data-tone="${esc(p.tone)}" style="min-height:${opts.tall ? '9rem' : '5.5rem'}">
        <span class="tx tx-${esc(p.tx)}"></span>
        <span class="folio" aria-hidden="true">${pad2(i + 1)}</span>
      </span>
      <span class="meta dim" style="margin-top:.5rem">${esc(p.desc)}</span>
    </a>`;

  /* ── The twelve structures ───────────────────────────────────── */
  const L = {
    flow: (ps) => `<div class="l-flow l-flow--3">
      ${ps.map((p, i) => `<div class="keep">${entry(p, i, { long: true })}</div>`).join('')}
    </div>`,

    split: (ps) => `<div class="l-split" style="border:1px solid var(--rule)">
      <div class="l-split__fixed band--sunk">
        <div class="is-sticky">
          <p class="micro dim">The fixed half</p>
          <p class="display" style="margin-top:.5rem;max-width:16ch">Six things, built in the gaps between other things.</p>
          <p class="dim" style="margin-top:.75rem;max-width:34ch">
            This side holds still. The evidence for it scrolls past on the right,
            which is the whole argument for the shape.
          </p>
        </div>
      </div>
      <div>${ps.map((p, i) => `<div style="padding:.9rem 0;border-bottom:1px solid var(--hair)">${entry(p, i, { long: true })}</div>`).join('')}</div>
    </div>`,

    strip: (ps) => `<div class="l-strip">
      ${ps.map((p, i) => card(p, i, { tall: true })).join('')}
    </div>
    <p class="micro faint" style="margin-top:.5rem">Scroll sideways — six of six</p>`,

    stagger: (ps) => `<div class="l-stagger">${ps.map((p, i) => card(p, i)).join('')}</div>`,

    overlap: (ps) => `<div class="l-overlap">
      ${ps.map((p, i) => `<div class="panel" style="background:var(--plate)">${entry(p, i, { long: true })}</div>`).join('')}
    </div>`,

    bands: (ps) => `<div class="l-bands">
      ${ps.map((p, i) => `<div class="${i === 0 ? 'is-lead' : ''}">
        <div class="sheet">${entry(p, i, { long: i === 0 })}</div>
      </div>`).join('')}
    </div>`,

    asym: (ps) => {
      const [lead, ...rest] = ps;
      return `<div class="l-asym">
        <div class="l-asym__main">
          <p class="micro dim"><span class="num">01</span> ${esc(lead.name)} · ${esc(lead.year)}</p>
          <p class="display" style="margin-top:.6rem;max-width:20ch">${esc(lead.desc)}.</p>
          <p class="dim" style="margin-top:.9rem;max-width:56ch">${esc(lead.long)}</p>
        </div>
        <div class="l-asym__side">
          <p class="micro dim" style="border-top:1px solid var(--rule);padding-top:.5rem">Also on the sheet</p>
          <div style="margin-top:.6rem">
            ${rest.map((p, i) => `<div style="padding:.5rem 0;border-bottom:1px solid var(--hair)">${entry(p, i + 1)}</div>`).join('')}
          </div>
        </div>
      </div>`;
    },

    classified: (ps) => {
      /* Doubled so the density is honest — three columns of six
         entries would not be a classifieds page, it would be a list. */
      const doubled = [...ps, ...ps];
      return `<div class="l-classified">
        ${doubled.map((p, i) => `<div>
          <span class="meta"><span class="num">${pad2((i % ps.length) + 1)}</span> <span class="strong">${esc(p.name)}</span>${arrow(p)}</span>
          <span class="meta dim" style="display:block">${esc(p.desc)} · ${esc(p.year)}</span>
        </div>`).join('')}
      </div>`;
    },

    bento: (ps) => {
      const spans = ['c6', 'c3', 'c3', 'c4', 'c4', 'c4'];
      return `<div class="l-bento">
        ${ps.map((p, i) => `<div class="${spans[i % spans.length]}" style="display:flex">${card(p, i)}</div>`).join('')}
      </div>`;
    },

    rungs: (ps) => `<div class="l-rungs">
      ${ps.map((p, i) => `<div class="${i === 0 ? 'is-mark' : ''}">${entry(p, i)}</div>`).join('')}
    </div>`,

    measure: (ps) => `<div class="l-measure">
      <p class="micro dim">One column, and room around it</p>
      <p class="display" style="margin:.6rem 0 1rem">The most expensive layout on the sheet.</p>
      <p class="dim">
        Six items, set one after another with nothing beside them. Every other
        structure here exists to avoid spending this much width on this little
        content — which is exactly why it is the only one that can carry a long
        argument without tiring the reader.
      </p>
      <div style="margin-top:1.5rem">
        ${ps.map((p, i) => `<div style="padding:.7rem 0;border-bottom:1px solid var(--hair)">${entry(p, i)}</div>`).join('')}
      </div>
    </div>`,

    table: (ps) => `<div class="scroll-x"><table class="l-table">
      <thead><tr><th>No.</th><th>Item</th><th>Description</th><th>Kind</th><th style="text-align:right">Year</th></tr></thead>
      <tbody>
        ${ps.map((p, i) => `<tr>
          <td class="t-num">${pad2(i + 1)}</td>
          <td class="t-item strong">${esc(p.name)}${arrow(p)}</td>
          <td class="t-desc">${esc(p.desc)}</td>
          <td><span class="flag" data-tone="${esc(kindOf(p).tone)}"><span class="sw" data-tone="${esc(kindOf(p).tone)}"></span>${esc(kindOf(p).label)}</span></td>
          <td class="t-year">${esc(p.year)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`,
  };

  window.renderLayout = (el, id, ps = (window.DATA ? DATA.projects : [])) => {
    if (!el || !L[id]) return;
    el.innerHTML = L[id](ps);
  };
  window.layoutIds = () => Object.keys(L);

  /* Journal ledger, grouped by year inside <details>. */
  window.renderPosts = (el) => {
    if (!el || !window.DATA) return;
    const years = [...new Set(DATA.posts.map((p) => p.year))];
    el.innerHTML = years.map((y) => `
      <details class="fold" open>
        <summary>${esc(y)} <span class="faint" style="font-weight:400">· ${pad2(DATA.posts.filter((p) => p.year === y).length)}</span></summary>
        <div class="fold__body" style="max-width:none;padding-left:0">
          ${DATA.posts.filter((p) => p.year === y).map((p) => `
          <a class="entry" href="${esc(p.href)}" style="padding:.5rem 0;border-bottom:1px solid var(--hair)">
            <span class="entry__k">
              <span class="num" style="color:var(--faint)">${esc(p.date)}</span>
              <span class="entry__t">${esc(p.title)}</span>
              <span class="entry__y">${esc(p.mins)} min</span>
            </span>
            <span class="entry__d">${esc(p.lede)}</span>
          </a>`).join('')}
        </div>
      </details>`).join('');
  };

  /* ── Tabs, with an optional stepper bound to the same state ────── */
  window.wireTabs = (listEl, stageEl, onSelect, stepperEl) => {
    if (!listEl || !stageEl) return;
    const tabs = $$('[role="tab"]', listEl);
    let busy = false;

    const select = (tab, force) => {
      if (!tab || busy || (!force && tab.getAttribute('aria-selected') === 'true')) return;
      busy = true;
      tabs.forEach((t) => {
        t.setAttribute('aria-selected', String(t === tab));
        t.tabIndex = t === tab ? 0 : -1;
      });
      stageEl.dataset.fading = 'true';
      setTimeout(() => {
        onSelect(tab.dataset.mode, tabs.indexOf(tab), tabs.length);
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
      next.focus(); select(next);
    });

    if (stepperEl) {
      stepperEl.addEventListener('click', (e) => {
        const step = Number(e.target.closest('[data-step]')?.dataset.step);
        if (!step) return;
        const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
        select(tabs[(i + step + tabs.length) % tabs.length]);
      });
    }

    /* Draw the first state without waiting for a click. */
    const first = tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0];
    onSelect(first.dataset.mode, tabs.indexOf(first), tabs.length);
    return { select, tabs };
  };

  /* ── Auto-populated regions ──────────────────────────────────── */
  if (window.DATA) {
    $$('[data-layout]').forEach((el) => renderLayout(el, el.dataset.layout));
    $$('[data-count="projects"]').forEach((el) => { el.textContent = pad2(DATA.projects.length); });
    $$('[data-count="posts"]').forEach((el) => { el.textContent = pad2(DATA.posts.length); });
    $$('[data-count="layouts"]').forEach((el) => { el.textContent = pad2(DATA.layouts.length); });
    $$('[data-email]').forEach((el) => {
      el.textContent = DATA.who.email;
      if (el.tagName === 'A') el.href = 'mailto:' + DATA.who.email;
    });
    const ed = $('#edition-date');
    if (ed) {
      /* The edition line is the one place a real date belongs. */
      ed.textContent = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    }
  }

  /* ── Contact form ────────────────────────────────────────────────
     Validated here so the messages sit in the layout rather than in
     a native bubble. There is no endpoint — this is a mockup — so a
     valid submit says so plainly. */
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
