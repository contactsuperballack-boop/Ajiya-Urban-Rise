import type { NextFunction, Request, Response } from "express";

interface SecurityOptions {
  cmsOrigin: string;
  isProduction: boolean;
}

function escapeCspSource(value: string): string {
  return value.replace(/[';]/g, "");
}

/**
 * Hand-written security headers (no `helmet` dependency). The CMS origin (VITE_CMS_URL, via
 * server/config.ts) is now threaded into `img-src`/`connect-src` instead of a hard-coded
 * `connect-src 'self'` — the frontend talks to Strapi directly, so the previous CSP would
 * have silently blocked those requests in production.
 *
 * `style-src 'unsafe-inline'` remains required because Vite/Tailwind partially inline CSS at
 * build time; tightening that with nonces is a legitimate future follow-up.
 */
export function securityHeaders(options: SecurityOptions) {
  const cmsOrigin = escapeCspSource(options.cmsOrigin);

  return (_req: Request, res: Response, next: NextFunction) => {
    const directives = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `img-src 'self' data: https: ${cmsOrigin}`,
      `connect-src 'self' ${cmsOrigin}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
      "manifest-src 'self'",
    ];

    if (options.isProduction) {
      directives.push("upgrade-insecure-requests");
    }

    res.setHeader("Content-Security-Policy", directives.join("; "));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "accelerometer=()",
        "gyroscope=()",
        "magnetometer=()",
      ].join(", ")
    );
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

    // HSTS only makes sense once the site is actually served over HTTPS.
    if (options.isProduction) {
      res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    }

    next();
  };
}
