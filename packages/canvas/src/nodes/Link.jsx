import { memo } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { useRegister, useMediaSrc } from './common';

/* Link / bookmark card. Created by pasting or dropping a URL onto the board; the
   host's `onUnfurl` adapter fetches the page's Open Graph metadata (title,
   description, image) and bakes it into the node, so a committed board renders
   the card with no runtime network fetch (and it shows up in read-only previews
   unchanged). The whole card is an <a>: in read-only mode a stationary click
   opens it natively (pointerdown bails on anchors); in edit mode the click is
   suppressed so selecting/dragging never navigates — double-click opens it. */
function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url || ''; }
}

function LinkCard({ node }) {
  const { readOnly } = useCanvas();
  const { setRef, dataProps, style } = useRegister(node);
  const img = useMediaSrc(node.image || '');
  const s = { ...style, width: (node.w || 280) + 'px' };
  const host = hostOf(node.url);

  return (
    <a
      ref={setRef}
      className="node link"
      {...dataProps}
      style={s}
      href={node.url || undefined}
      target="_blank"
      rel="noreferrer noopener"
      // In edit mode the card is a draggable object, not a live link — suppress
      // the native navigation and let the pointer handlers own the click (a tap
      // opens it, see Canvas). In view mode (read-only) let the anchor work
      // natively so a plain click opens the URL.
      onClick={(e) => { if (!readOnly) e.preventDefault(); }}
      draggable={false}
    >
      {node.loading ? (
        <div className="link-loading"><Loader2 className="spin" /><span>Fetching link…</span></div>
      ) : (
        <>
          {img ? (
            <div className="link-thumb"><img src={img} alt="" draggable={false} /></div>
          ) : null}
          <div className="link-body">
            <div className="link-title">{node.title || host}</div>
            {node.desc ? <div className="link-desc">{node.desc}</div> : null}
            <div className="link-host">
              {node.favicon
                ? <img className="link-favicon" src={node.favicon} alt="" draggable={false} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                : <Link2 className="link-favicon-fallback" />}
              <span>{node.siteName || host}</span>
            </div>
          </div>
        </>
      )}
    </a>
  );
}

export default memo(LinkCard);
