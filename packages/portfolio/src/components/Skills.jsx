import { skills } from '../data/skills';
import { Section, ListRow, Sep } from './ui';

/* Capabilities, grouped by discipline. The group label sits in the row's index
   column so it lines up with the year tokens in Experience/Education, keeping the
   CV's two-column rhythm. */
const Skills = () => (
  <Section id="skills" label="Skills">
    <div className="-my-1">
      {skills.map((g) => (
        <ListRow key={g.id} index={g.label}>
          <span className="text-pretty text-[1rem] text-muted">
            {g.items.map((item, i) => (
              <span key={item}>
                {i > 0 && <Sep />}
                {item}
              </span>
            ))}
          </span>
        </ListRow>
      ))}
    </div>
  </Section>
);

export default Skills;
