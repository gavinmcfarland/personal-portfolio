import { ThemeProvider } from "./contexts/ThemeContext";
import ThemeToggle from "./components/ThemeToggle";
import Intro from "./components/Intro";
import Projects from "./components/Projects";
import Experience from "./components/Experience";
import Awards from "./components/Awards";
import Education from "./components/Education";
import Connect from "./components/Connect";
import Footer from "./components/Footer";

function App() {
  return (
    <ThemeProvider>
      <div className="bg-base min-h-screen">
        <ThemeToggle />
        <main className="mx-auto w-full max-w-2xl px-5 sm:px-6">
          <Intro />
          <Projects />
          <Awards />

          <Connect />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
