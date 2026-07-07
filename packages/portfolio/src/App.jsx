import { ThemeProvider } from './contexts/ThemeContext';
import { CanvasProvider } from './canvas/CanvasProvider';
import Canvas from './canvas/Canvas';

function App() {
  return (
    <ThemeProvider>
      <CanvasProvider>
        <Canvas />
      </CanvasProvider>
    </ThemeProvider>
  );
}

export default App;
