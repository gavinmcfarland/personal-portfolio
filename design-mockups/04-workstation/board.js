/* ══════════════════════════════════════════════════════════════════
   WORKSTATION — the board
   One node list, one renderer, used twice: inert and scaled for the
   figure on project.html, live and pannable on project-canvas.html.
   The figure is not a picture of the board; it IS the board, drawn
   smaller, so the two cannot fall out of step.

   Every node is a window — same bevel, same navy caption, same
   square corners as the page chrome. Nothing on the board uses a
   shape the desktop does not already have.

   Coordinates and widths are multiples of 20. The code node is
   ILLUSTRATIVE: the documented Figma API showing the sandbox/iframe
   split, not a verbatim file from the project.
   ══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const NODES = [
    { id:'intro', type:'doc', x:0, y:0, z:10, title:'Brief',
      html:'<p>A zero-config toolchain for Figma plugins. Scaffold it, develop it with real hot reloading, ship it — without hand-assembling a bundler, a manifest and a message bridge first.</p>',
      chips:['Node','TypeScript','Vite'] },

    { id:'callout', type:'callout', x:520, y:-40, z:11, text:'What it does' },

    { id:'n1', type:'note', x:520, y:0,   z:12, title:'01', text:'Zero config' },
    { id:'n2', type:'note', x:720, y:0,   z:13, title:'02', text:'Real HMR,\nstate kept' },
    { id:'n3', type:'note', x:520, y:180, z:14, title:'03', text:'React\nSvelte\nVue' },
    { id:'n4', type:'note', x:720, y:180, z:15, title:'04', text:'One command\nto ship' },

    { id:'code', type:'code', x:0, y:280, z:16, title:'main.ts — Notepad', text:
      '<span class="cm">// sandbox half — document, no DOM</span>\n' +
      '<span class="kw">figma</span>.ui.onmessage = (msg) => {\n' +
      '  <span class="kw">if</span> (msg.type === <span class="cm">\'resize\'</span>) {\n' +
      '    <span class="kw">figma</span>.ui.resize(msg.w, msg.h)\n' +
      '  }\n' +
      '}' },

    { id:'link', type:'link', x:960, y:0, z:17, title:'Shortcut',
      url:'https://www.plugma.dev/', name:'Plugma — Getting Started',
      desc:'Scaffold a plugin and run it with hot reloading, in one command.', host:'plugma.dev' },

    { id:'how', type:'doc', x:960, y:260, z:18, title:'How it works',
      html:'<p>The UI is served from a dev server while you work and inlined at build time, so the sandbox half never notices the difference.</p><p>Messages are typed across the bridge with <code>onmessage</code>.</p>' },

    { id:'why', type:'doc', x:520, y:400, z:19, title:'The point',
      html:'<p>Interface work stops being a stop-start loop. That is the whole return on the tool.</p>' },
  ];

  const SHAPES = [{ id:'a1', x1:340, y1:60, x2:500, y2:20, width:3, z:6 }];

  const FIGURE_IDS = ['intro','callout','n1','n2','n3','n4','link'];

  function renderNode(n) {
    const el = document.createElement('div');
    el.className = 'node';
    el.style.transform = `translate(${n.x}px,${n.y}px)`;
    el.style.zIndex = n.z;

    const title = (t) => `<div class="nwin__title"><span>${esc(t)}</span><span class="x">✕</span></div>`;

    if (n.type === 'doc') {
      el.innerHTML = `<div class="nwin n-doc">${title(n.title)}
        <div class="nwin__body field-bg">${n.html}${
          n.chips ? `<div class="chips">${n.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>` : ''
        }</div></div>`;
    } else if (n.type === 'note') {
      el.innerHTML = `<div class="nwin n-note">${title(n.title)}
        <div class="nwin__body">${esc(n.text)}</div></div>`;
    } else if (n.type === 'callout') {
      el.innerHTML = `<div class="n-callout">${esc(n.text)}</div>`;
    } else if (n.type === 'code') {
      el.innerHTML = `<div class="nwin n-code">${title(n.title)}
        <div class="nwin__body field-bg" style="padding:0"><pre>${n.text}</pre></div></div>`;
    } else if (n.type === 'link') {
      el.innerHTML = `
        <a class="nwin n-link" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">
          ${title(n.title)}
          <div class="nwin__body field-bg">
            <div class="n-link__thumb">Preview not available</div>
            <span class="n-link__title" style="margin-top:6px">${esc(n.name)}</span>
            <span class="n-link__desc">${esc(n.desc)}</span>
            <span class="n-link__host">${esc(n.host)}</span>
          </div>
        </a>`;
    }
    return el;
  }

  /* Connectors read a live token, so they follow the theme with
     everything else rather than being pinned to a hex. */
  const stroke = () => getComputedStyle(document.documentElement).getPropertyValue('--c-yellow').trim() || '#FFFF00';

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
             stroke="currentColor" stroke-width="${s.width}" marker-end="url(#${mid})"/>`;
    svg.style.color = stroke();
    return svg;
  }

  function paint(root) {
    const c = stroke();
    root.querySelectorAll('.shape-svg').forEach((s) => { s.style.color = c; });
  }

  window.drawFigure = function drawFigure(el, scale, offset) {
    NODES.filter((n) => FIGURE_IDS.includes(n.id)).forEach((n) => el.appendChild(renderNode(n)));
    el.style.transform = `translate(${offset}px,${offset}px) scale(${scale})`;
  };

  window.drawBoard = function drawBoard(opts) {
    const GRID = 20, MIN = 0.08, MAX = 8, LEGIBLE = 0.35;
    const vp = document.getElementById(opts.viewport);
    const world = document.getElementById(opts.world);
    const zoomUi = document.getElementById(opts.zoom);
    const zoomval = zoomUi && zoomUi.querySelector('.zoomval');
    const status = opts.status && document.getElementById(opts.status);

    const view = { x:0, y:0, scale:1 };
    let touched = false;

    function apply() {
      world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.scale})`;
      const step = Math.max(2, 4 * view.scale);
      vp.style.backgroundSize = `${step}px ${step}px`;
      vp.style.backgroundPosition = `${view.x % step}px ${view.y % step}px, ${view.x % step + step / 2}px ${view.y % step + step / 2}px`;
      const pct = Math.round(view.scale * 100) + '%';
      if (zoomval) zoomval.textContent = pct;
      if (status) status.textContent = 'Zoom: ' + pct;
    }

    const frag = document.createDocumentFragment();
    SHAPES.forEach((s) => frag.appendChild(renderShape(s)));
    NODES.forEach((n) => frag.appendChild(renderNode(n)));
    world.appendChild(frag);

    /* Counted, not typed. A hardcoded object count in the status bar
       is one edit away from being a lie about the board beside it. */
    const count = opts.count && document.getElementById(opts.count);
    if (count) count.textContent = `${NODES.length} object(s) on board`;

    new MutationObserver(() => paint(world))
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
      pad = pad == null ? Math.min(64, r.width * 0.06) : pad;
      const s = Math.min((r.width - pad * 2) / b.w, (r.height - pad * 2) / b.h);

      if (s < LEGIBLE) {
        /* On a phone the whole board fits around 20%, which is a
           smear rather than content. Frame the opening window at a
           legible size and let the reader pan out. */
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
    const zoomCentre = (f) => {
      const r = vp.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, f);
    };

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
       so that pans; a pinch arrives with ctrlKey, so that zooms. */
    vp.addEventListener('wheel', (e) => {
      e.preventDefault(); touched = true;
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, Math.exp(-clamp(e.deltaY, -24, 24) * 0.015));
      else { view.x -= e.deltaX; view.y -= e.deltaY; apply(); }
    }, { passive:false });

    vp.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 120 : 40;
      const moves = { ArrowLeft:[step,0], ArrowRight:[-step,0], ArrowUp:[0,step], ArrowDown:[0,-step] };
      if (e.key in moves) {
        e.preventDefault(); touched = true;
        view.x += moves[e.key][0]; view.y += moves[e.key][1]; apply();
      } else if (e.key === '+' || e.key === '=') { e.preventDefault(); touched = true; zoomCentre(1.25); }
      else if (e.key === '-') { e.preventDefault(); touched = true; zoomCentre(0.8); }
      else if (e.key === '0') { e.preventDefault(); fit(); }
    });

    if (zoomUi) zoomUi.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      touched = true;
      const a = btn.dataset.act;
      if (a === 'fit') fit();
      else if (a === 'in') zoomCentre(1.25);
      else if (a === 'out') zoomCentre(0.8);
      else if (a === 'reset') { view.scale = 1; apply(); }
    });

    if ('ResizeObserver' in window) {
      let t;
      new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (!touched) fit(); }, 120); }).observe(vp);
    }

    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!touched) fit(); });
  };
})();
