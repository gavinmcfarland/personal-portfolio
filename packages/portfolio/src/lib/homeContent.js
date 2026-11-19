import { cloneElement } from "react";
import { renderMarkdown } from "./markdown";

/* The home page's prose, read from src/content/home.md.
 *
 * The file is a run of regions, each opened by a marker on a line of its own:
 *
 *   <!-- @description -->
 *
 *   Design engineer building tools…
 *
 * Anything before the first marker is a preamble (a comment for whoever opens
 * the file) and is kept as written. */

const MARKER = /^<!--\s*@([\w-]+)\s*-->[ \t]*$/;

/* raw → { preamble, order, regions: { name: markdown } } */
export function parseRegions(raw) {
  const lines = String(raw).replace(/\r\n?/g, "\n").split("\n");
  const preamble = [];
  const order = [];
  const regions = {};
  let current = null;
  for (const line of lines) {
    const m = line.match(MARKER);
    if (m) {
      current = m[1];
      order.push(current);
      regions[current] = [];
    } else if (current) {
      regions[current].push(line);
    } else {
      preamble.push(line);
    }
  }
  const trim = (ls) => ls.join("\n").replace(/^\s*\n/, "").replace(/\s+$/, "");
  return {
    preamble: preamble.join("\n").replace(/\s+$/, ""),
    order,
    regions: Object.fromEntries(order.map((name) => [name, trim(regions[name])])),
  };
}

/* The inverse: regions back into the file, in their original order. */
export function composeRegions({ preamble, order, regions }) {
  const parts = preamble ? [preamble] : [];
  for (const name of order) {
    parts.push(`<!-- @${name} -->`);
    if (regions[name]) parts.push(regions[name]);
  }
  return `${parts.join("\n\n")}\n`;
}

/* How each region is set, on top of what the markdown renderer gives a block.
   The opening region rises with the masthead rather than revealing on scroll;
   the staging region's last paragraph introduces the canvas under it. */
const REGION_CLASSES = {
  description: { all: "rise d1" },
  staging: { all: "reveal", last: "lede" },
  background: { all: "reveal" },
  connect: { all: "reveal" },
};

const addClass = (node, cls) =>
  cls ? cloneElement(node, { className: `${node.props.className || ""} ${cls}`.trim() }) : node;

/* renderMarkdown, with the region's classes added to each block's node. */
export function parseRegion(name, text) {
  const result = renderMarkdown(text);
  const { all, last } = REGION_CLASSES[name] || {};
  const nodes = result.blocks.filter((b) => b.node);
  const lastNode = nodes[nodes.length - 1];
  for (const block of nodes) {
    // `reveal` is the renderer's own on some kinds; the opening region replaces it.
    let node = block.node;
    if (all && !all.includes("reveal") && /\breveal\b/.test(node.props.className || "")) {
      node = cloneElement(node, { className: node.props.className.replace(/\s*\breveal\b/, "") });
    }
    node = addClass(node, all && !(all === "reveal" && /\breveal\b/.test(node.props.className || "")) ? all : "");
    if (block === lastNode) node = addClass(node, last);
    block.node = node;
  }
  return result;
}
