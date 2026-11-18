import { useEffect, useRef, useState } from "react";
import { read, write } from "../lib/devStore";
import { DEFAULTS, FONTS, GROUPS, STORE_KEYS, stackFor } from "../lib/typeTrial";

/* A trial tool, not a feature: swaps the site's faces so candidates can be
   judged in place. Two targets, picked independently with the tabs at the top
   of the list — body (`--font-sans`) and headings (`--font-heading`). Hovering
   (or arrowing through) a name previews it at once on the current target by
   rewriting that token on <html>; every rule that sets type reads one of the
   two, so nothing else needs to know. Leaving the list reverts to the picked
   face; clicking picks it and remembers it in localStorage.

   Dev only — mounted through TypeTrial.jsx, which renders nothing in a
   production build. */

/* The font list, fallback stacks and defaults live in lib/typeTrial.js, shared
   with the commit endpoint. */

/* `fallback` is what app.css sets today; choosing it writes no override. */
const TARGETS = [
  { key: "body", label: "Body", token: "--font-sans", fallback: DEFAULTS.body, store: STORE_KEYS.body },
  { key: "heading", label: "Headings", token: "--font-heading", fallback: DEFAULTS.heading, store: STORE_KEYS.heading },
];


const apply = (target, name) => {
  const font = FONTS.find((f) => f.name === name);
  const root = document.documentElement;
  // The default is what app.css already says; clear the override rather than
  // restating it, so the stylesheet stays the source of truth.
  if (!font || font.name === target.fallback) root.style.removeProperty(target.token);
  else root.style.setProperty(target.token, stackFor(font));
};

/* One <link> per family so a family the API refuses can't take the rest down
   with it. Loaded all at once the first time the picker is approached, so that
   by the time the pointer reaches a name its face is already there and the
   preview is instant rather than a fallback flash. The two defaults come from
   index.html already. */
let loaded = false;
const loadAll = () => {
  if (loaded) return;
  loaded = true;
  for (const font of FONTS) {
    if (font.system || TARGETS.some((t) => t.fallback === font.name)) continue;
    const family = font.name.replace(/ /g, "+");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${family}:${font.axes}&display=swap`;
    document.head.appendChild(link);
  }
};

const loadPicks = () =>
  Object.fromEntries(TARGETS.map((t) => [t.key, read(t.store) || t.fallback]));

const FontPicker = () => {
  const [picks, setPicks] = useState(loadPicks);
  const [targetKey, setTargetKey] = useState("body");
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const target = TARGETS.find((t) => t.key === targetKey);
  const picked = picks[targetKey];
  const revert = () => TARGETS.forEach((t) => apply(t, picks[t.key]));

  // A saved non-default face needs its file before it can show.
  useEffect(() => {
    if (TARGETS.some((t) => picks[t.key] !== t.fallback)) loadAll();
    TARGETS.forEach((t) => apply(t, picks[t.key]));
  }, [picks]);

  // Close on an outside click; reverting the preview comes with it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
        TARGETS.forEach((t) => apply(t, picks[t.key]));
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, picks]);

  // Opening (or switching target) lands on the picked face, ready to arrow
  // through.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.focus({ preventScroll: false });
  }, [open, targetKey]);

  // Stays open after a pick, so the other target can be set straight after.
  const choose = (name) => {
    setPicks((p) => ({ ...p, [targetKey]: name }));
    write(target.store, name === target.fallback ? null : name);
    apply(target, name);
  };

  const onListKey = (e) => {
    const items = [...listRef.current.querySelectorAll("[role=option]")];
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      items[(i + step + items.length) % items.length]?.focus();
    }
  };

  const onPopKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      revert();
      rootRef.current?.querySelector("button")?.focus();
    }
  };

  const summary = TARGETS.map((t) => `${t.label}: ${picks[t.key]}`).join(" · ");

  return (
    <div ref={rootRef} className="type-trial-panel button-panel" onPointerEnter={loadAll}>
      <button
        type="button"
        className="type-trial-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Typefaces — ${summary}. Click to try others.`}
        title={summary}
        onFocus={loadAll}
        onClick={() => setOpen((o) => !o)}
      >
        Aa
      </button>
      {open && (
        <div className="font-picker-pop" onKeyDown={onPopKey}>
          <div role="tablist" aria-label="Apply to" className="text-tuner-options font-picker-tabs">
            {TARGETS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={t.key === targetKey}
                onClick={() => {
                  revert();
                  setTargetKey(t.key);
                }}
              >
                {t.label}
                <span>{picks[t.key]}</span>
              </button>
            ))}
          </div>
          <ul
            ref={listRef}
            role="listbox"
            aria-label={`${target.label} typeface`}
            className="font-picker-list"
            onKeyDown={onListKey}
            // Pointer off the list (but still inside the picker) drops the preview.
            onPointerLeave={revert}
          >
            {GROUPS.map((group) => [
              <li key={group.label} role="presentation" className="font-picker-group">
                {group.label}
              </li>,
              ...group.fonts.map((font) => (
                <li
                  key={font.name}
                  role="option"
                  tabIndex={-1}
                  aria-selected={font.name === picked}
                  // Each name is set in its own face, so the list is a specimen too.
                  style={{ fontFamily: stackFor(font) }}
                  onPointerEnter={() => apply(target, font.name)}
                  onFocus={() => apply(target, font.name)}
                  onClick={() => choose(font.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      choose(font.name);
                    }
                  }}
                >
                  {font.name}
                  {font.original && (
                    <span className="font-picker-tag" title="The site's original typeface">
                      original
                    </span>
                  )}
                </li>
              )),
            ])}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FontPicker;
