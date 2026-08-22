import { useEffect, useRef } from 'react';

/**
 * wow.js port — adds `.is-visible` to every descendant carrying the
 * `.wpt-reveal` class once it scrolls into view. Mirrors the original
 * themes' animate.css entrances (zoomIn / flip / fadeInRight) without
 * shipping the whole library.
 */
export function useReveal(deps: unknown[] = []) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll('.wpt-reveal'));
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    // small stagger per element index inside the same section
    targets.forEach((t, i) => {
      (t as HTMLElement).style.transitionDelay = `${(i % 4) * 90}ms`;
      io.observe(t);
    });

    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return rootRef;
}
