import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Canvas } from '@gavinmcfarland/canvas';
import { buildBase } from './ProjectCanvas';
import { publishedBoard } from '../data/canvasBoards';
import { ACCENT } from '../theme';

/* Wraps a project row and, while it is hovered, floats a small tilted card
   next to the cursor containing an inert miniature of the project's actual
   canvas. The real <Canvas> renders read-only at twice the card's size and is
   scaled to 0.5, so the thumbnail is faithful to the board the row leads to —
   including any edits saved from the project page (read from the same
   localStorage key the page persists to).

   The card is portalled to <body> because the reveal-on-scroll sections keep a
   transform, which would otherwise re-anchor position:fixed to the section. */

const readSaved = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

/* Deterministic per-project tilt (±1.5°–3.4°) so every thumbnail sits at its
   own slight angle without re-rolling on each hover. */
const tiltFor = (id) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const mag = 1.5 + (h % 20) / 10;
  return h % 2 ? mag : -mag;
};

const OFFSET = 18; // gap between cursor and card
const MARGIN = 12; // minimum gap to the viewport edges

export default function ProjectCanvasPreview({ project, children }) {
  // Non-null = open; holds the card's viewport position at the moment it opened.
  const [pos, setPos] = useState(null);
  const timer = useRef(null);
  const popRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });

  /* The Projects list stays mounted for the app's life; navigating to a project
     just overlays it (see App.jsx). So a hidden row can still be hovered or —
     most visibly — refocused when the browser restores focus to the last-clicked
     row's link on window regain, which would pop a thumbnail over the open
     project page. The preview only ever makes sense on the home route, so gate
     everything on it. */
  const onHome = useLocation().pathname === '/';

  const clamp = (x, y) => {
    const w = popRef.current?.offsetWidth ?? 418;
    const h = popRef.current?.offsetHeight ?? 258;
    return {
      x: Math.min(x + OFFSET, window.innerWidth - w - MARGIN),
      y: Math.min(y + OFFSET, window.innerHeight - h - MARGIN),
    };
  };

  // A pending 150ms timer could fire after a fast row-click navigates away;
  // read the live route here (not the value captured at schedule time) so it
  // becomes a no-op off home.
  const homeRef = useRef(onHome);
  useEffect(() => { homeRef.current = onHome; }, [onHome]);

  // Small enter delay so skimming the list doesn't flash thumbnails.
  const show = () => {
    if (!onHome) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (homeRef.current) setPos(clamp(mouse.current.x, mouse.current.y));
    }, 150);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setPos(null);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  // Leaving home (into a project overlay) must dismiss any open preview — its
  // row is now hidden behind the overlay and should never resurface there.
  // Reset during render (React's setState-during-render pattern) so no thumbnail
  // lingers a frame on the way out.
  const [prevHome, setPrevHome] = useState(onHome);
  if (prevHome !== onHome) {
    setPrevHome(onHome);
    if (!onHome && pos) setPos(null);
  }

  const onMouseEnter = (e) => {
    mouse.current = { x: e.clientX, y: e.clientY };
    show();
  };

  // Track the cursor with direct style writes — no re-render (and no canvas
  // re-render) per mousemove.
  const onMouseMove = (e) => {
    mouse.current = { x: e.clientX, y: e.clientY };
    const el = popRef.current;
    if (!el) return;
    const p = clamp(e.clientX, e.clientY);
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
  };

  // Keyboard focus has no cursor — anchor the card to the row instead. (show()
  // gates on onHome, so a link refocused while hidden behind a project overlay
  // never pops a thumbnail.)
  const onFocus = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mouse.current = { x: r.left + r.width / 2, y: r.bottom };
    show();
  };

  return (
    <div onMouseEnter={onMouseEnter} onMouseMove={onMouseMove} onMouseLeave={hide} onFocus={onFocus} onBlur={hide}>
      {children}
      {pos && onHome &&
        createPortal(
          <div
            ref={popRef}
            aria-hidden="true"
            style={{ left: pos.x, top: pos.y }}
            className="canvas-preview pointer-events-none fixed z-50 hidden [@media(hover:hover)]:block"
          >
            <div
              style={{ transform: `rotate(${tiltFor(project.id)}deg)` }}
              className="overflow-hidden rounded-xl border border-line bg-base shadow-xl"
            >
              <div className="h-64 w-104">
                <div className="h-128 w-208 origin-top-left scale-50">
                  {/* storageKey must match the project page's board: media
                      dropped there lives in IndexedDB under a DB derived from
                      it, and the miniature resolves those refs the same way.
                      Read-only canvases never write to the key. */}
                  {/* Unsaved local edits win, then the committed snapshot —
                      the same precedence the editable project page applies. */}
                  {/* initialView="fit" frames the whole board in the card
                      instead of restoring the saved pan/zoom crop. */}
                  <Canvas
                    key={project.id}
                    fit="contain"
                    classNames={{ root: "enamel" }}
                    accent={ACCENT}
                    ui={false}
                    initialView="fit"
                    base={buildBase(project)}
                    storageKey={`project-canvas-${project.id}`}
                    initialState={
                      readSaved(`project-canvas-${project.id}`) ||
                      publishedBoard(`project-canvas-${project.id}`)
                    }
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
