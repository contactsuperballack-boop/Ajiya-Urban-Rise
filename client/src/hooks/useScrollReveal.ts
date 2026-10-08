import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/motion";

/**
 * Staggered scroll-reveal for a container of repeated items (grid cells, list rows, steps —
 * anything CSS-selectable from a common parent). Built on `ScrollTrigger.batch()` per the
 * gsap-scrolltrigger skill: one batch call handles many independent targets, each firing its
 * own reveal as it individually enters the viewport, rather than one Observer per element.
 *
 * Deliberately separate from `useReveal` in Home.tsx (the per-card IntersectionObserver hook
 * project cards already use) — that one is fine-grained (each card owns its own visible
 * boolean + delay), this one is for "reveal a whole batch of already-rendered items", which
 * covers everything else still static: philosophy steps, service rows, the why-grid,
 * investment steps, team cards.
 *
 * CMS-driven lists: pass the resolved list's length (or the query state's status) as part of
 * `deps` — the selector query only finds real DOM nodes after that data has rendered.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(selector: string, deps: unknown[] = []) {
  const containerRef = useRef<T>(null);

  useGSAP(() => {
    const container = containerRef.current;
    if (!container) return;
    const targets = gsap.utils.toArray<HTMLElement>(selector, container);
    if (!targets.length) return;

    const mm = gsap.matchMedia();
    mm.add(motionConditions, (context) => {
      const { reduceMotion } = context.conditions as { reduceMotion: boolean };

      if (reduceMotion) {
        gsap.set(targets, { clearProps: "all" });
        return;
      }

      gsap.set(targets, { autoAlpha: 0, y: 28 });
      ScrollTrigger.batch(targets, {
        start: "top 88%",
        once: true,
        onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out", stagger: 0.12, overwrite: true }),
      });
    });
  }, deps);

  return containerRef;
}
