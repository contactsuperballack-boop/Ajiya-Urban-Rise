import crypto from "node:crypto";
import { db } from "./db";
import type { EnquiryInput } from "@shared/enquiry";

/**
 * PostgreSQL persistence for leads (see migrations/001 and 002 for the schema). Site-visit
 * requests are leads too — `requestType: "site_visit"` plus a preferred date/time — so one
 * table, one admin view, one notification path covers both.
 */

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "VIEWING", "NEGOTIATING", "CONVERTED", "LOST"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface StoredLead extends EnquiryInput {
  id: string;
  submittedAt: string;
  ip: string;
  status: LeadStatus;
}

type SaveLeadInput = Omit<StoredLead, "id" | "status">;

interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  message: string;
  source_page: string | null;
  related_project_slug: string | null;
  related_property_slug: string | null;
  request_type: "enquiry" | "site_visit";
  preferred_visit_date: Date | string | null;
  preferred_visit_time: "Morning" | "Afternoon" | null;
  ip: string | null;
  status: LeadStatus;
  submitted_at: Date;
}

const COLUMNS = `
  id, name, email, phone, interest, message,
  source_page, related_project_slug, related_property_slug,
  request_type, preferred_visit_date, preferred_visit_time,
  ip, status, submitted_at
`;

function dateToIso(value: Date | string | null): string | undefined {
  if (!value) return undefined;
  // pg returns DATE columns as a JS Date at local midnight; format from local parts so a
  // timezone offset can't shift the calendar day.
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

function rowToLead(row: LeadRow): StoredLead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    interest: row.interest,
    message: row.message,
    sourcePage: row.source_page ?? undefined,
    relatedProjectSlug: row.related_project_slug ?? undefined,
    relatedPropertySlug: row.related_property_slug ?? undefined,
    requestType: row.request_type,
    preferredVisitDate: dateToIso(row.preferred_visit_date),
    preferredVisitTime: row.preferred_visit_time ?? undefined,
    submittedAt: row.submitted_at.toISOString(),
    ip: row.ip ?? "unknown",
    status: row.status,
    // The honeypot is deliberately not persisted.
    companyWebsite: "",
  };
}

export async function saveLead(lead: SaveLeadInput): Promise<StoredLead> {
  const id = crypto.randomUUID();
  const result = await db.query<LeadRow>(
    `
      INSERT INTO leads (
        id, name, email, phone, interest, message,
        source_page, related_project_slug, related_property_slug,
        request_type, preferred_visit_date, preferred_visit_time,
        ip, submitted_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING ${COLUMNS}
    `,
    [
      id,
      lead.name,
      lead.email,
      lead.phone,
      lead.interest,
      lead.message,
      lead.sourcePage ?? null,
      lead.relatedProjectSlug ?? null,
      lead.relatedPropertySlug ?? null,
      lead.requestType ?? "enquiry",
      lead.preferredVisitDate ?? null,
      lead.preferredVisitTime ?? null,
      lead.ip ?? null,
      lead.submittedAt,
    ]
  );

  if (result.rows.length !== 1) {
    throw new Error("Lead was not persisted.");
  }
  return rowToLead(result.rows[0]);
}

export async function readAllLeads(): Promise<StoredLead[]> {
  const result = await db.query<LeadRow>(`SELECT ${COLUMNS} FROM leads ORDER BY submitted_at DESC`);
  return result.rows.map(rowToLead);
}

/** Returns the updated lead, or null if no lead has that id. */
export async function updateLeadStatus(id: string, status: LeadStatus): Promise<StoredLead | null> {
  const result = await db.query<LeadRow>(`UPDATE leads SET status = $2 WHERE id = $1 RETURNING ${COLUMNS}`, [id, status]);
  return result.rows[0] ? rowToLead(result.rows[0]) : null;
}
