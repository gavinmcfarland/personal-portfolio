const About = () => {
  const skills = [
    'TypeScript / JavaScript',
    'React / Next.js',
    'Node.js / Python',
    'System Architecture',
    'API Design',
    'Developer Tools',
    'Cloud Infrastructure',
    'Database Design'
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
                I'm a full-stack engineer and maker who builds digital products that solve real problems.
                From developer tools to web platforms, I focus on creating software that empowers teams and
                individuals to work more efficiently.
              </p>
              <p>
                My work spans the entire stack — from system architecture and APIs to intuitive user interfaces.
                Projects like Plugma showcase my approach to developer experience, featuring hot module reloading
                and zero-config setup that makes building easier for thousands of developers.
              </p>
              <p>
                I believe in open source, clean code, and building tools that are not just functional, but
                delightful to use. Every project is an opportunity to push boundaries and create something meaningful.
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
