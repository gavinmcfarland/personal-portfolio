import { memo } from 'react';
import { useRegister } from './common';

/* Anchor / section region. The dashed box scales with zoom; its draggable label
   is rendered in the screen-space chrome layer (see Chrome.jsx). */
function Frame({ node }) {
  const { setRef, dataProps, x, y, reflowed } = useRegister(node);
  const style = {
    transform: `translate(${x}px,${y}px) scale(${node.scale || 1})`,
    zIndex: node.z,
    width: (node.w || 200) + 'px',
    height: (node.h || 140) + 'px',
    ...(reflowed ? { transition: 'transform 200ms ease' } : null),
  };
  return (
    <div ref={setRef} className="node frame" {...dataProps} data-name={node.name} style={style}>
      <div className="frame-body" />
    </div>
  );
}

export default memo(Frame);
