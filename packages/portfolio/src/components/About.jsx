import { useReveal } from "../hooks/useReveal";

const stack = [
  "TypeScript",
  "React",
  "Svelte",
  "Vue",
  "Node.js",
  "Vite",
  "Figma API",
];

const About = () => {
  const ref = useReveal();

  return (
    <section
      id="about"
      className="scroll-mt-24 px-4 py-20 sm:px-6 md:py-28"
      ref={ref}
    >
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 md:grid-cols-12 md:gap-x-16">
        {/* Section title */}
        <div className="reveal md:col-span-5">
          <h2 className="mt-3 text-balance font-display text-4xl font-bold leading-[1.05] tracking-[-0.025em] text-ink md:text-5xl">
            Removing <span className="text-accent">friction</span> from creative
            workflows
          </h2>
          {/* Currently — a small signature detail */}
        </div>

        {/* Prose, held to a comfortable reading measure */}
        <div className="reveal md:col-span-7 md:pt-2">
          <div className="max-w-[54ch] space-y-6 text-pretty text-lg leading-relaxed text-muted">
            <p>
              I build developer and design tooling: CLIs, Figma plugins and npm
              packages used by thousands. My focus is removing friction from
              creative and development workflows.
            </p>
            <p>
              My most popular project, <span className="text-ink">Plugma</span>,
              gives Figma plugin developers hot module reloading, in-browser
              previews and zero-config setup.
            </p>
          </div>

          {/* Stack strip */}
          <div className="mt-10 border-t border-line pt-8">
            <span className="kicker">Stack</span>
            <div className="mt-4 flex flex-wrap gap-2">
              {stack.map((s) => (
                <span key={s} className="chip">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
