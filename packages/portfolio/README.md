# Portfolio - Gavin McFarland

A modern, minimalistic portfolio showcasing Figma development tools and plugins.

## Features

- **Modern Design**: Clean, minimalistic interface with dark mode support
- **Responsive**: Fully responsive design that works on all devices
- **Project Showcase**: Detailed presentation of major projects including Figlet, Plugma, Table Creator, and Table Widget
- **Fast Performance**: Built with Vite for optimal loading speeds

## Technologies Used

- React 18
- Vite (latest)
- Tailwind CSS
- PostCSS

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5180` to view the portfolio.

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

The production files will be generated in the `dist` folder.

## Writing

The blog, at `/writing`. A post is a markdown file — add the file and it appears
in the archive, on the home page's WRITING section, and at its own URL. Nothing
else is registered by hand.

```
src/content/writing/a-post.md          → /writing/a-post
src/content/writing/a-post/index.md    → /writing/a-post   (+ its images)
```

Frontmatter drives the listing; `title` and `date` are required.

```yaml
---
title: Dithering video in the browser
date: 2026-07-12
summary: One clip, re-cut as dots at whatever size it is drawn.
tags: [dither, performance]
draft: true # optional
---
```

The full authoring reference — the supported markdown subset, images, code
sample syntax — is in
[`src/content/writing/_README.md`](src/content/writing/_README.md), next to the
posts.

### How it is set

A post opens with its title flush to the content column — a masthead, like the
home page's, not a section body under a `NAME` label. Everything below it is a
man page, like the rest of the site. The renderer
([`src/lib/markdown.jsx`](src/lib/markdown.jsx)) doesn't emit generic tags — it
emits the furniture that already exists in `app.css`: `##` becomes a
`.section-label` (flush, uppercase, tracked, the same rank as EXAMPLES on the
home page), paragraphs hang at the `--stop` indent, links are `.xref`, notes are
`.footnotes`, and an archive entry is the printed contents row (`.leaders`) with
dotted leaders running out to its date. What's genuinely new is small: a code
panel, a figure, a list, a quote.

Code samples are highlighted by the canvas package's own tokeniser, imported
from its `./code` subpath — a leaf module with no React, no CSS and no
dependencies, so it costs a few hundred bytes rather than pulling the canvas
engine into a post's chunk. The `--code-*` tokens in `app.css` restate the
canvas's enamel palette, so a sample here and a code object on a board are
identical.

### The content boundary

[`vite-plugin-writing-index.js`](vite-plugin-writing-index.js) resolves the
content directory and serves two virtual modules:

- `virtual:writing-index` — frontmatter only (title, date, summary, tags, word
  count) plus a lazy loader per post. This is what Home imports, so it must stay
  small; a glob that read every post's markdown to get at its frontmatter would
  put the full text of the whole archive in the first chunk.
- `virtual:writing-post/<slug>` — one post's markdown and its images, behind a
  dynamic import. One chunk per post, fetched when the post is opened.

Because the import list is generated rather than globbed, **a draft is genuinely
absent from a build**: no manifest entry, no chunk, no asset, and its URL falls
through to Not Found. Under `pnpm dev` the whole directory is present, drafts
marked with a `DRAFT` tag in the listings.

## Private pages

Password-protected, full-document canvases you can share with one person via an
auto-generated URL. The board ships as **ciphertext only** — until the correct
password is entered there is nothing readable in the page, the DOM, or the JS
bundle. No backend or database is involved; it works on the existing static
Vercel deploy.

### 1. Create a page

```bash
pnpm --filter portfolio private:new
# → URL       /private/swydquup2x8u   (prefix with your domain)
# → Password  Kx7mNp2qRt5wVj9a  (generated — save it now, it is not stored)
# → File      public/private/swydquup2x8u.json
```

This writes an encrypted record to `public/private/<slug>.json` and prints a
random unguessable URL and a strong password. Flags:

- `--password <pw>` — use your own password instead of a generated one.
- `--base-url https://yoursite.com` — print a full URL rather than a bare path.

The password is **never** stored or committed — save it when it's printed.

### 2. Author the canvas (local only)

The new page starts blank. Editing is a local, owner-only capability —
recipients on the deployed site get a **read-only** canvas.

```bash
pnpm dev
```

Open `/private/<slug>`, unlock with the password, and edit. Each save
re-encrypts the board client-side with the password you just entered and writes
it back to `public/private/<slug>.json` via a dev-only endpoint. **The password
never touches disk — only ciphertext is written.**

### 3. Publish and share

```bash
git add public/private && git commit -m "Add private page" && <deploy>
```

Then send the URL and the password to the recipient **separately** (e.g. link by
email, password by Signal). Never commit the password.

### How it works

- **Encryption** ([`src/lib/privateCrypto.js`](src/lib/privateCrypto.js)):
  the board is encrypted with AES-GCM using a key derived from the password via
  PBKDF2 (200k iterations, random per-record salt). A wrong password fails the
  GCM auth tag — that's how the gate detects it, so no password hash is stored.
  The same module runs in Node (the generator) and the browser (the page), so
  the record format is identical on both sides.
- **The page** ([`src/pages/PrivatePage.jsx`](src/pages/PrivatePage.jsx)):
  fetches the ciphertext, shows a password gate, and on unlock decrypts and
  mounts a full-document `<Canvas>`. It's a standalone route (no site nav, just
  the theme toggle), wired in [`src/App.jsx`](src/App.jsx).
- **Routing on Vercel**: `public/private/<slug>.json` has a file extension, so
  the SPA rewrite in [`vercel.json`](vercel.json) serves it directly as a static
  asset; the extensionless `/private/<slug>` route falls through to the SPA.
- **Dev save-back** ([`vite-plugin-canvas-save.js`](vite-plugin-canvas-save.js)):
  the `/__private/save` endpoint (dev only, never in the build) persists the
  encrypted record; a companion route serves it from disk to avoid a
  watcher/reload race, mirroring the existing `canvas-assets` handling.

### Security notes

- The slug provides obscurity; the **password is the real access control**.
  Because the ciphertext is publicly downloadable by anyone with the URL, an
  offline brute-force is theoretically possible — keep the generated password
  (or a comparably strong one) and don't reuse it.
- **No built-in revocation or expiry.** To revoke, delete
  `public/private/<slug>.json` and redeploy.
- **Media is not encrypted.** Dropped images/video bake to `public/canvas-assets/`
  as committed files (content-hashed, unguessable names, but served in the clear
  to anyone with the exact asset URL). Board text, layout, and shapes are fully
  encrypted; embedded media files are not.

## Projects Featured

1. **Figlet** - Interactive Figma API Sandbox
2. **Plugma** - Next-Level Figma Plugin Development Toolkit
3. **Table Creator** - Flexible Table Generation for Figma
4. **Table Widget** - Collaborative Tables for FigJam

## Structure

```
src/
├── components/
│   ├── Hero.jsx       # Landing section
│   ├── Projects.jsx   # Projects listing
│   ├── ProjectCard.jsx # Individual project cards
│   ├── About.jsx      # About section
│   └── Contact.jsx    # Contact information
├── data/
│   └── projects.js    # Project data and descriptions
├── App.jsx           # Main application component
├── main.jsx          # Entry point
└── index.css         # Tailwind CSS imports
```