import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ThemeToggle from "./ThemeToggle";

/* The playground and project canvases can maximise into a full-viewport overlay
   (`fullscreenButton="document"`): the canvas root is promoted into the
   browser's top layer and marked `data-cv-fullbleed`, covering whichever theme
   toggle the page underneath was showing. Mirror the page/overlay pattern —
   while it's maximised, float a toggle above the overlay so the control always
   rides with whichever surface is on top. Rendered inside the ThemeProvider;
   the portal preserves that context. */
export default function CanvasMaximizeToggle() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const sync = () =>
      setMaximized(
        // A presenting board is full-bleed too, but the room is watching it —
        // a theme button floating in the corner of a talk is one more thing on
        // screen that isn't the slide.
        !!document.querySelector(
          ".canvas-root[data-cv-fullbleed]:not([data-cv-presenting])",
        ),
      );
    sync(); // catch a canvas already maximised on mount
    // The canvas sets/removes these as it toggles the overlay; the root stays
    // within <body> either way, so watching the attributes is enough.
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-cv-fullbleed", "data-cv-presenting"],
    });
    return () => observer.disconnect();
  }, []);

  /* A maximised board sits in the TOP LAYER, which paints above every ordinary
     element whatever its z-index — so no stacking value could put this toggle
     over it. It goes into the top layer too (a manual popover, opened before
     paint so it is never seen as the `display: none` a closed popover is). The
     top layer stacks by the order things were shown, and this only ever mounts
     once the board is already maximised, so it lands on top of it. */
  const hostRef = useRef(null);
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el || typeof el.showPopover !== "function") return undefined;
    try {
      el.showPopover();
    } catch {
      return undefined; // refused: the CSS below keeps it visible, just beneath
    }
    return () => {
      try {
        if (el.isConnected && el.matches(":popover-open")) el.hidePopover();
      } catch {
        /* already closed */
      }
    };
  }, [maximized]);

  if (!maximized) return null;
  // z above the overlay's 2147483000 for the fallback path (a browser without
  // the top layer, where the board is a plain fixed overlay). `left/bottom-auto`
  // and the box resets undo the UA's popover styles (`inset: 0`, a border, a
  // background); `block` keeps it painted if showPopover was ever refused.
  return createPortal(
    <div
      ref={hostRef}
      popover="manual"
      className="fixed right-[22px] top-[22px] bottom-auto left-auto z-[2147483001] m-0 block border-0 bg-transparent p-0"
    >
      <ThemeToggle className="" />
    </div>,
    document.body,
  );
}
