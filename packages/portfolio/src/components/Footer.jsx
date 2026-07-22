import { Link } from "react-router-dom";
import { Canvas } from "@gavinmcfarland/canvas";
import { boardSaver, publishedBoard, uploadMedia, unfurlLink } from "../data/canvasBoards";
import { ACCENT } from "../theme";
import { ArrowRight } from "./ui";

/* A self-contained board for the footer playground. `card` is a portfolio-only
   node type, so the demo sticks to the canvas's built-in nodes (markdown, sticky,
   arrow) — no managedTypes / nodeTypes needed. It follows the page's light/dark
   mode automatically via the `.dark` ancestor the ThemeProvider toggles. */
const demoBase = {
  brand: { title: "Canvas", subtitle: "playground" },
  nodes: [
    {
      id: "d-md",
      type: "md",
      x: -210,
      y: -150,
      w: 330,
      z: 1,
      text:
        "# This is a canvas 👋\nAn **embeddable** React component — the same engine behind the canvas edition of this site.\n\n- Pan & zoom the board\n- Add notes, text & `markdown`\n- Draw, frame and organise",
    },
    { id: "d-note-1", type: "sticky", color: "yellow", x: 190, y: -150, z: 2, text: "Drag me\naround!" },
    { id: "d-note-2", type: "sticky", color: "blue", x: 210, y: 95, z: 3, text: "Double-click\nto edit me" },
  ],
  shapes: [
    { id: "d-arrow", type: "arrow", stroke: ACCENT.light, width: 3, z: 4, x1: 150, y1: -70, x2: 195, y2: -115 },
  ],
};

const Footer = () => (
  <footer className="mt-24 border-t border-line">
    <div className="mr-auto w-full max-w-2xl pl-8 pr-5 sm:pl-14 sm:pr-6 lg:pl-24 pt-16">
      <div className="section-label">Playground</div>
      <p className="mt-4 max-w-[52ch] text-pretty text-[1.0625rem] leading-relaxed text-muted">
        This site also comes as an infinite canvas — packaged as an embeddable
        React component. Here it is dropped straight into the footer. Have a play:
        pan, zoom, drop a note, or pick a tool from the bar.
      </p>
    </div>

    <div className="mr-auto w-full max-w-5xl pl-8 pr-5 sm:pl-14 sm:pr-6 lg:pl-24 pt-8 pb-14">
      <div
        className="overflow-hidden rounded-2xl border border-line"
        style={{ height: "min(70vh, 520px)" }}
      >
        <Canvas
          fit="contain"
          initialView="fit"
          classNames={{ root: "enamel" }}
          accent={ACCENT}
          editable={import.meta.env.DEV}
          cooperativeGestures
          base={demoBase}
          storageKey="footer-canvas-demo"
          initialState={publishedBoard("footer-canvas-demo")}
          onPublish={boardSaver("footer-canvas-demo")}
          onUploadImage={uploadMedia}
          onUploadVideo={uploadMedia}
          onUploadHtml={uploadMedia}
          onUnfurl={unfurlLink}
        />
      </div>
      <p className="mt-3 text-[0.8125rem] text-faint">
        Embedded with a single{" "}
        <code className="font-sans">{'<Canvas fit="contain" />'}</code> component.
      </p>
    </div>

    <section className="mr-auto w-full max-w-2xl pl-8 pr-5 sm:pl-14 sm:pr-6 lg:pl-24 pt-4 pb-14">
      <div className="section-label">Responsive collisions</div>
      <p className="mt-4 max-w-[52ch] text-pretty text-[1.0625rem] leading-relaxed text-muted">
        The canvas adapts to its container: as space runs out, objects reflow to
        stay in view — routing around each other and keeping the overlaps you make
        on purpose. See it fill the screen:
      </p>
      <Link
        to="/responsive"
        className="group mt-6 inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 font-sans text-[0.875rem] font-medium text-ink transition-colors duration-200 hover:bg-surface"
      >
        Open the full-screen demo
        <ArrowRight className="h-4 w-4 text-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
      </Link>
    </section>

    <div className="mr-auto w-full max-w-2xl pl-8 pr-5 sm:pl-14 sm:pr-6 lg:pl-24 pb-16">
      <p className="text-[0.8125rem] text-faint">© 2026 Gavin McFarland</p>
    </div>
  </footer>
);

export default Footer;
