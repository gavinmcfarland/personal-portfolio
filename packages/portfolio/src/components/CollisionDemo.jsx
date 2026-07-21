import { Canvas } from "@gavinmcfarland/canvas";
import { ACCENT } from "../theme";

/* Collision-reflow demo. A read-only board whose objects reposition themselves
   so they never overlap once the container is too narrow to fit their authored
   layout. The container is user-resizable (drag its bottom-right corner) —
   narrowing it shrinks the responsive width band, and `collide` pushes the
   cards that no longer fit down into a single column, snapping them back as it
   widens again.

   View-mode only (collide never runs while editing), so no persistence wiring
   is needed. An explicit top-left `view` (rather than initialView="fit") keeps
   the row anchored to the top so the reflowed column grows down into the frame
   instead of off the bottom; the default top-left resizeAnchor keeps that top
   pinned as the container resizes. */
const cards = [
  { id: "c-a", text: "### Resize me →\nDrag the corner" },
  { id: "c-b", text: "### No overlaps\nWe reposition" },
  { id: "c-c", text: "### Out of room?\nWe stack down" },
  { id: "c-d", text: "### Room again?\nWe snap back" },
];
const collideState = {
  view: { x: 40, y: 36, scale: 0.9 },
  nodes: cards.map((c, i) => ({ ...c, type: "md", x: i * 232, y: 0, w: 210, z: i + 1 })),
  shapes: [],
};

const CollisionDemo = () => (
  <section className="mx-auto w-full max-w-5xl px-5 sm:px-6 pt-4 pb-14">
    <div className="section-label">Responsive collisions</div>
    <p className="mt-4 max-w-[52ch] text-pretty text-[1.0625rem] leading-relaxed text-muted">
      The same canvas, made responsive. Grab the panel’s bottom-right corner and
      drag it narrower — when the cards no longer fit side by side, they
      reposition themselves into a single column instead of overlapping, and slot
      back as you widen it again.
    </p>

    <div className="mt-8">
      <div
        className="collide-demo overflow-hidden rounded-2xl border border-line"
        style={{
          height: "min(70vh, 440px)",
          width: "100%",
          maxWidth: "100%",
          minWidth: "300px",
          resize: "horizontal",
        }}
      >
        <Canvas
          fit="contain"
          accent={ACCENT}
          editable={false}
          ui={false}
          cooperativeGestures
          collide
          collideStrategy="push-down"
          layoutWidth="viewport"
          collideGap={22}
          initialState={collideState}
        />
      </div>
      <p className="mt-3 text-[0.8125rem] text-faint">
        Powered by the <code className="font-sans">collide</code> prop —{" "}
        <code className="font-sans">{'<Canvas collide collideStrategy="push-down" />'}</code>.
      </p>
    </div>
  </section>
);

export default CollisionDemo;
