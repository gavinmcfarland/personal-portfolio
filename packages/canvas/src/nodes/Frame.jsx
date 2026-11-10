import { memo } from 'react';

/* Sits the section's fill under every other object on the board. Nodes sent to
   the back take ever-lower z values (backZ), so this sits far below any of them. */
const FILL_Z = -1e6;
import { useRegister } from './common';

/* Anchor / section region. The node itself is an invisible box — it holds the
   region's geometry and takes the drags/hit-tests. The outline and the draggable
   label are drawn in the screen-space chrome layer (see Chrome.jsx), so neither
   thickens as the board zooms in; the faint fill is a sibling in the world,
   stacked under everything else. */
function Frame({ node }) {
  const { setRef, dataProps, x, y, reflowed } = useRegister(node);
  const style = {
    transform: `translate(${x}px,${y}px) scale(${node.scale || 1})`,
    zIndex: node.z,
    width: (node.w || 200) + 'px',
    height: (node.h || 140) + 'px',
    ...(reflowed ? { transition: 'transform 200ms ease' } : null),
  };
  // The faint fill lives in the world, not the chrome layer: the chrome sits
  // above the board, so a wash there would tint everything inside the section.
  // `--cv-frame-sc` lets its radius match the screen-space outline's at any
  // object scale (the world's zoom is folded in via --cv-inv-zoom).
  const fillStyle = { ...style, zIndex: FILL_Z, '--cv-frame-sc': node.scale || 1 };
  return (
    <>
      <div className="cv-frame-fill" aria-hidden="true" style={fillStyle} />
      <div ref={setRef} className="cv-node cv-frame" {...dataProps} data-name={node.name} style={style} />
    </>
  );
}

export default memo(Frame);
