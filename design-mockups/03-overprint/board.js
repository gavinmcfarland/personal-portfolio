/* ══════════════════════════════════════════════════════════════════
   OVERPRINT — the board
   One node list and one renderer, used twice: inert and scaled for
   the figure on piece.html, live and pannable on piece-canvas.html.
   The figure is not a picture of the board — it IS the board, drawn
   smaller — so the two cannot fall out of step.

   Every coordinate and width is a multiple of 20. The code node is
   ILLUSTRATIVE: the documented Figma API showing the sandbox/iframe
   split, not a verbatim file from the project.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const NODES = [
    { id:'intro', type:'doc', x:0, y:0, z:10, head:'brief', headInk:'a',
      html:'<p>A zero-config toolchain for Figma plugins. Scaffold it, develop it with real hot reloading, ship it — without hand-assembling a bundler, a manifest and a message bridge first.</p>',
      chips:['node','typescript','vite'] },

    { id:'features', type:'callout', x:520, y:-40, z:11, text:'what it does', size:18 },

    /* Four flat notes. The first two are ink A, the second two ink B,
       and the small square between them is the overlap — the two
       inks multiplied, which is the system in one object. */
    { id:'n1', type:'ink', x:520, y:20,  z:12, ink:'a', idx:'01', text:'Zero\nconfig' },
    { id:'n2', type:'ink', x:740, y:20,  z:13, ink:'b', idx:'02', text:'Real HMR,\nstate kept' },
    { id:'n3', type:'ink', x:520, y:240, z:14, ink:'b', idx:'03', text:'React\nSvelte\nVue' },
    { id:'n4', type:'ink', x:740, y:240, z:15, ink:'a', idx:'04', text:'One command\nto ship' },
    { id:'lap', type:'ink', x:700, y:200, z:16, ink:'over', idx:'', text:'', w:80, h:80, blend:true },

    { id:'code', type:'code', x:0, y:320, z:17, head:'main.ts', text:
      '<span class="cm">// sandbox half — document, no DOM</span>\n' +
      '<span class="kw">figma</span>.ui.onmessage = (msg) => {\n' +
      '  <span class="kw">if</span> (msg.type === <span class="cm">\'resize\'</span>) {\n' +
      '    <span class="kw">figma</span>.ui.resize(msg.w, msg.h)\n' +
      '  }\n' +
      '}' },

    { id:'link', type:'link', x:1000, y:0, z:18, head:'link',
      url:'https://www.plugma.dev/', title:'Plugma — getting started',
      desc:'Scaffold a plugin and run it with hot reloading, in one command.', host:'plugma.dev' },

    { id:'how', type:'doc', x:1000, y:300, z:19, head:'how it works', headInk:'b',
      html:'<p>The UI is served from a dev server while you work and inlined at build time, so the sandbox half never notices the difference.</p><p>Messages are typed across the bridge with <code>onmessage</code>.</p>' },

    { id:'why', type:'doc', x:520, y:480, z:20, head:'the point', headInk:'b',
      html:'<p>Interface work stops being a stop-start loop. That is the whole return on the tool.</p>' },
  ];

  const SHAPES = [
    { id:'a1', x1:360, y1:60, x2:500, y2:20, width:3, z:6 },
  ];

  /* Which nodes the small figure shows — the opening argument only. */
  const FIGURE_IDS = ['intro','features','n1','n2','n3','n4','lap','link'];

  function renderNode(n) {
    const el = document.createElement('div');
    el.className = 'node';
    el.style.transform = `translate(${n.x}px,${n.y}px)`;
    el.style.zIndex = n.z;

    if (n.type === 'doc') {
      el.innerHTML = `<div class="panel n-doc">
        <div class="panel__head${n.headInk === 'b' ? ' panel__head--b' : ''}"><span>${esc(n.head)}</span></div>
        <div class="panel__body">${n.html}${
          n.chips ? `<div class="chips">${n.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>` : ''
        }</div></div>`;
    } else if (n.type === 'ink') {
      const size = n.w ? `width:${n.w}px;min-height:${n.h}px;` : '';
      el.innerHTML = `<div class="n-ink${n.blend ? ' overprint' : ''}" data-ink="${esc(n.ink)}" style="${size}">${
        n.idx ? `<span class="n-ink__idx">${esc(n.idx)}</span>` : ''
      }${esc(n.text)}</div>`;
    } else if (n.type === 'callout') {
      el.innerHTML = `<div class="n-callout" style="font-size:${n.size}px">${esc(n.text)}</div>`;
    } else if (n.type === 'code') {
      el.innerHTML = `<div class="panel n-code">
        <div class="panel__head"><span>${esc(n.head)}</span></div>
        <pre>${n.text}</pre></div>`;
    } else if (n.type === 'link') {
      el.innerHTML = `
        <a class="panel n-link" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">
          <div class="panel__head"><span>${esc(n.head)}</span><span>↗</span></div>
          <div class="n-link__thumb">preview</div>
          <div class="panel__body">
            <span class="n-link__title">${esc(n.title)}</span>
            <span class="n-link__desc">${esc(n.desc)}</span>
            <span class="n-link__host">${esc(n.host)}</span>
          </div>
        </a>`;
    }
    return el;
  }

  /* Connectors read the ink token live, so they follow the theme with
     everything else rather than being pinned to a hex. */
  const inkB = () => getComputedStyle(document.documentElement).getPropertyValue('--b').trim();

  function renderShape(s) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'shape-svg');
    svg.style.zIndex = s.z;
    const mid = 'ah-' + s.id;
    svg.innerHTML =
      `<defs><marker id="${mid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
         <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
       </marker></defs>
       <line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}"
             stroke="currentColor" stroke-width="${s.width}"
             marker-end="url(#${mid})"/>`;
    svg.style.color = inkB();
    return svg;
  }

  function paintShapes(root) {
    const c = inkB();
    root.querySelectorAll('.shape-svg').forEach((s) => { s.style.color = c; });
  }

  /* ── The inert figure ───────────────────────────────────────── */
  window.drawFigure = function drawFigure(el, scale, offset) {
    const nodes = NODES.filter((n) => FIGURE_IDS.includes(n.id));
    el.style.transform = `translate(${offset}px,${offset}px) scale(${scale})`;
    nodes.forEach((n) => el.appendChild(renderNode(n)));
    new MutationObserver(() => paintShapes(el))
      .observe(document.documentElement, { attributes:true, attributeFilter:['class'] });
  };

  /* ── The live board ─────────────────────────────────────────── */
  window.drawBoard = function drawBoard(opts) {
    const GRID = 20, MIN = 0.08, MAX = 8, LEGIBLE = 0.35;
    const vp = document.getElementById(opts.viewport);
    const world = document.getElementById(opts.world);
    const zoomUi = document.getElementById(opts.zoom);
    const zoomval = zoomUi && zoomUi.querySelector('.zoomval');

    const view = { x:0, y:0, scale:1 };
    let touched = false;

    function apply() {
      world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.scale})`;
      const step = Math.max(2, 5 * view.scale);          /* the halftone screen scales with the plate */
      vp.style.backgroundSize = `${step}px ${step}px`;
      vp.style.backgroundPosition = `${view.x % step}px ${view.y % step}px`;
      if (zoomval) zoomval.textContent = Math.round(view.scale * 100) + '%';
    }

    const frag = document.createDocumentFragment();
    SHAPES.forEach((s) => frag.appendChild(renderShape(s)));
    NODES.forEach((n) => frag.appendChild(renderNode(n)));
    world.appendChild(frag);

    new MutationObserver(() => paintShapes(world))
      .observe(document.documentElement, { attributes:true, attributeFilter:['class'] });

    function bounds() {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      NODES.forEach((n, i) => {
        const el = world.children[SHAPES.length + i];
        x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y);
        x1 = Math.max(x1, n.x + el.offsetWidth); y1 = Math.max(y1, n.y + el.offsetHeight);
      });
      return { x:x0, y:y0, w:x1 - x0, h:y1 - y0 };
    }

    function fit(pad) {
      const b = bounds();
      const r = vp.getBoundingClientRect();
      if (!b.w || !b.h || !r.width) return;
      pad = pad == null ? Math.min(72, r.width * 0.06) : pad;

      const s = Math.min((r.width - pad * 2) / b.w, (r.height - pad * 2) / b.h);

      if (s < LEGIBLE) {
        /* On a phone the whole board fits around 20%, which is a
           smear rather than content. Frame the opening panel at a
           legible size and let the reader pan out to the rest. */
        const first = world.children[SHAPES.length];
        const n = NODES[0];
        view.scale = clamp(Math.min((r.width - pad * 2) / first.offsetWidth, 1), MIN, MAX);
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

    let panning = false, lastX = 0, lastY = 0;

    vp.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a')) return;
      panning = true; touched = true;
      lastX = e.clientX; lastY = e.clientY;
      vp.setPointerCapture(e.pointerId);
    });
    vp.addEventListener('pointermove', (e) => {
      if (!panning) return;
      view.x += e.clientX - lastX; view.y += e.clientY - lastY;
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

    /* A trackpad two-finger swipe arrives as a wheel without ctrlKey,
       so that pans; browsers report a pinch as ctrlKey, so that
       zooms. The behaviour every canvas tool has. */
    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      touched = true;
      if (e.ctrlKey || e.metaKey) {
        zoomAt(e.clientX, e.clientY, Math.exp(-clamp(e.deltaY, -24, 24) * 0.015));
      } else {
        view.x -= e.deltaX; view.y -= e.deltaY; apply();
      }
    }, { passive:false });

    vp.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 120 : 40;
      const moves = { ArrowLeft:[step,0], ArrowRight:[-step,0], ArrowUp:[0,step], ArrowDown:[0,-step] };
      if (e.key in moves) {
        e.preventDefault(); touched = true;
        view.x += moves[e.key][0]; view.y += moves[e.key][1]; apply();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault(); touched = true; zoomCentre(1.25);
      } else if (e.key === '-') {
        e.preventDefault(); touched = true; zoomCentre(0.8);
      } else if (e.key === '0') {
        e.preventDefault(); fit();
      }
    });

    if (zoomUi) {
      zoomUi.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        touched = true;
        const act = btn.dataset.act;
        if (act === 'fit') fit();
        else if (act === 'in') zoomCentre(1.25);
        else if (act === 'out') zoomCentre(0.8);
        else if (act === 'reset') { view.scale = 1; apply(); }
      });
    }

    if ('ResizeObserver' in window) {
      let t;
      new ResizeObserver(() => {
        clearTimeout(t);
        t = setTimeout(() => { if (!touched) fit(); }, 120);
      }).observe(vp);
    }

    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!touched) fit(); });
  };
})();
