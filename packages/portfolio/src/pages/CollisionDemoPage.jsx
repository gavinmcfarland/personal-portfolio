import { Link } from "react-router-dom";
import { Canvas } from "@gavinmcfarland/canvas";
import { ACCENT } from "../theme";
import { ArrowLeft } from "../components/ui";

/* Full-screen responsive-collision demo. A slim header carries the back link and
   a hint; the canvas fills every remaining pixel. Resize the browser window
   (narrower) to watch objects reflow to stay in view — routing around each other
   and keeping any overlaps you make on purpose. Editable in dev (local-only
   autosave, no repo persistence — the board is defined by `base`). */
const cards = [
  { id: "c-a", text: "### Resize the window →\nWatch objects reflow" },
  { id: "c-b", text: "### No overlaps\nWe reposition" },
  { id: "c-c", text: "### Out of room?\nWe move aside" },
  { id: "c-d", text: "### Room again?\nWe snap back" },
];
const demoBase = {
  brand: { title: "Responsive canvas", subtitle: "collisions" },
  nodes: cards.map((c, i) => ({ ...c, type: "md", x: i * 232, y: 0, w: 210, z: i + 1 })),
  shapes: [],
};

export default function CollisionDemoPage() {
  return (
    <div className="fixed inset-0 flex flex-col bg-base">
      <header className="flex shrink-0 items-center gap-4 border-b border-line px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="group inline-flex shrink-0 items-center gap-2 font-sans text-[0.875rem] font-medium text-muted transition-colors duration-200 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-sans text-[0.9375rem] font-bold leading-tight text-ink">
            Responsive collisions
          </h1>
          <p className="truncate text-[0.8125rem] text-faint">
            Resize the window — objects reflow to stay in view, never overlapping unless you mean them to
          </p>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <Canvas
          fit="contain"
          initialView="fit"
          accent={ACCENT}
          editable={import.meta.env.DEV}
          collide
          collideStrategy="organic"
          collideGap={22}
          base={demoBase}
          storageKey="collide-demo"
        />
      </div>
    </div>
  );
}
