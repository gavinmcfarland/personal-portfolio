import { projects } from '../data/projects';

const Projects = () => {
  return (
    <section id="work" className="py-32 border-t border-gray-100 dark:border-gray-800/50">
      <div className="max-w-7xl mx-auto px-8">
        {/* Header in left column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
          <div>
            <span className="inline-flex items-center gap-3 text-sm font-medium text-gray-400 dark:text-gray-500 mb-4 tracking-wide">
              <span className="w-8 h-px bg-gray-300 dark:bg-gray-700" />
              SELECTED WORK
            </span>
            <p className="text-3xl md:text-4xl font-bold text-black dark:text-white">
              Tools, platforms, and products
            </p>
          </div>
          <div className="flex items-end">
            <p className="text-gray-400 dark:text-gray-500 leading-relaxed">
              Built for developers and teams — from CLI toolkits to collaborative data tools.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-20">
          {projects.map((project, index) => (
            <div key={project.id} className="group">
              {/* Project image area */}
              <div className="aspect-[4/3] bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800/50 mb-6 overflow-hidden relative">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl font-bold text-gray-200 dark:text-gray-800 transition-transform duration-500 group-hover:scale-110">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                {/* Hover line */}
                <div className="absolute bottom-0 left-0 w-0 h-px bg-black dark:bg-white group-hover:w-full transition-all duration-500" />
              </div>

              {/* Project info */}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-black dark:text-white">
                    {project.title}
                  </h3>
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800 px-2 py-1">
                    {project.category}
                  </span>
                </div>

                <p className="text-gray-500 dark:text-gray-400 mb-5 leading-relaxed text-sm">
                  {project.description}
                </p>

                <div className="flex flex-wrap gap-3 mb-5">
                  {project.tech.slice(0, 3).map((tech) => (
                    <span
                      key={tech}
                      className="text-xs text-gray-400 dark:text-gray-500"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-800/50">
                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/link px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium transition-opacity duration-300 hover:opacity-80"
                    >
                      <span className="flex items-center gap-2">
                        View Project
                        <svg className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </span>
                    </a>
                  )}
                  {project.github && (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-gray-200 dark:border-gray-800 text-black dark:text-white text-sm font-medium hover:border-gray-400 dark:hover:border-gray-600 transition-colors duration-300"
                    >
                      Source
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
