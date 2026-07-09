import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Canvas } from '@gavinmcfarland/canvas';
import { buildInitialState } from './data/canvasLayout';
import publishedState from './data/canvasState.json';
import Card from './cards/Card';
import { publishBoard, uploadImage } from './cards/canvasStorage';

/* The data-derived base: portfolio cards + seed annotations. `card` nodes are
   "managed" — they regenerate their content from the data files on every load and
   only their position/z/anchor is persisted. */
const base = buildInitialState();

function PortfolioCanvas() {
  const { mode, toggleTheme } = useTheme();
  return (
    <Canvas
      base={base}
      managedTypes={['card']}
      nodeTypes={{ card: Card }}
      initialState={publishedState}
      fit="fullscreen"
      editable={import.meta.env.DEV}
      storageKey="gm-canvas-portfolio-v1"
      homeId="home"
      theme={{ mode, toggle: toggleTheme }}
      onPublish={publishBoard}
      onUploadImage={uploadImage}
    />
  );
}

function App() {
  return (
    <ThemeProvider>
      <PortfolioCanvas />
    </ThemeProvider>
  );
}

export default App;
