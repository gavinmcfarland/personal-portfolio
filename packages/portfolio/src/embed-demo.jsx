/* eslint-disable react-refresh/only-export-components */
/* Dev-only demo: the canvas embedded inside a normal, scrolling web page —
   the `fit="contain"` use case. Not part of the portfolio build; served at
   /embed-demo.html during `pnpm dev`. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@gavinmcfarland/canvas';
import '@gavinmcfarland/canvas/styles.css';
import { buildInitialState } from './data/canvasLayout';
import Card from './cards/Card';

const base = buildInitialState();

const page = {
  maxWidth: 820,
  margin: '0 auto',
  padding: '48px 24px 120px',
  fontFamily: "'Inter', system-ui, sans-serif",
  color: '#1a1a1e',
  lineHeight: 1.6,
};

function Demo() {
  return (
    <div style={page}>
      <h1 style={{ fontSize: 34, letterSpacing: '-0.02em' }}>A canvas, embedded in a page section</h1>
      <p style={{ color: '#55555c' }}>
        Everything above and below the framed box is ordinary page content. The
        canvas below is a single <code>&lt;Canvas fit="contain" /&gt;</code>{' '}
        component filling a fixed-height section. Scroll the page — the wheel only
        zooms the board while the pointer is over it; elsewhere the page scrolls
        normally.
      </p>

      <div
        style={{
          height: 460,
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,.12)',
          boxShadow: '0 10px 40px rgba(0,0,0,.08)',
          margin: '28px 0',
        }}
      >
        <Canvas base={base} managedTypes={['card']} nodeTypes={{ card: Card }} editable />
      </div>

      <h2 style={{ fontSize: 22 }}>More page content</h2>
      <p style={{ color: '#55555c' }}>
        The section has its own bounds; the board measures that container (not the
        window) for fit and zoom. Drop a second <code>&lt;Canvas /&gt;</code> on the
        same page and the two stay fully independent — scoped classes, no shared
        globals.
      </p>
      <div style={{ height: 600 }} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Demo />
  </StrictMode>
);
