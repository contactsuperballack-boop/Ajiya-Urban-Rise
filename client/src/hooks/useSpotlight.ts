import { useRef } from "react";
import { gsap, useGSAP, motionConditions } from "@/lib/motion";

/**
 * Spotlight is a fine-pointer/desktop-only affordance — there's no hover state to react to on
 * a touchscreen, and it adds motion some users don't want, so it's gated behind both a real
 * hover-capable pointer and `prefers-reduced-motion` via the same matchMedia pattern used
 * everywhere else in the motion layer.
 */
const spotlightConditions = { ...motionConditions, canHover: "(hover: hover) and (pointer: fine)" };

/**
 * Wires one element's pointer movement to two CSS custom properties, `--spot-x`/`--spot-y`
 * (0-100, position within the element), via `gsap.quickTo` — per the gsap-performance skill,
 * quickTo reuses one tween per property instead of creating a new one on every pointermove
 * event. The element's own CSS reads those variables (see `.service-row::before` and
 * `.project-card-glow` in index.css) to position a radial-gradient glow; this hook only ever
 * touches the two variables and an `is-spotlit` class, never paints anything itself.
 */
function attachSpotlight(el: HTMLElement) {
  const setX = gsap.quickTo(el, "--spot-x", { duration: 0.35, ease: "power3", unit: "%" });
  const setY = gsap.quickTo(el, "--spot-y", { duration: 0.35, ease: "power3", unit: "%" });

  const handleMove = (event: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    setX(((event.clientX - rect.left) / rect.width) * 100);
    setY(((event.clientY - rect.top) / rect.height) * 100);
  };
  const handleEnter = () => el.classList.add("is-spotlit");
  const handleLeave = () => el.classList.remove("is-spotlit");

  el.addEventListener("pointermove", handleMove);
  el.addEventListener("pointerenter", handleEnter);
  el.addEventListener("pointerleave", handleLeave);

  return () => {
    el.removeEventListener("pointermove", handleMove);
    el.removeEventListener("pointerenter", handleEnter);
    el.removeEventListener("pointerleave", handleLeave);
  };
}

/** One spotlight-reactive element per component instance — e.g. each ProjectCard calling this once. */
export function useSpotlightRef<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(spotlightConditions, (context) => {
      const { reduceMotion, canHover } = context.conditions as { reduceMotion: boolean; canHover: boolean };
      if (reduceMotion || !canHover) return;
      return attachSpotlight(el);
    });
  }, []);

  return ref;
}

/** Many repeated children revealed from one container at once — e.g. every `.service-row`. */
export function useSpotlightGroup<T extends HTMLElement = HTMLDivElement>(selector: string, deps: unknown[] = []) {
  const containerRef = useRef<T>(null);

  useGSAP(() => {
    const container = containerRef.current;
    if (!container) return;
    const items = gsap.utils.toArray<HTMLElement>(selector, container);
    if (!items.length) return;

    const mm = gsap.matchMedia();
    mm.add(spotlightConditions, (context) => {
      const { reduceMotion, canHover } = context.conditions as { reduceMotion: boolean; canHover: boolean };
      if (reduceMotion || !canHover) return;
      const cleanups = items.map(attachSpotlight);
      return () => cleanups.forEach((fn) => fn());
    });
  }, deps);

  return containerRef;
}
