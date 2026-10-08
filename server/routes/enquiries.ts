import { Router } from "express";
import { enquirySchema } from "@shared/enquiry";
import { saveLead } from "../leadStore";
import { notifyNewLead } from "../notify";
import { checkRateLimit } from "../rateLimit";
import { reportFailedEnquiry } from "../monitoring";
import { sendEnquiryConfirmation } from "../mailer";
import { loadConfig } from "../config";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 5 submissions per 10 minutes per IP

export const enquiriesRouter = Router();

enquiriesRouter.post("/", async (req, res) => {
  // req.ip is Express's own interpretation of the client IP, resolved according to the
  // configured trust-proxy setting (see server/config.ts). Never read x-forwarded-for
  // directly here — that would bypass the trusted-hop logic entirely.
  const ip = req.ip || "unknown";

  // 1. Rate limit first — cheapest check, and the one that matters most against abuse.
  const { allowed, retryAfterSeconds } = checkRateLimit(ip, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!allowed) {
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      ok: false,
      error: "Too many enquiries from this connection. Please try again shortly.",
    });
  }

  // 2. Honeypot — silently accept without persisting or notifying, so a bot can't tell its
  // submission was rejected and adapt. Real users never populate this hidden field.
  if (typeof req.body?.companyWebsite === "string" && req.body.companyWebsite.trim().length > 0) {
    return res.status(201).json({ ok: true, id: "ok" });
  }

  // 3. Real server-side validation. This is the check that actually matters — the client's
  // own zod validation (same schema, see client/src/components/ContactForm usage) is only a
  // UX convenience; it is never trusted on its own.
  const parsed = enquirySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  // 4. Persist. Only after this succeeds do we consider the enquiry "received" — see
  // leadStore.ts for this store's current limitations.
  try {
    const lead = await saveLead({
      ...parsed.data,
      submittedAt: new Date().toISOString(),
      ip,
    });

    // 5. Notify the team, and confirm to the visitor — both fire-and-forget, deliberately
    // not awaited. Neither must be able to turn an already-saved lead into a failed response.
    void notifyNewLead(lead);
    void sendEnquiryConfirmation(lead, loadConfig());

    return res.status(201).json({ ok: true, id: lead.id });
  } catch (err) {
    reportFailedEnquiry(err, { route: "/api/enquiries", email: parsed.data.email });
    // Generic message to the client — no internals, stack traces, or file paths leaked.
    return res.status(500).json({
      ok: false,
      error: "Something went wrong on our end. Please try again, or reach us directly.",
    });
  }
});
