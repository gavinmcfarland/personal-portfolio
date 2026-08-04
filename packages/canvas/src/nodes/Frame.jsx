import { memo } from 'react';
import { useRegister } from './common';

/* Anchor / section region. The node itself is an invisible box — it holds the
   region's geometry and takes the drags/hit-tests. Both the things you SEE (the
   dashed outline and the draggable label) are drawn in the screen-space chrome
   layer (see Chrome.jsx), so neither thickens as the board zooms in. */
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
    <div ref={setRef} className="cv-node cv-frame" {...dataProps} data-name={node.name} style={style} />
  );
}

export default memo(Frame);
