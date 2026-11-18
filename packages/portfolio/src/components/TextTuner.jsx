import { useEffect, useRef, useState } from "react";
import { read, write } from "../lib/devStore";
import { DEFAULTS, SETTINGS, STORE_KEYS } from "../lib/typeTrial";

/* Dev-only companion to FontPicker ("tweaks"): tries the body text at another
   size or weight, a lighter or darker grey, with or without macOS's thin
   antialiasing, smaller buttons, and rounded button corners. Same rule as
   the font list — hovering an option previews it at once, leaving its row
   reverts, clicking keeps it (remembered in localStorage). The option equal to
   DEFAULTS (lib/typeTrial.js ← src/data/tweakDefaults.json) is what app.css
   says today: it writes no CSS and isn't stored, and a stored value that has
   since become the default simply stops doing anything.

   "Save as defaults" posts the lot — these tweaks and both font picks — to
   the dev server (vite-plugin-tweaks.js), which writes them into app.css,
   index.html and tweakDefaults.json, then reloads.

   Everything is written into one <style> element appended to <head>, so it is
   unlayered and later than app.css and wins without !important; removing the
   element is a complete reset. */

const STORE_KEY = STORE_KEYS.tweaks;

const baseOf = (s) => DEFAULTS[s.key];
// Only the settings that differ from the stylesheet.
const overrides = (values) =>
  Object.fromEntries(
    SETTINGS.filter((s) => values[s.key] != null && values[s.key] !== baseOf(s)).map(
      (s) => [s.key, values[s.key]],
    ),
  );

const loadSaved = () => {
  try {
    return overrides(JSON.parse(read(STORE_KEY)) || {});
  } catch {
    return {};
  }
};

const apply = (values) => {
  const live = overrides(values);
  const css = SETTINGS.filter((s) => live[s.key] != null)
    .map((s) => s.css(live[s.key]))
    .join("\n");
  let el = document.getElementById("text-trial");
  if (!css) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("style");
    el.id = "text-trial";
  }
  el.textContent = css;
  // Re-append every time so it stays last in <head>, after any stylesheet
  // Vite or the font picker added since.
  document.head.appendChild(el);
};

const TextTuner = () => {
  const [saved, setSaved] = useState(loadSaved);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => apply(saved), [saved]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
        apply(saved);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        apply(saved);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, saved]);

  const preview = (key, value) => apply({ ...saved, [key]: value });

  const choose = (key, value) => {
    const next = overrides({ ...saved, [key]: value });
    setSaved(next);
    write(STORE_KEY, Object.keys(next).length ? JSON.stringify(next) : null);
  };

  const reset = () => {
    setSaved({});
    write(STORE_KEY, null);
  };

  const changed = Object.keys(saved).length > 0;

  // Font picks live in FontPicker's state; storage is the shared record (it
  // only holds a pick that differs from the default). Read when the panel
  // opens, which is the only time the button is visible.
  const [fonts, setFonts] = useState({});
  useEffect(() => {
    if (!open) return;
    setFonts({ body: read(STORE_KEYS.body), heading: read(STORE_KEYS.heading) });
  }, [open]);
  const fontChanged = Object.values(fonts).some(Boolean);
  const [status, setStatus] = useState(null);

  const commit = async () => {
    const values = { ...DEFAULTS, ...saved };
    if (fonts.body) values.body = fonts.body;
    if (fonts.heading) values.heading = fonts.heading;
    const diff = Object.keys(values).filter((k) => values[k] !== DEFAULTS[k]);
    const summary = diff.map((k) => `  ${k}: ${DEFAULTS[k]} → ${values[k]}`).join("\n");
    if (!window.confirm(`Write these as the new defaults?\n\n${summary}\n\nThis edits app.css, index.html and tweakDefaults.json.`)) return;
    setStatus("Saving…");
    try {
      const res = await fetch("/__tweaks/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const out = await res.json();
      if (!out.ok) throw new Error(out.error || res.statusText);
      // Everything stored is now the default — clear it, and reload so the
      // new stylesheet and defaults are what's on screen.
      Object.values(STORE_KEYS).forEach((k) => write(k, null));
      setStatus("Saved");
      window.location.reload();
    } catch (err) {
      setStatus(`Failed: ${err.message}`);
    }
  };

  return (
    <div ref={rootRef} className="type-trial-panel button-panel">
      <button
        type="button"
        className="type-trial-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Tweaks"
        title="Tweaks"
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeWidth={1.8} d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" strokeWidth={1.8} />
          <circle cx="10" cy="17" r="2" strokeWidth={1.8} />
        </svg>
        {changed && <span className="type-trial-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div role="dialog" aria-label="Tweaks" className="text-tuner">
          {SETTINGS.map((s) => {
            const current = saved[s.key] ?? baseOf(s);
            return (
              <div key={s.key} className="text-tuner-row">
                <div className="text-tuner-label">
                  {s.label}
                  <span>{s.note}</span>
                </div>
                <div
                  role="radiogroup"
                  aria-label={s.label}
                  className="text-tuner-options"
                  onPointerLeave={() => apply(saved)}
                >
                  {s.options.map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      role="radio"
                      aria-checked={o.value === current}
                      onPointerEnter={() => preview(s.key, o.value)}
                      onFocus={() => preview(s.key, o.value)}
                      onBlur={() => apply(saved)}
                      onClick={() => choose(s.key, o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="text-tuner-actions">
            <button
              type="button"
              className="text-tuner-reset"
              disabled={!changed}
              onClick={reset}
            >
              Reset to stylesheet
            </button>
            <button
              type="button"
              className="text-tuner-commit"
              disabled={!(changed || fontChanged) || status === "Saving…"}
              onClick={commit}
              title="Write these tweaks and both font picks into the source as the new defaults"
            >
              Save as defaults
            </button>
          </div>
          {status && <p className="text-tuner-status">{status}</p>}
        </div>
      )}
    </div>
  );
};

export default TextTuner;
