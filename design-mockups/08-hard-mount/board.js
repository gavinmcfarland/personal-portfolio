/* ══════════════════════════════════════════════════════════════════
   08 · HARD MOUNT — the board
   The page is a ruled sheet; the board is SQUARED PAPER — 20px minor,
   100px major, both scaling with zoom.

   Three things follow the variation's rules rather than the engine's
   convenience:

   1. Every node coordinate and every node width is a multiple of 20,
      so nodes land on the squared paper instead of near it.
   2. Connectors are ORTHOGONAL. Rule 1 ("no curves") applies to lines
      as much as to boxes, so these are right angles — H, V, H — where
      07 drew bezier curves.
   3. Nothing is drawn with a colour literal. Fills and strokes are
      the same custom properties the page uses, so the board follows
      the theme with no redraw and no second palette to keep in sync.

   Gestures differ by mode. `boxed` sits inside a scrolling page, so a
   plain wheel must scroll the page through it and only a pinch zooms.
   `full` owns the viewport and takes everything.
   ══════════════════════════════════════════════════════════════════ */

window.Board = (() => {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* The code node is illustrative — the documented Figma plugin API
     showing the sandbox / iframe split, not a verbatim project file. */
  const NODES = [
    { id: 'title', type: 'title', x: 0, y: -80, z: 20, text: 'Plugma' },

    { id: 'intro', type: 'doc', x: 0, y: 0, z: 21, bar: ['Sheet 01', 'Overview'],
      html: '<h3>Two programs, one plugin</h3>'
          + '<p>A Figma plugin is two programs that cannot see each other — one in a sandbox '
          + 'holding the document, one in an iframe holding the DOM. They speak only by '
          + 'passing messages.</p>'
          + '<p>So every plugin began with the same lost day: a bundler, a manifest, a '
          + 'message bridge, and a build step that inlines the UI.</p>' },

    { id: 'b1', type: 'block', x: 400, y: -60, z: 22, fill: 'a', num: '01', text: 'Zero\nconfig' },
    { id: 'b2', type: 'block', x: 600, y: -60, z: 23, fill: 'b', num: '02', text: 'Real HMR\nstate kept' },
    { id: 'b3', type: 'block', x: 400, y: 100, z: 24, fill: 'c', num: '03', text: 'React\nSvelte\nVue' },
    { id: 'b4', type: 'block', x: 600, y: 100, z: 25, fill: 'd', num: '04', text: 'One command\nto ship' },

    { id: 'plate', type: 'plate', x: 400, y: 280, z: 26,
      art: 'arcs', glyph: 'P', bar: ['Fig. 01', 'Dev server'] },

    { id: 'code', type: 'code', x: 0, y: 300, z: 27, bar: ['Listing 01', 'main.ts'],
      code: '<span class="cm">// sandbox half — document access, no DOM</span>\n'
          + '<span class="kw">figma</span>.ui.onmessage = (msg) => {\n'
          + '  <span class="kw">if</span> (msg.type === <span class="cm">\'resize\'</span>) {\n'
          + '    <span class="kw">figma</span>.ui.resize(msg.w, msg.h)\n'
          + '  }\n'
          + '}' },

    { id: 'how', type: 'doc', x: 880, y: 100, z: 28, bar: ['Sheet 02', 'Mechanism'],
      html: '<h3>How it works</h3>'
          + '<p>The UI is served from a dev server while you develop and inlined at build '
          + 'time, so the sandbox half never notices the difference.</p>'
          + '<p>Messages are typed across the bridge with <code>onmessage</code>.</p>' },

    { id: 'link', type: 'link', x: 880, y: -80, z: 29,
      url: 'https://www.plugma.dev/', host: 'plugma.dev', art: 'bars',
      bar: ['Ref. 01', 'External'],
      title: 'Plugma — Getting started',
      desc: 'Scaffold a plugin and run it with hot reloading, in one command.' },

    { id: 'why', type: 'doc', x: 400, y: 500, z: 30, bar: ['Sheet 03', 'Result'],
      html: '<h3>Why it matters</h3>'
          + '<p>Interface work stops being a stop-start loop. That is the whole return on '
          + 'the tool — and the substrate for every plugin I built after it.</p>' },
  ];

  const LINKS = [
    { id: 'l1', x1: 320, y1: 40,  x2: 400, y2: 0   },
    { id: 'l2', x1: 320, y1: 160, x2: 400, y2: 320 },
    { id: 'l3', x1: 820, y1: 20,  x2: 880, y2: 60  },
  ];

  /* ── Rendering ─────────────────────────────────────────────────── */

  const bar = (b) => b
    ? `<div class="nd__bar"><span>${esc(b[0])}</span><span>${esc(b[1])}</span></div>`
    : '';

  function nodeEl(n) {
    const el = document.createElement('div');
    el.className = 'board__node';
    el.style.transform = `translate(${n.x}px,${n.y}px)`;
    el.style.zIndex = n.z;

    if (n.type === 'title') {
      el.innerHTML = `<div class="nd-title">${esc(n.text)}</div>`;

    } else if (n.type === 'doc') {
      el.innerHTML = `<div class="nd nd-doc">${bar(n.bar)}<div class="nd__body">${n.html}</div></div>`;

    } else if (n.type === 'block') {
      el.innerHTML = `<div class="nd-block" data-fill="${esc(n.fill)}">
        <span class="nd-block__num">${esc(n.num)}</span>
        <span class="nd-block__t">${esc(n.text)}</span>
      </div>`;

    } else if (n.type === 'code') {
      el.innerHTML = `<div class="nd nd-code">${bar(n.bar)}<pre>${n.code}</pre></div>`;

    } else if (n.type === 'plate') {
      el.innerHTML = `<div class="nd nd-plate">
        <div class="nd__body">
          <div class="plate plate--wide">
            <div class="plate__art" data-art="${esc(n.art)}"></div>
            <span class="plate__glyph" aria-hidden="true">${esc(n.glyph)}</span>
          </div>
        </div>
        <div class="nd__bar" style="border-bottom:0;border-top:1px solid var(--rule)">
          <span>${esc(n.bar[0])}</span><span>${esc(n.bar[1])}</span>
        </div>
      </div>`;

    } else if (n.type === 'link') {
      el.innerHTML = `<a class="nd nd-link" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">
        ${bar(n.bar)}
        <div class="plate plate--wide" style="border-width:0 0 1px">
          <div class="plate__art" data-art="${esc(n.art)}"></div>
        </div>
        <div class="nd__body">
          <span class="nd-link__t">${esc(n.title)}</span>
          <span class="nd-link__d">${esc(n.desc)}</span>
          <span class="nd-link__h">${esc(n.host)} ↗</span>
        </div>
      </a>`;
    }
    return el;
  }

  /* Orthogonal connector — H to the midpoint, V, then H in. Stroked
     with the ink token so it re-colours with the theme. */
  function linkEl(l) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'board__svg');
    svg.style.zIndex = 5;
    const mid = 'bm-' + l.id;
    const mx = Math.round((l.x1 + l.x2) / 2 / 20) * 20;
    svg.innerHTML = `
      <defs>
        <marker id="${mid}" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--ink)"/>
        </marker>
      </defs>
      <path d="M${l.x1} ${l.y1} H${mx} V${l.y2} H${l.x2}"
            fill="none" stroke="var(--ink)" stroke-width="1"
            marker-end="url(#${mid})"/>`;
    return svg;
  }

  /* ── Engine ────────────────────────────────────────────────────── */

  function mount(root, opts = {}) {
    const mode = opts.mode || 'boxed';
    const MINOR = 20, MAJOR = 100, MIN = .1, MAX = 6;
    const LEGIBLE = .34;

    root.dataset.mode = mode;
    root.innerHTML = `
      <div class="board__vp" tabindex="0" role="group"
           aria-label="Project board. Drag to pan${mode === 'full' ? ', scroll to zoom' : ', pinch to zoom'}. Arrow keys pan, plus and minus zoom, zero fits.">
        <div class="board__world"></div>
      </div>
      <div class="board__ui board__zoom">
        <button type="button" data-act="fit" title="Fit to view" aria-label="Fit board to view">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square">
            <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>
          </svg>
        </button>
        <button type="button" data-act="out" aria-label="Zoom out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M5 12h14"/></svg>
        </button>
        <button type="button" id="board-zoomval" data-act="reset" aria-label="Reset zoom to 100 percent">100%</button>
        <button type="button" data-act="in" aria-label="Zoom in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <div class="board__ui board__hint" aria-hidden="true">Drag to pan · ${mode === 'full' ? 'scroll' : 'pinch'} to zoom</div>`;

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

    /* Squared paper. Two rule sets, minor and major, both drawn as
       1px lines and both scaling with the view. */
    function apply() {
      world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.scale})`;

      const mn = MINOR * view.scale, mj = MAJOR * view.scale;
      const ox = view.x, oy = view.y;
      vp.style.backgroundImage =
        'linear-gradient(var(--grid-major) 1px, transparent 1px),' +
        'linear-gradient(90deg, var(--grid-major) 1px, transparent 1px),' +
        'linear-gradient(var(--grid-minor) 1px, transparent 1px),' +
        'linear-gradient(90deg, var(--grid-minor) 1px, transparent 1px)';
      vp.style.backgroundSize = `${mj}px ${mj}px, ${mj}px ${mj}px, ${mn}px ${mn}px, ${mn}px ${mn}px`;
      vp.style.backgroundPosition =
        `${ox % mj}px ${oy % mj}px, ${ox % mj}px ${oy % mj}px, ${ox % mn}px ${oy % mn}px, ${ox % mn}px ${oy % mn}px`;

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
      const pad = Math.min(48, r.width * .05);
      const s = Math.min((r.width - pad * 2) / b.w, (r.height - pad * 2) / b.h);

      if (s < LEGIBLE) {
        /* On a phone the whole board fits at ~18%, which is a smear.
           Frame the opening node at a readable size instead. */
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

    /* ── Pan ─────────────────────────────────────────────────────
       Boxed mode ignores touch drags so the page can still be
       scrolled with a finger over the board; mouse and pen pan. */
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

    /* A browser reports a trackpad pinch as a wheel event with ctrlKey
       set. In boxed mode that is the only thing taken — everything
       else falls through and scrolls the page. */
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
      const step = e.shiftKey ? 100 : 20;
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
