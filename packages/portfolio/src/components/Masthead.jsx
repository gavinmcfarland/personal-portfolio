/* The running head of a man page, at the top of the document. Two full-bleed
   rows: the invocation that names the conceit ($ man gavin), then the classic
   three-part roff header — command(section) at both edges, manual title
   centred. Spans the full viewport width the way a man page fills the terminal;
   the theme toggle floats over the right of the invocation row (empty there). */
const Masthead = () => (
  <div className="border-b border-line">
    <div className="w-full px-8 py-2.5 sm:px-14 lg:px-24">
      <p className="man-strip">
        <span className="prompt">$</span> man gavin
      </p>
    </div>
    <div className="border-t border-line px-8 py-2 sm:px-14 lg:px-24">
      <div className="man-strip flex items-baseline justify-between gap-4">
        <b>GAVIN(1)</b>
        <span className="hidden sm:inline">General Commands Manual</span>
        <b>GAVIN(1)</b>
      </div>
    </div>
  </div>
);

export default Masthead;
