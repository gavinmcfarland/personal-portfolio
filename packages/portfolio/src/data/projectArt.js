/* The artwork behind each project's home-page plate.

   One abstract SVG per project (src/assets/project-art/), drawn in grayscale
   because the dither reads luminance and nothing else — a gradient in the
   drawing is what becomes a ramp of dots on the page. The SVGs are imported
   as source (`?raw`) rather than as URLs so `loadLuma` gets the document
   itself and rasterises it at 1024px on the long edge, well above the dot
   grid: every cell then averages real detail instead of point-sampling one
   pixel of a 480px bitmap.

   Keyed by project id — see <ProjectPlate> for how one becomes dots. */

import health from "../assets/project-art/health.svg?raw";
import figlet from "../assets/project-art/figlet.svg?raw";
import plugma from "../assets/project-art/plugma.svg?raw";
import askeroo from "../assets/project-art/askeroo.svg?raw";
import tableCreator from "../assets/project-art/table-creator.svg?raw";
import iconPreview from "../assets/project-art/icon-preview.svg?raw";
import layerStyles from "../assets/project-art/layer-styles.svg?raw";

export const projectArt = {
  health,
  figlet,
  plugma,
  askeroo,
  "table-creator": tableCreator,
  "icon-preview": iconPreview,
  "layer-styles": layerStyles,
};

export const artFor = (id) => projectArt[id] || null;
