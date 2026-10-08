import nodemailer, { type Transporter } from "nodemailer";
import type { AppConfig } from "./config";
import type { StoredLead } from "./leadStore";
import { reportServerError } from "./monitoring";

/**
 * Transactional confirmation email only — "we've got your enquiry", sent to the person who
 * just submitted the form. This is deliberately separate from (and much smaller than) a real
 * newsletter/marketing email provider, which is still on hold. Generic SMTP so any real
 * mailbox or transactional API that exposes SMTP works without a code change; see
 * server/config.ts for how `config.smtp` gets built (only set once host + from-address are
 * both present).
 *
 * Fully optional and fails soft: with no SMTP config, this module silently no-ops (server
 * config.ts already logs the warning once, at startup, per the established pattern — see
 * MONITORING_WEBHOOK_URL/ENQUIRY_WEBHOOK_URL). A send failure is reported and swallowed; it
 * must never turn an already-saved lead into a failed request for the visitor.
 */

let cachedTransport: Transporter | null = null;

function getTransport(smtp: NonNullable<AppConfig["smtp"]>): Transporter {
  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user && smtp.password ? { user: smtp.user, pass: smtp.password } : undefined,
    });
  }
  return cachedTransport;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function buildMessage(lead: StoredLead): { subject: string; text: string; html: string } {
  const isVisit = lead.requestType === "site_visit";
  const firstName = lead.name.trim().split(/\s+/)[0] || lead.name;

  const visitLine = isVisit && lead.preferredVisitDate
    ? `You've requested a site visit for ${lead.preferredVisitDate}${lead.preferredVisitTime ? ` (${lead.preferredVisitTime})` : ""}. This is a request, not a confirmed booking — our team will contact you shortly to confirm the actual time.`
    : "";

  const subject = isVisit ? "We've received your site-visit request — AJIYA Urban Rise" : "We've received your enquiry — AJIYA Urban Rise";

  const text = [
    `Hi ${firstName},`,
    "",
    `Thank you for reaching out to AJIYA Urban Rise. We've received your ${isVisit ? "site-visit request" : "enquiry"} regarding "${lead.interest}" and a member of our team will be in touch shortly.`,
    visitLine,
    "",
    "If anything changes or you'd like to add more detail in the meantime, just reply to this email.",
    "",
    "AJIYA Urban Rise",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<div style="font-family:Georgia,serif;color:#1a1a1a;max-width:480px;margin:0 auto;padding:24px 0;">
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Thank you for reaching out to AJIYA Urban Rise. We've received your ${isVisit ? "site-visit request" : "enquiry"} regarding <strong>${escapeHtml(lead.interest)}</strong> and a member of our team will be in touch shortly.</p>
    ${visitLine ? `<p>${escapeHtml(visitLine)}</p>` : ""}
    <p>If anything changes or you'd like to add more detail in the meantime, just reply to this email.</p>
    <p style="margin-top:32px;color:#555;">AJIYA Urban Rise</p>
  </div>`;

  return { subject, text, html };
}

export async function sendEnquiryConfirmation(lead: StoredLead, config: AppConfig): Promise<void> {
  if (!config.smtp) return; // not configured — silent no-op, warning already logged at startup
  if (!lead.email) return;

  try {
    const { subject, text, html } = buildMessage(lead);
    await getTransport(config.smtp).sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
      to: lead.email,
      subject,
      text,
      html,
    });
  } catch (err) {
    reportServerError(err, { route: "mailer.sendEnquiryConfirmation", leadId: lead.id });
    // Deliberately does not rethrow — see module docstring.
  }
}
