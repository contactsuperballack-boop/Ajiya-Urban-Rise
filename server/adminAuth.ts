import crypto from "node:crypto";
import type { RequestHandler } from "express";
import { checkRateLimit, isRateLimited } from "./rateLimit";

/**
 * Shared-password gate for the internal lead-management API. Deliberately minimal ("fast and
 * cheap" by design): one username + password from env, checked with a constant-time
 * comparison, sent as an Authorization: Basic header by the admin page over HTTPS.
 *
 * Safety properties worth keeping if this is ever extended:
 *   - FAIL CLOSED: if ADMIN_USERNAME/ADMIN_PASSWORD aren't both set, the admin API answers
 *     404, never "open". A missing env var must never mean no password.
 *   - Only FAILED attempts count toward the lockout (10 per 15 minutes per IP), and once
 *     locked out even a correct password is refused until the window passes.
 *   - No WWW-Authenticate header on 401, so browsers don't pop a native login dialog over
 *     the site's own login form.
 *   - This is a single shared credential, not per-user accounts: no audit trail of *who*
 *     changed a lead's status, and rotating it means telling everyone. Move to real user
 *     accounts (or SSO) if more than a couple of people will use this.
 */
const FAIL_LIMIT = 10;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

function safeEqual(a: string, b: string): boolean {
  // Hash both sides first so the comparison is fixed-length (timingSafeEqual throws on
  // unequal lengths, and a length-dependent early exit would itself leak information).
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export const requireAdmin: RequestHandler = (req, res, next) => {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "no-store");

  if (!username || !password) {
    return res.status(404).json({ ok: false, error: "Not found." });
  }

  const ip = req.ip || "unknown";
  const failKey = `admin-fail:${ip}`;
  const lock = isRateLimited(failKey, FAIL_LIMIT, FAIL_WINDOW_MS);
  if (lock.limited) {
    res.setHeader("Retry-After", String(lock.retryAfterSeconds));
    return res.status(429).json({ ok: false, error: "Too many failed attempts. Try again later." });
  }

  const header = req.headers.authorization ?? "";
  const [scheme, encoded] = header.split(" ");
  let ok = false;
  if (scheme === "Basic" && encoded) {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    if (sep > -1) {
      // Evaluate both comparisons unconditionally so timing doesn't reveal which was wrong.
      const userOk = safeEqual(decoded.slice(0, sep), username);
      const passOk = safeEqual(decoded.slice(sep + 1), password);
      ok = userOk && passOk;
    }
  }

  if (!ok) {
    checkRateLimit(failKey, FAIL_LIMIT, FAIL_WINDOW_MS); // record the failure
    return res.status(401).json({ ok: false, error: "Incorrect username or password." });
  }
  next();
};
