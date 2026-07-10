import { Link } from 'react-router-dom';
import { projects } from '../data/projects';
import { Section, ListRow, ArrowRight } from './ui';
import ProjectCanvasPreview from './ProjectCanvasPreview';

const Projects = () => (
  <Section id="projects" label="Projects">
    <div className="-my-1">
      {projects.map((p) => (
        <ListRow key={p.id} index={p.title}>
          <p className="max-w-[52ch] text-pretty pr-7 text-[1rem] leading-relaxed text-muted">
            {p.summary}
          </p>
          <div className="tnum mt-2 text-[0.9375rem] text-faint">
            {p.tech.join('  •  ')}
          </div>
          <div className="mt-3">
            <ProjectCanvasPreview project={p}>
              <Link
                to={`/projects/${p.id}`}
                className="group inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 font-sans text-[0.8125rem] font-medium text-ink transition-colors duration-200 hover:bg-surface"
              >
                View on canvas
                <ArrowRight className="h-3.5 w-3.5 text-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
              </Link>
            </ProjectCanvasPreview>
          </div>
        </ListRow>
      ))}
    </div>
  </Section>
);

export default Projects;
