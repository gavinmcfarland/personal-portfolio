import { useEffect, useState } from "react";
import DeferredCanvas from "../components/DeferredCanvas";
import {
  boardSaver,
  publishedBoard,
  uploadMedia,
  unfurlLink,
  presentRelay,
} from "../data/canvasBoards";
import { ACCENT } from "../theme";
import Seo from "../components/Seo";
import Intro from "../components/Intro";
import Projects from "../components/Projects";
import Writing from "../components/Writing";
import Connect from "../components/Connect";
import HomeProse from "../components/HomeProse";
import { HomeProseContext } from "../lib/homeProseContext";
import { useReveal } from "../hooks/useReveal";

/* The in-page editor for the prose — dev only. `import.meta.env.DEV` is a
   build-time constant, so in a build this is null and neither the editor nor
   the canvas engine its Edit button comes from reaches the bundle. See
   src/components/HomeEditor.jsx. */
const loadEditor = import.meta.env.DEV ? () => import("../components/HomeEditor") : null;

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
  //
  // The editor arrives a moment after the page; swapping it in remounts the
  // prose, so the observer scans again once it has (see useReveal).
  const [editor, setEditor] = useState(null);
  useEffect(() => {
    let live = true;
    loadEditor?.().then((mod) => live && setEditor(mod));
    return () => {
      live = false;
    };
  }, []);
  const ref = useReveal(editor);
  return (
    <HomeProseContext.Provider value={editor?.renderRegion ?? null}>
      {editor && <editor.HomeEditorChrome rootRef={ref} />}
      {/* Home keeps the site defaults — a generic OG card with the site name. */}
      <Seo
        title=""
        description="Design engineer building tools and web applications. Currently building Awenate."
      />
      {/* All page content lives in <main>: a flush heading per group, its body
        hung at the indent stop beside it — no wrapper between them. */}
      <main
        ref={ref}
        className="mr-auto w-full max-w-3xl pb-(--sp-16) pl-5 pr-4 sm:pl-14 sm:pr-6 lg:pl-24"
      >
        {/* CONTENTS, CAPABILITIES, ENVIRONMENT and INDEX were removed from Home;
          copies of all four live on the unlisted /backup page. */}
        <Intro />
        <Projects />

        {/* Directly under the work, because that is what it is mostly about — a
          post is usually the account of how one of the things above was built.
          It used to sit further down, between the staging canvas and the
          background, where it read as a third unrelated thing rather than as
          the notes behind the second. Renders nothing until there is a
          published post. */}
        <Writing />

        <h2 id="playground" className="section-label reveal">
          Staging
        </h2>
        <HomeProse name="staging" />
        <div
          className="indent reveal overflow-hidden rounded-2xl border border-line"
          style={{ height: "min(70vh, 520px)" }}
        >
          <DeferredCanvas
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
            presentRelay={presentRelay}
          />
        </div>

        <h2 id="background" className="section-label reveal">
          Background
        </h2>
        <HomeProse name="background" />

        <Connect />

        {/* Closes the page the way a man page closes: a single quiet line, flush
          to the content column since it belongs to no section. The year is read
          at render so it never goes stale. */}
        <p className="colophon reveal">
          © {new Date().getFullYear()} Gavin McFarland
        </p>
      </main>
    </HomeProseContext.Provider>
  );
};

export default Home;
