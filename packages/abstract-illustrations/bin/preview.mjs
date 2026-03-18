#!/usr/bin/env node

import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatorPath = join(__dirname, 'generate-illustration.mjs');

const ALL_KEYWORDS = [
  'code', 'terminal', 'data', 'chart', 'layers', 'network', 'grid', 'text',
  'kanban', 'timeline', 'form', 'music', 'calendar', 'mail', 'files', 'dashboard',
  'wave', 'orbit', 'spiral', 'scatter',
];

// ─── parse CLI args (used as initial defaults) ───────────────────────────────

const cliArgs = process.argv.slice(2);
let port = 3333;
const initialGeneratorArgs = [];

for (let i = 0; i < cliArgs.length; i++) {
  if (cliArgs[i] === '--port' && cliArgs[i + 1]) {
    port = parseInt(cliArgs[i + 1], 10);
    i++;
  } else {
    initialGeneratorArgs.push(cliArgs[i]);
  }
}

// ─── parse query string into generator args ──────────────────────────────────

function queryToArgs(query) {
  const params = new URLSearchParams(query);
  const args = [];

  const keyword = params.get('keyword') || '';
  if (keyword && keyword !== 'random') {
    args.push(keyword);
  }

  const secondary = params.get('secondary') || '';
  if (secondary && secondary !== 'none') {
    if (secondary === 'random') {
      const choices = ALL_KEYWORDS.filter((k) => k !== keyword);
      args.push(choices[Math.floor(Math.random() * choices.length)]);
    } else {
      args.push(secondary);
    }
  }

  if (params.get('dark') === 'true') {
    args.push('--dark');
  }

  const seed = params.get('seed') || '';
  if (seed) {
    args.push('--seed', seed);
  }

  const name = params.get('name') || '';
  if (name) {
    args.push('--name', name);
  }

  const c1 = params.get('c1') || '';
  const c2 = params.get('c2') || '';
  const c3 = params.get('c3') || '';
  if (c1 && c2 && c3) {
    args.push('--colors', `${c1},${c2},${c3}`);
  }

  const d1 = params.get('d1') || '';
  const d2 = params.get('d2') || '';
  const d3 = params.get('d3') || '';
  if (d1 && d2 && d3) {
    args.push('--colors-dark', `${d1},${d2},${d3}`);
  }

  return args;
}

// ─── parse generator args back into form state ───────────────────────────────

function argsToState(args) {
  const state = { keyword: 'random', secondary: 'none', dark: false, seed: '', name: '', c1: '', c2: '', c3: '', d1: '', d2: '', d3: '' };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dark') {
      state.dark = true;
    } else if (args[i] === '--seed' && args[i + 1]) {
      state.seed = args[i + 1];
      i++;
    } else if (args[i] === '--name' && args[i + 1]) {
      state.name = args[i + 1];
      i++;
    } else if (args[i] === '--colors' && args[i + 1]) {
      const parts = args[i + 1].split(',');
      if (parts.length === 3) {
        state.c1 = parts[0].trim();
        state.c2 = parts[1].trim();
        state.c3 = parts[2].trim();
      }
      i++;
    } else if (args[i] === '--colors-dark' && args[i + 1]) {
      const parts = args[i + 1].split(',');
      if (parts.length === 3) {
        state.d1 = parts[0].trim();
        state.d2 = parts[1].trim();
        state.d3 = parts[2].trim();
      }
      i++;
    } else if (!args[i].startsWith('--') && args[i] !== '--') {
      if (state.keyword === 'random') {
        state.keyword = args[i];
      } else if (state.secondary === 'none') {
        state.secondary = args[i];
      }
    }
  }

  return state;
}

// ─── extract UI state from query (preserves "random" literally) ──────────────

function queryToUiState(query) {
  const params = new URLSearchParams(query);
  return {
    keyword: params.get('keyword') || 'random',
    secondary: params.get('secondary') || 'none',
    dark: params.get('dark') === 'true',
    seed: params.get('seed') || '',
    name: params.get('name') || '',
    c1: params.get('c1') || '',
    c2: params.get('c2') || '',
    c3: params.get('c3') || '',
    d1: params.get('d1') || '',
    d2: params.get('d2') || '',
    d3: params.get('d3') || '',
  };
}

// ─── jsx → html conversion ───────────────────────────────────────────────────

function jsxToHtml(jsx) {
  let html = jsx;

  html = html.replace(/^\/\/.*\n/gm, '');
  html = html.replace(/^import .*;\s*$/gm, '');
  html = html.replace(/const \w+ = \(\) => \{/, '');
  // strip React hooks (useRef, useState, useEffect blocks)
  html = html.replace(/^\s*const \w+Ref = useRef.*$/gm, '');
  html = html.replace(/^\s*const \[.*\] = useState.*$/gm, '');
  html = html.replace(/^\s*useEffect\(\(\) => \{[\s\S]*?\}, \[.*?\]\);\s*/gm, '');
  html = html.replace(/^\s*return \(\s*$/m, '');
  html = html.replace(/^\s*\);\s*$/m, '');
  html = html.replace(/^\s*\};\s*$/m, '');
  html = html.replace(/^export default \w+;\s*$/m, '');
  html = html.replace(/\{\/\*.*?\*\/\}/g, '');
  // strip React ref attributes and template literal styles
  html = html.replace(/\s*ref=\{[^}]+\}/g, '');
  html = html.replace(/style=\{\{ transform: `scale\(\$\{scale\}\)` \}\}/g, 'id="illustration-inner"');
  html = html.replace(/className=/g, 'class=');

  html = html.replace(/style=\{\{(.*?)\}\}/g, (_, inner) => {
    const css = inner
      .split(',')
      .map((pair) => {
        const [key, ...rest] = pair.split(':');
        if (!key || rest.length === 0) return '';
        const prop = key.trim().replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^'|'$/g, '');
        const val = rest.join(':').trim().replace(/^'|'$/g, '').replace(/^"|"$/g, '');
        return `${prop}: ${val}`;
      })
      .filter(Boolean)
      .join('; ');
    return `style="${css}"`;
  });

  html = html.replace(/<(div|span)(\s[^>]*?)\s*\/>/g, '<$1$2></$1>');
  html = html.replace(/strokeLinecap=/g, 'stroke-linecap=');
  html = html.replace(/strokeLinejoin=/g, 'stroke-linejoin=');
  html = html.replace(/strokeWidth=/g, 'stroke-width=');
  html = html.replace(/fillRule=/g, 'fill-rule=');
  html = html.replace(/clipRule=/g, 'clip-rule=');
  html = html.replace(/=\{(\d+(?:\.\d+)?)\}/g, '="$1"');

  return html.trim();
}

// ─── generate illustration html ──────────────────────────────────────────────

function generateBody(generatorArgs) {
  const jsx = execFileSync('node', [generatorPath, ...generatorArgs], {
    encoding: 'utf-8',
  });
  return jsxToHtml(jsx);
}

// ─── extract seed from generator output ──────────────────────────────────────

function getSeedFromOutput(generatorArgs) {
  const jsx = execFileSync('node', [generatorPath, ...generatorArgs], {
    encoding: 'utf-8',
  });
  const match = jsx.match(/\/\/ Seed: (\d+)/);
  return match ? match[1] : '';
}

// ─── build full HTML page ────────────────────────────────────────────────────

function buildPage(generatorArgs, uiState) {
  const isDark = generatorArgs.includes('--dark');
  const body = generateBody(generatorArgs);
  const state = uiState || argsToState(generatorArgs);

  // get the actual seed used (for display)
  const seedMatch = (() => {
    const jsx = execFileSync('node', [generatorPath, ...generatorArgs], { encoding: 'utf-8' });
    const m = jsx.match(/\/\/ Seed: (\d+)/);
    return m ? m[1] : '';
  })();

  const bgColor = isDark ? '#0a0a0a' : '#ffffff';
  const textColor = isDark ? '#000000' : '#000000';

  const keywordOptions = ['random', ...ALL_KEYWORDS]
    .map((k) => `<option value="${k}"${k === state.keyword ? ' selected' : ''}>${k}</option>`)
    .join('');

  const secondaryOptions = ['none', 'random', ...ALL_KEYWORDS]
    .map((k) => `<option value="${k}"${k === state.secondary ? ' selected' : ''}>${k}</option>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en"${isDark ? ' class="dark"' : ''}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Illustration Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { darkMode: 'class' }
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

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: ${bgColor};
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif;
    }

    .controls {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #ffffff;
      border-top: 1px solid #e5e7eb;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 13px;
      z-index: 100;
    }

    .controls label {
      color: #9ca3af;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .controls .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .controls select,
    .controls input[type="text"] {
      padding: 6px 8px;
      border: 1px solid #e5e7eb;
      background: #ffffff;
      font-size: 13px;
      font-family: inherit;
      color: #000000;
      min-width: 100px;
    }

    .controls input[type="text"] {
      width: 80px;
    }

    .controls input[type="color"] {
      width: 32px;
      height: 32px;
      padding: 1px;
      border: 1px solid #e5e7eb;
      background: #ffffff;
      cursor: pointer;
    }

    .controls input[type="text"].wide {
      width: 120px;
    }

    .controls button {
      padding: 6px 14px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      color: #000000;
    }

    .controls button:hover {
      background: #f3f4f6;
    }

    .controls button.primary {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }

    .controls button.primary:hover {
      opacity: 0.85;
    }

    .controls .toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      user-select: none;
    }

    .controls .toggle input {
      accent-color: #000000;
    }

    .controls .spacer {
      flex: 1;
    }

    .controls .seed-display {
      color: #9ca3af;
      font-size: 11px;
      font-family: 'SF Mono', Monaco, monospace;
    }
  </style>
</head>
<body>
  <div id="illustration-container" style="display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 56px); padding: 2rem;">
    ${body}
  </div>
  <script>
    (function() {
      var inner = document.getElementById('illustration-inner');
      var container = document.getElementById('illustration-container');
      if (!inner || !container) return;
      function resize() {
        var w = container.clientWidth - 64;
        var h = container.clientHeight - 64;
        var s = Math.min(w / 480, h / 480, 1);
        inner.style.transform = 'scale(' + s + ')';
      }
      resize();
      new ResizeObserver(resize).observe(container);
    })();
  </script>

  <form class="controls" method="GET" action="/">
    <div class="field">
      <label for="keyword">Keyword</label>
      <select name="keyword" id="keyword">
        ${keywordOptions}
      </select>
    </div>

    <div class="field">
      <label for="secondary">Secondary</label>
      <select name="secondary" id="secondary">
        ${secondaryOptions}
      </select>
    </div>

    <div class="field">
      <label for="seed">Seed</label>
      <input type="text" name="seed" id="seed" value="${state.seed}" placeholder="random" />
    </div>

    <div class="field">
      <label for="name">Component</label>
      <input type="text" name="name" id="name" value="${state.name}" placeholder="Illustration" class="wide" />
    </div>

    <div class="field">
      <label>&nbsp;</label>
      <label class="toggle">
        <input type="checkbox" name="dark" value="true"${isDark ? ' checked' : ''} />
        Dark
      </label>
    </div>

    <div style="width: 1px; height: 28px; background: #e5e7eb; margin: 0 4px; align-self: end;"></div>

    <div class="field">
      <label>Light</label>
      <div style="display: flex; gap: 4px;">
        <input type="color" ${state.c1 ? 'name="c1" ' : ''}id="c1" value="${state.c1 || '#9ca3af'}" data-color="c1" title="Strong" />
        <input type="color" ${state.c2 ? 'name="c2" ' : ''}id="c2" value="${state.c2 || '#d1d5db'}" data-color="c2" title="Medium" />
        <input type="color" ${state.c3 ? 'name="c3" ' : ''}id="c3" value="${state.c3 || '#f3f4f6'}" data-color="c3" title="Subtle" />
      </div>
    </div>

    <div class="field">
      <label>Dark</label>
      <div style="display: flex; gap: 4px;">
        <input type="color" ${state.d1 ? 'name="d1" ' : ''}id="d1" value="${state.d1 || '#4b5563'}" data-color="d1" title="Strong" />
        <input type="color" ${state.d2 ? 'name="d2" ' : ''}id="d2" value="${state.d2 || '#374151'}" data-color="d2" title="Medium" />
        <input type="color" ${state.d3 ? 'name="d3" ' : ''}id="d3" value="${state.d3 || '#1f2937'}" data-color="d3" title="Subtle" />
      </div>
    </div>

    <div class="field">
      <label>&nbsp;</label>
      <div style="display: flex; gap: 4px;">
        <button type="button" id="randomize-colors" style="font-size: 11px; padding: 4px 8px;">
          Shuffle
        </button>
        <button type="button" id="reset-colors" style="font-size: 11px; padding: 4px 8px;">
          Reset
        </button>
      </div>
    </div>

    <div class="spacer"></div>

    <span class="seed-display">seed: ${seedMatch}</span>

    <button type="button" onclick="document.getElementById('seed').value=''; this.form.submit();">
      Randomise
    </button>

    <button type="submit" class="primary">
      Generate
    </button>
  </form>
  <script>
    document.querySelectorAll('.controls select, .controls input[type="checkbox"]').forEach(function(el) {
      el.addEventListener('change', function() { this.form.submit(); });
    });
    document.querySelectorAll('.controls input[type="color"]').forEach(function(el) {
      el.addEventListener('change', function() {
        document.querySelectorAll('input[data-color]').forEach(function(c) {
          c.setAttribute('name', c.dataset.color);
        });
        this.form.submit();
      });
    });

    function activateAllColors() {
      document.querySelectorAll('input[data-color]').forEach(function(el) {
        el.setAttribute('name', el.dataset.color);
      });
    }

    // harmonious colour generation
    function hslToHex(h, s, l) {
      h = ((h % 360) + 360) % 360;
      s = Math.max(0, Math.min(100, s)) / 100;
      l = Math.max(0, Math.min(100, l)) / 100;
      var a = s * Math.min(l, 1 - l);
      function f(n) {
        var k = (n + h / 30) % 12;
        var color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      }
      return '#' + f(0) + f(8) + f(4);
    }

    function generateHarmony() {
      var baseHue = Math.floor(Math.random() * 360);
      var strategies = ['mono', 'analogous', 'complementary', 'triadic', 'split'];
      var strategy = strategies[Math.floor(Math.random() * strategies.length)];

      var h1 = baseHue, h2 = baseHue, h3 = baseHue;
      switch (strategy) {
        case 'mono':
          h2 = baseHue;
          h3 = baseHue;
          break;
        case 'analogous':
          h2 = baseHue + 25 + Math.floor(Math.random() * 15);
          h3 = baseHue - 25 - Math.floor(Math.random() * 15);
          break;
        case 'complementary':
          h2 = baseHue + 180;
          h3 = baseHue + 180 + (Math.random() > 0.5 ? 15 : -15);
          break;
        case 'triadic':
          h2 = baseHue + 120;
          h3 = baseHue + 240;
          break;
        case 'split':
          h2 = baseHue + 150;
          h3 = baseHue + 210;
          break;
      }

      return {
        light: {
          c1: hslToHex(h1, 30 + Math.random() * 35, 55 + Math.random() * 15),
          c2: hslToHex(h2, 20 + Math.random() * 25, 75 + Math.random() * 10),
          c3: hslToHex(h3, 15 + Math.random() * 20, 92 + Math.random() * 5),
        },
        dark: {
          c1: hslToHex(h1, 40 + Math.random() * 30, 45 + Math.random() * 15),
          c2: hslToHex(h2, 25 + Math.random() * 20, 30 + Math.random() * 10),
          c3: hslToHex(h3, 15 + Math.random() * 15, 15 + Math.random() * 8),
        }
      };
    }

    document.getElementById('randomize-colors').addEventListener('click', function() {
      var palette = generateHarmony();
      document.getElementById('c1').value = palette.light.c1;
      document.getElementById('c2').value = palette.light.c2;
      document.getElementById('c3').value = palette.light.c3;
      document.getElementById('d1').value = palette.dark.c1;
      document.getElementById('d2').value = palette.dark.c2;
      document.getElementById('d3').value = palette.dark.c3;
      activateAllColors();
      this.form.submit();
    });

    document.getElementById('reset-colors').addEventListener('click', function() {
      document.getElementById('c1').value = '#9ca3af';
      document.getElementById('c2').value = '#d1d5db';
      document.getElementById('c3').value = '#f3f4f6';
      document.getElementById('d1').value = '#4b5563';
      document.getElementById('d2').value = '#374151';
      document.getElementById('d3').value = '#1f2937';
      document.querySelectorAll('input[data-color]').forEach(function(el) {
        el.removeAttribute('name');
      });
      this.form.submit();
    });
  </script>
</body>
</html>`;
}

// ─── serve ────────────────────────────────────────────────────────────────────

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  if (url.pathname === '/' || url.pathname === '/index.html') {
    // if there are query params, use those; otherwise fall back to CLI args
    const hasQuery = url.search && url.search.length > 1;
    const generatorArgs = hasQuery ? queryToArgs(url.search) : initialGeneratorArgs;
    const uiState = hasQuery ? queryToUiState(url.search) : null;

    const html = buildPage(generatorArgs, uiState);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`\n  Preview server running at http://localhost:${port}`);
  console.log(`  Args: ${initialGeneratorArgs.join(' ') || '(random)'}\n`);
});
