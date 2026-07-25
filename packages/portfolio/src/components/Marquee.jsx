/* A quiet keyword strip between the hero and the work — the Bold mockup's
   scrolling marquee, dropped onto a surface band instead of a colour bar so it
   stays inside the Enamel palette. Full-bleed (matches the Section break-out),
   pauses on hover, and freezes for reduced-motion users. Decorative, so the
   whole strip is aria-hidden. */
const TERMS = [
  "Design systems",
  "Figma plugins",
  "Svelte & TypeScript",
  "Design engineering",
  "Prototyping",
  "Web platform",
  "React",
  "CSS architecture",
];

const Group = () => (
  <div className="marquee-group">
    {TERMS.map((t) => (
      <span key={t} className="flex items-center gap-10">
        <span>{t}</span>
        <span className="marquee-sep">/</span>
      </span>
    ))}
  </div>
);

const Marquee = () => (
  <div
    aria-hidden="true"
    className="marquee mt-14 w-screen -ml-8 border-y border-line bg-surface py-3 sm:mt-20 sm:-ml-14 lg:-ml-24"
  >
    <div className="marquee-track">
      {/* Duplicated once; the keyframe travels exactly -50% for a seamless loop. */}
      <Group />
      <Group />
    </div>
  </div>
);

export default Marquee;
