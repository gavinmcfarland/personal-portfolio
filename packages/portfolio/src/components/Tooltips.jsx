import { useEffect } from "react";

/* Site-wide tooltips: replaces the browser's native `title` tooltip with one
   drawn in the page — black, white text, an arrow — that places itself against
   the window. Nothing renders through React: it is one element managed from a
   handful of document listeners, so every `title` in the app (and in the canvas
   package, which uses them on its controls) is picked up without touching the
   markup.

   How a title becomes a tooltip:
   - On pointer-over or keyboard focus, the nearest element with a `title` has
     it moved to `data-tooltip`, so the native tooltip never gets its delay to
     appear. An icon-only control whose title was its only name gets it as an
     `aria-label`, so nothing is lost to a screen reader.
   - React re-sets `title` only when the prop changes (the theme toggle's does on
     every click), and a MutationObserver watching just that attribute moves it
     again straight away.

   Placement: below the target if it fits, else above, else whichever side has
   room; then slid along that edge to stay 8px inside the window, with the arrow
   kept pointing at the target's centre. It is shown in the top layer (a manual
   popover) so it clears the maximised canvas and a fullscreen element, both of
   which live there too.

   Shown after a short delay; once one is up, moving to the next target shows
   that one at once. Hidden on pointer-out, press, scroll, resize and Escape. Not
   shown for touch, which has no hover (and no native tooltip either). */

const SHOW_DELAY = 400;
const GROUP_WINDOW = 300; // ms after hiding during which the next one is instant
const GAP = 6; // target ↔ tooltip
const EDGE = 8; // tooltip ↔ window edge
const ARROW = 5;

function migrate(el) {
  const title = el.getAttribute("title");
  if (title == null) return;
  el.removeAttribute("title");
  if (!title.trim()) return;
  el.setAttribute("data-tooltip", title);
  if (!el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby") && !el.textContent.trim()) {
    el.setAttribute("aria-label", title);
  }
}

function place(tip, arrow, target) {
  const t = target.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  // Measure at the natural size first.
  tip.style.left = "0px";
  tip.style.top = "0px";
  const { width: w, height: h } = tip.getBoundingClientRect();
  const cx = t.left + t.width / 2;
  const cy = t.top + t.height / 2;
  const room = {
    bottom: vh - t.bottom - GAP - EDGE,
    top: t.top - GAP - EDGE,
    right: vw - t.right - GAP - EDGE,
    left: t.left - GAP - EDGE,
  };
  const side =
    room.bottom >= h ? "bottom" : room.top >= h ? "top" : room.right >= w ? "right" : room.left >= w ? "left" : room.bottom >= room.top ? "bottom" : "top";
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  let x;
  let y;
  if (side === "bottom" || side === "top") {
    x = clamp(cx - w / 2, EDGE, vw - EDGE - w);
    y = side === "bottom" ? t.bottom + GAP : t.top - GAP - h;
    // Arrow under the target's centre, kept off the tooltip's corners.
    arrow.style.left = `${clamp(cx - x, ARROW + 4, w - ARROW - 4)}px`;
    arrow.style.top = "";
  } else {
    y = clamp(cy - h / 2, EDGE, vh - EDGE - h);
    x = side === "right" ? t.right + GAP : t.left - GAP - w;
    arrow.style.top = `${clamp(cy - y, ARROW + 4, h - ARROW - 4)}px`;
    arrow.style.left = "";
  }
  tip.style.left = `${Math.round(x)}px`;
  tip.style.top = `${Math.round(y)}px`;
  tip.dataset.side = side;
}

export default function Tooltips() {
  useEffect(() => {
    const tip = document.createElement("div");
    tip.className = "site-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.id = "site-tooltip";
    const supportsPopover = typeof tip.showPopover === "function";
    if (supportsPopover) tip.setAttribute("popover", "manual");
    const text = document.createElement("span");
    const arrow = document.createElement("span");
    arrow.className = "site-tooltip__arrow";
    arrow.setAttribute("aria-hidden", "true");
    tip.append(text, arrow);
    document.body.appendChild(tip);

    let current = null;
    let timer = 0;
    let lastHidden = 0;

    const hide = () => {
      clearTimeout(timer);
      if (!current) return;
      current.removeAttribute("aria-describedby");
      current = null;
      lastHidden = performance.now();
      tip.classList.remove("is-open");
      if (supportsPopover && tip.matches(":popover-open")) tip.hidePopover();
    };

    const show = (target) => {
      const label = target.getAttribute("data-tooltip");
      if (!label || !target.isConnected) return;
      current = target;
      text.textContent = label;
      // Described by the tooltip only when it says something the name doesn't.
      const name = (target.getAttribute("aria-label") || target.textContent || "").trim();
      if (name !== label.trim()) target.setAttribute("aria-describedby", tip.id);
      if (supportsPopover) {
        // Re-show so it is the newest entry in the top layer, above a
        // fullscreen element or the maximised canvas opened since.
        if (tip.matches(":popover-open")) tip.hidePopover();
        tip.showPopover();
      }
      tip.classList.add("is-open");
      place(tip, arrow, target);
    };

    const schedule = (target) => {
      if (target === current) return;
      clearTimeout(timer);
      const instant = current || performance.now() - lastHidden < GROUP_WINDOW;
      if (current) hide();
      if (instant) show(target);
      else timer = setTimeout(() => show(target), SHOW_DELAY);
    };

    const targetOf = (node) => {
      const el = node instanceof Element ? node.closest("[title], [data-tooltip]") : null;
      if (!el) return null;
      migrate(el);
      return el.hasAttribute("data-tooltip") ? el : null;
    };

    const onOver = (e) => {
      if (e.pointerType === "touch") return;
      const target = targetOf(e.target);
      if (target) schedule(target);
      else if (current || timer) hide();
    };
    const onOut = (e) => {
      if (!current && !timer) return;
      const to = e.relatedTarget;
      const from = current || e.target.closest?.("[data-tooltip]");
      if (from && to instanceof Node && from.contains(to)) return;
      hide();
    };
    const onFocus = (e) => {
      // Keyboard focus only — a click also focuses, and that shouldn't pop one.
      if (!(e.target instanceof Element) || !e.target.matches(":focus-visible")) return;
      const target = targetOf(e.target);
      if (target) schedule(target);
    };
    const onBlur = () => hide();
    const onKey = (e) => {
      if (e.key === "Escape") hide();
    };

    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.target instanceof Element && r.target.hasAttribute("title")) {
          migrate(r.target);
          if (r.target === current) {
            text.textContent = r.target.getAttribute("data-tooltip") || "";
            place(tip, arrow, current);
          }
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["title"], subtree: true });

    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    document.addEventListener("pointerdown", hide, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("focusout", onBlur, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);

    return () => {
      hide();
      observer.disconnect();
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
      document.removeEventListener("pointerdown", hide, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("focusout", onBlur, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      tip.remove();
    };
  }, []);

  return null;
}
