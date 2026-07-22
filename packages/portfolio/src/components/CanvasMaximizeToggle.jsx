import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ThemeToggle from "./ThemeToggle";

/* The playground canvas can maximise into a full-viewport overlay
   (`fullscreenButton="document"`): the canvas root is portaled to <body> with a
   near-max z-index and marked `data-cv-fullbleed`, covering Home's own theme
   toggle. Mirror the page/overlay pattern — while it's maximised, float a toggle
   above the overlay so the control always rides with whichever surface is on
   top. Rendered inside the ThemeProvider; the portal preserves that context. */
export default function CanvasMaximizeToggle() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const sync = () =>
      setMaximized(!!document.querySelector(".canvas-root[data-cv-fullbleed]"));
    sync(); // catch a canvas already maximised on mount
    // The canvas sets/removes `data-cv-fullbleed` as it toggles the overlay; the
    // root stays within <body> either way, so watching that attribute is enough.
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-cv-fullbleed"],
    });
    return () => observer.disconnect();
  }, []);

  if (!maximized) return null;
  // z above the overlay's 2147483000 so it sits on top of the maximised canvas.
  return createPortal(
    <ThemeToggle className="fixed right-[22px] top-[22px] z-[2147483001]" />,
    document.body,
  );
}
