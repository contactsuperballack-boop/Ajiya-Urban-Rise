import { Router } from "express";
import { newsletterSchema } from "@shared/enquiry";
import { subscribe } from "../newsletterStore";
import { checkRateLimit } from "../rateLimit";
import { reportFailedEnquiry } from "../monitoring";

const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export const newsletterRouter = Router();

newsletterRouter.post("/", async (req, res) => {
  const ip = req.ip || "unknown";

  const { allowed, retryAfterSeconds } = checkRateLimit(`newsletter:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!allowed) {
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({ ok: false, error: "Too many attempts. Please try again shortly." });
  }

  if (typeof req.body?.companyWebsite === "string" && req.body.companyWebsite.trim().length > 0) {
    return res.status(201).json({ ok: true });
  }

  const parsed = newsletterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: "Enter a valid email address.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const { alreadySubscribed } = await subscribe(parsed.data.email, ip);
    return res.status(201).json({ ok: true, alreadySubscribed });
  } catch (err) {
    reportFailedEnquiry(err, { route: "/api/newsletter", email: parsed.data.email });
    return res.status(500).json({ ok: false, error: "Something went wrong on our end. Please try again." });
  }
});
