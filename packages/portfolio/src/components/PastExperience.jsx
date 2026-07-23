import { Section } from "./ui";

const PastExperience = () => (
  <Section id="experience" label="Past experience">
    <p className="max-w-lg text-pretty text-[1.0625rem] leading-relaxed text-muted">
      I&rsquo;ve worked as a Freelance Designer and Engineer for over 12 years,
      helping various companies and clients such as Lovable, American Express,
      Amazon, and NatWest. Before that I worked full-time as a Frontend Designer
      for a white label dating company. You can read my full professional
      history on{" "}
      <a
        href="https://www.linkedin.com/in/gavinmcfarland"
        target="_blank"
        rel="noopener noreferrer"
        className="ulink font-medium"
      >
        LinkedIn
      </a>
      .
    </p>
  </Section>
);

export default PastExperience;
