# abstract-illustrations

A CLI tool that generates monochrome, sharp-cornered abstract illustrations as self-contained JSX components. Built to match a minimal portfolio aesthetic — grayscale palette, no border radius, geometric shapes.

The output is a React component using Tailwind CSS classes, ready to drop into any project.

## Usage

```bash
node bin/generate-illustration.mjs [keywords...] [options]
```

### Keywords

Keywords control the type of composition generated. The first keyword becomes the main element; additional keywords are added as secondary decorations.

| Keyword     | Description                          |
|-------------|--------------------------------------|
| `code`      | Editor window with code-like lines   |
| `terminal`  | Command prompt with output lines     |
| `data`      | Table / spreadsheet grid             |
| `chart`     | Abstract bar chart                   |
| `layers`    | Stacked offset rectangles            |
| `network`   | Connected node diagram (SVG)         |
| `grid`      | Dot or square grid pattern           |
| `text`      | Paragraph-like block lines           |
| `kanban`    | Board with columns and cards         |
| `timeline`  | Vertical timeline with events        |
| `form`      | Input fields and controls            |
| `music`     | Player with album art and track list |
| `calendar`  | Month grid with highlighted days     |
| `mail`      | Inbox message list                   |
| `files`     | File tree with folders               |
| `dashboard` | Widget grid with mini charts         |

If no keywords are given, a random type is chosen.

### Options

| Flag              | Description                                      |
|-------------------|--------------------------------------------------|
| `--seed N`        | Set a specific seed for deterministic output      |
| `--name Name`     | Set the exported component name (default: `Illustration`) |
| `--dark`          | Use dark mode colour tokens                      |

### Examples

Generate a code editor illustration:

```bash
node bin/generate-illustration.mjs code
```

Generate a dark mode chart with a dot grid, saved to a file:

```bash
node bin/generate-illustration.mjs chart grid --dark > ChartVisual.jsx
```

Generate a deterministic terminal illustration with a custom component name:

```bash
node bin/generate-illustration.mjs terminal --seed 42 --name TerminalVisual
```

Generate a random illustration (different each time):

```bash
node bin/generate-illustration.mjs
```

### Sample output

```bash
node bin/generate-illustration.mjs code --seed 100 --name CodeVisual
```

```jsx
const CodeVisual = () => {
  return (
    <div className="relative w-full h-full">
      <div className="absolute bottom-10 right-8 w-20 h-32 border border-gray-100 animate-float" />

      {/* Main element: code */}
      <div className="absolute inset-0 m-auto w-[320px] flex items-center justify-center">
        <div className="bg-white border border-gray-100 shadow-2xl shadow-black/[0.04] overflow-hidden">
          <div className="p-6 flex flex-col">
            <div className="flex gap-2 mb-6">
              <div className="w-2.5 h-2.5 bg-gray-200" />
              <div className="w-2.5 h-2.5 bg-gray-200" />
              <div className="w-2.5 h-2.5 bg-gray-200" />
            </div>
            <div className="space-y-3">
              <div className="flex gap-2 ml-4">
                <div className="w-24 h-2.5 bg-gray-200" />
                <div className="w-32 h-2.5 bg-gray-100" />
              </div>
              <div className="flex gap-2 ml-8">
                <div className="w-28 h-2.5 bg-gray-200/60" />
                <div className="w-20 h-2.5 bg-gray-100" />
              </div>
              <!-- ... more lines ... -->
            </div>
            <div className="h-px w-full bg-gray-200 mt-6" />
          </div>
        </div>
      </div>

      {/* Secondary: grid */}
      <div className="absolute bottom-8 left-8">
        <div className="grid grid-cols-7 gap-3">
          <div className="w-1 h-1 bg-gray-300" />
          <!-- ... dots ... -->
        </div>
      </div>
    </div>
  );
};

export default CodeVisual;
```

Render the component inside a container with a defined height:

```jsx
<div className="h-[400px]">
  <CodeVisual />
</div>
```

## Preview server

Launch a local server to preview illustrations in the browser without setting up a React project.

```bash
node bin/preview.mjs [keywords...] [options]
```

The preview server accepts all the same keywords and options as the generator, plus:

| Flag         | Description                              |
|--------------|------------------------------------------|
| `--port N`   | Set the server port (default: `3333`)    |

### Examples

Preview a code illustration:

```bash
node bin/preview.mjs code
```

Preview a dark mode chart on a custom port:

```bash
node bin/preview.mjs chart --dark --port 4000
```

Preview random illustrations (reload the page to regenerate):

```bash
node bin/preview.mjs
```

When no `--seed` is set, each page reload generates a new random variation. Set `--seed` to lock the output.

## Monorepo scripts

From the repository root:

```bash
# Generate to stdout
pnpm generate -- code --seed 42

# Launch preview server
pnpm preview -- terminal --dark
```

## Design notes

- **Monochrome palette** — light mode uses `gray-100`/`gray-200`/`gray-300`, dark mode uses `gray-700`/`gray-800`/`gray-900`
- **No border radius** — all shapes are sharp rectangles
- **Tailwind CSS** — output uses Tailwind utility classes; the preview server loads Tailwind via CDN
- **Zero dependencies** — both the generator and preview server use only Node.js built-ins
