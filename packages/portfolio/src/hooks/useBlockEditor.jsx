import { cloneElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { renderMarkdown } from "../lib/markdown";
import { Field } from "../components/BlockEditor";
import {
  blockSource,
  insertBlock,
  mergeWithPrevious,
  moveBlock,
  removeBlock,
  replaceBlock,
} from "../lib/blockEdit";

/* Editing a run of markdown blocks where they are set — dev only. Shared by the
   post editor (ArticleEditor.jsx) and the home page's prose (HomeEditor.jsx);
   both reach this module only behind `import.meta.env.DEV`. The field and the
   save-state words it uses are in src/components/BlockEditor.jsx.
 *
 * The body is its rendered blocks, and clicking one swaps it for its own
 * markdown in a field set in the same register. Leaving the field commits the
 * change as a splice of the source (src/lib/blockEdit.js) and the block is
 * rendered again. The caller owns the text, its history and its saving; this
 * owns which field is open and what the keys do in it.
 *
 *   Esc / click away    commit
 *   Enter               split the block at the caret (a new block at the end)
 *   Shift+Enter         a line break inside the block
 *   ⌘/Ctrl+Enter        new block below — the way out of a list or code sample
 *   Backspace at start  delete an empty block, or join a paragraph to the last
 *   ↑ / ↓ at an edge    move to the block above / below
 *   Alt+↑ / Alt+↓       move the block */

/* Kinds where Enter is a newline, not a new block — their source is
   line-oriented, and a split would cut an item or a sample in two. */
const MULTILINE = new Set(["code", "list", "quote", "footnote"]);

const defaultParse = (text) => renderMarkdown(text);

/* Options:
     body, setBody   the markdown and how to change it
     editing         whether the page is in edit mode
     parse           text → renderMarkdown's result (to pass resolveAsset, or
                     to decorate the nodes); keep it stable (useCallback), as
                     the body is parsed again whenever it changes
     revealScope     selector for the `.reveal` elements this body renders
     placeholder     shown in an empty field
     newClassName    the classes a new block's field is set in

   Returns { parsed, active, close, openInsert, onBodyClick, blocks }, where
   `blocks` is the body to render — the parsed nodes, with the open field in
   place of the block it edits. Click handling is delegated: spread
   `onClick: onBodyClick` onto whatever element contains them. */
export function useBlockEditor({
  body,
  setBody,
  editing,
  parse = defaultParse,
  revealScope,
  placeholder = "Write, or type ## for a heading",
  newClassName = "indent max-w-measure text-muted",
}) {
  const parsed = useMemo(() => parse(body), [body, parse]);

  /* The field being edited: an existing block (`index`) or a new one going in
     after block `insertAfter` (-1: before the first). `seq` remounts the field
     whenever the target changes, so focus and caret are set fresh. */
  const [active, setActive] = useState(null);
  const seq = useRef(0);
  const activeSeq = useRef(0);
  const openBlock = (text, index, caret = "end") => {
    const p = parse(text);
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

  const countBlocks = (text) => (String(text).trim() ? parse(text).blocks.length : 0);

  /* ── Committing a field ── */

  /* The body with the active field's draft written in, and how many blocks the
     draft became. `base` is the index of the first of them. */
  const committed = () => {
    const { lines, blocks } = parsed;
    if (!active) return { body, base: 0, span: 0 };
    const text = active.draft;
    if (active.index != null) {
      const block = blocks[active.index];
      const unchanged = text === active.shown;
      return {
        body: unchanged ? body : replaceBlock(lines, block, text),
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
        const { body: next, base, span } = committed();
        setBody(next);
        openInsert(base + span - 1);
      } else if (!before.trim()) {
        // At the very start: a new block above this one.
        openInsert(active.index - 1);
        setBody(committed().body);
      } else {
        // In the middle: two blocks, caret at the start of the second.
        const { lines, blocks } = parsed;
        const next = replaceBlock(lines, blocks[active.index], `${before.trimEnd()}\n\n${after.trimStart()}`);
        setBody(next);
        openBlock(next, active.index + countBlocks(before), 0);
      }
      return;
    }

    if (e.key === "Backspace" && atStart) {
      if (!active.draft) {
        e.preventDefault();
        if (isBlock) {
          const { lines, blocks } = parsed;
          const next = removeBlock(lines, blocks[active.index]);
          setBody(next);
          if (active.index > 0) openBlock(next, active.index - 1);
          else close();
        } else if (active.insertAfter >= 0) {
          openBlock(body, active.insertAfter);
        } else {
          close();
        }
        return;
      }
      const prev = isBlock && parsed.blocks[active.index - 1];
      if (kind === "paragraph" && prev && prev.kind === "paragraph") {
        e.preventDefault();
        const { body: next, caret } = mergeWithPrevious(parsed.lines, parsed.blocks, active.index, active.draft);
        setBody(next);
        openBlock(next, active.index - 1, caret);
      }
      return;
    }

    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && isBlock) {
      e.preventDefault();
      const dir = e.key === "ArrowUp" ? -1 : 1;
      const { body: next, span } = committed();
      if (span !== 1) {
        setBody(next);
        close();
        return;
      }
      const p = parse(next);
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
      const { body: next, base, span } = committed();
      const target = e.key === "ArrowUp" ? base - 1 : base + span;
      if (target < 0 || target >= parse(next).blocks.length) return;
      e.preventDefault();
      setBody(next);
      openBlock(next, target, e.key === "ArrowUp" ? "end" : 0);
    }
  };

  /* The field's own blur: commit, unless a keyboard action already moved on to
     another field (it bumped the sequence before this one unmounted). */
  const onFieldBlur = (fieldSeq) => () => {
    if (activeSeq.current === fieldSeq) finish();
  };

  /* ── Block tools ── */
  const moveActive = (dir) => {
    const { body: next, span } = committed();
    const p = parse(next);
    if (span !== 1) {
      setBody(next);
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
    const next = active ? committed().body : body;
    if (active) setBody(next);
    openBlock(next, index);
  };

  // Leaving edit mode commits whatever field is open.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the page-wide mode, which lives outside React
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
    if (!revealScope) return;
    const all = document.querySelectorAll(`${revealScope} .reveal`);
    if (!firstPaint.current) {
      firstPaint.current = new WeakSet(all);
      return;
    }
    for (const el of all) {
      if (!el.classList.contains("in") && !firstPaint.current.has(el)) el.classList.add("in", "instant");
    }
  });

  /* ── Render ──
     Blocks are the renderer's own elements, keys and all, with only a
     data-block attribute added — so entering edit mode changes props, not the
     tree, and nothing that isn't being edited moves, resizes or remounts. */
  const field = (key) => (
    <Field
      key={key}
      value={active.draft}
      caret={active.caret}
      onChange={setDraft}
      onKeyDown={onFieldKey}
      onBlur={onFieldBlur(active.seq)}
      mono={active.index != null && parsed.blocks[active.index].kind === "code"}
      placeholder={placeholder}
    />
  );

  const insertField = (after) =>
    editing && active && active.index == null && active.insertAfter === after ? (
      <div key={`new-${after}`} className={`wb-field ${newClassName}`} data-kind="new">
        {field(active.seq)}
      </div>
    ) : null;

  /* Keyed by content, not position: inserting or splitting a block leaves
     every block after it with the same key, so React keeps their elements
     rather than rebuilding the rest of the body. */
  const seen = {};
  const keyOf = (block) => {
    const src = blockSource(parsed.lines, block);
    const n = (seen[src] = (seen[src] || 0) + 1);
    return `${block.kind}:${n}:${src}`;
  };

  const blocks = [insertField(-1)];
  parsed.blocks.forEach((block, i) => {
    if (editing && active && active.index === i) {
      const cls = (block.node?.props?.className || newClassName).replace(/\breveal\b/, "");
      blocks.push(
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
      blocks.push(cloneElement(block.node, { key: keyOf(block), "data-block": i }));
    }
    // A footnote definition (no node of its own) is set at the foot, by the caller.
    blocks.push(insertField(i));
  });

  return { parsed, active, close, openInsert, onBodyClick, blocks };
}
