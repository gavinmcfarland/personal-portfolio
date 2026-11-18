import { cloneElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EditDock } from "@gavinmcfarland/canvas";
import { ACCENT } from "../theme";
import ArticleView from "./ArticleView";
import { renderMarkdown } from "../lib/markdown";
import { parseFrontmatter } from "../lib/frontmatter";
import {
  blockSource,
  insertBlock,
  mergeWithPrevious,
  moveBlock,
  removeBlock,
  replaceBlock,
} from "../lib/blockEdit";
import { rememberSaved } from "../data/writing";

/* The in-page editor for a post — dev only. WritingPost loads this module
   behind `import.meta.env.DEV`, so none of it (nor the canvas engine the Edit
   button comes from) is in a build.
 *
 * The page is edited where it is set. The title and summary are fields in the
 * masthead; the body is its rendered blocks, and clicking one swaps it for its
 * own markdown in a field set in the same register. Leaving the field commits
 * the change as a splice of the source (src/lib/blockEdit.js) and the block is
 * rendered again. Every change is saved back to the .md file through
 * /__writing/save (vite-plugin-writing-index.js) shortly after it is made.
 *
 *   Esc / click away    commit
 *   Enter               split the block at the caret (a new block at the end)
 *   Shift+Enter         a line break inside the block
 *   ⌘/Ctrl+Enter        new block below — the way out of a list or code sample
 *   Backspace at start  delete an empty block, or join a paragraph to the last
 *   ↑ / ↓ at an edge    move to the block above / below
 *   Alt+↑ / Alt+↓       move the block
 *   ⌘/Ctrl+Z           undo a committed change (outside a field) */

/* The Edit button, for a page that may have no canvas on it. */
export function ArticleDock({ rootRef }) {
  return <EditDock rootRef={rootRef} accent={ACCENT} label="this page" />;
}

/* Kinds where Enter is a newline, not a new block — their source is
   line-oriented, and a split would cut an item or a sample in two. */
const MULTILINE = new Set(["code", "list", "quote", "footnote"]);

const sameDoc = (a, b) => a.title === b.title && a.summary === b.summary && a.body === b.body;

const countBlocks = (text) => (String(text).trim() ? renderMarkdown(text).blocks.length : 0);

export default function ArticleEditor({ post, loaded, editing, onChange }) {
  const [doc, setDoc] = useState(() => ({
    title: loaded.data.title || "",
    summary: loaded.data.summary || "",
    body: loaded.text,
  }));
  const docRef = useRef(doc);
  docRef.current = doc;

  const resolveAsset = loaded.resolveAsset;
  const parse = (body) => renderMarkdown(body, { resolveAsset });
  const parsed = useMemo(() => parse(doc.body), [doc.body]); // eslint-disable-line react-hooks/exhaustive-deps

  /* The field being edited: an existing block (`index`) or a new one going in
     after block `insertAfter` (-1: before the first). `seq` remounts the field
     whenever the target changes, so focus and caret are set fresh. */
  const [active, setActive] = useState(null);
  const seq = useRef(0);
  const activeSeq = useRef(0);
  const openBlock = (body, index, caret = "end") => {
    const p = parse(body);
    const block = p.blocks[index];
    activeSeq.current = ++seq.current;
    if (!block) return setActive(null);
    // A paragraph is set as one run of text, so its field shows it as one:
    // the line breaks in the file are where it was wrapped, not breaks in the
    // text, and showing them would re-wrap the paragraph the moment it's
    // clicked. Untouched, the original lines are kept (see `committed`).
    const source = blockSource(p.lines, block);
    const shown = block.kind === "paragraph" ? source.replace(/[ \t]*\n[ \t]*/g, " ") : source;
    setActive({ index, caret, draft: shown, shown, seq: seq.current });
  };
  const openInsert = (insertAfter) => {
    activeSeq.current = ++seq.current;
    setActive({ insertAfter, caret: 0, draft: "", seq: seq.current });
  };
  const close = () => {
    activeSeq.current = ++seq.current;
    setActive(null);
  };

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
      close();
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

  /* ── Committing a field ── */

  /* The body with the active field's draft written in, and how many blocks the
     draft became. `base` is the index of the first of them. */
  const committed = () => {
    const { lines, blocks } = parsed;
    if (!active) return { body: doc.body, base: 0, span: 0 };
    const text = active.draft;
    if (active.index != null) {
      const block = blocks[active.index];
      const unchanged = text === active.shown;
      return {
        body: unchanged ? doc.body : replaceBlock(lines, block, text),
        base: active.index,
        span: unchanged ? 1 : countBlocks(text),
      };
    }
    const after = active.insertAfter >= 0 ? blocks[active.insertAfter] : null;
    return {
      body: insertBlock(lines, blocks, after, text),
      base: active.insertAfter + 1,
      span: countBlocks(text),
    };
  };

  const finish = () => {
    setBody(committed().body);
    close();
  };

  const setDraft = (draft) => setActive((a) => ({ ...a, draft }));

  const onFieldKey = (e) => {
    const el = e.currentTarget;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const atEnd = el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
    const isBlock = active.index != null;
    const kind = isBlock ? parsed.blocks[active.index].kind : "paragraph";
    const mod = e.metaKey || e.ctrlKey;

    if (e.key === "Escape") {
      e.preventDefault();
      finish();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && (mod || !MULTILINE.has(kind))) {
      e.preventDefault();
      if (!active.draft.trim()) return;
      const before = el.value.slice(0, el.selectionStart);
      const after = el.value.slice(el.selectionEnd);
      if (mod || !after.trim() || !isBlock) {
        // At the end (or forced): keep this block, open a new one below it.
        const { body, base, span } = committed();
        setBody(body);
        openInsert(base + span - 1);
      } else if (!before.trim()) {
        // At the very start: a new block above this one.
        openInsert(active.index - 1);
        setBody(committed().body);
      } else {
        // In the middle: two blocks, caret at the start of the second.
        const { lines, blocks } = parsed;
        const body = replaceBlock(lines, blocks[active.index], `${before.trimEnd()}\n\n${after.trimStart()}`);
        setBody(body);
        openBlock(body, active.index + countBlocks(before), 0);
      }
      return;
    }

    if (e.key === "Backspace" && atStart) {
      if (!active.draft) {
        e.preventDefault();
        if (isBlock) {
          const { lines, blocks } = parsed;
          const body = removeBlock(lines, blocks[active.index]);
          setBody(body);
          if (active.index > 0) openBlock(body, active.index - 1);
          else close();
        } else if (active.insertAfter >= 0) {
          openBlock(doc.body, active.insertAfter);
        } else {
          close();
        }
        return;
      }
      const prev = isBlock && parsed.blocks[active.index - 1];
      if (kind === "paragraph" && prev && prev.kind === "paragraph") {
        e.preventDefault();
        const { body, caret } = mergeWithPrevious(parsed.lines, parsed.blocks, active.index, active.draft);
        setBody(body);
        openBlock(body, active.index - 1, caret);
      }
      return;
    }

    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && isBlock) {
      e.preventDefault();
      const dir = e.key === "ArrowUp" ? -1 : 1;
      const { body, span } = committed();
      if (span !== 1) {
        setBody(body);
        close();
        return;
      }
      const p = parse(body);
      const moved = moveBlock(p.lines, p.blocks, active.index, dir);
      if (moved == null) return;
      setBody(moved);
      openBlock(moved, active.index + dir, el.selectionStart);
      return;
    }

    // Plain arrows only: ⌘/Ctrl+↓ is "end of text" and Shift+↓ extends a
    // selection — neither should leave the field.
    const plain = !mod && !e.altKey && !e.shiftKey;
    if (plain && ((e.key === "ArrowUp" && atStart) || (e.key === "ArrowDown" && atEnd))) {
      const { body, base, span } = committed();
      const target = e.key === "ArrowUp" ? base - 1 : base + span;
      if (target < 0 || target >= parse(body).blocks.length) return;
      e.preventDefault();
      setBody(body);
      openBlock(body, target, e.key === "ArrowUp" ? "end" : 0);
    }
  };

  /* The field's own blur: commit, unless a keyboard action already moved on to
     another field (it bumped the sequence before this one unmounted). */
  const onFieldBlur = (fieldSeq) => () => {
    if (activeSeq.current === fieldSeq) finish();
  };

  /* ── Block tools ── */
  const moveActive = (dir) => {
    const { body, span } = committed();
    const p = parse(body);
    if (span !== 1) {
      setBody(body);
      close();
      return;
    }
    const moved = moveBlock(p.lines, p.blocks, active.index, dir);
    if (moved == null) return;
    setBody(moved);
    openBlock(moved, active.index + dir);
  };
  const deleteActive = () => {
    setBody(removeBlock(parsed.lines, parsed.blocks[active.index]));
    close();
  };

  /* ── Clicks on the rendered body ── */
  const onBodyClick = (e) => {
    if (e.target.closest(".wb-field")) return;
    // A footnote at the foot opens the definition it was set from.
    const note = e.target.closest("[data-note]");
    const el = e.target.closest("[data-block]");
    const index = note
      ? parsed.blocks.findIndex((b) => b.note === Number(note.dataset.note))
      : el
        ? Number(el.dataset.block)
        : -1;
    if (index < 0) return;
    e.preventDefault(); // a link in a block is text to edit, not somewhere to go
    const body = active ? committed().body : doc.body;
    if (active) setBody(body);
    openBlock(body, index);
  };

  // Leaving edit mode commits whatever field is open.
  useEffect(() => {
    if (!editing && active) finish();
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  /* The reveal-on-scroll fade is for the page arriving, not for editing it.
     Any block element that wasn't there on the first paint — one an edit
     created, or one rebuilt after its field closed — has the reveal class but
     was never seen by the observer, so it would sit at opacity 0. Mark those
     revealed at once, with no transition. The ones from the first paint keep
     the normal fade as they scroll in. Runs after every render. */
  const firstPaint = useRef(null);
  useLayoutEffect(() => {
    const all = document.querySelectorAll(".writing-body .reveal");
    if (!firstPaint.current) {
      firstPaint.current = new WeakSet(all);
      return;
    }
    for (const el of all) {
      if (!el.classList.contains("in") && !firstPaint.current.has(el)) el.classList.add("in", "instant");
    }
  });

  /* ── Render ──
     The same ArticleView the reader gets, in both modes: entering edit mode
     changes props, not the tree, so nothing that isn't being edited moves,
     resizes or remounts. Blocks are the renderer's own elements, keys and
     all, with only a data-block attribute added. */
  const field = (key) => (
    <Field
      key={key}
      value={active.draft}
      caret={active.caret}
      onChange={setDraft}
      onKeyDown={onFieldKey}
      onBlur={onFieldBlur(active.seq)}
      mono={active.index != null && parsed.blocks[active.index].kind === "code"}
      placeholder="Write, or type ## for a heading"
    />
  );

  const insertField = (after) =>
    editing && active && active.index == null && active.insertAfter === after ? (
      <div key={`new-${after}`} className="wb-field indent max-w-measure text-muted" data-kind="new">
        {field(active.seq)}
      </div>
    ) : null;

  /* Keyed by content, not position: inserting or splitting a block leaves
     every block after it with the same key, so React keeps their elements
     rather than rebuilding the rest of the post. */
  const seen = {};
  const keyOf = (block) => {
    const src = blockSource(parsed.lines, block);
    const n = (seen[src] = (seen[src] || 0) + 1);
    return `${block.kind}:${n}:${src}`;
  };

  const children = [insertField(-1)];
  parsed.blocks.forEach((block, i) => {
    if (editing && active && active.index === i) {
      const cls = (block.node?.props?.className || "indent max-w-measure text-muted").replace(/\breveal\b/, "");
      children.push(
        <div key={`edit-${i}`} className={`wb-field ${cls}`} data-kind={block.kind}>
          <div className="wb-tools" onMouseDown={(e) => e.preventDefault()}>
            <button type="button" title="Move up (Alt+↑)" onClick={() => moveActive(-1)} disabled={i === 0}>
              ↑
            </button>
            <button
              type="button"
              title="Move down (Alt+↓)"
              onClick={() => moveActive(1)}
              disabled={i === parsed.blocks.length - 1}
            >
              ↓
            </button>
            <button type="button" title="Delete block" onClick={deleteActive}>
              delete
            </button>
          </div>
          {field(active.seq)}
        </div>,
      );
    } else if (block.node) {
      children.push(cloneElement(block.node, { key: keyOf(block), "data-block": i }));
    }
    // A footnote definition (no node of its own) is set at the foot, below.
    children.push(insertField(i));
  });
  children.push(parsed.footnotes);

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
      {children}
    </ArticleView>
  );
}

/* A textarea that grows with its text, set in whatever register its parent
   (or `className`) gives it. */
function Field({ value, onChange, caret, singleLine, mono, className = "", ...rest }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // A block field opens focused, with the caret where the action put it.
  useLayoutEffect(() => {
    if (caret === undefined) return;
    const el = ref.current;
    const at = caret === "end" ? el.value.length : Math.min(caret, el.value.length);
    el.focus({ preventScroll: true });
    el.setSelectionRange(at, at);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { onKeyDown, ...others } = rest;
  const keyDown = singleLine
    ? (e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }
    : onKeyDown;

  return (
    <textarea
      {...others}
      ref={ref}
      rows={1}
      spellCheck
      className={`writing-edit-field${mono ? " writing-edit-field--mono" : ""} ${className}`}
      value={value}
      onChange={(e) => onChange(singleLine ? e.target.value.replace(/\n/g, " ") : e.target.value)}
      onKeyDown={keyDown}
    />
  );
}

/* A word or two at the end of the meta line — inline, so it never adds a line. */
function SaveStatus({ status, onRetry, onOverwrite }) {
  if (status === "idle") return null;
  if (status === "saving") return <span aria-live="polite">saving…</span>;
  if (status === "saved") return <span aria-live="polite">saved</span>;
  if (status === "error")
    return (
      <span aria-live="polite">
        <span className="text-accent">save failed</span> —{" "}
        <button type="button" className="wb-link" onClick={onRetry}>
          retry
        </button>
      </span>
    );
  return (
    <span aria-live="polite">
      <span className="text-accent">changed on disk</span> —{" "}
      <button type="button" className="wb-link" onClick={() => window.location.reload()}>
        reload
      </button>{" "}
      or{" "}
      <button type="button" className="wb-link" onClick={onOverwrite}>
        overwrite
      </button>
    </span>
  );
}
