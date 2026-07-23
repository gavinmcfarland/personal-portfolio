/* ═════════════════════════════════════════════════════════════════
   14 · COLOURBAR — the board
   The same pan/zoom canvas as 09–13, identical in behaviour so the
   difference between the sets reads as one of register rather than
   of capability.

   The one change is what a note is made of. 13's notes were dither
   plates, which had to quieten their field before type could sit on
   them. Here a note is one flat patch from the sixteen with its type
   set in the paired ink — the pairing was decided in §1, so a note
   never has to weaken its own material to stay legible.

   The board owns the viewport beside the rail and takes every
   gesture: drag or wheel pans, ctrl/pinch-wheel zooms at the cursor,
   arrows pan, + / − zoom, 0 fits.
   ═════════════════════════════════════════════════════════════════ */

window.Board = (() => {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function nodeEl(n) {
    const el = document.createElement('div');
    el.className = 'board__node';
    el.style.transform = `translate(${n.x}px,${n.y}px)`;
    el.style.width = n.w + 'px';

    if (n.kind === 'note') {
      el.innerHTML = `<div class="note" data-c="${esc(n.ink)}">
        <span class="note__label">${esc(n.label)}</span>${esc(n.text)}</div>`;
    } else if (n.kind === 'code') {
      el.innerHTML = `<div class="nd-code">
        <div class="nd-code__bar">${esc(n.label)}</div><pre>${esc(n.text)}</pre></div>`;
    } else {
      el.innerHTML = `<div class="nd-doc">
        <span class="lbl">${esc(n.label)}</span>${esc(n.text)}</div>`;
    }
    return el;
  }
  window.boardNodeEl = nodeEl;

  function mount(root, notes) {
    const GRID = 24, MIN = .3, MAX = 2.5;

    root.innerHTML = `
      <div class="board__vp" tabindex="0" role="group"
           aria-label="Working board. Drag or scroll to pan, pinch to zoom. Arrow keys pan, plus and minus zoom, zero fits.">
        <div class="board__world"></div>
      </div>`;

    const vp = root.querySelector('.board__vp');
    const world = root.querySelector('.board__world');
    const readout = document.getElementById('board-zoomval');
    const view = { x: 0, y: 0, scale: 1 };

    function apply() {
      world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.scale})`;
      const step = GRID * view.scale;
      vp.style.setProperty('--g', `${step}px`);
      vp.style.setProperty('--gx', `${view.x % step}px`);
      vp.style.setProperty('--gy', `${view.y % step}px`);
      if (readout) readout.textContent = Math.round(view.scale * 100) + '%';
    }

    const els = notes.map(nodeEl);
    els.forEach((e) => world.appendChild(e));

    function bounds() {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      notes.forEach((n, i) => {
        x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y);
        x1 = Math.max(x1, n.x + els[i].offsetWidth);
        y1 = Math.max(y1, n.y + els[i].offsetHeight);
      });
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }

    function fit() {
      const b = bounds();
      const r = vp.getBoundingClientRect();
      if (!b.w || !b.h || !r.width) return;
      const pad = Math.min(72, r.width * .06);
      view.scale = clamp(Math.min((r.width - pad * 2) / b.w, (r.height - pad * 2) / b.h, 1), MIN, MAX);
      view.x = (r.width - b.w * view.scale) / 2 - b.x * view.scale;
      view.y = (r.height - b.h * view.scale) / 2 - b.y * view.scale;
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
      panning = true;
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

    /* A trackpad pinch arrives as a wheel event with ctrlKey set;
       that zooms. A plain wheel pans, which is what a canvas that
       owns its viewport owes the reader. */
    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
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
        e.preventDefault();
        view.x += moves[e.key][0]; view.y += moves[e.key][1]; apply();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault(); zoomCentre(1.25);
      } else if (e.key === '-') {
        e.preventDefault(); zoomCentre(.8);
      } else if (e.key === '0') {
        e.preventDefault(); fit();
      }
    });

    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    addEventListener('resize', fit);

    return { fit, zoomCentre };
  }

  /* The static figure printed inside project(1). Same nodes, same
     classes, no interaction — a picture of the canvas rather than a
     second implementation of it. */
  function figure(root, notes) {
    const world = root.querySelector('.boardfig__world');
    if (!world) return;
    notes.forEach((n) => world.appendChild(nodeEl(n)));
  }

  return { mount, figure };
})();
