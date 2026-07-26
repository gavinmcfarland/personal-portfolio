import { skills } from "../data/skills";

/* CAPABILITIES — the disciplines set as a manual's nested outline: each group is
   a numbered top-level entry (1, 2, 3) and its terms hang beneath as a lettered
   sub-list (a, b, c). The hierarchy is the content; order and depth carry it.
   Driven by the shared skills data so it never drifts from the CV. */

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

const Capabilities = () => (
  <>
    <h2 id="capabilities" className="section-label reveal">
      Capabilities
    </h2>
    <div className="indent reveal man-outline max-w-measure">
      {skills.map((group, gi) => (
        <div key={group.id}>
          <div className="man-outline__row">
            <span className="man-outline__mk">{gi + 1}</span>
            <span>
              <b>{group.label}</b>
            </span>
          </div>
          {group.items.map((item, ii) => (
            <div key={item} className="man-outline__row man-outline--2">
              <span className="man-outline__mk">{LETTERS[ii]}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  </>
);

export default Capabilities;
