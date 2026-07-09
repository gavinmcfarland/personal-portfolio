import { useCanvas } from '../CanvasProvider';

export default function Hint() {
  const { hintHidden, setHintHidden, EDITABLE } = useCanvas();
  if (hintHidden) return null;
  return (
    <div className="ui panel" id="hint">
      <span className="x" onClick={() => setHintHidden(true)}>✕</span>
      <b>Explore the board.</b> Drag empty space to pan · scroll to move · <span className="kbd">⌘/Ctrl</span>+scroll or pinch to zoom.
      {EDITABLE && (
        <>
          <br />
          Add notes, <b>Markdown</b>, text or drawings. Draw an <b>Anchor</b> box for a jump-to section. <b>Right-click</b> to send front/back. Auto-saves.
        </>
      )}
    </div>
  );
}
