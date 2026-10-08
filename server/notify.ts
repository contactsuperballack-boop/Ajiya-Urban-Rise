import type { StoredLead } from "./leadStore";

/**
 * Notifies the team of a new lead. Uses a generic incoming-webhook POST (the format Slack,
 * Discord, and MS Teams all accept for a plain-text message) via the ENQUIRY_WEBHOOK_URL env
 * var, so it works with whichever the team already uses without adding an SDK dependency.
 *
 * If ENQUIRY_WEBHOOK_URL is unset, falls back to a console log — enquiries are still visible
 * during local development, but nobody gets pinged. Set the env var before relying on this in
 * staging/production.
 *
 * Deliberately fire-and-forget: the lead is already durably saved (see leadStore.ts) by the
 * time this is called, so a failed notification must never fail the user's submission — it's
 * a "best effort, log and move on" concern, not a blocking one.
 */
export async function notifyNewLead(lead: StoredLead): Promise<void> {
  const webhookUrl = process.env.ENQUIRY_WEBHOOK_URL;

  const context = [
    lead.relatedProjectSlug ? `project: ${lead.relatedProjectSlug}` : null,
    lead.relatedPropertySlug ? `property: ${lead.relatedPropertySlug}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const visit =
    lead.requestType === "site_visit"
      ? ` SITE VISIT REQUESTED for ${lead.preferredVisitDate ?? "unspecified date"}${lead.preferredVisitTime ? ` (${lead.preferredVisitTime})` : ""} — please confirm manually.`
      : "";

  const summary = `New AJIYA ${lead.requestType === "site_visit" ? "site-visit request" : "enquiry"} from ${lead.name} (${lead.email}, ${lead.phone}) — interest: ${lead.interest}${
    context ? ` [${context}]` : ""
  }.${visit} Source: ${lead.sourcePage ?? "unknown"}.`;

  if (!webhookUrl) {
    console.log(`[enquiry] ${summary}\n${lead.message}`);
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `${summary}\n\n"${lead.message}"` }),
    });
    if (!res.ok) {
      console.error(`[enquiry] webhook notification failed with status ${res.status} for lead ${lead.id}`);
    }
  } catch (err) {
    console.error(`[enquiry] webhook notification threw for lead ${lead.id}:`, err);
  }
}
