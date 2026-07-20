/* ══════════════════════════════════════════════════════════════════
   13 · DITHER — shared behaviour
   The bar, the surface toggle, the construction grid, and the
   renderers. Deliberately small: this set's interest is in §3 of
   system.css, and almost nothing here needs scripting to work.
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

  /* ── Surface ─────────────────────────────────────────────────── */
  const themeBtn = $('#theme-toggle');
  if (themeBtn) {
    const sync = () => themeBtn.setAttribute('aria-pressed',
      String(document.documentElement.classList.contains('light')));
    sync();
    themeBtn.addEventListener('click', () => {
      const light = document.documentElement.classList.toggle('light');
      localStorage.setItem('gm-surface-13', light ? 'bone' : 'dark');
      sync();
    });
  }

  /* ── Construction grid — the button, or G ─────────────────────── */
  const lines = $('#gridlines');
  if (lines && !lines.children.length) {
    lines.innerHTML = `<div class="g">${'<i></i>'.repeat(12)}</div>`;
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

  /* A plate is an illustration, so it always ships with its caption
     and its number. `n` is the plate's position in the sheet, not
     the project's — the caption numbers the pictures. */
  window.plateHtml = (id, n, label) =>
    `<span class="plate" data-plate="${esc(id)}" aria-hidden="true"></span>
     <span class="plate-cap">Plate ${n} — ${esc(label || id)}</span>`;

  /* The command entry: a `$ …` line, then a plate beside a
     description. The shape of every listing in this set. */
  window.renderEntries = (el, ps = DATA.projects) => {
    if (!el) return;
    el.innerHTML = ps.map((p, i) => `
      <a class="entry"${attrs(p.href)}>
        <span class="cmd">
          <span class="cmd__$">$</span>
          <span><span class="dim">gavin ${esc(p.flag)}</span> <span class="cmd__name">${esc(p.name)}</span></span>
          <span class="cmd__year">${esc(p.year)}</span>
        </span>
        <span class="entry__grid">
          <span style="display:block">
            <span class="plate" data-plate="${esc(p.plate)}" aria-hidden="true"></span>
            <span class="plate-cap" style="display:block">Plate ${i + 1} — ${esc(plateName(p.plate))}</span>
          </span>
          <span style="display:block">
            <span class="entry__desc" style="display:block">${esc(p.desc)}</span>
            <span class="ln" style="display:inline-block;margin-top:1rem">${esc(p.link)}</span>
          </span>
        </span>
      </a>`).join('');
  };

  const plateName = (id) => {
    const p = (DATA.plates || []).find((x) => x.id === id);
    return p ? p.name : id;
  };
  window.plateName = plateName;

  /* ── Journal, grouped by year ────────────────────────────────── */
  window.renderPosts = (el) => {
    if (!el || !window.DATA) return;
    const years = [...new Set(DATA.posts.map((p) => p.year))];
    el.innerHTML = years.map((y) => `
      <details class="fold" open>
        <summary><span class="b">${esc(y)}</span> <span class="faint">(${pad2(DATA.posts.filter((p) => p.year === y).length)})</span></summary>
        <div class="fold__body" style="max-width:none">
          ${DATA.posts.filter((p) => p.year === y).map((p) => `
          <a class="ln--bare" href="${esc(p.href)}" style="display:grid;grid-template-columns:9ch 1fr auto;gap:1.25rem;padding:.4rem 0;align-items:baseline">
            <span class="faint sm">${esc(p.date)}</span>
            <span>
              <span class="b" style="color:var(--ink)">${esc(p.title)}</span>
              <span style="display:block">${esc(p.lede)}</span>
            </span>
            <span class="faint sm">${esc(p.mins)} min</span>
          </a>`).join('')}
        </div>
      </details>`).join('');
  };

  /* ── Copy-to-clipboard on the address ────────────────────────────
     The address is the one thing on these pages a reader actually
     needs to take away, so it is the one thing with an affordance. */
  window.wireCopy = () => {
    $$('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = btn.dataset.copy || DATA.who.email;
        try { await navigator.clipboard.writeText(text); } catch { return; }
        const label = $('.copy__label', btn);
        if (!label) return;
        const was = label.textContent;
        label.textContent = 'copied';
        setTimeout(() => { label.textContent = was; }, 1400);
      });
    });
  };

  /* ── Auto-populated regions ──────────────────────────────────── */
  if (window.DATA) {
    $$('[data-entries]').forEach((el) => renderEntries(el));
    $$('[data-count="projects"]').forEach((el) => { el.textContent = pad2(DATA.projects.length); });
    $$('[data-count="posts"]').forEach((el) => { el.textContent = pad2(DATA.posts.length); });
    $$('[data-count="plates"]').forEach((el) => { el.textContent = pad2(DATA.plates.length); });
    $$('[data-count="decals"]').forEach((el) => { el.textContent = pad2(DATA.decals.length); });
    $$('[data-email]').forEach((el) => {
      el.textContent = DATA.who.email;
      if (el.tagName === 'A') el.href = 'mailto:' + DATA.who.email;
    });
    wireCopy();
  }

  /* ── Contact form ────────────────────────────────────────────────
     Validated here so the messages sit in the layout rather than in
     a native bubble. There is no endpoint — this is a mockup — so a
     valid submit says so plainly. */
  const form = $('#contact-form');
  if (form) {
    const rules = {
      name:    (v) => v.trim().length >= 2 || 'required: a name',
      email:   (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'invalid: not an address',
      message: (v) => v.trim().length >= 12 || 'too short: a sentence or two',
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
