import { z } from "zod";

/**
 * Central, validated environment configuration. Replaces scattered `process.env.X` reads
 * across security.ts/index.ts/db.ts. Fails fast at startup rather than surfacing a broken
 * CSP, an open CORS policy, or a missing DATABASE_URL only once a request hits it.
 */

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

const positiveInteger = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .refine((value) => value > 0);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: positiveInteger.default("3000"),
  DATABASE_URL: z.string().url().optional(),
  DATABASE_SSL: booleanString.default("true"),
  DATABASE_POOL_MAX: positiveInteger.default("10"),
  DATABASE_IDLE_TIMEOUT_MS: positiveInteger.default("30000"),
  DATABASE_CONNECTION_TIMEOUT_MS: positiveInteger.default("10000"),
  VITE_CMS_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().min(1),
  TRUST_PROXY: z.string().min(1),
  ENQUIRY_WEBHOOK_URL: z.string().url().optional(),
  MONITORING_WEBHOOK_URL: z.string().url().optional(),
  // Internal lead-management page. Both must be set to enable it; if either is missing the
  // admin API answers 404 (fail closed). Password must be long — it is a single shared secret.
  ADMIN_USERNAME: z.string().min(3).optional(),
  ADMIN_PASSWORD: z.string().min(12, "ADMIN_PASSWORD must be at least 12 characters.").optional(),
  // Transactional confirmation email only (see server/mailer.ts) — the person who submitted
  // an enquiry/site-visit gets "we've got this", nothing more. Deliberately generic SMTP, not
  // a specific provider's SDK: any real host (Gmail w/ app password, Zoho, a business
  // mailbox, or a transactional API that exposes SMTP like Resend/Postmark) works without a
  // code change. This is NOT the newsletter/marketing email provider — that's still on hold.
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: positiveInteger.default("587"),
  SMTP_SECURE: booleanString.default("false"), // true only for port 465 (implicit TLS)
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().min(1).default("AJIYA Urban Rise"),
  APP_VERSION: z.string().min(1).default("unknown"),
  // Canonical production origin — used for sitemap.xml, robots.txt, and canonical URLs.
  // No trailing slash. Falls back to a placeholder so dev/staging don't crash; swap for the
  // real domain before launch.
  SITE_URL: z.string().url().default("https://ajiyaurbanrise.com"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type AppConfig = {
  nodeEnv: "development" | "test" | "production";
  port: number;
  databaseUrl?: string;
  databaseSsl: boolean;
  databasePoolMax: number;
  databaseIdleTimeoutMs: number;
  databaseConnectionTimeoutMs: number;
  cmsUrl: string;
  cmsOrigin: string;
  allowedOrigins: string[];
  trustProxy: string;
  enquiryWebhookUrl?: string;
  monitoringWebhookUrl?: string;
  appVersion: string;
  siteUrl: string;
  smtp?: { host: string; port: number; secure: boolean; user?: string; password?: string; fromEmail: string; fromName: string };
  logLevel: "debug" | "info" | "warn" | "error";
};

function parseOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin);
}

function validateProductionRequirements(config: AppConfig): void {
  if (config.nodeEnv !== "production") return;

  const missing: string[] = [];
  if (!config.databaseUrl) missing.push("DATABASE_URL");
  if (!config.cmsUrl) missing.push("VITE_CMS_URL");
  if (!config.allowedOrigins.length) missing.push("ALLOWED_ORIGINS");
  if (!config.trustProxy) missing.push("TRUST_PROXY");
  if (missing.length > 0) {
    throw new Error(`Production configuration incomplete. Missing: ${missing.join(", ")}`);
  }

  if (config.allowedOrigins.some((origin) => origin.includes("localhost") || origin.includes("127.0.0.1"))) {
    throw new Error("Production ALLOWED_ORIGINS cannot contain localhost or 127.0.0.1.");
  }

  if (config.cmsUrl.startsWith("http://")) {
    throw new Error("Production VITE_CMS_URL must use HTTPS.");
  }

  if (!config.databaseSsl) {
    throw new Error("Production DATABASE_SSL must be true.");
  }

  if (!config.monitoringWebhookUrl) {
    console.warn("[config] MONITORING_WEBHOOK_URL is not configured. External alerting is disabled.");
  }
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    console.warn("[config] ADMIN_USERNAME/ADMIN_PASSWORD not set. The internal lead-management page is disabled.");
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM_EMAIL) {
    console.warn("[config] SMTP_HOST/SMTP_FROM_EMAIL not set. Enquiry confirmation emails are disabled — visitors won't receive one.");
  }
  if (!config.enquiryWebhookUrl) {
    console.warn("[config] ENQUIRY_WEBHOOK_URL is not configured. New-lead notifications are disabled.");
  }
}

let cachedConfig: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const env = parsed.data;
  const cmsUrl = new URL(env.VITE_CMS_URL);

  const config: AppConfig = {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    databaseSsl: env.DATABASE_SSL,
    databasePoolMax: env.DATABASE_POOL_MAX,
    databaseIdleTimeoutMs: env.DATABASE_IDLE_TIMEOUT_MS,
    databaseConnectionTimeoutMs: env.DATABASE_CONNECTION_TIMEOUT_MS,
    cmsUrl: cmsUrl.toString().replace(/\/$/, ""),
    cmsOrigin: cmsUrl.origin,
    allowedOrigins: parseOrigins(env.ALLOWED_ORIGINS),
    trustProxy: env.TRUST_PROXY,
    enquiryWebhookUrl: env.ENQUIRY_WEBHOOK_URL,
    monitoringWebhookUrl: env.MONITORING_WEBHOOK_URL,
    appVersion: env.APP_VERSION,
    siteUrl: env.SITE_URL.replace(/\/$/, ""),
    // Only "on" once a host AND a from-address are both set — a host with no from-address
    // (or vice versa) is a half-finished config, not a working one, so this stays undefined
    // rather than attempting to send with missing pieces.
    smtp:
      env.SMTP_HOST && env.SMTP_FROM_EMAIL
        ? {
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            user: env.SMTP_USER,
            password: env.SMTP_PASSWORD,
            fromEmail: env.SMTP_FROM_EMAIL,
            fromName: env.SMTP_FROM_NAME,
          }
        : undefined,
    logLevel: env.LOG_LEVEL,
  };

  validateProductionRequirements(config);
  cachedConfig = config;
  return config;
}

/**
 * Resolves the Express `trust proxy` setting from TRUST_PROXY. `true` is intentionally
 * forbidden — it trusts every hop's X-Forwarded-* headers unconditionally, which lets a
 * client spoof its own IP for rate limiting and audit logs. Use a specific hop count (e.g.
 * "1" for a single reverse proxy/load balancer) or a comma-separated list of trusted subnets.
 */
export function getTrustProxyValue(value: string): boolean | number | string[] {
  const normalized = value.trim();
  if (normalized === "true") {
    throw new Error("TRUST_PROXY=true is intentionally forbidden. Use a specific hop count or proxy subnet.");
  }
  if (normalized === "false") return false;
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return normalized
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
