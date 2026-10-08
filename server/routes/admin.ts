import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../adminAuth";
import { LEAD_STATUSES, readAllLeads, updateLeadStatus } from "../leadStore";
import { readAllSubscribers } from "../newsletterStore";
import { reportServerError } from "../monitoring";

/** Internal lead-management API. Every route sits behind requireAdmin — see adminAuth.ts. */
export const adminRouter = Router();
adminRouter.use(requireAdmin);

// Cheap credential check for the login form (no data returned).
adminRouter.get("/session", (_req, res) => res.json({ ok: true }));

adminRouter.get("/leads", async (_req, res) => {
  try {
    res.json({ ok: true, leads: await readAllLeads() });
  } catch (err) {
    reportServerError(err, { route: "/api/admin/leads" });
    res.status(500).json({ ok: false, error: "Could not load leads." });
  }
});

adminRouter.get("/subscribers", async (_req, res) => {
  try {
    res.json({ ok: true, subscribers: await readAllSubscribers() });
  } catch (err) {
    reportServerError(err, { route: "/api/admin/subscribers" });
    res.status(500).json({ ok: false, error: "Could not load subscribers." });
  }
});

const statusBody = z.object({ status: z.enum(LEAD_STATUSES) });
const uuid = z.string().uuid();

adminRouter.patch("/leads/:id", async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  const body = statusBody.safeParse(req.body);
  if (!id.success || !body.success) {
    return res.status(400).json({ ok: false, error: "Invalid lead id or status." });
  }
  try {
    const lead = await updateLeadStatus(id.data, body.data.status);
    if (!lead) return res.status(404).json({ ok: false, error: "Lead not found." });
    res.json({ ok: true, lead });
  } catch (err) {
    reportServerError(err, { route: "/api/admin/leads/:id" });
    res.status(500).json({ ok: false, error: "Could not update lead." });
  }
});
