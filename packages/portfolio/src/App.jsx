import { ThemeProvider } from './contexts/ThemeContext';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import Projects from './components/Projects';
import About from './components/About';
import Contact from './components/Contact';

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
        <Navigation />
        <Hero />
        <Projects />
        <About />
        <Contact />
      </div>
    </ThemeProvider>
  );
}

export default App;