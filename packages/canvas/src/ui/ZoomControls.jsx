import { Maximize, Minus, Plus } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { cx } from '../constants';

export default function ZoomControls() {
  const { eng, zoomLabelRef, classNames } = useCanvas();
  return (
    <div className={cx('cv-ui cv-panel', classNames?.zoom)} data-cv-part="zoom">
      <button data-cv-part="zoom-fit" title="Frame all content" onClick={() => eng.fitAll()}>
        <Maximize />
      </button>
      <span className="cv-zoom-sep" />
      <button data-cv-part="zoom-out" title="Zoom out" onClick={() => eng.zoomCenter(1 / 1.25)}>
        <Minus />
      </button>
      <span className="cv-zoomval" title="Reset to 100%" ref={zoomLabelRef} onClick={() => eng.zoomTo(1)}>100%</span>
      <button data-cv-part="zoom-in" title="Zoom in" onClick={() => eng.zoomCenter(1.25)}>
        <Plus />
      </button>
    </div>
  );
}
