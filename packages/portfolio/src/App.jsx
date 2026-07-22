import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import ThemeToggle from "./components/ThemeToggle";
import CanvasMaximizeToggle from "./components/CanvasMaximizeToggle";
import Home from "./pages/Home";
import ProjectPage from "./pages/ProjectPage";
import CollisionDemoPage from "./pages/CollisionDemoPage";
import NotFound from "./pages/NotFound";
import { projects } from "./data/projects";

/* Resolve the :id param to a project, or render the 404 page. */
function ProjectRoute() {
  const { id } = useParams();
  const project = projects.find((p) => p.id === id);
  return project ? <ProjectPage project={project} /> : <NotFound />;
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

  return (
    <ThemeProvider>
      <div className="bg-base min-h-screen">
        {/* Home stays mounted for the life of the app: navigating into a
            project overlays it rather than unmounting it, so its scroll
            position and one-time reveal animations are preserved on return.
            `isolate` traps its content's stacking context (the footer canvas
            chrome is z-100) below the route overlay, so nothing bleeds through
            when an overlay is open over a footer-scrolled page. The theme
            toggle lives inside the isolate too, so an opening overlay slides
            over it rather than sitting under a corner button that never moves. */}
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
            <div
              aria-hidden="true"
              className={`fixed inset-0 z-10 bg-[var(--scrim)] transition-opacity duration-340 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                open ? "opacity-60" : "opacity-0"
              }`}
            />
            {/* The exposed strip doubles as a back affordance — tap the peek of
                Home to dismiss the overlay. */}
            <button
              type="button"
              aria-label="Back to home"
              onClick={() => navigate("/")}
              className={`fixed inset-y-0 left-0 z-10 ${PEEK_WIDTH} cursor-pointer`}
            />
            <div
              className={`route-panel fixed inset-y-0 right-0 ${PEEK_INSET} z-20 overflow-y-auto border-l border-line bg-base transition-transform duration-340 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                open ? "translate-x-0" : "translate-x-full"
              }`}
            >
              {/* The panel's own toggle. The panel's transform makes this
                  `fixed` child position relative to the panel (not the
                  viewport), so it slides in and out with the page — and it
                  stays pinned to the corner while the panel's content scrolls. */}
              <ThemeToggle className="fixed right-4 top-[14px] z-50 sm:right-6 sm:top-[22px]" />
              <Routes location={overlayLoc}>
                <Route path="/projects/:id" element={<ProjectRoute />} />
                <Route path="/responsive" element={<CollisionDemoPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
