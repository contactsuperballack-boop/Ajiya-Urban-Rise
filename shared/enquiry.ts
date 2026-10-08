import { z } from "zod";

/**
 * Single source of truth for enquiry validation. Imported by the client (fast feedback,
 * no round-trip needed to catch an obviously-invalid field) AND the server (the only copy
 * that actually matters for security — see server/routes/enquiries.ts). Never trust the
 * client-side pass on its own; the server re-validates every submission independently.
 */
export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(190),
  phone: z.string().trim().min(7, "Enter a valid phone number.").max(30),
  interest: z.string().trim().min(1, "Let us know what you're interested in.").max(160),
  message: z.string().trim().min(10, "Tell us a little more — at least 10 characters.").max(2000),
  sourcePage: z.string().trim().max(200).optional(),
  relatedProjectSlug: z.string().trim().max(120).optional(),
  relatedPropertySlug: z.string().trim().max(120).optional(),
  // A site-visit request is an enquiry with a preferred date/time attached — same table, same
  // rate limiting/honeypot/notification pipeline, rather than a parallel second system. The
  // team confirms the actual slot manually; nothing here books anything.
  requestType: z.enum(["enquiry", "site_visit"]).default("enquiry"),
  preferredVisitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.").optional(),
  preferredVisitTime: z.enum(["Morning", "Afternoon"]).optional(),
  // Honeypot: real visitors never see or fill this field (hidden + aria-hidden on the client).
  // Bots that fill every input in a form will fill this too. Not a security boundary on its
  // own — paired with server-side rate limiting — but it silently filters a large share of
  // unsophisticated spam without adding friction for real users.
  companyWebsite: z.string().max(0, "").optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if (value.requestType !== "site_visit") return;
  if (!value.preferredVisitDate) {
    ctx.addIssue({ code: "custom", path: ["preferredVisitDate"], message: "Choose a preferred visit date." });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  if (value.preferredVisitDate < today) {
    ctx.addIssue({ code: "custom", path: ["preferredVisitDate"], message: "Choose today or a future date." });
  }
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
/** What a form may submit — `requestType` is optional here (defaults to "enquiry"), unlike the parsed output. */
export type EnquiryFormInput = z.input<typeof enquirySchema>;

export const enquiryInterestOptions = [
  "General Enquiry",
  "Buy Property",
  "Land",
  "Investment",
  "Construction",
  "Property Management",
] as const;

export const newsletterSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(190),
  // Same honeypot approach as the enquiry form — see the comment there.
  companyWebsite: z.string().max(0, "").optional().or(z.literal("")),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
