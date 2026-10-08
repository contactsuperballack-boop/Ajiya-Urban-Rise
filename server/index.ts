import express, { type ErrorRequestHandler } from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { securityHeaders } from "./security";
import { createCorsGuard } from "./cors";
import { enquiriesRouter } from "./routes/enquiries";
import { newsletterRouter } from "./routes/newsletter";
import { adminRouter } from "./routes/admin";
import { createSeoRouter } from "./routes/seo";
import { startRateLimitCleanup } from "./rateLimit";
import { monitoringMiddleware, reportServerError } from "./monitoring";
import { getTrustProxyValue, loadConfig } from "./config";
import { db } from "./db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const config = loadConfig();
  const app = express();
  const server = createServer(app);

  // IMPORTANT: never `app.set("trust proxy", true)` in production — it trusts every hop's
  // forwarded headers unconditionally, letting a client spoof its own IP. TRUST_PROXY must
  // be an explicit hop count (e.g. "1" for a single reverse proxy) or trusted subnet list.
  app.set("trust proxy", getTrustProxyValue(config.trustProxy));
  app.disable("x-powered-by");

  app.use(monitoringMiddleware);
  app.use(securityHeaders({ cmsOrigin: config.cmsOrigin, isProduction: config.nodeEnv === "production" }));
  // robots.txt/sitemap.xml sit before the CORS guard: crawler requests carry no Origin
  // header (the guard would no-op for them either way, but this makes that not matter) and
  // have no relation to the site's own cross-origin policy, which exists to protect the
  // enquiry/newsletter API, not static SEO files.
  app.use(createSeoRouter(config));
  app.use(createCorsGuard(config.allowedOrigins, config.nodeEnv === "production"));
  app.use(express.json({ limit: "20kb", strict: true }));

  // Liveness: is the Node process alive?
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      status: "healthy",
      version: config.appVersion,
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  // Readiness: can the process actually serve the application (DB reachable)?
  app.get("/api/health/ready", async (_req, res) => {
    try {
      await db.query("SELECT 1");
      res.status(200).json({ ok: true, status: "ready", dependencies: { database: "healthy" } });
    } catch {
      res.status(503).json({ ok: false, status: "not_ready", dependencies: { database: "unhealthy" } });
    }
  });

  app.use("/api/enquiries", enquiriesRouter);
  app.use("/api/newsletter", newsletterRouter);
  app.use("/api/admin", adminRouter);

  // Serve static files from dist/public in production
  const staticPath =
    config.nodeEnv === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(
    express.static(staticPath, {
      index: false,
      maxAge: config.nodeEnv === "production" ? "1d" : 0,
    })
  );

  // Handle client-side routing - serve index.html for all non-API routes
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ ok: false, error: "Not found." });
    }
    res.sendFile(path.join(staticPath, "index.html"));
  });

  // Generic error handler: never leak stack traces or internals to the client.
  const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    reportServerError(err, {
      requestId: res.getHeader("X-Request-ID"),
      route: req.path,
      method: req.method,
      statusCode: 500,
    });
    if (res.headersSent) return;
    res.status(500).json({
      ok: false,
      error: "Something went wrong on our end.",
      requestId: res.getHeader("X-Request-ID"),
    });
  };
  app.use(errorHandler);

  // Safety net for anything that escapes Express's own error handling entirely. Reports it,
  // but deliberately does NOT process.exit() on a stray rejection — that would turn a single
  // bad edge case into a full outage.
  process.on("unhandledRejection", (reason) => {
    reportServerError(reason, { route: "unhandledRejection" });
  });
  process.on("uncaughtException", (err) => {
    reportServerError(err, { route: "uncaughtException" });
  });

  startRateLimitCleanup();

  server.listen(config.port, () => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        type: "server_started",
        environment: config.nodeEnv,
        port: config.port,
        version: config.appVersion,
      })
    );
  });
}

// Fail fast: an invalid/incomplete production config should prevent startup entirely
// rather than serving traffic with a broken CSP, open CORS, or no database.
startServer().catch((error) => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "critical",
      type: "startup_failure",
      error: String(error),
    })
  );
  process.exit(1);
});
