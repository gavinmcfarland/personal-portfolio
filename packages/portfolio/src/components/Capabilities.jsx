import { skills } from "../data/skills";
import { Section } from "./ui";

/* Hanging notes (design-mockups/11-galley, §3): a reading measure on the left
   says what the work is; the disciplines are hung as annotations out in the
   open field beside it, each held off a vermilion rule. Reuses skills.js. */
const Capabilities = () => (
  <Section id="capabilities" label="What I do">
    <div className="hang">
      <div className="max-w-[34em] space-y-4 text-pretty text-[1.0625rem] leading-relaxed text-muted">
        <p>
          Most of my work sits where design and front-end meet — design systems,
          the tooling that holds them together, and the product work around them.
        </p>
        <p className="text-faint">
          When the tool doesn&rsquo;t exist yet, I build it. Most of what I&rsquo;ve
          made started as a recurring problem rather than an idea.
        </p>
      </div>

      <div className="hang__notes">
        {skills.map((group) => (
          <div key={group.id}>
            <span className="micro block mb-1 text-accent">{group.label}</span>
            <span className="text-[0.9375rem] leading-relaxed text-muted">
              {group.items.join(", ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  </Section>
);

export default Capabilities;
