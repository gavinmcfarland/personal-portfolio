import { freelance, permanent } from '../data/experience';
import { Section, ListRow, SubLabel, Sep } from './ui';

/* One year-group: the year shows once on the first row, blank on continuations,
   so a run of roles in the same year reads as a single block — like the CV. */
const Group = ({ year, entries }) =>
  entries.map((e, i) => (
    <ListRow key={`${year}-${i}`} index={i === 0 ? year : ''}>
      <div className="grid grid-cols-1 gap-y-1 sm:grid-cols-[9.5rem_1fr] sm:items-baseline sm:gap-x-5">
        <span className="font-sans text-[0.9375rem] font-bold text-ink">{e.primary}</span>
        <span className="text-pretty text-[1rem] text-muted">
          {e.meta.map((m, j) => (
            <span key={j}>
              {j > 0 && <Sep />}
              {m}
            </span>
          ))}
        </span>
      </div>
    </ListRow>
  ));

const Experience = () => (
  <Section id="experience" label="Past experience">
    <SubLabel>Freelance</SubLabel>
    <div className="-my-1">
      {freelance.map((g) => (
        <Group key={g.year} year={g.year} entries={g.entries} />
      ))}
    </div>

    <SubLabel>Perm</SubLabel>
    <div className="-my-1">
      {permanent.map((g) => (
        <Group key={g.year} year={g.year} entries={g.entries} />
      ))}
    </div>
  </Section>
);

export default Experience;
