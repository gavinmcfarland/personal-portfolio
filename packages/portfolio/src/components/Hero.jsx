const Hero = () => {
  return (
    <section className="min-h-screen flex items-center pt-20">
      <div className="w-full max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div>
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-3 text-sm font-medium text-gray-400 dark:text-gray-500 mb-6 tracking-wide">
                <span className="w-8 h-px bg-gray-300 dark:bg-gray-700" />
                FULL-STACK ENGINEER & MAKER
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black dark:text-white mb-6 leading-tight animate-fade-up-delay-1">
              Building digital
              <span className="block text-gray-400 dark:text-gray-500">products that matter</span>
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-md animate-fade-up-delay-2 leading-relaxed">
              Design engineer crafting tools, applications, and experiences. From developer tools to web platforms, I build products that solve real problems.
            </p>
            <div className="flex gap-4 animate-fade-up-delay-3">
              <a
                href="#work"
                className="group px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium transition-opacity duration-300 hover:opacity-80"
              >
                <span className="flex items-center gap-2">
                  View Work
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </a>
              <a
                href="https://github.com/gavinmcfarland"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 border border-gray-200 dark:border-gray-800 text-black dark:text-white text-sm font-medium hover:border-gray-400 dark:hover:border-gray-600 transition-colors duration-300"
              >
                GitHub
              </a>
            </div>
          </div>

          {/* Right visual — code editor card */}
          <div className="relative h-[500px] lg:h-[600px] animate-fade-in">
            {/* Floating background shapes */}
            <div className="absolute top-8 right-12 w-40 h-40 border border-gray-100 dark:border-gray-800 animate-float" />
            <div className="absolute bottom-16 left-4 w-24 h-24 border border-gray-100 dark:border-gray-800 animate-float-delayed" />

            {/* Main card */}
            <div className="absolute inset-0 m-auto w-[320px] h-[380px] bg-white dark:bg-gray-900 shadow-2xl shadow-black/[0.04] dark:shadow-black/30 border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="p-6 h-full flex flex-col">
                {/* Window chrome */}
                <div className="flex gap-2 mb-6">
                  <div className="w-2.5 h-2.5 bg-gray-200 dark:bg-gray-700" />
                  <div className="w-2.5 h-2.5 bg-gray-200 dark:bg-gray-700" />
                  <div className="w-2.5 h-2.5 bg-gray-200 dark:bg-gray-700" />
                </div>
                {/* Code lines */}
                <div className="space-y-3 flex-1">
                  <div className="flex gap-2">
                    <div className="w-12 h-2.5 bg-gray-200 dark:bg-gray-700" />
                    <div className="w-20 h-2.5 bg-gray-100 dark:bg-gray-800" />
                  </div>
                  <div className="flex gap-2 ml-4">
                    <div className="w-16 h-2.5 bg-gray-150 dark:bg-gray-750 bg-gray-200/60 dark:bg-gray-700/60" />
                    <div className="w-24 h-2.5 bg-gray-100 dark:bg-gray-800" />
                  </div>
                  <div className="flex gap-2 ml-4">
                    <div className="w-10 h-2.5 bg-gray-200 dark:bg-gray-700" />
                    <div className="w-32 h-2.5 bg-gray-100 dark:bg-gray-800" />
                  </div>
                  <div className="flex gap-2 ml-8">
                    <div className="w-20 h-2.5 bg-gray-100 dark:bg-gray-800" />
                  </div>
                  <div className="h-2.5" />
                  <div className="flex gap-2">
                    <div className="w-14 h-2.5 bg-gray-200 dark:bg-gray-700" />
                    <div className="w-16 h-2.5 bg-gray-100 dark:bg-gray-800" />
                  </div>
                  <div className="flex gap-2 ml-4">
                    <div className="w-24 h-2.5 bg-gray-200/60 dark:bg-gray-700/60" />
                    <div className="w-12 h-2.5 bg-gray-100 dark:bg-gray-800" />
                  </div>
                  <div className="flex gap-2 ml-4">
                    <div className="w-8 h-2.5 bg-gray-200 dark:bg-gray-700" />
                    <div className="w-28 h-2.5 bg-gray-100 dark:bg-gray-800" />
                  </div>
                  <div className="h-2.5" />
                  <div className="flex gap-2">
                    <div className="w-16 h-2.5 bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
                {/* Bottom accent line */}
                <div className="h-px w-full bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>

            {/* Dot grid */}
            <div className="absolute bottom-10 left-10 grid grid-cols-5 gap-3">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-gray-300 dark:bg-gray-700"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
