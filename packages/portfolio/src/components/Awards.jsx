import { awards } from '../data/awards';
import { Section, ListRow, Sep } from './ui';

const Awards = () => (
  <Section id="awards" label="Awards and recognition">
    <div className="-my-1">
      {awards.map((a) => (
        <ListRow key={a.id} index={a.year}>
          <span className="font-sans text-[0.9375rem] font-bold text-ink">{a.title}</span>
          <Sep />
          <span className="text-[1rem] text-muted">{a.place}</span>
        </ListRow>
      ))}
    </div>
  </Section>
);

export default Awards;
