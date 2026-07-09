import { Section } from "./ui";

const socials = [
  { label: "GitHub", href: "https://github.com/gavinmcfarland" },
  { label: "X", href: "https://x.com/gavinmcfarland" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/gavinmcfarland" },
];

const Connect = () => (
  <div className="pb-20">
    <Section id="connect" label="Connect">
      <div className="pr-3 pl-[0px]">
        <p className="max-w-[48ch] text-pretty text-[1.0625rem] leading-relaxed text-muted">Looking for the next interesting thing to build.</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[1.0625rem]">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="ulink"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </Section>
  </div>
);

export default Connect;
