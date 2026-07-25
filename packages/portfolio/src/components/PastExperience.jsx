import { Section } from "./ui";

/* The operating context, set as a man page's ENVIRONMENT: the variables the
   `gavin` command runs under — stack, location, the years and the names behind
   them — as roff .TP hanging pairs. The full history lives one cross-reference
   away. */

const ENV = [
  { name: "STACK", value: "TypeScript, Svelte, Node.js, React, Vite, Figma API" },
  { name: "BASED", value: "London, United Kingdom" },
  { name: "DOMAINS", value: "Finance, government, retail" },
  {
    name: "HISTORY",
    value:
      "12+ years freelance — Lovable, American Express, Amazon, NatWest, and others",
  },
];

const PastExperience = () => (
  <Section id="environment" label="Environment">
    <dl className="space-y-3">
      {ENV.map((e) => (
        <div key={e.name} className="tp">
          <dt>{e.name}</dt>
          <dd className="text-muted">{e.value}</dd>
        </div>
      ))}
    </dl>

    <p className="mt-6 text-[0.85rem] text-muted">
      Full professional history:{" "}
      <a
        href="https://www.linkedin.com/in/gavinmcfarland"
        target="_blank"
        rel="noopener noreferrer"
        className="xref"
      >
        linkedin
      </a>
      <span className="xref__sec">(7)</span>
    </p>
  </Section>
);

export default PastExperience;
