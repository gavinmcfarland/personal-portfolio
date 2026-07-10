import { memo } from 'react';
import { useCanvas } from '../CanvasProvider';
import { useRegister, useMediaSrc } from './common';

/* Dropped image object. Stored as a committed static asset (see the canvas-save
   Vite plugin); the node only holds its URL and display size. Double-click (or
   the context-menu action) opens it in the full-screen lightbox. */
function ImageNode({ node }) {
  const { eng } = useCanvas();
  const { setRef, dataProps, style } = useRegister(node);
  const src = useMediaSrc(node.src);
  const s = { ...style, width: (node.w || 200) + 'px', height: (node.h || 150) + 'px' };
  return (
    <div
      ref={setRef}
      className="node image"
      {...dataProps}
      style={s}
      onDoubleClick={(e) => { e.stopPropagation(); eng.openFullscreen(node.id); }}
    >
      <img src={src || undefined} alt={node.alt || ''} draggable={false} />
    </div>
  );
}

export default memo(ImageNode);
