import { Section } from "./ui";

/* Condensed work history as a short prose bio rather than a list. */
const PastExperience = () => (
  <Section id="past-experience" label="Past experience">
    <p className="text-pretty text-[1.0625rem] leading-relaxed text-muted">
      I've worked as a Freelance Designer and Engineer for over 10 years,
      helping various companies and clients such as Lovable, American Express,
      NatWest, Amazon and John Lewis. Before that I worked full-time as a
      Frontend Designer for a white label dating company. You can read my full
      professional history on{" "}
      <a
        href="https://www.linkedin.com/in/gavinmcfarland"
        target="_blank"
        rel="noopener noreferrer"
        className="ulink"
      >
        LinkedIn
      </a>
      .
    </p>
  </Section>
);

export default PastExperience;
