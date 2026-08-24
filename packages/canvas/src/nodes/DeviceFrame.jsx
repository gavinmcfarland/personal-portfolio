import { ChevronLeft, ChevronRight, RotateCw, Code, X } from 'lucide-react';
import { useCanvas } from '../CanvasProvider';
import { frameBarH } from '../constants';

/* A CSS-styled device frame wrapped around a single image / video node. The
   frame is pure decoration drawn *inside* the node box: a fixed-height chrome
   bar (world px, so it scales with zoom like everything else) sits above a
   flex:1 screen that holds the media, so the frame grows to whatever size the
   media is. The bar is inert to pointers (pointer-events:none) so grabbing it
   still drags the node; only an editable field re-enables its own pointer so it
   can be edited without starting a drag.

   `node.frame` names the style. Five exist today — an abstract browser chrome, a
   Figma-style plugin window, a macOS-style terminal, and an iOS and an Android
   frame; more can slot in as another bar renderer + a `.cv-df--<style>` CSS
   block + an entry in FRAME_BARS.

   The platform frames are deliberately NOT device shells: no bezel, no notch,
   no home indicator. A drawn phone competes with the prototype inside it (which
   usually draws its own status bar anyway) and dictates one aspect ratio; a
   labelled bar just says which platform this is and at what size, and leaves
   the screen to the design. */

/* Reload, in the frame's own toolbar — the reader's way back to the state the
   board opened this embed on.

   It appears only once the reader has driven the document somewhere (the page
   half says when; see PAGE_BRIDGE in html-bridge.js) and only in view mode: an
   author has the context menu, and a live control in every frame would be one
   more thing between them and the work.

   The bar is inert to pointers so grabbing it still drags the node — this takes
   its own back, the same exception the editable fields make.

   Every bar is laid out as three groups — left, centre, right — and this is the
   first thing in the RIGHT one, on every frame. One position across all five
   means a reader who finds it once knows where it is on the next embed, which a
   control that sits after the title here and after the size readout there does
   not give them. */
function FrameReset({ node }) {
  const { readOnly, htmlMoved, eng } = useCanvas();
  if (!readOnly || node.type !== 'html' || !htmlMoved.includes(node.id)) return null;
  return (
    <button
      type="button"
      className="cv-df-reset"
      title="Back to the start"
      aria-label="Back to the start"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); eng.restartHtml(node.id); }}
    >
      <RotateCw strokeWidth={2.2} />
    </button>
  );
}

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

/* Abstract browser chrome: traffic-light dots, back/forward, a URL pill — and,
   after the pill, the reload, which is the one control here that does anything.
   The drawn reload that used to sit beside the arrows is gone: two refresh
   glyphs in one bar, one of them inert, is a bar that lies about which one to
   press. */
function BrowserBar({ node }) {
  return (
    <div className="cv-df-bar cv-df-bar--browser">
      <span className="cv-df-group cv-df-group--left">
        <span className="cv-df-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="cv-df-nav">
          <ChevronLeft strokeWidth={2.2} />
          <ChevronRight strokeWidth={2.2} />
        </span>
      </span>
      <span className="cv-df-group cv-df-group--center">
        <div className="cv-df-url">
          <FrameField node={node} field="frameUrl" value={node.frameUrl || 'example.com'} placeholder="example.com" className="cv-df-url-field" />
        </div>
      </span>
      <span className="cv-df-group cv-df-group--right">
        <FrameReset node={node} />
      </span>
    </div>
  );
}

/* Figma-style plugin window: an app icon + name on the left, a close button on
   the right (see the reference screenshot). */
function PluginBar({ node }) {
  return (
    <div className="cv-df-bar cv-df-bar--plugin">
      <span className="cv-df-group cv-df-group--left">
        <span className="cv-df-icon">
          <Code strokeWidth={2.2} />
        </span>
        <FrameField node={node} field="frameTitle" value={node.frameTitle || 'Plugin'} placeholder="Plugin" className="cv-df-title" />
      </span>
      <span className="cv-df-group cv-df-group--center" />
      <span className="cv-df-group cv-df-group--right">
        <FrameReset node={node} />
        <span className="cv-df-close">
          <X strokeWidth={2.2} />
        </span>
      </span>
    </div>
  );
}

/* macOS-style terminal: traffic-light dots on the left, a centred monospace
   title. The title is truly centred by the bar's grid, not by balancing the
   dots against a spacer of the same width. */
function TerminalBar({ node }) {
  return (
    <div className="cv-df-bar cv-df-bar--terminal">
      <span className="cv-df-group cv-df-group--left">
        <span className="cv-df-dots">
          <i />
          <i />
          <i />
        </span>
      </span>
      <span className="cv-df-group cv-df-group--center">
        <FrameField node={node} field="frameTitle" value={node.frameTitle || 'bash'} placeholder="bash" className="cv-df-termtitle" />
      </span>
      <span className="cv-df-group cv-df-group--right">
        <FrameReset node={node} />
      </span>
    </div>
  );
}

/* The platform marks — abstract geometry, carrying no brand: a diamond for iOS,
   a triangle for Android. The label beside them is what names the platform; the
   mark's job is only to tell the two frames apart at a glance, which two
   different silhouettes do.

   Solid, not outlined. An outline reads as "shape with a hole in it" once it is
   down at tile size and the pair stops being tellable apart; filled silhouettes
   hold their shape.

   Every corner is rounded to match the tile it sits in — generated rather than
   hand-written, because a rounded corner on a polygon is an arc between two
   tangent points set r/tan(θ/2) back along each edge, and θ differs per shape
   (90° on the diamond, 60° on the triangle). The triangle is dropped 0.7 units
   below the true centre: a point-up triangle carries its mass low, so centring
   it geometrically leaves it looking as though it has ridden up. */
const DiamondMark = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9.95 5.45A2.9 2.9 0 0 1 14.05 5.45L18.55 9.95A2.9 2.9 0 0 1 18.55 14.05L14.05 18.55A2.9 2.9 0 0 1 9.95 18.55L5.45 14.05A2.9 2.9 0 0 1 5.45 9.95z" />
  </svg>
);
const TriangleMark = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9.66 6.85A2.7 2.7 0 0 1 14.34 6.85L18.24 13.6A2.7 2.7 0 0 1 15.9 17.65L8.1 17.65A2.7 2.7 0 0 1 5.76 13.6z" />
  </svg>
);

/* Platform frames — the plugin window's layout (icon tile + name on the left)
   with the platform's mark in the tile and, on the right, the size of the
   screen area.

   That readout is computed, not typed: it is the viewport the embedded document
   is actually being rendered at, which is the number worth seeing on a frame
   like this — resize the node and it follows. The node's own height minus the
   bar is the screen, so the figure is what the document sees, not what the box
   measures. */
function PlatformBar({ node, name, mark }) {
  const bar = node.frameScale ? (+node.h || 0) * node.frameScale : frameBarH(node.frame);
  const w = Math.round(+node.w || 0);
  const h = Math.round(Math.max(0, (+node.h || 0) - bar));
  return (
    <div className={`cv-df-bar cv-df-bar--${node.frame}`}>
      <span className="cv-df-group cv-df-group--left">
        <span className="cv-df-icon">{mark}</span>
        <FrameField node={node} field="frameTitle" value={node.frameTitle || name} placeholder={name} className="cv-df-title" />
      </span>
      <span className="cv-df-group cv-df-group--center" />
      <span className="cv-df-group cv-df-group--right">
        <FrameReset node={node} />
        <span className="cv-df-dims">{w}×{h}</span>
      </span>
    </div>
  );
}

const IosBar = ({ node }) => <PlatformBar node={node} name="iOS" mark={<DiamondMark />} />;
const AndroidBar = ({ node }) => <PlatformBar node={node} name="Android" mark={<TriangleMark />} />;

const BARS = { plugin: PluginBar, terminal: TerminalBar, ios: IosBar, android: AndroidBar };

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
