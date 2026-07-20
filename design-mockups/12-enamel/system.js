/* ══════════════════════════════════════════════════════════════════
   12 · ENAMEL — shared behaviour
   The bar, the theme, the construction grid, and the renderers.
   `renderRank(el, id)` draws the SAME three items through each of
   the eight rank devices in §3 — signal.html runs all eight side by
   side, which is the only fair way to judge devices that are all
   trying to do the same job.
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

  /* ── Theme ───────────────────────────────────────────────────────
     Graphite is the default here, so the stored value is inverted
     relative to the earlier sets: this system opts IN to steel. */
  const themeBtn = $('#theme-toggle');
  if (themeBtn) {
    const sync = () => themeBtn.setAttribute('aria-pressed',
      String(document.documentElement.classList.contains('light')));
    sync();
    themeBtn.addEventListener('click', () => {
      const light = document.documentElement.classList.toggle('light');
      localStorage.setItem('gm-surface', light ? 'steel' : 'graphite');
      sync();
    });
  }

  /* ── Construction grid — the button, or G ─────────────────────── */
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

  /* ── Shared pieces ───────────────────────────────────────────── */
  const isExternal = (href) => /^https?:/.test(href);
  const attrs = (href) => isExternal(href)
    ? ` href="${esc(href)}" target="_blank" rel="noopener noreferrer"`
    : ` href="${esc(href)}"`;
  const arrow = (p) => isExternal(p.href) ? ' ↗' : '';
  const kindOf = (p) => (DATA.kinds[p.kind] || { label: p.kind, tone: 'teal' });

  /* The table. Note that the header row and the body rows are the
     same two sizes as everything else on every sheet. */
  window.renderTable = (el, ps = DATA.projects) => {
    if (!el) return;
    el.innerHTML = `<div class="scroll-x"><table class="tbl">
      <thead><tr><th>No.</th><th>Item</th><th>Description</th><th>Kind</th><th style="text-align:right">Year</th></tr></thead>
      <tbody>
        ${ps.map((p, i) => `<tr>
          <td class="t-n">${pad2(i + 1)}</td>
          <td class="t-name"><a class="ln--bare"${attrs(p.href)}>${esc(p.name)}${arrow(p)}</a></td>
          <td class="t-desc">${esc(p.desc)}</td>
          <td><span class="tag"><span class="sw" data-tone="${esc(kindOf(p).tone)}"></span>${esc(kindOf(p).label)}</span></td>
          <td class="t-year">${esc(p.year)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  };

  /* Enamel cards — the plate carries the weight a heading would. */
  window.renderCards = (el, ps = DATA.projects, spans = ['c4','c4','c4','c4','c4','c4']) => {
    if (!el) return;
    el.innerHTML = ps.map((p, i) => `
      <a class="panel ${spans[i % spans.length]}"${attrs(p.href)} style="padding:0">
        <span class="plate" data-tone="${esc(p.tone)}">
          <span class="tx tx-${esc(p.tx)}" aria-hidden="true"></span>
          <span class="numeral" aria-hidden="true">${pad2(i + 1)}</span>
        </span>
        <span style="padding:.875rem;display:block">
          <span class="mark faint" style="display:flex;justify-content:space-between;margin-bottom:.4rem">
            <span>${esc(kindOf(p).label)}</span><span>${esc(p.year)}</span>
          </span>
          <span class="strong" style="display:block">${esc(p.name)}${arrow(p)}</span>
          <span class="dim" style="display:block;margin-top:.15rem">${esc(p.desc)}</span>
        </span>
      </a>`).join('');
  };

  /* ── The eight rank devices ──────────────────────────────────────
     Every one receives the same three items and the same words. The
     only thing that varies is how "the first one matters most" gets
     said — which is the entire subject of signal.html. */
  const SAMPLE = () => DATA.projects.slice(0, 3);

  const plain = (p, i) => `
    <div style="padding:.6rem 0">
      <span class="strong">${esc(p.name)}</span>
      <span class="dim" style="display:block">${esc(p.desc)}</span>
    </div>`;

  const R = {
    fill: (ps) => `
      <div class="fill" data-tone="blue">
        <span class="mark" style="opacity:.72">Lead</span>
        <span class="strong" style="display:block;margin-top:.3rem">${esc(ps[0].name)}</span>
        <span style="display:block;opacity:.8">${esc(ps[0].desc)}</span>
      </div>
      ${ps.slice(1).map(plain).join('')}`,

    invert: (ps) => `
      <div class="invert">
        <span class="mark" style="opacity:.7">Lead</span>
        <span class="strong" style="display:block;margin-top:.3rem">${esc(ps[0].name)}</span>
        <span style="display:block;opacity:.75">${esc(ps[0].desc)}</span>
      </div>
      ${ps.slice(1).map(plain).join('')}`,

    weight: (ps) => ps.map((p, i) => `
      <div style="padding:.6rem 0">
        <span class="${i === 0 ? 'strong' : 'dim'}">${esc(p.name)}</span>
        <span class="${i === 0 ? 'dim' : 'faint'}" style="display:block">${esc(p.desc)}</span>
      </div>`).join(''),

    colour: (ps) => ps.map((p, i) => `
      <div style="padding:.6rem 0">
        <span class="${i === 0 ? 'accent strong' : ''}">${esc(p.name)}</span>
        <span class="dim" style="display:block">${esc(p.desc)}</span>
      </div>`).join(''),

    rule: (ps) => ps.map((p, i) => `
      <div class="topped ${i === 0 ? 'topped--hi' : ''}" style="padding-bottom:.6rem">
        <span class="strong">${esc(p.name)}</span>
        <span class="dim" style="display:block">${esc(p.desc)}</span>
      </div>`).join(''),

    number: (ps) => ps.map((p, i) => `
      <div style="padding:.6rem 0;display:flex;gap:.75rem">
        <span class="n">${pad2(i + 1)}</span>
        <span>
          <span class="strong">${esc(p.name)}</span>
          <span class="dim" style="display:block">${esc(p.desc)}</span>
        </span>
      </div>`).join(''),

    edge: (ps) => ps.map((p, i) => `
      <div class="edged" ${i === 0 ? 'data-tone="lime"' : ''} style="padding-block:.6rem;margin-bottom:.2rem">
        <span class="strong">${esc(p.name)}</span>
        <span class="dim" style="display:block">${esc(p.desc)}</span>
      </div>`).join(''),

    space: (ps) => `
      <div style="padding-block:2.25rem">
        <span class="strong">${esc(ps[0].name)}</span>
        <span class="dim" style="display:block">${esc(ps[0].desc)}</span>
      </div>
      ${ps.slice(1).map((p) => `
      <div style="padding:.2rem 0">
        <span class="strong">${esc(p.name)}</span>
        <span class="dim" style="display:block">${esc(p.desc)}</span>
      </div>`).join('')}`,
  };

  window.renderRank = (el, id, ps = SAMPLE()) => {
    if (!el || !R[id]) return;
    el.innerHTML = R[id](ps);
  };

  /* ── Journal ─────────────────────────────────────────────────── */
  window.renderPosts = (el) => {
    if (!el || !window.DATA) return;
    const years = [...new Set(DATA.posts.map((p) => p.year))];
    el.innerHTML = years.map((y) => `
      <details class="fold" open>
        <summary>${esc(y)} <span class="faint mono" style="font-weight:400">${pad2(DATA.posts.filter((p) => p.year === y).length)}</span></summary>
        <div class="fold__body" style="max-width:none;padding-left:0">
          ${DATA.posts.filter((p) => p.year === y).map((p) => `
          <a class="ln--bare edged" data-tone="${esc(p.tone)}" href="${esc(p.href)}"
             style="display:block;padding:.55rem .875rem;margin-bottom:.3rem">
            <span class="mono faint" style="display:flex;gap:.75rem">
              <span>${esc(p.date)}</span><span>${esc(p.tag)}</span>
              <span style="margin-left:auto">${esc(p.mins)} min</span>
            </span>
            <span class="strong" style="display:block;margin-top:.15rem">${esc(p.title)}</span>
            <span class="dim" style="display:block">${esc(p.lede)}</span>
          </a>`).join('')}
        </div>
      </details>`).join('');
  };

  /* ── Tabs ────────────────────────────────────────────────────── */
  window.wireTabs = (listEl, stageEl, onSelect) => {
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
        onSelect(tab.dataset.mode, tabs.indexOf(tab));
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
    const first = tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0];
    onSelect(first.dataset.mode, tabs.indexOf(first));
  };

  /* ── Auto-populated regions ──────────────────────────────────── */
  if (window.DATA) {
    $$('[data-table]').forEach((el) => renderTable(el));
    $$('[data-cards]').forEach((el) => renderCards(el));
    $$('[data-count="projects"]').forEach((el) => { el.textContent = pad2(DATA.projects.length); });
    $$('[data-count="posts"]').forEach((el) => { el.textContent = pad2(DATA.posts.length); });
    $$('[data-count="ranks"]').forEach((el) => { el.textContent = pad2(DATA.ranks.length); });
    $$('[data-email]').forEach((el) => {
      el.textContent = DATA.who.email;
      if (el.tagName === 'A') el.href = 'mailto:' + DATA.who.email;
    });
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
