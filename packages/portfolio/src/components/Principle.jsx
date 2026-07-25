import { useReveal } from "../hooks/useReveal";

/* Held apart (design-mockups/11-galley, P7): a small label at the head, one
   large statement at the foot, and a whole viewport of nothing between them —
   the gap is the argument. A deliberate pause between the work and the past.
   Edit the statement freely; it paraphrases the Projects intro's own words. */
const Principle = () => {
  const ref = useReveal();
  return (
    <section
      ref={ref}
      className="reveal w-screen -ml-8 border-t border-line sm:-ml-14 lg:-ml-24"
    >
      <div className="mr-auto w-full max-w-5xl pl-8 pr-5 pt-10 sm:pl-14 sm:pr-6 sm:pt-16 lg:pl-24">
        <div className="sheet sheet--tall sheet--split">
          <span className="sheet__mark">space-between</span>

          <p className="micro">Working principle</p>

          <div className="max-w-3xl pb-4">
            <p className="display">
              The best tools disappear. The craft is in making something{" "}
              <em>feel effortless to use.</em>
            </p>
            <p className="mt-7 font-mono text-[0.75rem]">
              <a href="#projects" className="ulink">
                See the work &rarr;
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Principle;
