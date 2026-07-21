import { useEffect, useState } from 'react';
import { Square, X } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';

/* Floating panel shown while the microphone is capturing. Reflects the engine's
   `recording` state (the MediaRecorder itself lives in the engine so a capture
   survives re-renders and never persists half-finished). Stop drops a finished
   sound node; cancel discards. */
function fmt(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function Recorder() {
  const { recording, eng } = useCanvas();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!recording) return undefined;
    const start = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Date.now() - start), 200);
    return () => clearInterval(id);
  }, [recording]);

  if (!recording) return null;

  return (
    <div className="cv-ui cv-panel cv-show" data-cv-part="recorder">
      <span className="cv-rec-dot" />
      <span className="cv-rec-time">{fmt(elapsed)}</span>
      <button className="cv-rec-btn cv-stop" title="Stop &amp; add" onClick={() => eng.stopRecording()}>
        <Square />
      </button>
      <button className="cv-rec-btn cv-cancel" title="Cancel" onClick={() => eng.cancelRecording()}>
        <X />
      </button>
    </div>
  );
}
