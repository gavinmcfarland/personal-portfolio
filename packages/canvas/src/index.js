/* Public entry point for the embeddable canvas.
   Consumers: `import { Canvas, CanvasProvider, useCanvas } from '@gavinmcfarland/canvas'` */
export { default as CanvasSurface } from './Canvas';
export { CanvasProvider, useCanvas } from './CanvasProvider';
export { default as Canvas } from './Canvas.embed';
export * as constants from './constants';
/* The Edit button without a board: lets a non-canvas surface (a host page's
   editable text) share the one page-wide Edit toggle and mode. */
export { default as EditDock } from './ui/EditDock';
export { default as EditToggle } from './ui/EditToggle';
export { useEditMode, useEditSurface } from './edit-surface';
