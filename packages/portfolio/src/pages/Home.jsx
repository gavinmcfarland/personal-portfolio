import { Canvas } from "@gavinmcfarland/canvas";
import {
  boardSaver,
  publishedBoard,
  uploadMedia,
  unfurlLink,
} from "../data/canvasBoards";
import { ACCENT } from "../theme";
import Seo from "../components/Seo";
import Intro from "../components/Intro";
import Projects from "../components/Projects";
import Connect from "../components/Connect";
import { Section } from "../components/ui";

/* A self-contained board for the canvas playground. It sticks to the canvas's
   built-in nodes (markdown, sticky, arrow) and follows the page's light/dark mode
   via the `.dark` ancestor the ThemeProvider toggles. */
const playgroundBoard = {
  brand: { title: "Canvas", subtitle: "playground" },
  nodes: [
    {
      id: "d-md",
      type: "md",
      x: -210,
      y: -150,
      w: 330,
      z: 1,
      text: "# This is a canvas 👋\nAn **embeddable** React component — the same engine behind the canvas edition of this site.\n\n- Pan & zoom the board\n- Add notes, text & `markdown`\n- Draw, frame and organise",
    },
    {
      id: "d-note-1",
      type: "sticky",
      color: "yellow",
      x: 190,
      y: -150,
      z: 2,
      text: "Drag me\naround!",
    },
    {
      id: "d-note-2",
      type: "sticky",
      color: "blue",
      x: 210,
      y: 95,
      z: 3,
      text: "Double-click\nto edit me",
    },
  ],
  shapes: [
    {
      id: "d-arrow",
      type: "arrow",
      stroke: ACCENT.light,
      width: 3,
      z: 4,
      x1: 150,
      y1: -70,
      x2: 195,
      y2: -115,
    },
  ],
};

const Home = () => (
  <>
    {/* Home keeps the site defaults — a generic OG card with the site name. */}
    <Seo
      title=""
      description="Designer and full-stack engineer building tools and web applications. Currently freelancing and building Awenate."
    />
    {/* All page content lives in <main>, one <section> per group. */}
    <main className="mr-auto w-full max-w-5xl pl-8 pr-5 sm:pl-14 sm:pr-6 lg:pl-24">
      {/* CONTENTS, CAPABILITIES, ENVIRONMENT and INDEX were removed from Home;
          copies of all four live on the unlisted /backup page. */}
      <Intro />
      <Projects />

      <Section id="playground" label="Scratch">
        <p className="max-w-[64ch] text-muted">
          <span className="prompt">$</span> gavin{" "}
          <span className="flag not-italic text-muted">--scratch</span> &mdash; an
          interactive board of what has my attention right now: ideas,
          experiments and features, often here long before they become finished
          work. Pan, zoom, and leave a note.
        </p>
        <div
          className="mt-8 overflow-hidden rounded-2xl border border-line"
          style={{ height: "min(70vh, 520px)" }}
        >
          <Canvas
            fit="contain"
            initialView="fit"
            fullscreenButton="document"
            classNames={{ root: "enamel" }}
            accent={ACCENT}
            editable={import.meta.env.DEV}
            cooperativeGestures
            base={playgroundBoard}
            storageKey="footer-canvas-demo"
            initialState={publishedBoard("footer-canvas-demo")}
            onPublish={boardSaver("footer-canvas-demo")}
            onUploadImage={uploadMedia}
            onUploadVideo={uploadMedia}
            onUploadAudio={uploadMedia}
            onUploadHtml={uploadMedia}
            onUnfurl={unfurlLink}
          />
        </div>
      </Section>

      <Connect />
    </main>

  </>
);

export default Home;
