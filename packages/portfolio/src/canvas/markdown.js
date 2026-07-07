/* Tiny markdown renderer + source highlighter, ported from the mockup.
   mdParse → rendered HTML (for the read view); mdHighlight → tokenised source
   (for the live-highlighted editor overlay). Both return HTML strings. */
const mdEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function mdParse(src) {
  const blocks = [];
  src = src.replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) => {
    blocks.push(`<pre class="cb"><code>${mdEsc(code.replace(/\n$/, ''))}</code></pre>`);
    return ` ${blocks.length - 1} `;
  });
  const inline = (t) =>
    mdEsc(t)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
      .replace(/(^|[^_])_([^_\s][^_]*?)_/g, '$1<em>$2</em>');
  const lines = src.split(/\n/);
  let html = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const ph = line.match(/^ (\d+) $/);
    if (ph) {
      html += blocks[+ph[1]];
      i++;
      continue;
    }
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const n = h[1].length;
      html += `<h${n}>${inline(h[2])}</h${n}>`;
      i++;
      continue;
    }
    const kick = line.match(/^--(?!-)\s+(.+)$/); // "-- Subheading" → dash kicker
    if (kick) {
      html += `<div class="md-kicker">${inline(kick[1])}</div>`;
      i++;
      continue;
    }
    if (/^\s*(\[[^\]]+\]\s*)+$/.test(line) && line.indexOf('](') < 0) {
      // "[a] [b]" → tag pills
      const tags = [...line.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
      html += `<div class="md-tags">${tags.map((t) => `<span>${inline(t)}</span>`).join('')}</div>`;
      i++;
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      html += '<hr>';
      i++;
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const bq = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        bq.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      html += `<blockquote>${inline(bq.join(' '))}</blockquote>`;
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const it = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        it.push(inline(lines[i].replace(/^\s*[-*+]\s+/, '')));
        i++;
      }
      html += `<ul>${it.map((x) => `<li>${x}</li>`).join('')}</ul>`;
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const it = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        it.push(inline(lines[i].replace(/^\s*\d+\.\s+/, '')));
        i++;
      }
      html += `<ol>${it.map((x) => `<li>${x}</li>`).join('')}</ol>`;
      continue;
    }
    const para = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^ \d+ $/.test(lines[i]) &&
      !/^--(?!-)\s+/.test(lines[i]) &&
      !/^\s*(\[[^\]]+\]\s*)+$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    html += `<p>${inline(para.join(' '))}</p>`;
  }
  return html;
}

export function mdHighlight(src) {
  let fence = false;
  return src
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        fence = !fence;
        return `<span class="t-fence">${mdEsc(line)}</span>`;
      }
      if (fence) return `<span class="t-code">${mdEsc(line) || ' '}</span>`;
      if (/^(#{1,6})\s/.test(line)) return `<span class="t-head">${mdEsc(line)}</span>`;
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) return `<span class="t-hr">${mdEsc(line)}</span>`;
      if (/^\s*>\s?/.test(line)) return `<span class="t-quote">${mdEsc(line)}</span>`;
      if (/^--(?!-)\s+\S/.test(line)) return `<span class="t-kicker">${mdEsc(line)}</span>`;
      if (/^\s*(\[[^\]]+\]\s*)+$/.test(line) && line.indexOf('](') < 0)
        return mdEsc(line).replace(/(\[[^\]]+\])/g, '<span class="t-tag">$1</span>');
      let l = mdEsc(line);
      l = l.replace(/^(\s*)([-*+])(\s+)/, '$1<span class="t-mark">$2</span>$3');
      l = l.replace(/^(\s*)(\d+\.)(\s+)/, '$1<span class="t-mark">$2</span>$3');
      l = l.replace(
        /(`[^`]+`)|(\*\*[^*]+\*\*|__[^_]+__)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)|(\[[^\]]+\]\([^)\s]+\))/g,
        (m, c, b, e2) => `<span class="${c ? 't-code-in' : b ? 't-bold' : e2 ? 't-em' : 't-link'}">${m}</span>`
      );
      return l || ' ';
    })
    .join('\n');
}
