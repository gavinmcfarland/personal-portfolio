/* Public entry point for the embeddable canvas.
   Consumers: `import { Canvas, CanvasProvider, useCanvas } from '@gavinmcfarland/canvas'` */
export { default as CanvasSurface } from './Canvas';
export { CanvasProvider, useCanvas } from './CanvasProvider';
export { default as Canvas } from './Canvas.embed';
export * as constants from './constants';
