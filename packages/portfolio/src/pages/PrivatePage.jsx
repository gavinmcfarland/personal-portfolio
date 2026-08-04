import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Canvas } from "@gavinmcfarland/canvas";
import ThemeToggle from "../components/ThemeToggle";
import Seo from "../components/Seo";
import { uploadMedia, unfurlLink, presentRelay } from "../data/canvasBoards";
import { ACCENT } from "../theme";
import { decryptBoard, encryptBoard } from "../lib/privateCrypto";

/* A privately shared, password-gated canvas that fills the whole document.

   The board ships only as ciphertext at /private/<id>.json — until the correct
   password is entered nothing readable is in the DOM.

   Editing is an owner-only, dev-only capability: recipients on the deployed site
   get a read-only canvas (pan/zoom). While `vite serve` is running the owner
   unlocks the page with the password, edits, and each save re-encrypts the board
   client-side with that in-memory password and writes it back to the static file
   via the dev `/__private/save` endpoint — the password never touches disk.
   Commit the updated file and deploy to publish the content. */

const STATUS = { loading: "loading", locked: "locked", missing: "missing", unlocked: "unlocked" };

// The seed board before anything has been authored — a blank canvas.
const emptyBase = { brand: { title: "", subtitle: "" }, nodes: [], shapes: [] };

/* onPublish adapter (dev only): encrypt the live snapshot with the owner's
   in-memory password and persist it back to public/private/<slug>.json. */
function makeSaver(slug, getPassword) {
  if (!import.meta.env.DEV) return undefined;
  return async (snapshot) => {
    const record = await encryptBoard(getPassword(), snapshot);
    const res = await fetch("/__private/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, record }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);
  };
}

export default function PrivatePage() {
  const { id } = useParams();
  const [status, setStatus] = useState(STATUS.loading);
  const [record, setRecord] = useState(null);
  const [board, setBoard] = useState(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  // Held after unlock so dev saves can re-encrypt without re-prompting.
  const passwordRef = useRef("");

  // Fetch the ciphertext record. A missing file 404s on Vercel; under `vite
  // serve` a missing public file falls back to index.html, so a failed JSON
  // parse counts as "not found" too.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/private/${id}.json`, { cache: "no-store" });
        if (!res.ok) throw new Error("missing");
        const data = await res.json();
        if (!cancelled) {
          setRecord(data);
          setStatus(STATUS.locked);
        }
      } catch {
        if (!cancelled) setStatus(STATUS.missing);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function onSubmit(e) {
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    setError("");
    try {
      const decrypted = await decryptBoard(password, record);
      passwordRef.current = password;
      setBoard(decrypted);
      setStatus(STATUS.unlocked);
    } catch {
      setError("Incorrect password");
      setPassword("");
    } finally {
      setChecking(false);
    }
  }

  if (status === STATUS.unlocked) {
    return (
      <div className="private-canvas fixed inset-0 bg-base">
        <Seo title="Private page" noindex />
        <ThemeToggle />
        <Canvas
          fit="contain"
          initialView="fit"
          resizeAnchor="center"
          scaleWithContainer
          scrollbars="auto"
          classNames={{ root: "enamel" }}
          accent={ACCENT}
          editable={import.meta.env.DEV}
          saveStatus
          base={emptyBase}
          initialState={board ?? undefined}
          storageKey={`private-${id}`}
          onPublish={makeSaver(id, () => passwordRef.current)}
          onUploadImage={uploadMedia}
          onUploadVideo={uploadMedia}
          onUploadAudio={uploadMedia}
          onUploadHtml={uploadMedia}
          onUnfurl={unfurlLink}
          presentRelay={presentRelay}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-base px-6">
      <Seo title="Private page" noindex />
      <ThemeToggle />
      {status === STATUS.loading && (
        <p className="text-4 text-faint">Loading…</p>
      )}

      {status === STATUS.missing && (
        <div className="text-center">
          <h1 className="font-sans text-5 font-bold text-ink">Link not found</h1>
          <p className="mt-(--sp-1) text-4 text-muted">
            This private page doesn’t exist or has been removed.
          </p>
        </div>
      )}

      {status === STATUS.locked && (
        <form
          onSubmit={onSubmit}
          className="w-full max-w-xs rounded-[12px] border border-line bg-surface p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          <h1 className="font-sans text-4 font-bold text-ink">Private page</h1>
          <p className="mt-(--sp-1) text-4 text-muted">Enter the password to view.</p>
          {/* Password managers key saved credentials by (origin, username). Without a
              username every board shares one credential for this origin, so unlocking a
              second board reads as "you changed the password" and Chrome offers to
              overwrite the first. Naming the board makes each one its own credential.
              Kept in layout (not display:none) so managers actually parse it. */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            value={id}
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: "none",
            }}
          />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            aria-invalid={error ? "true" : undefined}
            placeholder="Password"
            className="mt-(--sp-2) w-full rounded-[8px] border border-line bg-base px-3 py-2 text-4 text-ink outline-none focus:border-[var(--accent)]"
          />
          {error && <p className="mt-(--sp-1) text-4 text-[var(--accent)]">{error}</p>}
          <button
            type="submit"
            disabled={checking || !password}
            className="mt-(--sp-2) w-full rounded-[8px] bg-[var(--accent)] px-3 py-2 text-4 font-medium text-[var(--on-accent)] transition-opacity disabled:opacity-50"
          >
            {checking ? "Unlocking…" : "Unlock"}
          </button>
        </form>
      )}
    </div>
  );
}
