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

Visit `http://localhost:5173` to view the portfolio.

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

The production files will be generated in the `dist` folder.

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