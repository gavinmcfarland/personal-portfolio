import { useContext, useMemo } from "react";
import homeSource from "../content/home.md?raw";
import { parseRegions, parseRegion } from "../lib/homeContent";
import { HomeProseContext } from "../lib/homeProseContext";

/* One region of the home page's prose (src/content/home.md), set where the
   page puts it. Its blocks are siblings of the heading above them, exactly as
   the hand-set paragraphs were — the wrapper is `display: contents`.

   In a build this is all there is. On a dev server, once the editor
   (HomeEditor.jsx) has loaded, Home hands every region its `renderRegion`
   through HomeProseContext, and each region is set as an editable body. */

const fileRegions = parseRegions(homeSource).regions;

function StaticRegion({ name }) {
  const blocks = useMemo(() => parseRegion(name, fileRegions[name] || "").blocks, [name]);
  return blocks.map((b) => b.node);
}

export default function HomeProse({ name }) {
  const renderRegion = useContext(HomeProseContext);
  return (
    <div className="contents" data-home-region={name}>
      {renderRegion ? renderRegion(name) : <StaticRegion name={name} />}
    </div>
  );
}
