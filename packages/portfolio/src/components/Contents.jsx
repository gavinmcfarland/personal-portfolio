/* CONTENTS — a printed manual's table of contents borrowed into the man-page
   set: each section title with dotted leaders running out to its locator. Real
   man pages carry no TOC; the device is a printed-book one. The §n locators are
   shared with the INDEX so the two finding-aids agree. */

const ENTRIES = [
  { label: "Name", href: "#name", sec: "1" },
  { label: "Synopsis", href: "#synopsis", sec: "2" },
  { label: "Description", href: "#description", sec: "3" },
  { label: "Examples", href: "#examples", sec: "4" },
  { label: "Capabilities", href: "#capabilities", sec: "5" },
  { label: "Staging", href: "#playground", sec: "6" },
  { label: "Environment", href: "#environment", sec: "7" },
  { label: "Index", href: "#index", sec: "8" },
  { label: "See also", href: "#connect", sec: "9" },
  { label: "Author", href: "#author", sec: "10" },
];

const Contents = () => (
  <>
    <h2 id="contents" className="section-label reveal">
      Contents
    </h2>
    <ul className="indent reveal leaders max-w-measure-narrow">
      {ENTRIES.map((e) => (
        <li key={e.href} className="leader">
          <a href={e.href} className="xref">
            {e.label}
          </a>
          <span className="leader__dots" aria-hidden="true" />
          <span className="leader__pg">
            <span className="sec">§</span>
            {e.sec}
          </span>
        </li>
      ))}
    </ul>
  </>
);

export default Contents;
