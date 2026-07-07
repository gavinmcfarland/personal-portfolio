import { Section } from './ui';

const socials = [
  { label: 'GitHub', href: 'https://github.com/gavinmcfarland' },
  { label: 'X', href: 'https://x.com/gavinmcfarland' },
];

const Connect = () => (
  <div className="pb-20">
    <Section id="connect" label="Connect">
      <div className="px-3">
        <p className="max-w-[48ch] text-pretty text-[1.0625rem] leading-relaxed text-muted">
          Open to freelance work and collaborations. The quickest way to reach me
          is email.
        </p>
        <a
          href="mailto:gavin@limitlessloop.com"
          className="ulink mt-3 inline-block text-[1.0625rem] font-medium"
        >
          gavin@limitlessloop.com
        </a>

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

        <p className="mt-10 text-[0.8125rem] text-faint">© 2026 Gavin McFarland</p>
      </div>
    </Section>
  </div>
);

export default Connect;
