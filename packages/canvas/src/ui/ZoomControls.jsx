import { useCanvas } from '../CanvasProvider';

export default function ZoomControls() {
  const { eng, zoomLabelRef } = useCanvas();
  return (
    <div className="ui panel" id="zoom">
      <button id="zoomFit" title="Frame all content" onClick={() => eng.fitAll()}>
        <svg viewBox="0 0 24 24">
          <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
        </svg>
      </button>
      <span className="zoom-sep" />
      <button id="zoomOut" title="Zoom out" onClick={() => eng.zoomCenter(1 / 1.25)}>−</button>
      <span id="zoomval" title="Reset to 100%" ref={zoomLabelRef} onClick={() => eng.zoomTo(1)}>100%</span>
      <button id="zoomIn" title="Zoom in" onClick={() => eng.zoomCenter(1.25)}>+</button>
    </div>
  );
}
