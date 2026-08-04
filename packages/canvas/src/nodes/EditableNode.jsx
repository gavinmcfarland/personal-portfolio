import { memo, useEffect, useRef } from 'react';
import { useCanvas } from '../CanvasProvider';
import { useRegister } from './common';
import { sanitizeRich, isRichHtml, applyListShortcut } from '../rich-text';

/* Sticky notes & free text blocks — uncontrolled contentEditable so React never
   fights the caret. Text commits to the model on blur. Empty text blocks
   self-delete (they'd be invisible); empty stickies stay — the note itself is
   a visible object the user placed.

   Text blocks are rich: they carry bold / italic / underline / strikethrough and
   lists (see rich-text.js), typed with the browser's own ⌘B/⌘I/⌘U, applied from
   the properties panel, or auto-formatted from a "- " / "1. " line opener.
   Stickies stay plain — they're a label on a note, not a document. */
function EditableNode({ node }) {
  const { editingId, readOnly, eng, nodeEls, actionRef } = useCanvas();
  const { setRef, dataProps, style } = useRegister(node);
  const txtRef = useRef(null);
  const editing = editingId === node.id;
  const hug = node.w == null;
  const align = node.align || 'left';
  const rich = node.type !== 'sticky';

  // Watch the node's size for two jobs. While editing: keep the selection
  // outline in sync as the text grows/shrinks the node (text isn't committed to
  // state until blur, so nothing else fires). And for a hugging centre/right-
  // aligned block: keep it anchored — the box's centre (or right edge) stays
  // put as the width changes, so centred text grows evenly and right-aligned
  // text grows leftward. The anchor is derived from the committed x each time
  // the effect re-runs (a shift we make re-derives the same anchor; a drag
  // re-derives a new one). Skipped mid-gesture: resizes and cmd-drag font
  // scaling style the element imperatively, and a state write here would fight
  // them — the post-gesture commit re-fires this observer anyway.
  useEffect(() => {
    const anchored = hug && align !== 'left';
    if ((!editing && !anchored) || typeof ResizeObserver === 'undefined') return;
    const el = nodeEls.get(node.id);
    if (!el) return;
    const k = align === 'center' ? 0.5 : 1;
    const sc = node.scale || 1;
    const anchor = node.x + el.offsetWidth * sc * k;
    const ro = new ResizeObserver(() => {
      if (anchored && !el.dataset.w && !actionRef.current) {
        const nx = anchor - el.offsetWidth * sc * k;
        if (Math.abs(nx - node.x) > 0.01) { eng.updateNode(node.id, { x: nx }); return; }
      }
      eng.syncChrome();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [editing, hug, align, eng, nodeEls, actionRef, node.id, node.x, node.scale]);

  // Seed the text exactly once; the DOM owns it thereafter. A formatted block
  // seeds from its (re-sanitised) HTML — the stored markup is already clean, but
  // a snapshot is just JSON and may have been authored or edited anywhere.
  useEffect(() => {
    const txt = txtRef.current;
    if (!txt) return;
    if (rich && node.html) txt.innerHTML = sanitizeRich(node.html);
    else txt.textContent = node.text || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const txt = txtRef.current;
    if (!txt) return;
    if (editing) {
      txt.contentEditable = 'true';
      // Make the browser's own ⌘B/⌘I/⌘U emit <b>/<i>/<u> rather than inline
      // styles, which the sanitiser would strip along with every other
      // attribute — the formatting would appear to type and then vanish.
      try { document.execCommand('styleWithCSS', false, false); } catch { /* not supported */ }
      txt.focus();
      const r = document.createRange();
      r.selectNodeContents(txt);
      r.collapse(false);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    } else {
      txt.contentEditable = 'false';
    }
  }, [editing]);

  const commit = () => {
    const txt = txtRef.current;
    // `innerText` reads the text as laid out, so line breaks and list items each
    // land on their own line whichever way the browser represented them.
    const text = txt ? (rich ? txt.innerText : txt.textContent) : '';
    if (text.trim() === '' && node.type !== 'sticky') { eng.removeNode(node.id); eng.stopEditing(); return; }
    if (rich && txt) {
      const html = sanitizeRich(txt.innerHTML);
      txt.innerHTML = html; // keep the live DOM identical to what we store
      eng.updateNode(node.id, { text, html: isRichHtml(html) ? html : undefined });
    } else {
      eng.updateNode(node.id, { text });
    }
    eng.stopEditing();
  };

  /* Paste never brings foreign markup in as-is: rich blocks take the sanitised
     subset of the pasted HTML, everything else takes plain text. */
  const onPaste = (e) => {
    const cd = e.clipboardData;
    if (!cd) return;
    e.preventDefault();
    e.stopPropagation();
    const html = rich ? sanitizeRich(cd.getData('text/html')) : '';
    if (html) document.execCommand('insertHTML', false, html);
    else document.execCommand('insertText', false, cd.getData('text/plain'));
  };

  /* Markdown-style list shortcuts fire off the space keystroke that closes a
     line-opening "-" / "1." marker. */
  const onInput = (e) => {
    if (!rich) return;
    const ne = e.nativeEvent;
    if (ne.inputType === 'insertText' && ne.data === ' ') applyListShortcut(txtRef.current);
  };

  const onDoubleClick = (e) => {
    if (readOnly) return;
    e.stopPropagation();
    eng.selectNode(node.id);
    eng.startEditing(node.id);
  };

  const isSticky = node.type === 'sticky';
  // The editing state rides the existing data-editing="1" attribute (below), so
  // no separate class is needed on the wrapper.
  const cls = `cv-node ${isSticky ? 'cv-sticky' : 'cv-tblock'}`;
  // A text block starts width-less (single line, grows as you type); once the
  // user resizes it, the stored width fixes the box and the text wraps inside.
  let sizedStyle = node.w != null ? { ...style, width: node.w + 'px' } : style;
  if (node.fontSize != null) sizedStyle = { ...sizedStyle, fontSize: node.fontSize + 'px' };
  if (node.align && node.align !== 'left') sizedStyle = { ...sizedStyle, textAlign: node.align };

  return (
    <div
      ref={setRef}
      className={cls}
      {...dataProps}
      {...(isSticky ? { 'data-color': node.color } : { 'data-font': node.font || 'serif' })}
      data-editing={editing ? '1' : ''}
      style={sizedStyle}
      onDoubleClick={onDoubleClick}
    >
      <div
        className="cv-txt"
        ref={txtRef}
        onBlur={commit}
        onInput={onInput}
        onPaste={onPaste}
        suppressContentEditableWarning
      />
    </div>
  );
}

export default memo(EditableNode);
