const Hero = () => {
  return (
    <section className="min-h-screen flex items-center pt-20">
      <div className="w-full max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div>
            <h1 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 tracking-wide">
              FULL-STACK ENGINEER & MAKER
            </h1>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black dark:text-white mb-6 leading-tight">
              Building digital products
              <span className="block">that matter</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md">
              Design engineer crafting tools, applications, and experiences. From developer tools to web platforms, I build products that solve real problems.
            </p>
            <div className="flex gap-4">
              <a
                href="#work"
                className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-medium hover:opacity-90 transition-opacity"
              >
                View Work
              </a>
              <a
                href="https://github.com/gavinmcfarland"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 border border-black dark:border-white text-black dark:text-white font-medium hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>

          {/* Right visual */}
          <div className="relative h-[500px] lg:h-[600px]">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-2xl">
              {/* Abstract visual representation */}
              <div className="relative h-full p-8 flex items-center justify-center">
                <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                  <div className="h-32 bg-black dark:bg-white rounded"></div>
                  <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded col-span-2"></div>
                  <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded col-span-2"></div>
                  <div className="h-32 bg-gray-400 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;