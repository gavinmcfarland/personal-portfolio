import { Canvas } from "@gavinmcfarland/canvas";
import { boardSaver, publishedBoard, uploadMedia, unfurlLink } from "../data/canvasBoards";
import { ACCENT } from "../theme";

/* Collision-reflow demo — a fully editable board that ALSO reflows responsively.
   The two compose through the board's mode: in Edit mode you author at real
   positions (collision off); switch to View and the cards reposition so they
   never overlap once the container is too narrow to fit their authored layout,
   snapping back as it widens. Resize the panel (drag its bottom-right corner) to
   watch the reflow.

   Wired like the site's other boards (dev-authorable + persistence); `collide`
   is the only addition. An explicit top-left `view` in the seed keeps the row
   anchored to the top so the reflowed column grows down into the frame. */
const cards = [
  { id: "c-a", text: "### Resize me →\nDrag the corner" },
  { id: "c-b", text: "### No overlaps\nWe reposition" },
  { id: "c-c", text: "### Out of room?\nWe stack down" },
  { id: "c-d", text: "### Room again?\nWe snap back" },
];
const collideSeed = {
  // Framed top-left (below the board chrome) so the reflowed column grows down
  // into the frame rather than off the bottom.
  view: { x: 40, y: 64, scale: 0.82 },
  nodes: cards.map((c, i) => ({ ...c, type: "md", x: i * 232, y: 0, w: 210, z: i + 1 })),
  shapes: [],
};

const CollisionDemo = () => (
  <section className="mx-auto w-full max-w-5xl px-5 sm:px-6 pt-4 pb-14">
    <div className="section-label">Responsive collisions</div>
    <p className="mt-4 max-w-[52ch] text-pretty text-[1.0625rem] leading-relaxed text-muted">
      An editable canvas, made responsive. Grab the panel’s bottom-right corner
      and drag it narrower — in view mode the cards that no longer fit flow around
      the others to stay in view, keeping their arrangement (nothing shifts while
      it all still fits, and overlaps you make on purpose are kept). It’s a normal
      board underneath: hit <em>Edit</em> to rearrange it yourself.
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
          editable={import.meta.env.DEV}
          cooperativeGestures
          collide
          collideStrategy="organic"
          collideGap={22}
          base={{ nodes: collideSeed.nodes, shapes: [], brand: { title: "collide", subtitle: "responsive" } }}
          storageKey="collide-demo"
          initialState={publishedBoard("collide-demo") || collideSeed}
          onPublish={boardSaver("collide-demo")}
          onUploadImage={uploadMedia}
          onUploadVideo={uploadMedia}
          onUploadHtml={uploadMedia}
          onUnfurl={unfurlLink}
        />
      </div>
      <p className="mt-3 text-[0.8125rem] text-faint">
        Editable and responsive at once — the same board, with the{" "}
        <code className="font-sans">collide</code> prop added.
      </p>
    </div>
  </section>
);

export default CollisionDemo;
