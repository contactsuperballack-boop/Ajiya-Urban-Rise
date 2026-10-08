/**
 * Client-side counterpart to server/monitoring.ts — same reasoning applies: no real
 * error-tracking SDK (Sentry, Bugsnag, etc.) is wired in, but every caught front-end error
 * goes through this one function, so adding a real provider later is a one-file change.
 *
 * Current behavior: structured console logging only. A real deployment should replace the
 * body of this function with `Sentry.captureException(error, { extra: context })` or
 * equivalent once a provider is chosen — every call site (currently just ErrorBoundary) stays
 * unchanged.
 */
export function reportClientError(error: unknown, context: Record<string, unknown> = {}): void {
  // eslint-disable-next-line no-console
  console.error("[monitoring] client error:", error, context);
}
