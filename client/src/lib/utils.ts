import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MutableRefObject, Ref } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Combines multiple refs into one callback ref, for the rare case a single DOM node needs to
 * be tracked by more than one hook at once (e.g. both useScrollReveal and useSpotlightGroup
 * on the same container) — React only allows one `ref` prop per element.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as MutableRefObject<T | null>).current = node;
    }
  };
}
