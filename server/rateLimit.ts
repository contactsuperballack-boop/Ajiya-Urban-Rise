/**
 * Minimal in-memory sliding-window rate limiter, keyed by an arbitrary string (IP address
 * for the enquiry endpoint). No external dependency, which is what made this practical to
 * write without network access to install express-rate-limit — but that's also its real
 * limitation:
 *
 *   - Per-process only. If this ever runs as more than one instance behind a load balancer,
 *     each instance has its own counters, so the effective limit multiplies by instance count.
 *   - Resets on every restart/redeploy.
 *
 * Fine for a single-instance Phase 1 deployment. Swap for a Redis-backed limiter (or
 * express-rate-limit + a shared store) before running multiple instances.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const bucket = buckets.get(key) ?? { timestamps: [] };
  const recent = bucket.timestamps.filter((t) => t > windowStart);

  if (recent.length >= limit) {
    const retryAfterMs = recent[0] + windowMs - now;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  recent.push(now);
  buckets.set(key, { timestamps: recent });
  return { allowed: true };
}

/**
 * Non-consuming check: is this key currently over its limit? Used by the admin login guard,
 * which must refuse further attempts once too many have FAILED — while only failures (not
 * every request) count toward the limit. checkRateLimit() records a hit each call, so it
 * can't be used for "block first, count only on failure".
 */
export function isRateLimited(key: string, limit: number, windowMs: number): { limited: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const recent = (buckets.get(key)?.timestamps ?? []).filter((t) => t > now - windowMs);
  if (recent.length >= limit) {
    return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
  }
  return { limited: false };
}

/** Periodic sweep so long-running processes don't accumulate unbounded stale entries. */
export function startRateLimitCleanup(intervalMs = 15 * 60 * 1000, maxAgeMs = 60 * 60 * 1000) {
  const timer = setInterval(() => {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, bucket] of buckets) {
      const fresh = bucket.timestamps.filter((t) => t > cutoff);
      if (fresh.length === 0) buckets.delete(key);
      else buckets.set(key, { timestamps: fresh });
    }
  }, intervalMs);
  timer.unref(); // don't keep the process alive just for this timer
  return timer;
}

/** Test-only: clears all buckets between test cases. */
export function _resetRateLimitStateForTests() {
  buckets.clear();
}
