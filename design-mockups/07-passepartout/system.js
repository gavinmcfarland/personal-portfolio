/* ══════════════════════════════════════════════════════════════════
   07 · PASSEPARTOUT — shared behaviour
   Theme, nav, the shared renderers, the gallery filter and the
   contact form. Every template loads this same file; nothing here
   is page-specific beyond "does this element exist".
   ══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  window.esc = esc;

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ── Theme ───────────────────────────────────────────────────────
     The pre-paint script in each <head> has already set the class.
     This only handles the toggle and remembering the choice. */
  const themeBtn = $('#theme-toggle');
  if (themeBtn) {
    const sync = () => themeBtn.setAttribute('aria-pressed',
      String(document.documentElement.classList.contains('dark')));
    sync();
    themeBtn.addEventListener('click', () => {
      const dark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('gm-theme', dark ? 'dark' : 'light');
      sync();
      /* The board draws itself from the same tokens, so it has to be
         told when they change. */
      window.dispatchEvent(new CustomEvent('gm:theme', { detail: { dark } }));
    });
  }

  /* ── Nav ─────────────────────────────────────────────────────── */
  const nav = $('#nav');
  if (nav && window.DATA) {
    const here = document.body.dataset.page;
    nav.innerHTML = DATA.nav.map((n) =>
      `<a href="${esc(n.href)}"${n.id === here ? ' aria-current="page"' : ''}>${esc(n.name)}</a>`
    ).join('');
  }

  /* ── Shared renderers ────────────────────────────────────────── */
  const kindOf = (p) => DATA.kinds[p.kind] || { label: p.kind, colour: 'var(--faint)' };
  const isExternal = (href) => /^https?:/.test(href);

  const attrs = (href) => isExternal(href)
    ? ` href="${esc(href)}" target="_blank" rel="noopener noreferrer"`
    : ` href="${esc(href)}"`;

  window.render = {
    /* A plate + caption, the gallery unit */
    card(p) {
      const k = kindOf(p);
      return `
        <a class="mount mount--bare card" data-kind="${esc(p.kind)}"
           data-search="${esc((p.name + ' ' + p.desc + ' ' + k.label).toLowerCase())}"
           ${attrs(p.href)}>
          <div class="card__plate">
            <div class="plate plate--wide">
              <div class="plate__art" data-art="${esc(p.art)}"></div>
              <span class="plate__glyph" aria-hidden="true">${esc(p.glyph)}</span>
            </div>
          </div>
          <div class="card__body">
            <div class="spread">
              <span class="strong">${esc(p.name)}${isExternal(p.href) ? ' ↗' : ''}</span>
              <span class="label">${esc(p.year)}</span>
            </div>
            <p class="small" style="margin-top:.3rem">${esc(p.desc)}</p>
            <span class="rows__kind" style="margin-top:.75rem">
              <span class="dot" style="background:${k.colour}"></span>${esc(k.label)}
            </span>
          </div>
        </a>`;
    },

    /* A dense row, the index unit */
    row(p) {
      const k = kindOf(p);
      return `
        <a class="rows__row" data-kind="${esc(p.kind)}"
           data-search="${esc((p.name + ' ' + p.desc).toLowerCase())}"${attrs(p.href)}>
          <span class="rows__year">${esc(p.year)}</span>
          <span class="rows__name">${esc(p.name)}${isExternal(p.href) ? ' ↗' : ''}
            <span class="rows__desc">${esc(p.desc)}</span>
          </span>
          <span class="rows__kind">
            <span class="dot" style="background:${k.colour}"></span>${esc(k.label)}
          </span>
        </a>`;
    },

    defs(items) {
      return items.map((i) => `
        <div><dt>${esc(i.k)}</dt><dd class="leader"></dd><dd>${esc(i.v)}</dd></div>`).join('');
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
    render.into('capabilities',  DATA.capabilities.map((c) => `
      <div class="mount">
        <span class="label">${esc(c.k)}</span>
        <p class="body" style="margin-top:.6rem">${esc(c.v)}</p>
      </div>`).join(''));

    $$('[data-count="projects"]').forEach((el) => { el.textContent = DATA.projects.length; });
    $$('[data-year="now"]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    $$('[data-email]').forEach((el) => {
      el.textContent = DATA.who.email;
      if (el.tagName === 'A') el.href = 'mailto:' + DATA.who.email;
    });
  }

  /* ── Gallery filter ──────────────────────────────────────────────
     Filters what is already in the DOM and reports a real count.
     Without JS the gallery still renders in full and the panel is
     simply absent, which is the correct degradation. */
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
      /* Query the items rather than the children: the container also
         holds a <noscript>, which would otherwise be counted as a
         result and reported in the total ("3 of 7"). */
      const items = [...scope.querySelectorAll(':scope > [data-search]')];
      let shown = 0;

      items.forEach((el) => {
        const okQ = !q || (el.dataset.search || '').includes(q);
        const okK = kind === 'all' || el.dataset.kind === kind;
        const on = okQ && okK;
        el.hidden = !on;
        if (on) shown++;
      });

      if (count) count.textContent = `${shown} of ${items.length}`;
      if (empty) empty.hidden = shown > 0;
    };

    if (search) search.addEventListener('input', run);
    chipInputs.forEach((r) => r.addEventListener('change', run));
    run();
  }

  /* ── Contact form ────────────────────────────────────────────────
     Validated here rather than left to the browser so the messages
     sit in the layout instead of in a native bubble. The form has no
     endpoint — this is a mockup — so submit reports success and says
     so plainly rather than pretending to have sent anything. */
  const form = $('#contact-form');
  if (form) {
    const rules = {
      name:    (v) => v.trim().length >= 2 || 'Tell me what to call you.',
      email:   (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'That does not look like an email address.',
      message: (v) => v.trim().length >= 12 || 'A sentence or two, so I know what this is about.',
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
      /* Validate on blur, then live once it has been wrong — nagging
         while someone is still typing their first character is rude. */
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
      if (done) {
        done.hidden = false;
        done.focus();
      }
      form.reset();
      $$('.field', form).forEach((f) => { f.dataset.invalid = 'false'; });
      $$('.err', form).forEach((el) => { el.textContent = ''; });
    });
  }
})();
