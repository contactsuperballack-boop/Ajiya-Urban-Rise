import type { RequestHandler } from "express";

/**
 * Locks down cross-origin requests to an exact allowlist (ALLOWED_ORIGINS, via
 * server/config.ts). Never sets `Access-Control-Allow-Origin: *` — the origin returned is
 * always the caller's own origin, and only after it matched the allowlist. Same-origin
 * requests (no Origin header — curl, the SPA's own fetches, most non-browser clients) are
 * always allowed through untouched.
 */
export function createCorsGuard(allowedOrigins: string[], isProduction: boolean): RequestHandler {
  const allowed = new Set(allowedOrigins);

  return (req, res, next) => {
    const originHeader = req.headers.origin;
    if (!originHeader) {
      return next();
    }

    let origin: string;
    try {
      origin = new URL(originHeader).origin;
    } catch {
      return res.status(403).json({ ok: false, error: "Invalid request origin." });
    }

    if (!allowed.has(origin)) {
      return res.status(403).json({ ok: false, error: "Cross-origin request blocked." });
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID");
    res.setHeader("Access-Control-Max-Age", "600");

    if (isProduction) {
      res.setHeader("Access-Control-Allow-Credentials", "false");
    }

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    next();
  };
}
