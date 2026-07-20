/* ══════════════════════════════════════════════════════════════════
   11 · GALLEY — shared behaviour
   The running head, the theme, the construction grid, and the
   renderers. `renderPlace(el, id)` draws the same six items into any
   of the nine occupations in §3 — space.html steps through all of
   them a viewport at a time.
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

  /* ── The running head ────────────────────────────────────────── */
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
  const kindOf = (p) => (DATA.kinds[p.kind] || { label: p.kind });

  /* The ruled index — the set's workhorse, used wherever items need
     to be findable rather than shown. */
  const index = (ps, opts = {}) => `
    <div class="index">
      ${opts.head === false ? '' : `<div class="index__row index--head">
        <span>No.</span><span>Item</span><span>Description</span><span>Kind</span><span style="text-align:right">Year</span>
      </div>`}
      ${ps.map((p, i) => `
      <a class="index__row"${attrs(p.href)}>
        <span class="index__n">${pad2(i + 1)}</span>
        <span class="index__name">${esc(p.name)}${arrow(p)}</span>
        <span class="index__desc">${esc(p.desc)}</span>
        <span class="index__kind faint">${esc(kindOf(p).label)}</span>
        <span class="index__year">${esc(p.year)}</span>
      </a>`).join('')}
    </div>`;
  window.renderIndex = (el, ps = DATA.projects, opts) => { if (el) el.innerHTML = index(ps, opts); };

  /* A short prose run, used where a placement needs argument rather
     than a list to prove it can hold one. */
  const runOfText = (ps) => `
    <p style="margin-bottom:1.1rem">${esc(ps[0].long)}</p>
    <p class="dim">Five more sit behind it — ${ps.slice(1).map((p) => esc(p.name)).join(', ')} —
    each built because a problem kept recurring and the thing that would have
    fixed it did not exist yet.</p>`;

  /* ── The nine occupations ────────────────────────────────────────
     Each returns the INNER markup for a .frame; the frame class
     itself is applied by the caller, because the placement is the
     frame, not the content. */
  const P = {
    tl: (ps) => ({ cls: 'frame--tl', html: `
      <div class="hold">
        <p class="micro faint">Top left</p>
        <p class="display" style="margin:1rem 0">Where the eye already is.</p>
        <p class="dim">${esc(ps[0].long)}</p>
      </div>` }),

    measure: (ps) => ({ cls: 'frame--tl', html: `
      <div class="hold">
        <p class="micro faint">The column</p>
        <hr class="rule" style="margin:.75rem 0 1.25rem">
        ${runOfText(ps)}
      </div>` }),

    hang: (ps) => ({ cls: 'frame--tl', html: `
      <div class="hang hold--full">
        <div>
          <p class="micro faint">Hanging notes</p>
          <hr class="rule" style="margin:.75rem 0 1.25rem">
          ${runOfText(ps)}
        </div>
        <div class="hang__notes">
          <div><span class="micro">Note 1</span><span class="mark dim">The measure never widens. What changes is how much sheet is left beside it.</span></div>
          <div><span class="micro">Note 2</span><span class="mark dim">Marginalia belongs in the margin — which means there has to be one.</span></div>
        </div>
      </div>` }),

    bleed: (ps) => ({ cls: 'frame--bleed', html: `
      <div>
        <hr class="rule" style="border-top-width:1px;margin-bottom:1.5rem">
        <p class="micro faint">Full bleed</p>
        <p class="display" style="margin:1rem 0;max-width:16em">No margin at all — the band touches both edges.</p>
        <hr class="rule" style="margin-top:1.5rem">
      </div>` }),

    bl: () => ({ cls: 'frame--bl', html: `
      <div class="hold">
        <p class="micro faint">Bottom left</p>
        <p class="display" style="margin:1rem 0">The emptiness sits above, pressing down.</p>
        <p class="dim">The shape a closing statement wants: everything already said is the space overhead.</p>
      </div>` }),

    cl: () => ({ cls: 'frame--cl', html: `
      <div class="hold">
        <p class="micro faint">Centred left</p>
        <p class="display" style="margin:1rem 0">Calmer, and expensive.</p>
        <p class="dim">A whole viewport spent on three lines. Worth it perhaps twice in a set.</p>
      </div>` }),

    split: (ps) => ({ cls: 'frame--split', html: `
      <div class="hold">
        <p class="micro faint">Held apart</p>
        <p class="display" style="margin-top:1rem">Two blocks,</p>
      </div>
      <div class="hold">
        <p class="display" style="margin-bottom:1rem">and the height between them.</p>
        <p class="dim">Nothing occupies the middle. The gap is the argument — it says these two things are related and distant at once.</p>
      </div>` }),

    wide: (ps) => ({ cls: 'frame--wide', html: `
      <div class="hold--full">
        <p class="micro faint">Full width</p>
        <hr class="rule" style="margin:.75rem 0 1.5rem">
        ${index(ps)}
        <p class="mark faint" style="margin-top:1rem">Only a rule or a table survives at this width. Prose does not, so prose is not given it.</p>
      </div>` }),

    tr: () => ({ cls: 'frame--tr', html: `
      <div class="hold" style="margin-left:auto">
        <p class="micro faint">Right</p>
        <p class="display" style="margin:1rem 0">The counterweight.</p>
        <p class="dim">Used once, and only against something already anchored left. On its own it reads as a mistake rather than a decision.</p>
      </div>` }),
  };

  /* Applies both the placement class and its content, because in
     this system those are the same decision. */
  window.renderPlace = (el, id, ps = (window.DATA ? DATA.projects : [])) => {
    if (!el || !P[id]) return;
    const out = P[id](ps);
    el.className = 'frame ' + out.cls;
    const def = (DATA.places || []).find((d) => d.id === id);
    el.innerHTML = (def ? `<span class="frame__mark">${esc(def.hint)}</span>` : '') + out.html;
  };

  /* ── Journal, grouped by year ────────────────────────────────── */
  window.renderPosts = (el) => {
    if (!el || !window.DATA) return;
    const years = [...new Set(DATA.posts.map((p) => p.year))];
    el.innerHTML = years.map((y) => `
      <details class="fold" open>
        <summary>${esc(y)} <span class="faint">· ${pad2(DATA.posts.filter((p) => p.year === y).length)}</span></summary>
        <div class="fold__body" style="max-width:none;padding-left:0">
          ${DATA.posts.filter((p) => p.year === y).map((p) => `
          <a class="ln--bare" href="${esc(p.href)}" style="display:block;padding:.6rem 0;border-bottom:1px solid var(--hair)">
            <span class="mark" style="display:flex;gap:1rem;align-items:baseline">
              <span class="faint">${esc(p.date)}</span>
              <span style="color:var(--ink)">${esc(p.title)}</span>
              <span class="faint" style="margin-left:auto">${esc(p.mins)} min</span>
            </span>
            <span class="dim" style="display:block;margin-top:.15rem">${esc(p.lede)}</span>
          </a>`).join('')}
        </div>
      </details>`).join('');
  };

  /* ── Stepper + ticks, sharing one selection ──────────────────── */
  window.wireSteps = (tickEl, stepEl, count, onSelect) => {
    let i = 0, busy = false;
    const btns = tickEl ? $$('button', tickEl) : [];

    const go = (next, immediate) => {
      if (busy) return;
      const n = (next + count) % count;
      if (n === i && !immediate) return;
      busy = true;
      i = n;
      btns.forEach((b, bi) => b.setAttribute('aria-selected', String(bi === i)));
      onSelect(i, immediate);
      busy = false;
    };

    btns.forEach((b, bi) => b.addEventListener('click', () => go(bi)));
    if (stepEl) {
      stepEl.addEventListener('click', (e) => {
        const step = Number(e.target.closest('[data-step]')?.dataset.step);
        if (step) go(i + step);
      });
    }
    go(0, true);
    return { go, get index() { return i; } };
  };

  /* ── Auto-populated regions ──────────────────────────────────── */
  if (window.DATA) {
    $$('[data-index]').forEach((el) => renderIndex(el));
    $$('[data-count="projects"]').forEach((el) => { el.textContent = pad2(DATA.projects.length); });
    $$('[data-count="posts"]').forEach((el) => { el.textContent = pad2(DATA.posts.length); });
    $$('[data-count="places"]').forEach((el) => { el.textContent = pad2(DATA.places.length); });
    $$('[data-email]').forEach((el) => {
      el.textContent = DATA.who.email;
      if (el.tagName === 'A') el.href = 'mailto:' + DATA.who.email;
    });
  }

  /* ── Contact form ────────────────────────────────────────────────
     Validated here so the messages sit on the sheet rather than in a
     native bubble. There is no endpoint — this is a mockup — so a
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
