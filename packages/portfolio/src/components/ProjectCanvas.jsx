import { Canvas } from "@gavinmcfarland/canvas";
import { boardSaver, publishedBoard, uploadMedia } from "../data/canvasBoards";

/* Builds a small, self-contained board seeded from a project's own fields, so
   every project page gets an on-brand interactive hero without hand-authoring a
   snapshot each time. Uses only the canvas's built-in node types (md, sticky)
   and a single accent arrow — no managedTypes / nodeTypes needed. */
export function buildBase(project) {
  const stickyColors = ["yellow", "blue", "green", "pink"];
  const highlights = (project.highlights || []).slice(0, 3);

  const intro = {
    id: "intro",
    type: "md",
    x: -340,
    y: -150,
    w: 340,
    z: 1,
    text: `# ${project.title}\n\n${project.tagline || project.summary}`,
  };

  const stack = {
    id: "stack",
    type: "md",
    x: -340,
    y: 90,
    w: 300,
    z: 2,
    text: `**Built with**\n\n${project.tech.join("  ·  ")}`,
  };

  const notes = highlights.map((h, i) => ({
    id: `note-${i}`,
    type: "sticky",
    color: stickyColors[i % stickyColors.length],
    x: 170,
    y: -160 + i * 140,
    z: 3 + i,
    text: h,
  }));

  return {
    brand: { title: project.title, subtitle: project.year || "Project" },
    nodes: [intro, stack, ...notes],
    shapes: [
      {
        id: "link-arrow",
        type: "arrow",
        stroke: "#7C2D91",
        width: 3,
        z: 20,
        x1: 20,
        y1: -100,
        x2: 150,
        y2: -120,
      },
    ],
  };
}

export default function ProjectCanvas({ project }) {
  // `key` remounts the canvas per project — the provider captures `base` only
  // once on mount, so a fresh key is what swaps the board between projects.
  const storageKey = `project-canvas-${project.id}`;
  return (
    <Canvas
      key={project.id}
      fit="contain"
      editable={import.meta.env.DEV}
      saveStatus
      base={buildBase(project)}
      storageKey={storageKey}
      initialState={publishedBoard(storageKey)}
      onPublish={boardSaver(storageKey)}
      onUploadImage={uploadMedia}
      onUploadVideo={uploadMedia}
    />
  );
}
