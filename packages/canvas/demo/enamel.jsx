import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '../src/index.js';
import '../src/styles.css'; // the canvas's own default stylesheet (core + theme)
import './enamel.css'; // the bespoke Enamel skin — pure CSS over the styling contract

/* A rebuild of design-mockups/12-enamel/board.html using @gavinmcfarland/canvas.
   The layout/content mirror that board's `DATA.board.notes`; the ENTIRE look is
   achieved from enamel.css alone (tokens + data-cv-part + data-type hooks) with
   no change to the package. Enamel tones map onto the canvas note-colour slots,
   which enamel.css re-points via --cv-note-* tokens:
     lime→green · blue→blue · teal→purple · vermilion→orange · ink→pink        */
const nodes = [
  { id: 'brief', type: 'md', x: 0, y: 0, w: 300, z: 1,
    text: '# Brief\n\nA zero-config toolchain for Figma plugins. Scaffold it, develop it with real hot reloading, ship it — without hand-assembling a bundler, a manifest and a message bridge first.' },

  { id: 'n1', type: 'sticky', x: 380, y: -40, w: 176, z: 2, color: 'green', text: '01\nZero\nconfig' },
  { id: 'n2', type: 'sticky', x: 596, y: -40, w: 176, z: 3, color: 'blue', text: '02\nReal HMR,\nstate kept' },
  { id: 'n3', type: 'sticky', x: 380, y: 140, w: 176, z: 4, color: 'purple', text: '03\nReact\nSvelte\nVue' },
  { id: 'n4', type: 'sticky', x: 596, y: 140, w: 176, z: 5, color: 'orange', text: '04\nOne command\nto ship' },

  { id: 'code', type: 'code', x: 0, y: 320, w: 340, z: 6, lang: 'ts',
    text: "// sandbox half — document access, no DOM\nfigma.ui.onmessage = (msg) => {\n  if (msg.type === 'resize') {\n    figma.ui.resize(msg.w, msg.h)\n  }\n}" },

  { id: 'how', type: 'md', x: 852, y: -40, w: 300, z: 7,
    text: '# How it works\n\nThe UI is served from a dev server while you work and inlined at build time, so the sandbox half never notices the difference. Messages are typed across the bridge.' },
  { id: 'point', type: 'md', x: 852, y: 220, w: 300, z: 8,
    text: '# The point\n\nInterface work stops being a stop-start loop. That is the whole return on the tool.' },

  { id: 'n5', type: 'sticky', x: 380, y: 340, w: 392, z: 9, color: 'pink', text: '05\nShip the loop,\nnot the config' },
];

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Canvas
      fit="fullscreen"
      initialView="fit"
      editable
      storageKey="enamel-demo"
      accent={{ light: '#c8341a', dark: '#ff6a4d' }}
      classNames={{ root: 'enamel' }}
      base={{ nodes, shapes: [] }}
    />
  </StrictMode>,
);
