import { useCallback, useEffect, useRef, useState } from "react";
import { EditDock } from "@gavinmcfarland/canvas";
import { ACCENT } from "../theme";
import ArticleView from "./ArticleView";
import { renderMarkdown } from "../lib/markdown";
import { parseFrontmatter } from "../lib/frontmatter";
import { SaveStatus } from "./BlockEditor";
import { useBlockEditor } from "../hooks/useBlockEditor";
import { rememberSaved } from "../data/writing";

/* The in-page editor for a post — dev only. WritingPost loads this module
   behind `import.meta.env.DEV`, so none of it (nor the canvas engine the Edit
   button comes from) is in a build.
 *
 * The page is edited where it is set. The title and summary are fields in the
 * masthead; the body is edited block by block (src/hooks/useBlockEditor.jsx has the keys).
 * Every change is saved back to the .md file through /__writing/save
 * (vite-plugin-writing-index.js) shortly after it is made.
 *
 *   ⌘/Ctrl+Z           undo a committed change (outside a field) */

/* The Edit button, for a page that may have no canvas on it. */
export function ArticleDock({ rootRef }) {
  return <EditDock rootRef={rootRef} accent={ACCENT} label="this page" />;
}

const sameDoc = (a, b) => a.title === b.title && a.summary === b.summary && a.body === b.body;

export default function ArticleEditor({ post, loaded, editing, onChange }) {
  const [doc, setDoc] = useState(() => ({
    title: loaded.data.title || "",
    summary: loaded.data.summary || "",
    body: loaded.text,
  }));
  const docRef = useRef(doc);
  docRef.current = doc;

  const resolveAsset = loaded.resolveAsset;
  const parse = useCallback((body) => renderMarkdown(body, { resolveAsset }), [resolveAsset]);
  // The field-closing function of the body editor below, for undo to call.
  const closeRef = useRef(() => {});

  /* Bumped whenever the title or summary is committed or undone: remounts the
     two contentEditable lines so React never reconciles against text the
     browser rewrote under it. Invisible — same element, same text. */
  const [fieldKey, setFieldKey] = useState(0);

  /* ── History ── */
  const history = useRef({ past: [], future: [] });
  const update = (next) => {
    const cur = docRef.current;
    if (sameDoc(next, cur)) return;
    history.current.past.push(cur);
    history.current.future = [];
    setDoc(next);
  };
  const setBody = (body) => update({ ...docRef.current, body });

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === "TEXTAREA" || ae.tagName === "INPUT" || ae.isContentEditable)) return;
      const { past, future } = history.current;
      const from = e.shiftKey ? future : past;
      const to = e.shiftKey ? past : future;
      if (!from.length) return;
      e.preventDefault();
      to.push(docRef.current);
      closeRef.current();
      setFieldKey((k) => k + 1);
      setDoc(from.pop());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── Saving ── */
  const baseRef = useRef(loaded.raw);
  const savedDoc = useRef(doc);
  const dirty = useRef(false);
  const chain = useRef(Promise.resolve());
  const [status, setStatus] = useState("idle"); // saving | saved | error | conflict

  const doSave = async (force = false) => {
    if (!dirty.current && !force) return;
    dirty.current = false;
    const snapshot = docRef.current;
    setStatus("saving");
    try {
      const res = await fetch("/__writing/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: post.slug, base: baseRef.current, force, ...snapshot }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        dirty.current = true;
        setStatus("conflict");
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      baseRef.current = json.raw;
      savedDoc.current = snapshot;
      rememberSaved(post.slug, json.raw);
      onChange({ raw: json.raw });
      if (!dirty.current) setStatus("saved");
    } catch (err) {
      console.error("[writing] save failed:", err);
      dirty.current = true;
      setStatus("error");
    }
  };
  const save = (force) => {
    chain.current = chain.current.then(() => doSave(force));
  };

  // Nothing to write if the post already says this — on mount (including a
  // StrictMode double-run), and after an undo back to what was last saved.
  useEffect(() => {
    if (sameDoc(doc, savedDoc.current)) return undefined;
    dirty.current = true;
    // The page behind the editor (view mode) reads the same state.
    onChange({
      data: { ...parseFrontmatter(baseRef.current).data, title: doc.title, summary: doc.summary },
      text: doc.body,
    });
    const t = setTimeout(() => save(), 600);
    return () => clearTimeout(t);
  }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving edit mode unmounts this — don't drop a change still in its debounce.
  useEffect(() => () => save(), []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── The body ── */
  const { parsed, active, close, openInsert, onBodyClick, blocks } = useBlockEditor({
    body: doc.body,
    setBody,
    editing,
    parse,
    revealScope: ".writing-body",
  });
  closeRef.current = close;

  const commitLine = (key) => (text) => {
    setFieldKey((k) => k + 1);
    update({ ...docRef.current, [key]: text });
  };

  return (
    <ArticleView
      post={post}
      title={doc.title || (editing ? "" : post.slug)}
      summary={doc.summary}
      headings={parsed.headings}
      editable={editing}
      onTitle={commitLine("title")}
      onSummary={commitLine("summary")}
      fieldKey={fieldKey}
      status={editing ? <SaveStatus status={status} onRetry={() => save()} onOverwrite={() => save(true)} /> : null}
      bodyProps={editing ? { onClick: onBodyClick } : undefined}
      className={editing ? "writing-editing" : ""}
      after={
        editing && !active ? (
          /* Out of flow, in the gap above SEE ALSO, so entering edit mode
             doesn't push anything down. */
          <div className="wb-add-wrap indent">
            <button type="button" className="wb-add post-meta" onClick={() => openInsert(parsed.blocks.length - 1)}>
              + add a paragraph
            </button>
          </div>
        ) : null
      }
    >
      {blocks}
      {parsed.footnotes}
    </ArticleView>
  );
}
