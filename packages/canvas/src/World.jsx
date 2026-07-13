import { useCanvas } from './CanvasProvider';
import EditableNode from './nodes/EditableNode';
import Markdown from './nodes/Markdown';
import Code from './nodes/Code';
import Frame from './nodes/Frame';
import MediaNode from './nodes/Media';
import SoundNode from './nodes/Sound';
import LinkCard from './nodes/Link';
import Shape from './Shape';

/* Built-in node renderers. Consumers extend this map via the `nodeTypes` prop
   (e.g. the portfolio registers its data-driven `card` renderer). */
const BUILTIN_TYPES = {
  sticky: EditableNode,
  tblock: EditableNode,
  md: Markdown,
  code: Code,
  frame: Frame,
  image: MediaNode,
  video: MediaNode,
  sound: SoundNode,
  link: LinkCard,
};

function NodeView({ node, nodeTypes }) {
  const Renderer = (nodeTypes && nodeTypes[node.type]) || BUILTIN_TYPES[node.type];
  return Renderer ? <Renderer node={node} /> : null;
}

export default function World() {
  const { nodes, shapes, draft, worldRef, nodeTypes } = useCanvas();
  return (
    <div className="cv-world" ref={worldRef}>
      {shapes.map((s) => <Shape key={s.id} shape={s} />)}
      {draft && <Shape key="draft" shape={draft} draft />}
      {nodes.map((n) => <NodeView key={n.id} node={n} nodeTypes={nodeTypes} />)}
    </div>
  );
}
