import { useEffect } from "react";
import { Routes, Route, useParams, useLocation } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import ThemeToggle from "./components/ThemeToggle";
import Home from "./pages/Home";
import ProjectPage from "./pages/ProjectPage";
import NotFound from "./pages/NotFound";
import { projects } from "./data/projects";

/* Resolve the :id param to a project, or render the 404 page. */
function ProjectRoute() {
  const { id } = useParams();
  const project = projects.find((p) => p.id === id);
  return project ? <ProjectPage project={project} /> : <NotFound />;
}

function App() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  /* Take over scroll restoration so the browser never fights us, and freeze
     the page behind a full-screen overlay (a project or 404) so the home
     page underneath keeps its exact scroll position for when we return. */
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = isHome ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isHome]);

  return (
    <ThemeProvider>
      <div className="bg-base min-h-screen">
        <ThemeToggle />

        {/* Home stays mounted for the life of the app: navigating into a
            project overlays it rather than unmounting it, so its scroll
            position and one-time reveal animations are preserved on return. */}
        <Home />

        {/* Non-home routes render as a full-screen overlay above Home. */}
        {!isHome && (
          <div className="fixed inset-0 z-10 overflow-y-auto bg-base">
            <Routes>
              <Route path="/projects/:id" element={<ProjectRoute />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
