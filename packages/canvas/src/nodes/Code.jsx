import { memo, useEffect, useRef, useState } from 'react';
import { Copy, Check, Wand2, WrapText } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { useRegister } from './common';
import { codeHighlight, codeLangLabel, CODE_LANGS, normalizeLang } from '../code';
import { formatCode as builtinFormat } from '../code-format';

const FORMAT_DEBOUNCE = 220; // ms of idle before an on-type reformat runs
const INDENT = '  ';         // one indent step (matches tab-size / Tab handling)

/* Code card — highlighted source at rest, a live-highlighted source editor while
   editing. Same caret-safe technique as the markdown node: an uncontrolled
   <textarea> sits transparently over a mirrored <pre> that paints the syntax
   highlight and drives the box height. A small header shows / edits the language
   and offers copy-to-clipboard.

   Highlighting defaults to the package's built-in tokeniser (code.js) but a host
   can override it by passing `highlightCode(src, lang)` to <Canvas> (e.g. wired
   to Shiki / Prism), keeping any such library entirely optional. */
function Code({ node }) {
  const { editingId, readOnly, eng, nodeEls, highlightCode, formatCode, formatOnType, setFormatOnType } = useCanvas();
  const { setRef, dataProps } = useRegister(node);
  const taRef = useRef(null);
  const hlRef = useRef(null);      // the highlight <pre>, kept scroll-synced with the textarea
  const headerHit = useRef(false); // true between a header pointer-down and the resulting blur
  const committed = useRef(false); // guards against committing twice per edit session
  const fmtTimer = useRef(0);      // pending debounced on-type reformat
  const composing = useRef(false); // true during IME composition (don't reformat mid-compose)
  const lang = node.lang || 'js';
  const [src, setSrc] = useState(node.text || '');
  const [copied, setCopied] = useState(false);
  const editing = editingId === node.id;
  const hl = highlightCode || codeHighlight;
  // `format` is a global preference (shared by every code object); `wrap` is
  // per-node. A host can swap in a real formatter (e.g. Prettier's
  // formatWithCursor) through the `formatCode` prop.
  const fmt = formatCode || builtinFormat;
  const fmtOn = formatOnType !== false;
  const wrap = node.wrap != null ? node.wrap : true;
  const typeFormat = fmtOn && !!fmt;

  // While editing, keep the selection outline in sync as the source grows/shrinks
  // the node (edits live in local state, so the provider's sync never fires).
  useEffect(() => {
    if (!editing || typeof ResizeObserver === 'undefined') return;
    const el = nodeEls.get(node.id);
    if (!el) return;
    const ro = new ResizeObserver(() => eng.syncChrome());
    ro.observe(el);
    return () => ro.disconnect();
  }, [editing, eng, nodeEls, node.id]);

  useEffect(() => {
    if (!editing) return;
    committed.current = false;
    const ta = taRef.current;
    if (!ta) return;
    setSrc(ta.value);
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, [editing]);

  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    clearTimeout(fmtTimer.current);
    const text = taRef.current ? taRef.current.value : src;
    eng.updateNode(node.id, { text });
    eng.stopEditing();
  };

  // Reformat the live buffer in place, preserving the caret. Runs on idle (see
  // scheduleFormat) so it never fights active typing. Supports sync or async
  // formatters and silently keeps the raw text if the formatter rejects/throws.
  const runFormat = () => {
    const ta = taRef.current;
    if (!ta || composing.current) return;
    const before = ta.value;
    const pos = ta.selectionStart;
    Promise.resolve()
      .then(() => fmt(before, lang, { cursorOffset: pos }))
      .then((res) => {
        const el = taRef.current;
        if (!el || el.value !== before) return; // stale: unmounted, or user typed since
        const formatted = typeof res === 'string' ? res : res && res.formatted;
        if (formatted == null || formatted === before) return;
        const rawPos = typeof res === 'string' ? pos : (res.cursorOffset != null ? res.cursorOffset : pos);
        const caret = Math.max(0, Math.min(rawPos, formatted.length));
        el.value = formatted;
        try { el.setSelectionRange(caret, caret); } catch { /* not focused */ }
        setSrc(formatted);
        eng.syncChrome();
      })
      .catch(() => { /* formatter rejected invalid/incomplete code — leave as-is */ });
  };

  const scheduleFormat = () => {
    if (!typeFormat) return;
    clearTimeout(fmtTimer.current);
    fmtTimer.current = setTimeout(runFormat, FORMAT_DEBOUNCE);
  };

  // Cancel any pending reformat when editing ends (and on unmount).
  useEffect(() => {
    if (!editing) clearTimeout(fmtTimer.current);
    return () => clearTimeout(fmtTimer.current);
  }, [editing]);

  // Clicking outside the node exits editing. The textarea's blur normally handles
  // this, but opening the language dropdown moves focus onto the <select>, so the
  // textarea won't fire another blur — a later outside click would otherwise leave
  // the node stuck in edit mode. This pointer-down listener covers that case.
  useEffect(() => {
    if (!editing) return undefined;
    const onDown = (e) => {
      const el = nodeEls.get(node.id);
      if (el && !el.contains(e.target)) commit();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, node.id, nodeEls]);

  // Blur only commits when focus actually leaves the node. Clicking the in-node
  // language picker moves focus off the textarea but must not exit editing —
  // detect it via relatedTarget, falling back to the header pointer-down flag
  // (some browsers report a null relatedTarget when a native <select> opens).
  const onBlur = (e) => {
    const nodeEl = e.currentTarget.closest('.node.code');
    const toHeader = e.relatedTarget && nodeEl && nodeEl.contains(e.relatedTarget);
    if (toHeader || headerHit.current) { headerHit.current = false; return; }
    commit();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur(); return; }
    const ta = e.currentTarget;
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ta.selectionStart, en = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en);
      ta.selectionStart = ta.selectionEnd = s + 2;
      setSrc(ta.value);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const prevIndent = (v.slice(lineStart, s).match(/^[ \t]*/) || [''])[0]; // fallback baseline
      const before = v.slice(0, s), after = v.slice(en);
      const prevCh = before.slice(-1);
      // Expand a bracket / tag pair the caret sits inside onto three lines.
      const pairs = { '{': '}', '(': ')', '[': ']' };
      const braceExpand = pairs[prevCh] && after.charAt(0) === pairs[prevCh];
      const htmlExpand = normalizeLang(lang) === 'html' && prevCh === '>' && before.slice(-2) !== '/>' && /^\s*<\//.test(after);
      let caret;
      if (braceExpand || htmlExpand) {
        const rest = after.replace(/^[ \t]*/, '');
        ta.value = before + '\n' + prevIndent + INDENT + '\n' + prevIndent + rest;
        caret = before.length + 1 + prevIndent.length + INDENT.length;
      } else {
        ta.value = before + '\n' + prevIndent + after;
        caret = before.length + 1 + prevIndent.length;
      }
      ta.setSelectionRange(caret, caret);
      setSrc(ta.value);
      // Reformat immediately (not debounced) so the new line lands at its correct
      // structural indent right away. The formatter overrides the baseline above
      // for supported languages; for others the baseline stands.
      if (typeFormat) { clearTimeout(fmtTimer.current); runFormat(); }
    }
  };

  const onInput = (e) => {
    setSrc(e.target.value);
    const it = (e.nativeEvent && e.nativeEvent.inputType) || '';
    // Don't reformat on deletions or undo/redo — otherwise removing indentation
    // (or undoing) is instantly reverted by the reindenter. Also cancel any
    // already-pending reformat so a prior keystroke doesn't bring it back.
    if (it.startsWith('delete') || it === 'historyUndo' || it === 'historyRedo') {
      clearTimeout(fmtTimer.current);
      return;
    }
    // A paste (or drag-drop) is a discrete block insertion, not live typing:
    // reformat it immediately rather than waiting out the type-debounce, so
    // pasted code snaps to structure at once — and doesn't get skipped if the
    // user clicks away before the debounce fires.
    if (it === 'insertFromPaste' || it === 'insertFromDrop') {
      if (typeFormat) { clearTimeout(fmtTimer.current); runFormat(); }
      return;
    }
    scheduleFormat();
  };

  const onDoubleClick = (e) => {
    if (readOnly) return;
    e.stopPropagation();
    eng.selectNode(node.id);
    eng.startEditing(node.id);
  };

  const setLang = (e) => {
    eng.updateNode(node.id, { lang: e.target.value });
    taRef.current?.focus();
  };

  const toggleFormat = (e) => {
    e.stopPropagation();
    setFormatOnType(!fmtOn); // global preference — affects every code object
    if (editing) taRef.current?.focus();
  };

  const toggleWrap = (e) => {
    e.stopPropagation();
    eng.updateNode(node.id, { wrap: !wrap });
    if (editing) taRef.current?.focus();
  };

  // Keep the highlight <pre> aligned with the textarea when it scrolls (matters
  // with wrapping off, where long lines scroll horizontally).
  const onScroll = (e) => {
    const p = hlRef.current;
    if (p) { p.scrollLeft = e.target.scrollLeft; p.scrollTop = e.target.scrollTop; }
  };

  const copy = (e) => {
    e.stopPropagation();
    // While editing, copy the live (uncommitted) editor text, not the stored value.
    const text = editing && taRef.current ? taRef.current.value : (node.text || '');
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1400); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => {});
    else done();
    if (editing) taRef.current?.focus(); // clicking the button blurred the textarea — restore it
  };

  const painted = hl(editing ? src : (node.text || ''), lang);
  const rendered = (node.text || '').trim()
    ? painted
    : '<span class="code-empty">Empty — double-click to edit</span>';

  const style = { transform: `translate(${node.x}px,${node.y}px)`, zIndex: node.z, width: (node.w || 420) + 'px' };

  return (
    <div
      ref={setRef}
      className={`node code${editing ? ' code-editing' : ''}${wrap ? '' : ' code-nowrap'}`}
      {...dataProps}
      style={style}
      onDoubleClick={onDoubleClick}
    >
      <div
        className="code-head"
        onPointerDown={(e) => {
          // Only the interactive controls swallow the gesture (so using them
          // doesn't drag the node or commit the edit); clicking bare header space
          // falls through to the canvas so the node can be selected / dragged.
          if (e.target.closest('button, select')) {
            e.stopPropagation();
            if (editing) headerHit.current = true;
          }
        }}
        onDoubleClick={(e) => { if (e.target.closest('button, select')) e.stopPropagation(); }}
      >
        {/* The visible language text is always this <span>, so it never shifts
            between states. While editing, a transparent <select> overlays it to
            provide the native dropdown; a chevron + border reveal the affordance. */}
        <span className="code-langbox">
          <span className="code-lang">{codeLangLabel(lang)}</span>
          {editing && (
            <select className="code-lang-sel" value={lang} onChange={setLang} aria-label="Language">
              {CODE_LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          )}
        </span>
        {/* Right-side actions — copy fades in on hover and is available in every
            mode (including view/readOnly, so viewers can grab the source). The
            format/wrap toggles are editing-only. Kept mounted so the header
            height stays constant. */}
        <div className="code-head-actions">
          {!readOnly && (
            <>
              <button
                className={`code-toggle${fmtOn ? ' on' : ''}`}
                title={fmtOn ? 'Format on type: on' : 'Format on type: off'}
                aria-pressed={fmtOn}
                onClick={toggleFormat}
              >
                <Wand2 />
              </button>
              <button
                className={`code-toggle${wrap ? ' on' : ''}`}
                title={wrap ? 'Wrap text: on' : 'Wrap text: off'}
                aria-pressed={wrap}
                onClick={toggleWrap}
              >
                <WrapText />
              </button>
            </>
          )}
          <button className="code-copy" title={copied ? 'Copied' : 'Copy'} onClick={copy}>
            {copied ? <Check /> : <Copy />}
          </button>
        </div>
      </div>
      <pre className="code-render"><code dangerouslySetInnerHTML={{ __html: rendered }} /></pre>
      <div className="code-edit">
        <pre className="code-hl" aria-hidden="true" ref={hlRef}><code dangerouslySetInnerHTML={{ __html: painted + '\n' }} /></pre>
        <textarea
          className="code-src"
          spellCheck={false}
          ref={taRef}
          defaultValue={node.text || ''}
          onInput={onInput}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onScroll={onScroll}
          onCompositionStart={() => { composing.current = true; clearTimeout(fmtTimer.current); }}
          onCompositionEnd={() => { composing.current = false; scheduleFormat(); }}
        />
      </div>
    </div>
  );
}

export default memo(Code);
