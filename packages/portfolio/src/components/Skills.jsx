import { skills } from '../data/skills';
import { ListRow, Sep } from './ui';

/* Capabilities, grouped by discipline. The group label sits in the row's index
   column so it lines up with the year tokens in Experience/Education, keeping the
   CV's two-column rhythm. */
const Skills = () => (
  <>
    <h2 id="skills" className="section-label reveal">
      Skills
    </h2>
    <div className="indent reveal -my-(--sp-1)">
      {skills.map((g) => (
        <ListRow key={g.id} index={g.label}>
          <span className="text-pretty text-4 text-muted">
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
  </>
);

export default Skills;
