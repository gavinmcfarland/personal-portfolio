/* The project page's code, fetched before anyone asks for the page.

   Opening a project used to fetch two chunks on the click — the page and,
   behind it, the canvas engine. They arrive quickly, but React has already
   committed the panel's empty fallback by then, and once a fallback is on
   screen it holds the real content back for ~300ms so the two don't flicker
   past each other. Measured on a production build: chunks in by ~90ms, canvas
   mounted at ~326ms. With the module already loaded there is no fallback and
   no hold, and the canvas mounts at ~40ms.

   So the import is started ahead of time, in two places:

   - once the browser is idle after Home has finished loading (see App.jsx),
     which is the case nearly every click lands in, and
   - when a pointer, a finger or the keyboard reaches a project link, for the
     reader who gets there before that.

   Neither is in the path of Home's own load: nothing here runs until `load`
   has fired and the main thread has nothing better to do. The canvas chunk is
   one Home fetches anyway for the board in its footer.

   One loader, shared with the route's `lazy()`, so there is a single request
   whichever of them asks first. Skipped on a connection that has asked for
   less data — the click still works, it just fetches then, as it used to. */
let pending = null;

export const loadProjectPage = () => {
  if (!pending) {
    pending = import("../pages/ProjectPage").catch((err) => {
      // A failed warm-up must not poison the real navigation: let the next
      // caller try again.
      pending = null;
      throw err;
    });
  }
  return pending;
};

const frugal = () => {
  const c = typeof navigator !== "undefined" ? navigator.connection : null;
  return !!c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""));
};

export const warmProjectPage = () => {
  if (frugal()) return;
  loadProjectPage().catch(() => {});
};

/* Props for a link to a project: warm on the first sign of intent. */
export const warmOnIntent = {
  onPointerEnter: warmProjectPage,
  onTouchStart: warmProjectPage,
  onFocus: warmProjectPage,
};

/* Warm once the page has loaded and the browser is idle. Returns a cancel. */
export const warmWhenIdle = () => {
  if (typeof window === "undefined") return () => {};
  let idle = 0;
  let timer = 0;
  const queue = () => {
    if (window.requestIdleCallback) idle = window.requestIdleCallback(warmProjectPage, { timeout: 4000 });
    else timer = window.setTimeout(warmProjectPage, 1500); // Safari
  };
  if (document.readyState === "complete") queue();
  else window.addEventListener("load", queue, { once: true });
  return () => {
    window.removeEventListener("load", queue);
    if (idle) window.cancelIdleCallback(idle);
    clearTimeout(timer);
  };
};
