/* The public, drop-in canvas component. Wraps the provider around the surface so
   an embedder can render a working board with a single element:

     <Canvas initialState={snapshot} editable nodeTypes={{ card: Card }} />

   All props are forwarded to <CanvasProvider>; see its prop list for the full
   configuration surface (base, managedTypes, storageKey, onPublish, …). */
import { CanvasProvider } from './CanvasProvider';
import CanvasSurface from './Canvas';

export default function Canvas(props) {
  return (
    <CanvasProvider {...props}>
      <CanvasSurface />
    </CanvasProvider>
  );
}
