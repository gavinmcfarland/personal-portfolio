import { Suspense, lazy, useEffect, useState } from "react";
import {
  Routes,
  Route,
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
/* The bar is off for now — component kept, nothing renders it. Re-enabling it
   means restoring the four commented blocks marked "BAR:" below, and dropping
   the two floating <ThemeToggle>s the bar replaces (it carries the toggle). */
// import SiteBar from "./components/SiteBar";
import ThemeToggle from "./components/ThemeToggle";
import CanvasMaximizeToggle from "./components/CanvasMaximizeToggle";
import Home from "./pages/Home";
import { visibleProjects } from "./data/projects";
import { findPost } from "./data/writing";

/* Home is the only page that loads with the app. Everything below renders in
   the sliding panel (or, for a private page, replaces the document), and none
   of it is mounted until a route asks for it — so none of it needs to be in
   the bundle that Home is waiting on. Several of these pull the canvas engine
   in with them, which is why the split is worth more than the page weights
   suggest.

   Imported as `lazy` rather than eagerly: the panel already mounts on a
   frame delay and slides for 340ms, so a chunk fetched on the same click
   normally arrives while it is still moving. */
const ProjectPage = lazy(() => import("./pages/ProjectPage"));
const CollisionDemoPage = lazy(() => import("./pages/CollisionDemoPage"));
/* The writing section. Two routes and, behind the post page, one lazy chunk per
   post — see src/data/writing.js. Home carries only the archive manifest
   (frontmatter), which is what its recent-entries list needs. */
const WritingIndex = lazy(() => import("./pages/WritingIndex"));
const WritingPost = lazy(() => import("./pages/WritingPost"));
/* The work index the bar's third link points at — the same project rows Home
   sets under EXAMPLES, given a page of their own. */
const Work = lazy(() => import("./pages/Work"));
// const CV = lazy(() => import("./pages/CV")); // CV page disabled — not public yet
const PrivatePage = lazy(() => import("./pages/PrivatePage"));
/* The phone remote for a presenting board. Its own standalone document like
   /private/*, and for a sharper reason: it must not pull Home — or the canvas
   engine behind it — onto a phone whose only job is showing a paragraph of
   notes and two buttons. */
const RemotePage = lazy(() => import("./pages/RemotePage"));
// The /examples/* prototype pages are disabled — the files are kept, but
// nothing routes to them. Re-enable by restoring these imports and the routes
// below.
// const ExamplesIndex = lazy(() => import("./pages/examples/ExamplesIndex"));
// const CaseStudy = lazy(() => import("./pages/examples/CaseStudy"));
// const Changelog = lazy(() => import("./pages/examples/Changelog"));
// const Colophon = lazy(() => import("./pages/examples/Colophon"));
const Backup = lazy(() => import("./pages/Backup"));
// Specimen disabled alongside /examples/* — page kept, route removed.
// const Specimen = lazy(() => import("./pages/Specimen"));
const NotFound = lazy(() => import("./pages/NotFound"));

/* Resolve the :id param to a project, or render the 404 page. Draft projects
   are excluded from `visibleProjects`, so their URLs return Not Found too. */
function ProjectRoute() {
  const { id } = useParams();
  const project = visibleProjects.find((p) => p.id === id);
  return project ? <ProjectPage project={project} /> : <NotFound />;
}

/* The same resolution for a post: drafts are absent from the built manifest's
   visible set, so their URLs return Not Found off the deployed site and open
   normally in dev. */
function WritingRoute() {
  const { slug } = useParams();
  const post = findPost(slug);
  // Keyed by slug so moving between posts is a remount: the previous post's
  // body can't be on screen while the next one is still being fetched.
  return post ? <WritingPost key={post.slug} post={post} /> : <NotFound />;
}

/* How far the sliding overlay stops from the left edge — the strip of Home left
   peeking behind it. Declared as literal class names (not computed) so Tailwind
   picks them up, and kept together so the panel inset and the peek's back-target
   width stay in sync. The peek is lg-and-up only; md and below get a full-width
   overlay (the in-page Back link dismisses it). */
const PEEK_INSET = "left-0 lg:left-[20%]"; // full width below lg, 20% peek at lg+
const PEEK_WIDTH = "hidden lg:block w-[20%]"; // back target only where the peek shows

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  /* The non-home routes render in a panel that slides in from the right and,
     on close, slides back out before unmounting — so keep rendering the last
     non-home route (`overlayLoc`) until the exit transition finishes. `open`
     drives the transform. */
  const [overlayLoc, setOverlayLoc] = useState(isHome ? null : location);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isHome) {
      setOverlayLoc(location);
      // Mount off-screen (translate-x-full), then slide in on the next frame.
      const r = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(r);
    }
    // Back to Home: slide out, then drop the overlay once the transition ends.
    setOpen(false);
    const t = setTimeout(() => setOverlayLoc(null), 340);
    return () => clearTimeout(t);
  }, [location, isHome]);

  /* Take over scroll restoration so the browser never fights us. */
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  /* Freeze the page behind the overlay so Home keeps its exact scroll position
     for when we return — and, crucially, so scrolling inside an open project's
     canvas (e.g. over its zoom/top-bar chrome, which lets the wheel through)
     can't scroll Home behind it. The page's scroll container is <html>, not
     <body>: `html { overflow-x: hidden }` makes its overflow-y compute to
     `auto`, so a body-only lock never takes — set overflow on the scroller
     itself (and clear it on return, restoring normal Home scrolling). */
  useEffect(() => {
    const scroller = document.scrollingElement || document.documentElement;
    scroller.style.overflow = isHome ? "" : "hidden";
    document.body.style.overflow = isHome ? "" : "hidden";
    return () => {
      scroller.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isHome]);

  /* Private pages are a standalone, full-document experience — no Home behind
     them and no sliding route panel. Rendered through <Routes> so the page can
     read its :id via useParams. Placed after every hook above so hook order
     stays stable across routes. */
  if (location.pathname.startsWith("/private/")) {
    return (
      <ThemeProvider>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/private/:id" element={<PrivatePage />} />
          </Routes>
        </Suspense>
      </ThemeProvider>
    );
  }

  /* Same treatment for the presenter's phone remote — a standalone document
     with nothing of the site behind it. */
  if (location.pathname.startsWith("/remote/")) {
    return (
      <ThemeProvider>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/remote/:room" element={<RemotePage />} />
          </Routes>
        </Suspense>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      {/* BAR: while the bar is off the page starts at the top of the viewport.
          With it on, add `pt-(--bar)` here — the bar is fixed, so the page in
          normal flow has to clear it. Padding rather than a margin, and with
          border-box sizing, so `min-h-screen` still means one viewport rather
          than one viewport plus a bar. */}
      <div className="bg-base min-h-screen">
        {/* BAR: <SiteBar /> */}
        {/* Home stays mounted for the life of the app: navigating into a
            project overlays it rather than unmounting it, so its scroll
            position and one-time reveal animations are preserved on return.
            `isolate` traps its content's stacking context (the footer canvas
            chrome is z-100) below the route overlay, so nothing bleeds through
            when an overlay is open over a footer-scrolled page. The theme
            toggle lives inside the isolate too, so an opening overlay slides
            over it rather than sitting under a corner button that never moves.
            (BAR: with the bar on, the toggle rides in it — drop this one.) */}
        <div className="isolate">
          <ThemeToggle />
          <Home />
        </div>

        {/* A toggle that appears only while the playground canvas is maximised,
            floated above its full-viewport overlay. */}
        <CanvasMaximizeToggle />

        {/* Non-home routes: a panel that slides in from the right and leaves a
            strip of Home peeking on the left. */}
        {overlayLoc && (
          <>
            {/* A dark grey scrim over the whole page dims the Home content so it
                reads as inactive. It spans the full viewport (not just the peek)
                so the page stays dimmed while the panel slides across it; the
                panel then covers all of it but the peeking strip. Fades in and
                out with the panel. */}
            {/* <div
              aria-hidden="true"
              className={`fixed inset-0 z-10 bg-[var(--scrim)] transition-opacity duration-340 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                open ? "opacity-60" : "opacity-0"
              }`}
            /> */}
            {/* The exposed strip doubles as a back affordance — tap the peek of
                Home to dismiss the overlay. */}
            <button
              type="button"
              aria-label="Back to home"
              onClick={() => navigate("/")}
              className={`fixed inset-y-0 left-0 z-10 ${PEEK_WIDTH} cursor-pointer`}
            />
            {/* BAR: with the bar on this is `bottom-0 top-(--bar)` instead of
                `inset-y-0` — the bar is chrome over both surfaces, so the panel
                slides in beneath it. It has to be an inset rather than padding
                because a project page's `absolute inset-0` layout measures the
                panel's padding box and would ignore padding here. */}
            <div
              className={`route-panel fixed inset-y-0 right-0 ${PEEK_INSET} z-20 overflow-y-auto border-l border-line bg-base shadow-[-8px_0_24px_rgba(0,0,0,0.08)] transition-transform duration-340 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                open ? "translate-x-0" : "translate-x-full"
              }`}
            >
              {/* The panel's own toggle. The panel's transform makes this
                  `fixed` child position relative to the panel (not the
                  viewport), so it slides in and out with the page — and it
                  stays pinned to the corner while the panel's content scrolls.
                  (BAR: with the bar on, drop this one too.) */}
              <ThemeToggle className="fixed right-[22px] top-[max(22px,calc(env(safe-area-inset-top)+12px))] z-50" />
              {/* The panel is what the reader is watching arrive, so an empty
                  one for the frames a chunk takes reads as the slide, not as a
                  gap. A spinner here would announce a wait that is usually
                  over before it could finish appearing. */}
              <Suspense fallback={null}>
                <Routes location={overlayLoc}>
                  <Route path="/projects/:id" element={<ProjectRoute />} />
                  <Route path="/work" element={<Work />} />
                  <Route path="/writing" element={<WritingIndex />} />
                  <Route path="/writing/:slug" element={<WritingRoute />} />
                  <Route path="/responsive" element={<CollisionDemoPage />} />
                  {/* /examples/* disabled — pages kept, routes removed, so
                    these paths fall through to Not Found below. Re-enable by
                    restoring the imports above and these routes. */}
                  {/* <Route path="/examples" element={<ExamplesIndex />} /> */}
                  {/* <Route path="/examples/plugma" element={<CaseStudy />} /> */}
                  {/* <Route path="/examples/changelog" element={<Changelog />} /> */}
                  {/* <Route path="/examples/colophon" element={<Colophon />} /> */}
                  {/* Unlisted archive of seven Home sections — nothing links
                    here, and the page is noindex. */}
                  <Route path="/backup" element={<Backup />} />
                  {/* Unlisted reference sheet for the Enamel system. Disabled
                    — page kept, route removed. */}
                  {/* <Route path="/specimen" element={<Specimen />} /> */}
                  {/* CV page disabled — not public yet. Re-enable by restoring
                    the import above and this route. */}
                  {/* <Route path="/cv" element={<CV />} /> */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </div>
          </>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
