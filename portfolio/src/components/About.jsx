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
    <section id="about" className="py-32 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2">
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-8 tracking-wide">
              ABOUT
            </h2>

            <div className="space-y-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                I'm a full-stack engineer and maker who builds digital products that solve real problems.
                From developer tools to web platforms, I focus on creating software that empowers teams and
                individuals to work more efficiently.
              </p>
              <p>
                My work spans the entire stack - from system architecture and APIs to intuitive user interfaces.
                Projects like Plugma showcase my approach to developer experience, featuring hot module reloading
                and zero-config setup that makes building easier for thousands of developers.
              </p>
              <p>
                I believe in open source, clean code, and building tools that are not just functional, but
                delightful to use. Every project is an opportunity to push boundaries and create something meaningful.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-8 mt-16">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold text-black dark:text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-8 tracking-wide">
              EXPERTISE
            </h3>
            <div className="space-y-3">
              {skills.map((skill) => (
                <div key={skill} className="text-lg text-black dark:text-white">
                  {skill}
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