import FontPicker from "./FontPicker";
import TextTuner from "./TextTuner";

/* The dev-only type trial: the typeface list and the body-text tuner, floated
   just left of the corner theme toggle. A production build renders nothing,
   so neither tool (nor the fonts it loads) ever reaches a visitor. */
const TypeTrial = () =>
  import.meta.env.DEV ? (
    <div className="type-trial">
      <FontPicker />
      <TextTuner />
    </div>
  ) : null;

export default TypeTrial;
