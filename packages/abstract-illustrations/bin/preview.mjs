#!/usr/bin/env node

import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatorPath = join(__dirname, 'generate-illustration.mjs');

// ─── parse args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let port = 3333;
const generatorArgs = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else {
    generatorArgs.push(args[i]);
  }
}

// detect --dark from forwarded args
const isDark = generatorArgs.includes('--dark');

// ─── jsx → html conversion ───────────────────────────────────────────────────

function jsxToHtml(jsx) {
  let html = jsx;

  // strip component wrapper — extract just the JSX body
  html = html.replace(/^\/\/.*\n/gm, '');           // remove comment lines
  html = html.replace(/const \w+ = \(\) => \{/, '');
  html = html.replace(/^\s*return \(\s*$/m, '');
  html = html.replace(/^\s*\);\s*$/m, '');
  html = html.replace(/^\s*\};\s*$/m, '');
  html = html.replace(/^export default \w+;\s*$/m, '');

  // remove JSX comments {/* ... */}
  html = html.replace(/\{\/\*.*?\*\/\}/g, '');

  // className → class
  html = html.replace(/className=/g, 'class=');

  // convert JSX style objects: style={{ key: 'value' }} → style="key: value"
  html = html.replace(/style=\{\{(.*?)\}\}/g, (_, inner) => {
    const css = inner
      .split(',')
      .map((pair) => {
        const [key, ...rest] = pair.split(':');
        if (!key || rest.length === 0) return '';
        const prop = key
          .trim()
          .replace(/([A-Z])/g, '-$1')
          .toLowerCase()
          .replace(/^'|'$/g, '');
        const val = rest
          .join(':')
          .trim()
          .replace(/^'|'$/g, '')
          .replace(/^"|"$/g, '');
        return `${prop}: ${val}`;
      })
      .filter(Boolean)
      .join('; ');
    return `style="${css}"`;
  });

  // convert self-closing <div ... /> → <div ...></div>
  html = html.replace(/<(div|span)(\s[^>]*?)\s*\/>/g, '<$1$2></$1>');

  // SVG attribute conversions
  html = html.replace(/strokeLinecap=/g, 'stroke-linecap=');
  html = html.replace(/strokeLinejoin=/g, 'stroke-linejoin=');
  html = html.replace(/strokeWidth=/g, 'stroke-width=');
  html = html.replace(/fillRule=/g, 'fill-rule=');
  html = html.replace(/clipRule=/g, 'clip-rule=');

  // convert JSX numeric attribute values: strokeWidth={1.5} → stroke-width="1.5"
  html = html.replace(/=\{(\d+(?:\.\d+)?)\}/g, '="$1"');

  return html.trim();
}

// ─── generate & convert ──────────────────────────────────────────────────────

function generateHtml() {
  const jsx = execFileSync('node', [generatorPath, ...generatorArgs], {
    encoding: 'utf-8',
  });

  const body = jsxToHtml(jsx);

  const bgColor = isDark ? '#0a0a0a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const darkClass = isDark ? 'class="dark"' : '';

  return `<!DOCTYPE html>
<html lang="en" ${darkClass}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Illustration Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
    }
  </script>
  <style>
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-12px); }
    }
    @keyframes float-delayed {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite; }
  </style>
</head>
<body style="margin: 0; background: ${bgColor}; color: ${textColor}; font-family: -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif;">
  <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem;">
    <div style="width: 480px; height: 480px; position: relative;">
      ${body}
    </div>
  </div>

  <!-- Controls -->
  <div style="position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); display: flex; gap: 0.75rem; align-items: center;">
    <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: ${isDark ? '#1f2937' : '#f3f4f6'}; border: 1px solid ${isDark ? '#374151' : '#e5e7eb'}; color: ${textColor}; font-size: 0.875rem; cursor: pointer; font-family: inherit;">
      Reload
    </button>
    <span style="font-size: 0.75rem; color: ${isDark ? '#6b7280' : '#9ca3af'};">
      ${generatorArgs.join(' ') || '(random)'}
    </span>
  </div>
</body>
</html>`;
}

// ─── serve ────────────────────────────────────────────────────────────────────

const server = createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    const html = generateHtml();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`\n  Preview server running at http://localhost:${port}`);
  console.log(`  Args: ${generatorArgs.join(' ') || '(random)'}`);
  console.log(`  Reload the page to regenerate (seed changes each time unless --seed is set)\n`);
});
