/* ══════════════════════════════════════════════════════════════════
   08 · HARD MOUNT — shared behaviour
   Theme, the construction-grid overlay, nav, renderers, the gallery
   filter and the contact form. Every template loads this same file.
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
     Built from .sheet > .g12 so it inherits the real grid's box model
     exactly rather than approximating it. 02 shipped a version of this
     that used a different box model and drew the bands ~33px off the
     real columns; reusing the primitives is what prevents that. */
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

  /* ── Nav ─────────────────────────────────────────────────────── */
  const nav = $('#nav');
  if (nav && window.DATA) {
    const here = document.body.dataset.page;
    nav.innerHTML = DATA.nav.map((n) =>
      `<a href="${esc(n.href)}"${n.id === here ? ' aria-current="page"' : ''}>${esc(n.name)}</a>`
    ).join('');
  }

  /* ── Renderers ───────────────────────────────────────────────── */
  const kindOf = (p) => DATA.kinds[p.kind] || { label: p.kind, colour: 'transparent' };
  const isExternal = (href) => /^https?:/.test(href);
  const attrs = (href) => isExternal(href)
    ? ` href="${esc(href)}" target="_blank" rel="noopener noreferrer"`
    : ` href="${esc(href)}"`;

  window.render = {
    card(p, i) {
      const k = kindOf(p);
      return `
        <a class="frame frame--bare card c4" data-kind="${esc(p.kind)}"
           data-search="${esc((p.name + ' ' + p.desc + ' ' + k.label).toLowerCase())}"
           ${attrs(p.href)}>
          <div class="card__plate">
            <div class="plate plate--wide">
              <div class="plate__art" data-art="${esc(p.art)}"></div>
              <span class="plate__glyph" aria-hidden="true">${esc(p.glyph)}</span>
            </div>
          </div>
          <div class="card__body">
            <span class="strong">${esc(p.name)}${isExternal(p.href) ? ' ↗' : ''}</span>
            <p class="small" style="margin-top:.15rem">${esc(p.desc)}</p>
          </div>
          <div class="frame__bar" style="margin-top:.75rem">
            <span>${esc(pad2(i + 1))} · ${esc(k.label)}</span>
            <span>${esc(p.year)}</span>
          </div>
        </a>`;
    },

    row(p, i) {
      const k = kindOf(p);
      return `
        <a class="sched__row" data-kind="${esc(p.kind)}"
           data-search="${esc((p.name + ' ' + p.desc).toLowerCase())}"${attrs(p.href)}>
          <span class="sched__num">${esc(pad2(i + 1))}</span>
          <span class="sched__name">${esc(p.name)}${isExternal(p.href) ? ' ↗' : ''}
            <span class="sched__desc">${esc(p.desc)}</span>
          </span>
          <span class="sched__kind">
            <span class="swatch" style="background:${k.colour}"></span>${esc(k.label)}
          </span>
          <span class="sched__year">${esc(p.year)}</span>
        </a>`;
    },

    defs(items) {
      return items.map((i) => `<div><dt>${esc(i.k)}</dt><dd>${esc(i.v)}</dd></div>`).join('');
    },

    into(id, html) {
      const el = document.getElementById(id);
      if (el) el.insertAdjacentHTML('beforeend', html);
    },
  };

  /* ── Auto-populated regions ──────────────────────────────────── */
  if (window.DATA) {
    render.into('project-rows',  DATA.projects.map(render.row).join(''));
    render.into('project-cards', DATA.projects.map(render.card).join(''));
    render.into('facts',         render.defs(DATA.facts));
    render.into('capabilities',  DATA.capabilities.map((c, i) => `
      <div class="frame c4">
        <div class="spread" style="margin-bottom:.5rem">
          <span class="label label--ink">${esc(c.k)}</span>
          <span class="micro">${esc(pad2(i + 1))}</span>
        </div>
        <hr class="hair" style="margin-bottom:.6rem">
        <p class="small">${esc(c.v)}</p>
      </div>`).join(''));

    $$('[data-count="projects"]').forEach((el) => { el.textContent = pad2(DATA.projects.length); });
    $$('[data-year="now"]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    $$('[data-email]').forEach((el) => {
      el.textContent = DATA.who.email;
      if (el.tagName === 'A') el.href = 'mailto:' + DATA.who.email;
    });
  }

  /* ── Gallery filter ──────────────────────────────────────────── */
  const search = $('#search');
  const chipInputs = $$('[name=kind]');
  if (search || chipInputs.length) {
    const scope = $('#project-cards') || $('#project-rows');
    const count = $('#result-count');
    const empty = $('#result-empty');

    const run = () => {
      if (!scope) return;
      const q = (search ? search.value : '').trim().toLowerCase();
      const kind = ($('[name=kind]:checked') || {}).value || 'all';
      /* Query the items, not the children — the container also holds a
         <noscript>, which would otherwise be counted in the total. */
      const items = [...scope.querySelectorAll(':scope > [data-search]')];
      let shown = 0;

      items.forEach((el) => {
        const okQ = !q || (el.dataset.search || '').includes(q);
        const okK = kind === 'all' || el.dataset.kind === kind;
        const on = okQ && okK;
        el.hidden = !on;
        if (on) shown++;
      });

      if (count) count.textContent = `${pad2(shown)} / ${pad2(items.length)}`;
      if (empty) empty.hidden = shown > 0;
    };

    if (search) search.addEventListener('input', run);
    chipInputs.forEach((r) => r.addEventListener('change', run));
    run();
  }

  /* ── Contact form ────────────────────────────────────────────────
     Validated here rather than by the browser so the messages sit in
     the layout instead of in a native bubble. There is no endpoint —
     this is a mockup — so a valid submit says so plainly rather than
     pretending to have sent anything. */
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
      /* On blur, then live only once it has already been wrong —
         nagging during the first keystroke is rude. */
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
