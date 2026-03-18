import { projects } from '../data/projects';

const Projects = () => {
  return (
    <section id="work" className="py-32 px-8 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="mb-20">
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 tracking-wide">
            SELECTED WORK
          </h2>
          <p className="text-3xl md:text-4xl font-bold text-black dark:text-white max-w-3xl">
            Tools, platforms, and products built for developers and teams
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-20">
          {projects.map((project, index) => (
            <div key={project.id} className="group">
              {/* Project image placeholder */}
              <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 mb-6 overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl font-bold text-gray-400 dark:text-gray-600">
                    {index + 1}
                  </span>
                </div>
              </div>

              {/* Project info */}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-2xl font-bold text-black dark:text-white">
                    {project.title}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-500">
                    {project.category}
                  </span>
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  {project.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {project.tech.slice(0, 3).map((tech) => (
                    <span
                      key={tech}
                      className="text-xs font-medium text-gray-500 dark:text-gray-500"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex gap-4">
                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-black dark:text-white hover:opacity-70 transition-opacity flex items-center gap-2"
                    >
                      View Project
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </a>
                  )}
                  {project.github && (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
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