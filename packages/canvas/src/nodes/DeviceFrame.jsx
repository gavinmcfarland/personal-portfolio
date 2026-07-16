import { ChevronLeft, ChevronRight, RotateCw, Code, X } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';

/* A CSS-styled device frame wrapped around a single image / video node. The
   frame is pure decoration drawn *inside* the node box: a fixed-height chrome
   bar (world px, so it scales with zoom like everything else) sits above a
   flex:1 screen that holds the media, so the frame grows to whatever size the
   media is. The bar is inert to pointers (pointer-events:none) so grabbing it
   still drags the node; only an editable field re-enables its own pointer so it
   can be edited without starting a drag.

   `node.frame` names the style. Three exist today — an abstract browser chrome, a
   Figma-style plugin window, and a macOS-style terminal; more (phone, tablet, …)
   can slot in as another bar renderer + a `.cv-df--<style>` CSS block. */

/* A committed-on-blur text field shared by the frame labels (browser URL /
   plugin title). Read-only boards show static text; editing never starts a node
   drag because the input captures its own pointer. */
function FrameField({ node, field, value, placeholder, className }) {
  const { readOnly, eng } = useCanvas();
  if (readOnly) return <span className={`${className} cv-df-field-text`}>{value}</span>;
  return (
    <input
      className={`${className} cv-df-field-input`}
      defaultValue={node[field] || ''}
      placeholder={placeholder}
      spellCheck={false}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      onBlur={(e) => {
        const v = e.currentTarget.value.trim();
        if (v !== (node[field] || '')) eng.updateNode(node.id, { [field]: v || undefined });
      }}
    />
  );
}

/* Abstract browser chrome: traffic-light dots, back/forward/reload, a URL pill. */
function BrowserBar({ node }) {
  return (
    <div className="cv-df-bar cv-df-bar--browser">
      <span className="cv-df-dots">
        <i />
        <i />
        <i />
      </span>
      <span className="cv-df-nav">
        <ChevronLeft strokeWidth={2.2} />
        <ChevronRight strokeWidth={2.2} />
        <RotateCw strokeWidth={2.2} />
      </span>
      <div className="cv-df-url">
        <FrameField node={node} field="frameUrl" value={node.frameUrl || 'example.com'} placeholder="example.com" className="cv-df-url-field" />
      </div>
    </div>
  );
}

/* Figma-style plugin window: an app icon + name on the left, a close button on
   the right (see the reference screenshot). */
function PluginBar({ node }) {
  return (
    <div className="cv-df-bar cv-df-bar--plugin">
      <span className="cv-df-icon">
        <Code strokeWidth={2.2} />
      </span>
      <FrameField node={node} field="frameTitle" value={node.frameTitle || 'Plugin'} placeholder="Plugin" className="cv-df-title" />
      <span className="cv-df-close">
        <X strokeWidth={2.2} />
      </span>
    </div>
  );
}

/* macOS-style terminal: traffic-light dots on the left, a centred monospace
   title. The spacer mirrors the dots' width so the title stays truly centred. */
function TerminalBar({ node }) {
  return (
    <div className="cv-df-bar cv-df-bar--terminal">
      <span className="cv-df-dots">
        <i />
        <i />
        <i />
      </span>
      <FrameField node={node} field="frameTitle" value={node.frameTitle || 'bash'} placeholder="bash" className="cv-df-termtitle" />
      <span className="cv-df-termspacer" />
    </div>
  );
}

const BARS = { plugin: PluginBar, terminal: TerminalBar };

/* Just the chrome bar for `node.frame`'s style — for nodes that keep their own
   stable wrapper structure (the html node renders its cv-df/cv-df-screen
   skeleton permanently so toggling the frame never re-parents its iframe,
   which would reload the document). */
export function FrameBar({ node }) {
  const Bar = BARS[node.frame] || BrowserBar;
  return <Bar node={node} />;
}

export default function DeviceFrame({ node, children }) {
  // --cv-df-bar (the chrome-bar height, and the unit every chrome metric derives
  // from) is set on the node element by MediaNode so the node's corner radius can
  // scale off it too; here it's just inherited.
  return (
    <div className={`cv-df cv-df--${node.frame}`}>
      <FrameBar node={node} />
      <div className="cv-df-screen">{children}</div>
    </div>
  );
}
