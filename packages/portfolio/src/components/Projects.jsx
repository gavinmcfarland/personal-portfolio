import { projects } from '../data/projects';
import { useReveal } from '../hooks/useReveal';

const ArrowUpRight = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 17L17 7M17 7H8M17 7v9" />
  </svg>
);

const Projects = () => {
  const ref = useReveal();

  return (
    <section id="work" className="scroll-mt-24 px-4 py-20 sm:px-6 md:py-28" ref={ref}>
      <div className="mx-auto max-w-[1200px]">
        {/* Section header */}
        <div className="reveal">
          <span className="kicker">Selected work</span>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-[-0.025em] text-ink md:text-5xl">
            Tools &amp; plugins
          </h2>
        </div>

        {/* Grid — all entries equal weight */}
        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map((project, index) => (
            <a
              key={project.id}
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="reveal group tile flex flex-col p-7 transition-colors duration-300 hover:border-line-strong in rounded-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-faint transition-colors duration-300 group-hover:text-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <ArrowUpRight className="h-4 w-4 text-faint transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
              </div>

              <h3 className="mt-6 font-display text-2xl font-bold tracking-tight text-ink">
                {project.title}
              </h3>
              <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.1em] text-accent">
                {project.tagline}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {project.tech.map((tech) => (
                  <span key={tech} className="chip">{tech}</span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
