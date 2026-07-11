import { memo, useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { useRegister } from './common';
import { codeHighlight, codeLangLabel, CODE_LANGS } from '../code';

/* Code card — highlighted source at rest, a live-highlighted source editor while
   editing. Same caret-safe technique as the markdown node: an uncontrolled
   <textarea> sits transparently over a mirrored <pre> that paints the syntax
   highlight and drives the box height. A small header shows / edits the language
   and offers copy-to-clipboard.

   Highlighting defaults to the package's built-in tokeniser (code.js) but a host
   can override it by passing `highlightCode(src, lang)` to <Canvas> (e.g. wired
   to Shiki / Prism), keeping any such library entirely optional. */
function Code({ node }) {
  const { editingId, readOnly, eng, nodeEls, highlightCode } = useCanvas();
  const { setRef, dataProps } = useRegister(node);
  const taRef = useRef(null);
  const headerHit = useRef(false); // true between a header pointer-down and the resulting blur
  const lang = node.lang || 'js';
  const [src, setSrc] = useState(node.text || '');
  const [copied, setCopied] = useState(false);
  const editing = editingId === node.id;
  const hl = highlightCode || codeHighlight;

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
    const ta = taRef.current;
    if (!ta) return;
    setSrc(ta.value);
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, [editing]);

  const commit = () => {
    const text = taRef.current ? taRef.current.value : src;
    eng.updateNode(node.id, { text });
    eng.stopEditing();
  };

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
      // Auto-indent: carry the current line's leading whitespace onto the new line.
      const s = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf('\n', s - 1) + 1;
      const indent = (ta.value.slice(lineStart, s).match(/^[ \t]*/) || [''])[0];
      if (indent) {
        e.preventDefault();
        const en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '\n' + indent + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + 1 + indent.length;
        setSrc(ta.value);
      }
    }
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

  const copy = (e) => {
    e.stopPropagation();
    const text = node.text || '';
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1400); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => {});
    else done();
  };

  const painted = hl(editing ? src : (node.text || ''), lang);
  const rendered = (node.text || '').trim()
    ? painted
    : '<span class="code-empty">Empty — double-click to edit</span>';

  const style = { transform: `translate(${node.x}px,${node.y}px)`, zIndex: node.z, width: (node.w || 420) + 'px' };

  return (
    <div
      ref={setRef}
      className={`node code${editing ? ' code-editing' : ''}`}
      {...dataProps}
      style={style}
      onDoubleClick={onDoubleClick}
    >
      <div
        className="code-head"
        onPointerDown={(e) => { e.stopPropagation(); if (editing) headerHit.current = true; }}
        onDoubleClick={(e) => e.stopPropagation()}
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
        {/* Kept mounted while editing (hidden via CSS) so the header height stays
            constant — its removal would otherwise shrink the header. */}
        {!readOnly && (
          <button className="code-copy" title={copied ? 'Copied' : 'Copy'} onClick={copy}>
            {copied ? <Check /> : <Copy />}
          </button>
        )}
      </div>
      <pre className="code-render"><code dangerouslySetInnerHTML={{ __html: rendered }} /></pre>
      <div className="code-edit">
        <pre className="code-hl" aria-hidden="true"><code dangerouslySetInnerHTML={{ __html: painted + '\n' }} /></pre>
        <textarea
          className="code-src"
          spellCheck={false}
          ref={taRef}
          defaultValue={node.text || ''}
          onInput={(e) => setSrc(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
      </div>
    </div>
  );
}

export default memo(Code);
