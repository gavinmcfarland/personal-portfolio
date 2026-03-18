const Contact = () => {
  const links = [
    {
      name: 'GitHub',
      url: 'https://github.com/gavinmcfarland',
      label: '@gavinmcfarland'
    },
    {
      name: 'Twitter',
      url: 'https://twitter.com/gavinmcfarland',
      label: '@gavinmcfarland'
    },
    {
      name: 'Email',
      url: 'mailto:contact@gavinmcfarland.com',
      label: 'contact@gavinmcfarland.com'
    }
  ];

  return (
    <footer id="contact" className="py-32 border-t border-gray-100 dark:border-gray-800/50">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left column */}
          <div>
            <span className="inline-flex items-center gap-3 text-sm font-medium text-gray-400 dark:text-gray-500 mb-8 tracking-wide">
              <span className="w-8 h-px bg-gray-300 dark:bg-gray-700" />
              GET IN TOUCH
            </span>
            <p className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">
              Let's build something
              <span className="text-gray-400 dark:text-gray-500"> together</span>
            </p>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              I'm always interested in new projects and opportunities to create tools that matter.
            </p>
          </div>

          {/* Right column */}
          <div className="flex flex-col justify-center">
            <div className="space-y-0">
              {links.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target={link.name !== 'Email' ? '_blank' : undefined}
                  rel={link.name !== 'Email' ? 'noopener noreferrer' : undefined}
                  className="group flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800/50 transition-colors duration-300"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400 dark:text-gray-500 w-16">{link.name}</span>
                    <span className="text-black dark:text-white font-medium group-hover:opacity-60 transition-opacity duration-300">
                      {link.label}
                    </span>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-700 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-32 pt-8 border-t border-gray-100 dark:border-gray-800/50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400 dark:text-gray-600">
              &copy; 2024 Gavin McFarland
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-600">
              Built with React & Tailwind CSS
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Contact;
