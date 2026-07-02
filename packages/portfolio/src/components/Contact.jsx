import { useReveal } from "../hooks/useReveal";

const links = [
  {
    name: "GitHub",
    url: "https://github.com/gavinmcfarland",
    label: "@gavinmcfarland",
    external: true,
  },
  {
    name: "X",
    url: "https://x.com/gavinmcfarland",
    label: "@gavinmcfarland",
    external: true,
  }
];

const Contact = () => {
  const ref = useReveal();

  return (
    <footer
      id="contact"
      className="scroll-mt-24 px-4 pt-20 pb-10 sm:px-6 md:pt-28"
      ref={ref}
    >
      <div className="mx-auto max-w-[1200px]">
        {/* CTA tile */}
        <div className="reveal tile p-6 sm:p-8 md:p-14 in rounded-2xl">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:items-center md:gap-12">
            <div>
              <span className="kicker">Contact</span>
              <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-[-0.03em] text-ink md:text-6xl">
                Let&apos;s build
                <br />
                something<span className="text-accent">.</span>
              </h2>
            </div>

            {/* Links */}
            <ul className="flex flex-col gap-3">
              {links.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.url}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface-2 px-5 py-4 transition-colors duration-300 hover:border-line-strong"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
                      <span className="kicker sm:w-16">{link.name}</span>
                      <span className="truncate font-display text-base font-semibold text-ink transition-colors duration-300 group-hover:text-accent md:text-lg">
                        {link.label}
                      </span>
                    </span>
                    <svg
                      className="h-4 w-4 shrink-0 text-faint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 17L17 7M17 7H8M17 7v9"
                      />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Colophon */}
        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="kicker normal-case">© 2026 Gavin McFarland</p>
        </div>
      </div>
    </footer>
  );
};

export default Contact;
