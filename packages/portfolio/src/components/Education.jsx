import { education } from '../data/education';
import { Section, ListRow, Sep } from './ui';

const Education = () => (
  <Section id="education" label="Education">
    <div className="-my-1">
      {education.map((e) => (
        <ListRow key={e.id} index={e.year}>
          <span className="font-sans text-[0.9375rem] font-bold text-ink">{e.title}</span>
          <Sep />
          <span className="text-[1rem] text-muted">{e.place}</span>
        </ListRow>
      ))}
    </div>
  </Section>
);

export default Education;
