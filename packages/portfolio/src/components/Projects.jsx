import { projects } from '../data/projects';
import { Section, ListRow, ArrowRight } from './ui';

const Projects = () => (
  <Section id="projects" label="Projects">
    <div className="-my-1">
      {projects.map((p) => (
        <ListRow key={p.id} index={p.title} to={`/projects/${p.id}`}>
          <p className="max-w-[52ch] text-pretty pr-7 text-[1rem] leading-relaxed text-muted">
            {p.summary}
          </p>
          <div className="tnum mt-2 text-[0.9375rem] text-faint">
            {p.tech.join('  •  ')}
          </div>
          <ArrowRight className="absolute right-3 top-3.5 h-3.5 w-3.5 text-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
        </ListRow>
      ))}
    </div>
  </Section>
);

export default Projects;
