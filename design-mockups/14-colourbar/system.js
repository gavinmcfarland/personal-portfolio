/* ══════════════════════════════════════════════════════════════════
   14 · COLOURBAR — shared behaviour
   The rail, the surface toggle, the construction grid, and the
   renderers.

   The renderers are the argument: stripHtml() draws every
   illustration in the set from `strip` + `inks` on the project, and
   renderProjects() draws the SAME six projects as a ruled table, a
   ledger, a bento and an asymmetric spread. colour(7) tab-switches
   all four in place. If two treatments ever disagreed about the
   content, the system would have failed visibly.
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

  /* ── Surface ─────────────────────────────────────────────────────
     Theme is the only preference this set persists. */
  const themeBtn = $('#theme-toggle');
  if (themeBtn) {
    const sync = () => themeBtn.setAttribute('aria-pressed',
      String(document.documentElement.classList.contains('dark')));
    sync();
    themeBtn.addEventListener('click', () => {
      const dark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('gm-surface-14', dark ? 'dark' : 'light');
      sync();
    });
  }

  /* ── Construction grid — the button, or G ───────────────────── */
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

  /* ── The rail ───────────────────────────────────────────────── */
  const nav = $('#nav');
  if (nav && window.DATA) {
    const here = document.body.dataset.page;
    nav.innerHTML = DATA.nav.map((n, i) =>
      `<a href="${esc(n.href)}"${n.id === here ? ' aria-current="page"' : ''}>` +
      `<span class="rail__n">${pad2(i + 1)}</span>${esc(n.name)}</a>`
    ).join('');
  }
  /* The rail carries a step strip of its own. The navigation is the
     one block on every sheet that never changes, so it is where the
     set states its palette. */
  const railStrip = $('#rail-strip');
  if (railStrip) railStrip.innerHTML = cells(['navy', 'teal', 'maroon', 'olive', 'purple', 'gray']);

  /* ── Shared pieces ──────────────────────────────────────────── */
  const isExternal = (href) => /^https?:/.test(href);
  const attrs = (href) => isExternal(href)
    ? ` href="${esc(href)}" target="_blank" rel="noopener noreferrer"`
    : ` href="${esc(href)}"`;
  const arrow = (p) => isExternal(p.href) ? ' <span class="faint" aria-hidden="true">↗</span>' : '';
  const kindOf = (p) => (DATA.kinds && DATA.kinds[p.kind]) || { label: p.kind, tone: 'silver' };
  window.kindOf = kindOf;

  /* `folio` is an optional numeral printed inside the LAST patch —
     inside, so it inherits the ink §1 paired with that colour rather
     than having to be told the pairing a second time. */
  function cells(inks, folio) {
    return inks.map((c, i) =>
      `<i data-c="${esc(c)}">${
        folio != null && i === inks.length - 1 ? `<span class="folio">${esc(folio)}</span>` : ''
      }</i>`).join('');
  }
  window.cells = cells;

  /* A strip is an illustration, so it always ships with its caption
     and its number. `n` is the strip's position on the sheet, not
     the project's — the caption numbers the pictures. */
  window.stripHtml = (id, inks, n, label) =>
    `<span class="strip" data-strip="${esc(id)}" aria-hidden="true">${
      cells(inks, id === 'e' && n != null ? pad2(n) : null)}</span>` +
    (n == null ? '' : `<span class="strip-cap">Strip ${pad2(n)} — ${esc(label || stripName(id))}</span>`);

  const stripName = (id) => {
    const s = (window.DATA && DATA.strips || []).find((x) => x.id === id);
    return s ? s.name : id;
  };
  window.stripName = stripName;

  /* ── The four treatments ────────────────────────────────────────
     Same array in, four different sheets out. */
  const T = {

    /* T1 — the ruled table. NO. / ITEM / DESCRIPTION / KIND / YEAR,
       dense rows on hairlines. Index and work(1). */
    table(ps) {
      return `<div class="scroll-x"><div class="tbl">
        <div class="tbl__row tbl__head">
          <span>no.</span><span>item</span><span>description</span><span>kind</span><span style="text-align:right">year</span>
        </div>
        ${ps.map((p, i) => `
        <a class="tbl__row"${attrs(p.href)}>
          <span class="tbl__num">${pad2(i + 1)}</span>
          <span class="tbl__item">${esc(p.name)}${arrow(p)}</span>
          <span class="tbl__desc">${esc(p.desc)}</span>
          <span><span class="chip"><span class="sw" data-c="${esc(kindOf(p).tone)}"></span>${esc(kindOf(p).label)}</span></span>
          <span class="tbl__year">${esc(p.year)}</span>
        </a>`).join('')}
      </div></div>
      <p class="scroll-hint mono">Table scrolls sideways rather than stacking.</p>`;
    },

    /* T2 — the ledger. The journal's register, borrowed for work. */
    ledger(ps) {
      return `<div class="ledger">
        ${ps.map((p, i) => `
        <a class="ledger__row"${attrs(p.href)}>
          <span class="ledger__date">${esc(p.year)} · ${pad2(i + 1)}</span>
          <span class="ledger__t">${esc(p.name)}${arrow(p)}
            <span class="ledger__lede">— ${esc(p.desc)}</span>
          </span>
          <span class="chip"><span class="sw" data-c="${esc(kindOf(p).tone)}"></span>${esc(kindOf(p).label)}</span>
          <span class="ledger__mins"></span>
        </a>`).join('')}
      </div>`;
    },

    /* T3 — the bento. Uneven spans, each cell carrying its strip.
       The leftover cell is labelled reserved: a silent gap in a grid
       reads as a bug. */
    bento(ps, spans = ['c6', 'c3', 'c3', 'c4', 'c4', 'c4']) {
      return `<div class="bento">
        ${ps.map((p, i) => `
        <a class="bento__cell ${spans[i % spans.length]}"${attrs(p.href)}>
          <span class="micro" style="display:flex;justify-content:space-between;color:var(--muted)">
            <span><span class="num">${pad2(i + 1)}</span> ${esc(p.name)}${arrow(p)}</span><span>${esc(p.year)}</span>
          </span>
          <span class="strip" data-strip="${esc(p.strip)}" aria-hidden="true">${
            cells(p.inks, p.strip === 'e' ? pad2(i + 1) : null)}</span>
          <span class="mono dim">${esc(p.desc)}</span>
        </a>`).join('')}
        <div class="bento__spacer c6" aria-hidden="true"><span class="micro">reserved</span></div>
      </div>`;
    },

    /* T4 — the asymmetric spread. The newest project is argued in
       prose on the wide column; the rest wait in the margin. */
    asym(ps) {
      const [lead, ...rest] = ps;
      return `<div class="asym">
        <div class="asym__main">
          <p class="micro faint" style="margin-bottom:.6rem"><span class="num">01</span> ${esc(lead.name)} · ${esc(lead.year)}</p>
          <p class="display" style="max-width:24ch">${esc(lead.desc)}</p>
          <p class="dim" style="margin-top:.9rem">${esc(lead.long)}</p>
          <p class="mono" style="margin-top:.9rem"><a class="ln"${attrs(lead.href)}>open ${esc(lead.name)}${arrow(lead)}</a></p>
        </div>
        <div class="asym__side">
          <div class="aside"><span class="micro">and also</span>
            ${rest.map((p, i) => `<a class="ln--bare" style="display:flex;gap:.5rem;padding:.1rem 0"${attrs(p.href)}><span class="num">${pad2(i + 2)}</span> <span>${esc(p.name)}${arrow(p)}</span></a>`).join('')}
          </div>
          <div class="strip" data-strip="a" style="height:5rem;margin-top:1rem" aria-hidden="true">${
            cells(ps.map((p) => kindOf(p).tone))}</div>
          <p class="strip-cap">Strip 01 — step, one patch per project, in its category ink.</p>
        </div>
      </div>`;
    },
  };

  window.renderProjects = (el, mode, ps = (window.DATA ? DATA.projects : []), spans) => {
    if (!el || !T[mode]) return;
    el.innerHTML = T[mode](ps, spans);
  };

  /* T5 — the entry. 13's `$ …` command line, then a strip beside a
     description. The shape of every listing in this set. */
  window.renderEntries = (el, ps = DATA.projects) => {
    if (!el) return;
    el.innerHTML = ps.map((p, i) => `
      <a class="entry"${attrs(p.href)}>
        <span class="cmd">
          <span class="cmd__$">$</span>
          <span><span class="dim">gavin ${esc(p.flag)}</span> <span class="cmd__name">${esc(p.name)}</span>${arrow(p)}</span>
          <span class="cmd__year">${esc(p.year)}</span>
        </span>
        <span class="entry__grid">
          <span style="display:block">${stripHtml(p.strip, p.inks, i + 1)}</span>
          <span style="display:block">
            <span class="entry__desc">${esc(p.desc)}</span>
            <span class="mono ln" style="display:inline-block;margin-top:.9rem">${esc(p.link)}</span>
          </span>
        </span>
      </a>`).join('');
  };

  /* ── Journal, grouped by year ───────────────────────────────── */
  window.renderPosts = (el) => {
    if (!el || !window.DATA) return;
    const years = [...new Set(DATA.posts.map((p) => p.year))];
    el.innerHTML = years.map((y) => `
      <details class="fold" open>
        <summary><span class="b">${esc(y)}</span> <span class="faint">(${pad2(DATA.posts.filter((p) => p.year === y).length)})</span></summary>
        <div class="fold__body" style="max-width:none">
          <div class="ledger" style="border-top:0">
            ${DATA.posts.filter((p) => p.year === y).map((p) => `
            <a class="ledger__row" href="${esc(p.href)}">
              <span class="ledger__date">${esc(p.date)}</span>
              <span class="ledger__t">${esc(p.title)}
                <span class="ledger__lede">— ${esc(p.lede)}</span>
              </span>
              <span class="chip"><span class="sw" data-c="${esc(p.ink)}"></span>${esc(p.tag)}</span>
              <span class="ledger__mins">${esc(p.mins)} min</span>
            </a>`).join('')}
          </div>
        </div>
      </details>`).join('');
  };

  /* ── Tabs — the one moving part ─────────────────────────────────
     A tablist whose buttons re-render a stage. The swap is a 120ms
     linear fade; nothing slides, and the selection is session-only. */
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

  /* ── Copy-to-clipboard on the address ───────────────────────────
     The address is the one thing on these pages a reader needs to
     take away, so it is the one thing with an affordance. */
  window.wireCopy = () => {
    $$('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = btn.dataset.copy || DATA.who.email;
        try { await navigator.clipboard.writeText(text); } catch { return; }
        const label = $('.copy__label', btn);
        if (!label) return;
        label.textContent = 'copied';
        setTimeout(() => { label.textContent = ''; }, 1400);
      });
    });
  };

  /* ── Auto-populated regions ─────────────────────────────────────
     Counts are computed, never typed. */
  if (window.DATA) {
    $$('[data-render]').forEach((el) => renderProjects(el, el.dataset.render));
    $$('[data-entries]').forEach((el) => renderEntries(el));
    $$('[data-count="projects"]').forEach((el) => { el.textContent = pad2(DATA.projects.length); });
    $$('[data-count="posts"]').forEach((el) => { el.textContent = pad2(DATA.posts.length); });
    $$('[data-count="strips"]').forEach((el) => { el.textContent = pad2(DATA.strips.length); });
    $$('[data-count="marks"]').forEach((el) => { el.textContent = pad2(DATA.marks.length); });
    $$('[data-count="inks"]').forEach((el) => { el.textContent = '16'; });
    $$('[data-email]').forEach((el) => {
      el.textContent = DATA.who.email;
      if (el.tagName === 'A') el.href = 'mailto:' + DATA.who.email;
    });
    /* The footer states its own breakdown rather than repeating a
       typed sentence: "6 projects — 2 tools, 1 library, 3 plug-ins". */
    $$('[data-breakdown]').forEach((el) => {
      const by = {};
      DATA.projects.forEach((p) => { by[p.kind] = (by[p.kind] || 0) + 1; });
      const parts = Object.keys(by).map((k) => `${by[k]} ${kindOf({ kind: k }).label}${by[k] > 1 ? 's' : ''}`);
      el.textContent = `${DATA.projects.length} projects — ${parts.join(', ')}`;
    });
    wireCopy();
  }

  /* ── Contact form ───────────────────────────────────────────────
     Validated here so the messages sit in the layout rather than in
     a native bubble. There is no endpoint — this is a mockup — so a
     valid submit says so plainly rather than pretending. */
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
      const problems = $('#form-problems');
      if (!allOk) {
        const bad = inputs.filter((i) => i.closest('.field').dataset.invalid === 'true');
        if (problems) { problems.hidden = false; problems.textContent = `${bad.length} problem${bad.length > 1 ? 's' : ''} — fix and resubmit.`; }
        if (done) done.hidden = true;
        bad[0].focus();
        return;
      }
      if (problems) problems.hidden = true;
      if (done) { done.hidden = false; done.focus(); }
      form.reset();
      $$('.field', form).forEach((f) => { f.dataset.invalid = 'false'; });
      $$('.err', form).forEach((el) => { el.textContent = ''; });
    });
  }
})();
