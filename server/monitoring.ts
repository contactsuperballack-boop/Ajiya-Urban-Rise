import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Structured, provider-agnostic telemetry. Every request gets an X-Request-ID (generated,
 * or passed through from an upstream proxy if present and sane) so a 500 in the logs can be
 * traced back to the exact request without exposing internals to the client. If
 * MONITORING_WEBHOOK_URL is set, server errors and failed enquiries also fire a webhook
 * alert (same Slack/Discord/Teams-compatible POST pattern as notify.ts).
 */

interface ErrorContext {
  requestId?: string | string[];
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: unknown;
}

function timestamp(): string {
  return new Date().toISOString();
}

function requestId(): string {
  return crypto.randomUUID();
}

/** Assigns/propagates X-Request-ID and logs one structured line per completed request. */
export function monitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.header("X-Request-ID");
  const id = incomingId && incomingId.length <= 100 ? incomingId : requestId();
  res.setHeader("X-Request-ID", id);

  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const payload = {
      timestamp: timestamp(),
      type: "http_request",
      requestId: id,
      method: req.method,
      route: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    };

    if (res.statusCode >= 500) {
      console.error(JSON.stringify({ ...payload, level: "error" }));
    } else if (res.statusCode >= 400) {
      console.warn(JSON.stringify({ ...payload, level: "warn" }));
    } else {
      console.log(JSON.stringify({ ...payload, level: "info" }));
    }
  });

  next();
}

async function sendWebhookAlert(title: string, detail: string): Promise<void> {
  const webhookUrl = process.env.MONITORING_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `🚨 ${title}\n${detail}` }),
    });
    if (!response.ok) {
      console.error(
        JSON.stringify({ level: "error", type: "monitoring_webhook_failure", statusCode: response.status })
      );
    }
  } catch (error) {
    console.error(JSON.stringify({ level: "error", type: "monitoring_webhook_exception", error: String(error) }));
  }
}

/** Unexpected server errors — the generic error handler, unhandled route exceptions, etc. */
export function reportServerError(err: unknown, context: ErrorContext = {}): void {
  const payload = { timestamp: timestamp(), type: "server_error", level: "error", error: String(err), context };
  console.error(JSON.stringify(payload));
  void sendWebhookAlert("AJIYA server error", JSON.stringify({ error: String(err), context }));
}

/**
 * A failed enquiry/newsletter persistence means a real visitor's message was silently lost —
 * worse than a generic 500, and deserves louder, distinct alerting.
 */
export function reportFailedEnquiry(err: unknown, context: ErrorContext = {}): void {
  const payload = {
    timestamp: timestamp(),
    type: "failed_lead_persistence",
    level: "critical",
    error: String(err),
    context,
  };
  console.error(JSON.stringify(payload));
  void sendWebhookAlert("AJIYA FAILED ENQUIRY — possible lead loss", JSON.stringify({ error: String(err), context }));
}
