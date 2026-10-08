import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

/**
 * Registered once, at module load, per the gsap-scrolltrigger skill's "register before any
 * ScrollTrigger usage" rule. Importing this module anywhere is enough — every hook below
 * (and any future one) can assume ScrollTrigger is ready.
 */
gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Shared breakpoint/reduced-motion conditions for every scroll effect in the site.
 *
 * `isMobile` matches the CSS breakpoint already used elsewhere in index.css (900px) — pin
 * and horizontal-scroll effects are the two most likely to misbehave on touch/narrow
 * viewports (see REDESIGN_SPRINT_PLAN.md), so every such effect should branch on this rather
 * than assuming desktop.
 *
 * `reduceMotion` mirrors the `prefers-reduced-motion` handling already present in index.css's
 * plain-CSS animations — this is the GSAP-side equivalent so JS-driven motion respects the
 * same user preference.
 */
export const motionConditions = {
  isDesktop: "(min-width: 901px)",
  isMobile: "(max-width: 900px)",
  reduceMotion: "(prefers-reduced-motion: reduce)",
} as const;

export { gsap, ScrollTrigger, useGSAP };
