import { useEffect, useRef, useState } from "react";
import { CmsNotFoundError } from "@/lib/cms-client";

export type CmsQueryState<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "not-found" }
  | { status: "empty" }
  | { status: "success"; data: T };

/**
 * Runs `fetcher` on mount (and whenever `deps` changes) and reduces the result to one of
 * loading / success / empty / error / not-found — the four states the engineering
 * directive requires every dynamic page to handle, plus loading. Treats an empty array
 * as "empty" automatically so list pages don't need to special-case it themselves.
 *
 * Usage:
 *   const state = useCmsResource(() => getProjects(), []);
 *   const projectState = useCmsResource(() => getProjectBySlug(slug), [slug]);
 */
export function useCmsResource<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList
): CmsQueryState<T> {
  const [state, setState] = useState<CmsQueryState<T>>({ status: "loading" });
  // Guards against setting state from a stale request if deps change before it resolves.
  const requestId = useRef(0);

  useEffect(() => {
    const thisRequest = ++requestId.current;
    setState({ status: "loading" });

    fetcher()
      .then((data) => {
        if (requestId.current !== thisRequest) return;
        if (Array.isArray(data) && data.length === 0) {
          setState({ status: "empty" });
        } else {
          setState({ status: "success", data });
        }
      })
      .catch((err) => {
        if (requestId.current !== thisRequest) return;
        if (err instanceof CmsNotFoundError) {
          setState({ status: "not-found" });
        } else {
          const message =
            err?.response?.status
              ? `The site couldn't load this content (error ${err.response.status}). Please try again shortly.`
              : "The site couldn't reach the content server. Check your connection and try again.";
          setState({ status: "error", error: message });
          // eslint-disable-next-line no-console
          console.error("CMS fetch failed:", err);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
