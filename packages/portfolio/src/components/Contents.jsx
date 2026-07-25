import { useEffect, useRef, useState } from "react";

/* The man page's sticky section index, relocated into the left margin. Terse
   monospace tokens — the section names a `man gavin` would carry — scroll-spied
   so the one nearest the top of the viewport takes the vermilion tick. Shown on
   lg+ only, where the gutter has room; below that the page is short enough to
   simply scroll, so it's hidden rather than reflowed. Each token is a real
   in-page anchor, so it doubles as navigation. */

const ITEMS = [
  { id: "name", label: "Name" },
  { id: "examples", label: "Examples" },
  { id: "playground", label: "Scratch" },
  { id: "environment", label: "Env" },
  { id: "connect", label: "See also" },
];

export default function Contents() {
  const [current, setCurrent] = useState(ITEMS[0].id);
  const visible = useRef(new Set());

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.current.add(entry.target.id);
          else visible.current.delete(entry.target.id);
        }
        // The highest section still on screen wins the tick.
        const next = ITEMS.find((it) => visible.current.has(it.id));
        if (next) setCurrent(next.id);
      },
      { rootMargin: "-10% 0px -70% 0px" }
    );

    ITEMS.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <nav
      aria-label="Contents"
      className="fixed left-0 top-1/2 z-5 hidden -translate-y-1/2 flex-col gap-2 pl-6 lg:flex"
    >
      {ITEMS.map((it) => (
        <a
          key={it.id}
          href={`#${it.id}`}
          className="toc-link"
          aria-current={current === it.id ? "true" : undefined}
        >
          {it.label}
        </a>
      ))}
    </nav>
  );
}
