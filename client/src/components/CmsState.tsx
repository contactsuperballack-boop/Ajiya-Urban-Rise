import { Link } from "wouter";
import type { CmsQueryState } from "@/hooks/useCmsResource";

/**
 * Renders the loading/empty/error/not-found branches of a CmsQueryState and calls
 * `children` with the resolved data on success. Keeps every dynamic page's state
 * handling visually consistent instead of each page inventing its own.
 */
export function CmsState<T>({
  state,
  children,
  emptyLabel = "Nothing here yet",
  emptyMessage = "This section is being prepared. Check back soon, or get in touch and we'll help directly.",
  notFoundLabel = "Not found",
  notFoundMessage = "We couldn't find what you were looking for. It may have moved or been unpublished.",
}: {
  state: CmsQueryState<T>;
  children: (data: T) => React.ReactNode;
  emptyLabel?: string;
  emptyMessage?: string;
  notFoundLabel?: string;
  notFoundMessage?: string;
}) {
  if (state.status === "loading") {
    return (
      <div className="cms-state" role="status" aria-live="polite">
        <span className="cms-state-spinner" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="property-empty" role="alert">
        <span className="eyebrow">Something went wrong</span>
        <p>{state.error}</p>
        <Link href="/contact" className="button button--dark mt-5">
          Talk to the team
        </Link>
      </div>
    );
  }

  if (state.status === "not-found") {
    return (
      <div className="property-empty">
        <span className="eyebrow">{notFoundLabel}</span>
        <p>{notFoundMessage}</p>
        <Link href="/" className="button button--dark mt-5">
          Return home
        </Link>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="property-empty">
        <span className="eyebrow">{emptyLabel}</span>
        <p>{emptyMessage}</p>
        <Link href="/contact" className="button button--dark mt-5">
          Talk to the team
        </Link>
      </div>
    );
  }

  return <>{children(state.data)}</>;
}
