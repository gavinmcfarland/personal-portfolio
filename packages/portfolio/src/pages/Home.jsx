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
import { useReveal } from "../hooks/useReveal";

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

const Home = () => {
  // One observer for the whole page. It used to live on each <section>; with the
  // sections flattened away, <main> is the only root left that spans them all.
  const ref = useReveal();
  return (
  <>
    {/* Home keeps the site defaults — a generic OG card with the site name. */}
    <Seo
      title=""
      description="Designer and full-stack engineer building tools and web applications. Currently freelancing and building Awenate."
    />
    {/* All page content lives in <main>: a flush heading per group, its body
        hung at the indent stop beside it — no wrapper between them. */}
    <main
      ref={ref}
      className="mr-auto w-full max-w-5xl pb-(--sp-16) pl-8 pr-5 sm:pl-14 sm:pr-6 lg:pl-24"
    >
      {/* CONTENTS, CAPABILITIES, ENVIRONMENT and INDEX were removed from Home;
          copies of all four live on the unlisted /backup page. */}
      <Intro />
      <Projects />

      <h2 id="playground" className="section-label reveal">
        Scratch
      </h2>
      <p className="lede indent reveal max-w-measure text-muted">
        These are things I&rsquo;m currently working on. New ideas, experiments,
        tools, and features often appear here long before they become polished
        projects. It&rsquo;s a snapshot of what has my attention right now.
      </p>
      <div
        className="indent reveal overflow-hidden rounded-2xl border border-line"
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

      <h2 id="background" className="section-label reveal">
        Background
      </h2>
      <p className="indent reveal max-w-measure text-muted">
        I&rsquo;ve spent over 12 years helping organisations across the public
        and private sectors solve problems through product design, user research,
        and engineering. Along the way, I&rsquo;ve worked with clients including
        Amazon, American Express, NatWest, and Lovable. You can read my full
        professional history on{" "}
        <a
          href="https://www.linkedin.com/in/gavinmcfarland"
          target="_blank"
          rel="noopener noreferrer"
          className="xref"
        >
          LinkedIn
        </a>
        .
      </p>

      <Connect />
    </main>
  </>
  );
};

export default Home;
