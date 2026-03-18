const About = () => {
  const skills = [
    'TypeScript / JavaScript',
    'Svelte / React',
    'Figma Plugin & Widget API',
    'CLI Tools (Ink / Node.js)',
    'Vite / Rollup',
    'API Design',
    'Developer Tools',
    'npm Package Publishing'
  ];

  const stats = [
    { label: 'Open Source Projects', value: '10+' },
    { label: 'Users Worldwide', value: '100K+' },
    { label: 'Years Building', value: '8+' }
  ];

  return (
    <section id="about" className="py-32 border-t border-gray-100 dark:border-gray-800/50">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left column */}
          <div>
            <span className="inline-flex items-center gap-3 text-sm font-medium text-gray-400 dark:text-gray-500 mb-4 tracking-wide">
              <span className="w-8 h-px bg-gray-300 dark:bg-gray-700" />
              ABOUT
            </span>

            <div className="space-y-6 text-gray-500 dark:text-gray-400 leading-relaxed">
              <p>
                I build developer tools and design tooling — CLIs, Figma plugins, and npm packages used by
                thousands of developers and designers. My focus is on making workflows faster and removing friction
                from creative and development processes.
              </p>
              <p>
                Plugma, my most popular project, gives Figma plugin developers hot module reloading, in-browser
                previews, and zero-config setup. I've also published several Figma plugins including Table Creator and Figlet, and open-source
                libraries like Askeroo for building interactive CLI experiences.
              </p>
              <p>
                I care about developer experience and ship tools that are simple to use but powerful underneath.
                Most of my work is open source and published on npm.
              </p>
            </div>
          </div>

          {/* Right column */}
          <div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mb-16">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold text-black dark:text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400 dark:text-gray-500">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Expertise */}
            <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-6 tracking-wide">
              EXPERTISE
            </h3>
            <div className="space-y-0 border-t border-gray-100 dark:border-gray-800/50">
              {skills.map((skill, i) => (
                <div
                  key={skill}
                  className="py-3 border-b border-gray-100 dark:border-gray-800/50 text-sm text-black dark:text-white flex items-center justify-between group"
                >
                  <span>{skill}</span>
                  <span className="w-0 h-px bg-black dark:bg-white group-hover:w-8 transition-all duration-300" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
