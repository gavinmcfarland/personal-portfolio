import { education } from '../data/education';
import { ListRow, Sep } from './ui';

const Education = () => (
  <>
    <h2 id="education" className="section-label reveal">
      Education
    </h2>
    <div className="indent reveal -my-(--sp-1)">
      {education.map((e) => (
        <ListRow key={e.id} index={e.year}>
          <span className="font-sans text-5 font-bold text-ink">{e.title}</span>
          <Sep />
          <span className="text-4 text-muted">{e.place}</span>
        </ListRow>
      ))}
    </div>
  </>
);

export default Education;
