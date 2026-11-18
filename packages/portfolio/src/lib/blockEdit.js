/* Block-level edits to a post body, as splices of its source lines.
 *
 * The blocks come from renderMarkdown (src/lib/markdown.jsx), each carrying the
 * line range it was read from. Every edit here replaces, removes, inserts or
 * swaps those ranges and leaves every other line exactly as written, so saving
 * a one-word change to a post changes one line of the file, not its whitespace.
 *
 * All functions take the normalised `lines` and return the new body string. */

/* A block's markdown, as the editor shows it. */
export function blockSource(lines, block) {
  return lines.slice(block.start, block.end).join("\n");
}

/* Text as typed into the editor → the lines it becomes. Blank lines at either
   end would only pad the gap between blocks, so they go. */
function toLines(text) {
  return String(text).replace(/\r\n?/g, "\n").replace(/^\s*\n/, "").replace(/\s+$/, "").split("\n");
}

const isBlank = (line) => line === undefined || !line.trim();

/* Collapse the run of blank lines at `at` down to one, so removing a block
   doesn't leave the gaps either side of it stacked. */
function closeGap(lines, at) {
  while (at > 0 && isBlank(lines[at - 1]) && at < lines.length && isBlank(lines[at])) {
    lines.splice(at, 1);
  }
}

export function replaceBlock(lines, block, text) {
  if (!String(text).trim()) return removeBlock(lines, block);
  const next = lines.slice();
  next.splice(block.start, block.end - block.start, ...toLines(text));
  return next.join("\n");
}

export function removeBlock(lines, block) {
  const next = lines.slice();
  next.splice(block.start, block.end - block.start);
  closeGap(next, block.start);
  return next.join("\n");
}

/* Insert `text` as new block(s) after `block`, or before the first block when
   `block` is null (or at the end of an empty body). */
export function insertBlock(lines, blocks, block, text) {
  if (!String(text).trim()) return lines.join("\n");
  const next = lines.slice();
  const body = toLines(text);
  if (block) {
    const at = block.end;
    next.splice(at, 0, "", ...body, ...(isBlank(next[at]) ? [] : [""]));
  } else if (blocks.length) {
    const at = blocks[0].start;
    next.splice(at, 0, ...body, "");
  } else {
    while (next.length && isBlank(next[next.length - 1])) next.pop();
    next.push("", ...body);
  }
  return next.join("\n");
}

/* Swap block `index` with its neighbour in direction `dir` (-1 up, +1 down).
   The gap between them is kept as it was, or made a blank line if there was
   none, so two blocks that were written touching don't fuse when swapped. */
export function moveBlock(lines, blocks, index, dir) {
  const other = index + dir;
  if (other < 0 || other >= blocks.length) return null;
  const [a, b] = dir < 0 ? [blocks[other], blocks[index]] : [blocks[index], blocks[other]];
  const gap = lines.slice(a.end, b.start);
  const region = [
    ...lines.slice(b.start, b.end),
    ...(gap.length ? gap : [""]),
    ...lines.slice(a.start, a.end),
  ];
  const next = lines.slice();
  next.splice(a.start, b.end - a.start, ...region);
  return next.join("\n");
}

/* Join block `index` onto the end of the block before it (Backspace at the
   start of a paragraph). Returns the body and where the caret should land. */
export function mergeWithPrevious(lines, blocks, index, text) {
  const prev = blocks[index - 1];
  const cur = blocks[index];
  const head = blockSource(lines, prev).replace(/\s+$/, "");
  const tail = String(text).replace(/^\s+/, "");
  const joined = tail ? `${head} ${tail}` : head;
  const next = lines.slice();
  next.splice(prev.start, cur.end - prev.start, ...toLines(joined));
  return { body: next.join("\n"), caret: head.length + (tail ? 1 : 0) };
}
