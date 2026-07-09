import { Routes, Route, useParams } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import ScrollToTop from "./components/ScrollToTop";
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
  return (
    <ThemeProvider>
      <div className="bg-base min-h-screen">
        <ScrollToTop />
        <ThemeToggle />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects/:id" element={<ProjectRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;
