import { Suspense, lazy, useEffect, useRef, useState } from "react";

/* The canvas, fetched when the reader is nearly looking at it.

   @gavinmcfarland/canvas is the largest thing the site imports — a canvas
   engine with its own nodes, toolbar, context menus and code formatter — and
   on Home it draws the Staging board, which sits several screens down. Loaded
   the ordinary way it is in the first bundle, so it is downloaded and parsed
   before React can mount anything, including the masthead at the very top.
   The board's own media follows it: the boards reference video, and mounting
   the canvas starts fetching it.

   So the import waits for an IntersectionObserver instead of the module
   graph. `rootMargin` is the lead time — start loading while the board is
   still that far below the fold, so a reader scrolling at a normal pace
   arrives to a canvas that is already there.

   The box does not move when it swaps: the height is set by the caller and
   this fills it, empty until the chunk lands, so nothing reflows. */

const Canvas = lazy(() =>
  import("@gavinmcfarland/canvas").then((m) => ({ default: m.Canvas })),
);

export default function DeferredCanvas({ rootMargin = "400px", ...props }) {
  const ref = useRef(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el) return;
    // No observer (old browser, a test environment): render it rather than
    // leaving a permanent hole.
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, rootMargin]);

  return (
    <div ref={ref} className="h-full w-full">
      {near && (
        <Suspense fallback={null}>
          <Canvas {...props} />
        </Suspense>
      )}
    </div>
  );
}
