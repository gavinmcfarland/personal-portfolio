import { memo } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { useRegister, useMediaSrc } from './common';

/* Link / bookmark card. Created by pasting or dropping a URL onto the board; the
   host's `onUnfurl` adapter fetches the page's Open Graph metadata (title,
   description, image) and bakes it into the node, so a committed board renders
   the card with no runtime network fetch (and it shows up in read-only previews
   unchanged). The whole card is an <a> (kept for semantics / middle-click), but
   navigation is always driven programmatically: the pointer handlers open it on a
   stationary tap (see Canvas — read-only or edit), so the native click is always
   suppressed and a drag/pan over the card never navigates. */
function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url || ''; }
}

function LinkCard({ node }) {
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
      // The card is a draggable / pannable object, not a live link — the pointer
      // handlers own opening it (a stationary tap opens it, a drag pans/moves it;
      // see Canvas). Suppress the native navigation in every mode so a tap can't
      // both open programmatically and navigate the anchor (a double-open on
      // touch, where the read-only pan also starts on the card).
      onClick={(e) => e.preventDefault()}
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
