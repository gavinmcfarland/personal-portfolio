# 11 · Galley

A galley proof is type set in one long column, printed on a sheet far wider than
the column needs so the corrector has somewhere to write. The type is the
artefact; the emptiness around it is the working surface.

09 explored page **types**. 10 explored **structures**. This one explores
**occupation** — how much of the sheet the content takes, where on it the content
sits, and what the remainder is doing. §3 of `system.css` is a placement
vocabulary rather than a layout library, and `space.html` walks through all nine
occupations a full viewport at a time.

| File | What it is |
| --- | --- |
| `system.css` | §1 tokens · §2 primitives · §3 **placement** · §4 components · §5 board |
| `system.js` | Running head, theme, grid overlay, and `renderPlace()` — one content set, nine occupations |
| `data.js` | `window.DATA` — content, plus the nine placement definitions |
| `board.js` | The pan/zoom canvas engine |
| `index.html` | **Galley** — top-left opening, hanging capabilities, full-width index, held-apart principle, bottom-left close |
| `space.html` | **Space** — the atlas: a stepper through one occupation at a time, then all nine stacked |
| `work.html` | **Work** — right-aligned opening (the set's one counterweight), full-width index, ink plates |
| `project.html` | **Plugma** — spec in the margin, one full-bleed plate, the galley column, held apart |
| `journal.html` | **Journal** — centred-left opening, lead note with marginalia, year groups |
| `note.html` | **Note** — the galley proper: one measure, corrections hung in the margin |
| `contact.html` | **Contact** — held apart, the form set as blanks to fill |
| `board.html` | **Board** — the one place colour lives |

Open any file directly. No build step.

## The three constraints

**A · No sans-serif, anywhere.** Prose is **Spectral**; every structural mark —
labels, nav, tables, metadata, the board — is **Courier Prime**, a typewriter face
with real serifs. The fallback stacks are `serif` and `monospace`; the string
`sans-serif` does not appear in the stylesheet.

**B · Two inks and a correction.** Paper, ink, and one red — the proofreader's
pencil. The greys (`--mid`, `--faint`, `--hair`) are ink held back, not new
colours. There is no second accent and no tinted surface anywhere in the document
half of the system. Six colour values per theme, and that is the whole palette.

**C · Colour lives on the board, and nowhere else.** §5 declares five note tones
— citron, sky, rose, moss, ink — and they are the only saturated colour in the
set. A sheet may show colour in exactly one circumstance: when it is displaying a
picture *of* the board (`project.html`, Fig. 1). Arriving at `board.html` after
six monochrome sheets should feel like opening a drawer of materials, which is
what the constraint is for.

## The nine occupations

| | Placement | What it is for |
| --- | --- | --- |
| P1 | Top left | The default. Content starts where the eye already is; the sheet is left open below and right. |
| P2 | The column | One 34em measure hard against the left margin. The galley itself. |
| P3 | Hanging notes | Measure left, annotations in the open field beside it. The emptiness is where marginalia lives. |
| P4 | Full bleed | Edge to edge, no margin. Reads loud without raising its voice — but only after held-back margins. |
| P5 | Bottom left | Content sinks; the emptiness sits above and presses down. The shape a closing statement wants. |
| P6 | Centred left | Vertically centred, still left-aligned. Calmer, and costs a viewport to say very little. |
| P7 | Held apart | One block at the head, one at the foot, the full height between them doing nothing. The gap is the argument. |
| P8 | Full width | The measure released. Only a rule or a table survives out here, so prose is not given it. |
| P9 | Right | The counterweight. Used once, and only against something already anchored left. |

Each frame carries its own annotation printed small in the empty part
(`start / start`, `34em / start`, `space-between`) — a galley always carries its
marks in the margin.

## The doctrine

Unchanged from 09 and 10, which is what makes the three sets read as siblings
despite three quite different registers:

1. **No curves** — `border-radius: 0` globally, never overridden.
2. **No shadows** — not one `box-shadow` declaration.
3. **No gradients** — the `.tx-*` utilities are hard-stop ink patterns (rule,
   hatch, grid, weave, stipple).
4. **Flat type** — 17px prose, 12px marks. Three exceptions: one display line per
   sheet, folio numerals as ornament, and one oversized quotation on `note.html`.
5. **Few buttons** — one `.btn`, appearing twice in the set (contact submit,
   board reset). Everything else is an underlined link.

Icons never appear; a transparent 1px-bordered square (`.ph`) stands where one
would go. Form fields are underlines rather than boxes — on a galley, a field is
a blank to fill.
