import { useEffect, useRef } from 'react';

/**
 * Adds the `in` class to `.reveal` descendants (and the ref element itself)
 * as they scroll into view — one calm, staggered reveal per section.
 *
 * `rescanOn` is for a page whose content arrives after it mounts — a post,
 * whose markdown is fetched in a second step. The scan happens once per commit
 * of that value, so blocks that did not exist at mount are picked up when they
 * do. Without it they would keep the `.reveal` class, never be observed, and so
 * never lose `opacity: 0`. Pages with static content pass nothing and scan once.
 */
export function useReveal(rescanOn) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const targets = [root, ...root.querySelectorAll('.reveal')].filter((el) =>
      el.classList.contains('reveal')
    );
    if (targets.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rescanOn]);

  return ref;
}
