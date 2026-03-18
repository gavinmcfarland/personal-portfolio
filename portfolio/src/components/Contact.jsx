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
    <footer id="contact" className="py-32 px-8 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-8 tracking-wide">
              GET IN TOUCH
            </h2>
            <p className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-8">
              Let's build something together
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              I'm always interested in new projects and opportunities to create tools that matter.
            </p>
          </div>

          <div className="lg:text-right">
            <div className="space-y-4">
              {links.map((link) => (
                <div key={link.name}>
                  <a
                    href={link.url}
                    target={link.name !== 'Email' ? '_blank' : undefined}
                    rel={link.name !== 'Email' ? 'noopener noreferrer' : undefined}
                    className="text-lg text-black dark:text-white hover:opacity-60 transition-opacity"
                  >
                    {link.label}
                  </a>
                  <span className="text-sm text-gray-500 dark:text-gray-500 ml-2">
                    {link.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-32 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-500">
              © 2024 Gavin McFarland
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Built with React & Tailwind CSS
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Contact;