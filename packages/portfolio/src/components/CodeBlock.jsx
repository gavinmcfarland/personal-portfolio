import { useEffect, useRef, useState } from "react";
import { codeHighlight, codeLangLabel } from "@gavinmcfarland/canvas/code";

/* A code sample in a post — a hairline panel with a mono bar header and the
   source beneath it, highlighted.
 *
 * The highlighting is the canvas package's own tokeniser, imported from its
 * `./code` subpath: a leaf module with no React, no CSS and no dependencies, so
 * this costs a few hundred bytes rather than pulling the canvas engine into the
 * post's chunk. That means a code sample on this page and a code object on a
 * board are tokenised by exactly the same rules — and, because the `cv-c-*`
 * classes it emits are coloured in app.css from the same enamel values the
 * canvas skin uses, they land on the same palette too. One highlighter, one set
 * of colours, two surfaces.
 *
 * `dangerouslySetInnerHTML` is how the tokeniser hands its work over (it returns
 * an HTML string), and it is safe here for the reason it is safe in the canvas:
 * the source is escaped before a single tag is added. Nothing in a post reaches
 * the DOM unescaped. */
export default function CodeBlock({ code, lang, title, className = "" }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = () => {
    const done = () => {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1400);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(done, () => {});
    } else done();
  };

  return (
    <div className={`codeblock ${className}`}>
      <div className="codeblock__head">
        {/* A sample is labelled by where it comes from when the post says so,
            and by what it is written in otherwise — never both, since the
            language is usually legible from the file name anyway. */}
        <span className="codeblock__label">{title || codeLangLabel(lang)}</span>
        <button
          type="button"
          className="codeblock__copy"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy code"}
          title={copied ? "Copied" : "Copy"}
        >
          {copied ? <CheckMark /> : <Clipboard />}
        </button>
      </div>
      <pre className="codeblock__body">
        <code dangerouslySetInnerHTML={{ __html: codeHighlight(code, lang) }} />
      </pre>
    </div>
  );
}

/* Square caps and mitred joins, like the arrows in ui.jsx and the chevron on a
   project row — the flat-square family the rest of the site draws in. */
const Clipboard = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="M9 4h6v3H9z" />
    <path d="M15 5.5h3.5v14H5.5v-14H9" />
  </svg>
);

const CheckMark = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
