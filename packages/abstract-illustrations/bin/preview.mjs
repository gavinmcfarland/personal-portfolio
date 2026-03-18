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

  return args;
}

// ─── parse generator args back into form state ───────────────────────────────

function argsToState(args) {
  const state = { keyword: 'random', secondary: 'none', dark: false, seed: '', name: '' };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dark') {
      state.dark = true;
    } else if (args[i] === '--seed' && args[i + 1]) {
      state.seed = args[i + 1];
      i++;
    } else if (args[i] === '--name' && args[i + 1]) {
      state.name = args[i + 1];
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
  };
}

// ─── jsx → html conversion ───────────────────────────────────────────────────

function jsxToHtml(jsx) {
  let html = jsx;

  html = html.replace(/^\/\/.*\n/gm, '');
  html = html.replace(/const \w+ = \(\) => \{/, '');
  html = html.replace(/^\s*return \(\s*$/m, '');
  html = html.replace(/^\s*\);\s*$/m, '');
  html = html.replace(/^\s*\};\s*$/m, '');
  html = html.replace(/^export default \w+;\s*$/m, '');
  html = html.replace(/\{\/\*.*?\*\/\}/g, '');
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
  <div style="display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 56px); padding: 2rem;">
    <div style="width: 480px; height: 480px; position: relative;">
      ${body}
    </div>
  </div>

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
