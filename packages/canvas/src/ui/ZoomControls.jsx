import { Maximize, Minus, Plus } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';

export default function ZoomControls() {
  const { eng, zoomLabelRef } = useCanvas();
  return (
    <div className="ui panel" id="zoom">
      <button id="zoomFit" title="Frame all content" onClick={() => eng.fitAll()}>
        <Maximize />
      </button>
      <span className="zoom-sep" />
      <button id="zoomOut" title="Zoom out" onClick={() => eng.zoomCenter(1 / 1.25)}>
        <Minus />
      </button>
      <span id="zoomval" title="Reset to 100%" ref={zoomLabelRef} onClick={() => eng.zoomTo(1)}>100%</span>
      <button id="zoomIn" title="Zoom in" onClick={() => eng.zoomCenter(1.25)}>
        <Plus />
      </button>
    </div>
  );
}
