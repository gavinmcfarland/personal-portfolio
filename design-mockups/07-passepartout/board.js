/* ══════════════════════════════════════════════════════════════════
   07 · PASSEPARTOUT — the board
   A small pan/zoom canvas. Two things are worth knowing:

   1. It renders NOTHING of its own styling. Every node is a class
      already defined in system.css, and connectors stroke with
      `var(--accent)`. So the board follows the theme with no redraw
      and no second palette to keep in sync.

   2. Gestures differ by mode. `boxed` sits inside a scrolling page,
      so a plain wheel must scroll the page through it and only a
      pinch zooms. `full` owns the viewport and takes everything.
      Getting this backwards is the classic embedded-canvas bug.
   ══════════════════════════════════════════════════════════════════ */

window.Board = (() => {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* ── The board's content ──────────────────────────────────────────
     Shaped the way a serialised board is: flat nodes with world
     coordinates and a z index. The code node is illustrative — it is
     the documented Figma plugin API showing the sandbox / iframe
     split, not a verbatim file from the project. */
  const NODES = [
    { id: 'title', type: 'title', x: 0, y: -76, z: 20, text: 'Plugma' },

    { id: 'intro', type: 'doc', x: 0, y: 0, z: 21,
      label: 'Overview',
      html: '<h3>Two programs, one plugin</h3>'
          + '<p>A Figma plugin is two programs that cannot see each other — one in a sandbox '
          + 'holding the document, one in an iframe holding the DOM. They speak only by '
          + 'passing messages.</p>'
          + '<p>So every plugin began with the same lost day: a bundler, a manifest, a '
          + 'message bridge, and a build step that inlines the UI.</p>' },

    { id: 'n1', type: 'note', x: 400, y: -60, z: 22, tint: 'clay',  label: '01', text: 'Zero\nconfig' },
    { id: 'n2', type: 'note', x: 616, y: -60, z: 23, tint: 'sky',   label: '02', text: 'Real HMR,\nstate kept' },
    { id: 'n3', type: 'note', x: 400, y: 100, z: 24, tint: 'sage',  label: '03', text: 'React\nSvelte\nVue' },
    { id: 'n4', type: 'note', x: 616, y: 100, z: 25, tint: 'lilac', label: '04', text: 'One command\nto ship' },

    { id: 'plate', type: 'plate', x: 400, y: 268, z: 26,
      art: 'arcs', glyph: 'P', caption: 'Fig. 1', captionR: 'dev server' },

    { id: 'code', type: 'code', x: 0, y: 296, z: 27, lang: 'main.ts',
      code: '<span class="cm">// sandbox half — document access, no DOM</span>\n'
          + '<span class="kw">figma</span>.ui.onmessage = (msg) => {\n'
          + '  <span class="kw">if</span> (msg.type === <span class="cm">\'resize\'</span>) {\n'
          + '    <span class="kw">figma</span>.ui.resize(msg.w, msg.h)\n'
          + '  }\n'
          + '}' },

    { id: 'how', type: 'doc', x: 880, y: 96, z: 28,
      label: 'Mechanism',
      html: '<h3>How it works</h3>'
          + '<p>The UI is served from a dev server while you develop and inlined at build '
          + 'time, so the sandbox half never notices the difference.</p>'
          + '<p>Messages are typed across the bridge with <code>onmessage</code>.</p>' },

    { id: 'link', type: 'link', x: 880, y: -76, z: 29,
      url: 'https://www.plugma.dev/', host: 'plugma.dev',
      title: 'Plugma — Getting started',
      desc: 'Scaffold a plugin and run it with hot reloading, in one command.',
      art: 'bars' },

    { id: 'why', type: 'doc', x: 400, y: 496, z: 30,
      label: 'Result',
      html: '<h3>Why it matters</h3>'
          + '<p>Interface work stops being a stop-start loop. That is the whole return on '
          + 'the tool — and the substrate for every plugin I built after it.</p>' },
  ];

  const LINKS = [
    { id: 'l1', x1: 330, y1: 40,  x2: 388, y2: 10 },
    { id: 'l2', x1: 330, y1: 150, x2: 388, y2: 300 },
    { id: 'l3', x1: 820, y1: 30,  x2: 868, y2: 60 },
  ];

  /* ── Rendering ─────────────────────────────────────────────────── */

  function nodeEl(n) {
    const el = document.createElement('div');
    el.className = 'board__node';
    el.style.transform = `translate(${n.x}px,${n.y}px)`;
    el.style.zIndex = n.z;

    if (n.type === 'title') {
      el.innerHTML = `<div class="nd-title">${esc(n.text)}</div>`;

    } else if (n.type === 'doc') {
      el.innerHTML = `<div class="nd-doc">
        ${n.label ? `<span class="label" style="display:block;margin-bottom:.6rem">${esc(n.label)}</span>` : ''}
        ${n.html}
      </div>`;

    } else if (n.type === 'note') {
      el.innerHTML = `<div class="nd-note" data-tint="${esc(n.tint)}">
        <span class="nd-note__label">${esc(n.label)}</span>${esc(n.text)}
      </div>`;

    } else if (n.type === 'code') {
      el.innerHTML = `<div class="nd-code">
        <div class="nd-code__bar">${esc(n.lang)}</div><pre>${n.code}</pre>
      </div>`;

    } else if (n.type === 'plate') {
      el.innerHTML = `<div class="nd-plate">
        <div class="plate plate--wide">
          <div class="plate__art" data-art="${esc(n.art)}"></div>
          <span class="plate__glyph" aria-hidden="true">${esc(n.glyph)}</span>
        </div>
        <div class="caption"><span>${esc(n.caption)}</span><span>${esc(n.captionR)}</span></div>
      </div>`;

    } else if (n.type === 'link') {
      el.innerHTML = `<a class="nd-link" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">
        <div class="plate plate--wide" style="border-radius:0;border-width:0 0 1px">
          <div class="plate__art" data-art="${esc(n.art)}"></div>
        </div>
        <div class="nd-link__body">
          <span class="nd-link__title">${esc(n.title)}</span>
          <span class="nd-link__desc">${esc(n.desc)}</span>
          <span class="nd-link__host">${esc(n.host)} ↗</span>
        </div>
      </a>`;
    }
    return el;
  }

  /* Connectors stroke with the accent token, so they re-colour with
     the theme without being redrawn. */
  function linkEl(l) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'board__svg');
    svg.style.zIndex = 5;
    const mid = 'bm-' + l.id;
    /* A gentle S rather than a straight line — it reads as a drawn
       connection instead of a border that happens to be diagonal. */
    const mx = (l.x1 + l.x2) / 2;
    svg.innerHTML = `
      <defs>
        <marker id="${mid}" viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)"/>
        </marker>
      </defs>
      <path d="M${l.x1} ${l.y1} C ${mx} ${l.y1}, ${mx} ${l.y2}, ${l.x2} ${l.y2}"
            fill="none" stroke="var(--accent)" stroke-width="1.75"
            stroke-linecap="round" opacity=".55" marker-end="url(#${mid})"/>`;
    return svg;
  }

  /* ── Engine ────────────────────────────────────────────────────── */

  function mount(root, opts = {}) {
    const mode = opts.mode || 'boxed';
    const GRID = 24, MIN = .1, MAX = 6;
    const LEGIBLE = .34;

    root.dataset.mode = mode;
    root.innerHTML = `
      <div class="board__vp" tabindex="0" role="group"
           aria-label="Project board. Drag to pan${mode === 'full' ? ', scroll to zoom' : ', pinch to zoom'}. Arrow keys pan, plus and minus zoom, zero fits.">
        <div class="board__world"></div>
      </div>
      <div class="board__ui board__zoom">
        <button type="button" data-act="fit" title="Fit to view" aria-label="Fit board to view">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>
          </svg>
        </button>
        <button type="button" data-act="out" aria-label="Zoom out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>
        </button>
        <button type="button" id="board-zoomval" data-act="reset" aria-label="Reset zoom to 100 percent">100%</button>
        <button type="button" data-act="in" aria-label="Zoom in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <div class="board__ui board__hint" aria-hidden="true">drag to pan · ${mode === 'full' ? 'scroll' : 'pinch'} to zoom</div>`;

    const vp = root.querySelector('.board__vp');
    const world = root.querySelector('.board__world');
    const zoomval = root.querySelector('#board-zoomval');
    const hint = root.querySelector('.board__hint');

    const view = { x: 0, y: 0, scale: 1 };
    let touched = false;

    const markTouched = () => {
      if (touched) return;
      touched = true;
      if (hint) hint.style.opacity = '0';
    };

    function apply() {
      world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.scale})`;
      const step = GRID * view.scale;
      vp.style.backgroundSize = `${step}px ${step}px`;
      vp.style.backgroundPosition = `${view.x % step}px ${view.y % step}px`;
      zoomval.textContent = Math.round(view.scale * 100) + '%';
    }

    const frag = document.createDocumentFragment();
    LINKS.forEach((l) => frag.appendChild(linkEl(l)));
    const els = NODES.map(nodeEl);
    els.forEach((e) => frag.appendChild(e));
    world.appendChild(frag);

    function bounds() {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      NODES.forEach((n, i) => {
        const el = els[i];
        x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y);
        x1 = Math.max(x1, n.x + el.offsetWidth);
        y1 = Math.max(y1, n.y + el.offsetHeight);
      });
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }

    function fit() {
      const b = bounds();
      const r = vp.getBoundingClientRect();
      if (!b.w || !b.h || !r.width) return;
      const pad = Math.min(56, r.width * .05);
      const s = Math.min((r.width - pad * 2) / b.w, (r.height - pad * 2) / b.h);

      if (s < LEGIBLE) {
        /* On a phone the whole board fits at ~18%, which is a smear.
           Frame the opening node at a readable size instead and let
           the reader pan out to the rest. */
        const n = NODES[1], el = els[1];
        view.scale = clamp(Math.min((r.width - pad * 2) / el.offsetWidth, 1), MIN, MAX);
        view.x = pad - n.x * view.scale;
        view.y = pad - n.y * view.scale;
      } else {
        view.scale = clamp(s, MIN, MAX);
        view.x = (r.width - b.w * view.scale) / 2 - b.x * view.scale;
        view.y = (r.height - b.h * view.scale) / 2 - b.y * view.scale;
      }
      apply();
    }

    function zoomAt(cx, cy, factor) {
      const r = vp.getBoundingClientRect();
      const px = cx - r.left, py = cy - r.top;
      const wx = (px - view.x) / view.scale, wy = (py - view.y) / view.scale;
      view.scale = clamp(view.scale * factor, MIN, MAX);
      view.x = px - wx * view.scale;
      view.y = py - wy * view.scale;
      apply();
    }

    function zoomCentre(factor) {
      const r = vp.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
    }

    /* ── Pan ──────────────────────────────────────────────────────
       Boxed mode ignores touch drags so the page can still be
       scrolled with a finger over the board; mouse and pen still
       pan. Full-bleed mode takes every pointer. */
    let panning = false, lastX = 0, lastY = 0;

    vp.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a')) return;
      if (mode === 'boxed' && e.pointerType === 'touch') return;
      panning = true;
      markTouched();
      lastX = e.clientX; lastY = e.clientY;
      vp.setPointerCapture(e.pointerId);
    });

    vp.addEventListener('pointermove', (e) => {
      if (!panning) return;
      view.x += e.clientX - lastX;
      view.y += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      apply();
    });

    const endPan = (e) => {
      if (!panning) return;
      panning = false;
      try { vp.releasePointerCapture(e.pointerId); } catch {}
    };
    vp.addEventListener('pointerup', endPan);
    vp.addEventListener('pointercancel', endPan);

    /* ── Wheel ────────────────────────────────────────────────────
       A browser reports a trackpad pinch as a wheel event with
       ctrlKey set. In boxed mode that is the ONLY thing we take —
       everything else falls through and scrolls the page, which is
       what a reader flicking past a figure expects. */
    vp.addEventListener('wheel', (e) => {
      const pinch = e.ctrlKey || e.metaKey;
      if (mode === 'boxed' && !pinch) return;
      e.preventDefault();
      markTouched();
      if (pinch) {
        zoomAt(e.clientX, e.clientY, Math.exp(-clamp(e.deltaY, -24, 24) * .015));
      } else {
        view.x -= e.deltaX; view.y -= e.deltaY; apply();
      }
    }, { passive: false });

    vp.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 120 : 40;
      const moves = {
        ArrowLeft: [step, 0], ArrowRight: [-step, 0],
        ArrowUp: [0, step], ArrowDown: [0, -step],
      };
      if (e.key in moves) {
        e.preventDefault(); markTouched();
        view.x += moves[e.key][0]; view.y += moves[e.key][1]; apply();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault(); markTouched(); zoomCentre(1.25);
      } else if (e.key === '-') {
        e.preventDefault(); markTouched(); zoomCentre(.8);
      } else if (e.key === '0') {
        e.preventDefault(); fit();
      }
    });

    root.querySelector('.board__zoom').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      markTouched();
      const act = btn.dataset.act;
      if (act === 'fit') fit();
      else if (act === 'in') zoomCentre(1.25);
      else if (act === 'out') zoomCentre(.8);
      else if (act === 'reset') { view.scale = 1; apply(); }
    });

    /* Refit while the reader has not taken over — the split changes
       proportion on resize and on the sidebar collapsing. */
    if ('ResizeObserver' in window) {
      let t;
      new ResizeObserver(() => {
        clearTimeout(t);
        t = setTimeout(() => { if (!touched) fit(); }, 120);
      }).observe(vp);
    }

    fit();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (!touched) fit(); });
    }

    return { fit, zoomCentre };
  }

  return { mount, NODES };
})();
