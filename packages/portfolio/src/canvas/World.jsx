import { useCanvas } from './CanvasProvider';
import Card from './nodes/Card';
import EditableNode from './nodes/EditableNode';
import Markdown from './nodes/Markdown';
import Frame from './nodes/Frame';
import ImageNode from './nodes/Image';
import Shape from './Shape';

function NodeView({ node }) {
  switch (node.type) {
    case 'card':
      return <Card node={node} />;
    case 'sticky':
    case 'tblock':
      return <EditableNode node={node} />;
    case 'md':
      return <Markdown node={node} />;
    case 'frame':
      return <Frame node={node} />;
    case 'image':
      return <ImageNode node={node} />;
    default:
      return null;
  }
}

export default function World() {
  const { nodes, shapes, draft, worldRef } = useCanvas();
  return (
    <div id="world" ref={worldRef}>
      {shapes.map((s) => <Shape key={s.id} shape={s} />)}
      {draft && <Shape key="draft" shape={draft} draft />}
      {nodes.map((n) => <NodeView key={n.id} node={n} />)}
    </div>
  );
}
