import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@gavinmcfarland/canvas';
import { buildBase } from './ProjectCanvas';

/* Wraps a trigger (the "View on canvas" link) and, while it is hovered or
   focused, floats a small card above it containing an inert miniature of the
   project's actual canvas. The real <Canvas> renders read-only at twice the
   card's size and is scaled to 0.5, so the preview is a faithful thumbnail of
   the board the link leads to — including any edits saved from the project
   page (read from the same localStorage key the page persists to). */

const readSaved = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

export default function ProjectCanvasPreview({ project, children }) {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  // Small enter delay so skimming the list doesn't flash previews.
  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), 150);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && (
        <div
          aria-hidden="true"
          className="canvas-preview pointer-events-none absolute bottom-full left-0 z-50 mb-3 hidden overflow-hidden rounded-xl border border-line bg-base shadow-xl [@media(hover:hover)]:block"
        >
          <div className="h-64 w-[26rem]">
            <div className="h-[32rem] w-[52rem] origin-top-left scale-50">
              <Canvas
                key={project.id}
                fit="contain"
                base={buildBase(project)}
                initialState={readSaved(`project-canvas-${project.id}`)}
              />
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
