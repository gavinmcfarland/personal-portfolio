# Writing — how a post is put together

Everything in this directory that isn't prefixed with `_` is a post. Adding one
means adding a file; nothing else is registered, imported or listed by hand.

    src/content/writing/a-post.md            → /writing/a-post
    src/content/writing/a-post/index.md      → /writing/a-post   (+ its assets)

Use the second layout when a post has images to keep beside it.

## Frontmatter

```yaml
---
title: Dithering video in the browser
date: 2026-07-12
summary: One clip, re-cut as dots at whatever size it is drawn.
tags: [dither, canvas]
updated: 2026-07-20   # optional
draft: true           # optional
---
```

`title` and `date` are required — a post missing either is still listed, with a
build warning. `date` is `YYYY-MM-DD` and sets the order (newest first) and the
year the entry is filed under. `summary` is the line under the entry in the
archive, and the description a link preview and a search result show.

A `draft` post is visible while `pnpm dev` is running and absent from the built
site: it's kept out of every list and its URL returns Not Found, exactly like a
draft project in `src/data/projects.js`.

## The supported markdown

A deliberately small subset, rendered by `src/lib/markdown.jsx` straight onto the
man-page furniture in `app.css`. Anything outside it renders as the literal text
it is — there's no HTML passthrough.

| Written                       | Set as                                          |
| ----------------------------- | ----------------------------------------------- |
| `## Heading`                  | a section head, flush, uppercase, tracked       |
| `### Heading`                 | the sub-head beneath it                         |
| a paragraph                   | body text hung at the three-character stop      |
| `- item` / `1. item`          | a list, square markers / vermilion numerals     |
| `> quoted`                    | a hairline-ruled aside                          |
| ` ```js title="File.jsx" `    | a code panel, highlighted                       |
| `![alt](./fig.svg "Caption")` | a figure, captioned `Fig. n — Caption`          |
| `![alt](./glyph.svg)` inline  | a small image sitting in the line               |
| `[text](url)`                 | a cross-reference link                          |
| `[^1]` and `[^1]: note`       | a footnote marker and the note at the foot      |
| `---`                         | a hairline break                                |
| `**bold**`, `*italic*`        | as expected; `_` only at a word boundary        |
| `` `literal` ``               | inline code                                     |
| `\*`                          | an escaped character                            |

Headings have two ranks and no more. `#` and `##` are both the section head —
the same rank as EXAMPLES and BACKGROUND on the home page — and `###` and
deeper are all the sub-head. A document set in one face at one size has exactly
two ranks available before rank stops reading as rank.

A post with three or more section heads gets a CONTENTS list at the top,
generated from them. Below that, it would just be a list of the headings already
on screen.

There is no smart-quote or dash conversion: type ’ and — directly.

## Images

Keep them in the post's own directory and reference them relatively:

```markdown
![The dot grid at three sizes](./grid.svg "One pitch, three widths.")
```

Vite hashes and emits them, so they're cached properly. A root-relative path
(`/logo.svg`, from `public/`) works too, and is the right choice for something
shared between posts.

## Code samples

The language after the fence picks the highlighting; `title="…"` names the
sample after the file it comes from, and is shown instead of the language.

````markdown
```jsx title="src/components/DitherVideo.jsx"
const CELL = 3;
```
````

Highlighting is the canvas package's own tokeniser
(`@gavinmcfarland/canvas/code`), painted with the same enamel token colours the
canvas code object uses — a sample here and a code object on a board are
identical. It knows js, ts, jsx, tsx, html, css, json, python, bash, go, rust
and sql; anything else is set as plain text.

## The two sample posts

`dithering-video-in-the-browser/` and `a-type-scale-with-seven-steps.md` are
placeholder copy — accurate about this repo, but written to exercise every block
above. Replace or delete them.
