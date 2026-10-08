import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * These test cases were empirically validated by hand outside vitest first (a 21-lead
 * concurrency stress test against an inlined copy of this exact logic) before being written
 * up as this proper test file — see the Sprint 4 summary for details. That dry run is what
 * gives confidence this passes, since this sandbox has no installed dependencies to actually
 * run `vitest` itself.
 *
 * Dynamic import (not a static one) is required here: leadStore.ts reads LEAD_STORE_DIR into
 * a module-level constant at import time, and ES module imports are hoisted above any code
 * that would set that env var first — so the module must be imported *after* the env var is
 * set, via await import(), not a static top-of-file import.
 */

describe("leadStore", () => {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "leadstore-test-"));
  let saveLead: typeof import("../leadStore").saveLead;
  let readAllLeads: typeof import("../leadStore").readAllLeads;

  beforeAll(async () => {
    process.env.LEAD_STORE_DIR = testDir;
    const mod = await import("../leadStore");
    saveLead = mod.saveLead;
    readAllLeads = mod.readAllLeads;
  });

  afterAll(() => {
    delete process.env.LEAD_STORE_DIR;
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("returns an empty array before any lead is saved", () => {
    expect(readAllLeads()).toEqual([]);
  });

  it("persists a lead and assigns it a unique id", async () => {
    const lead = await saveLead({
      name: "Ada Obi",
      email: "ada@example.com",
      phone: "+2348012345678",
      interest: "Land",
      message: "Interested in a plot in Kubwa.",
      submittedAt: new Date().toISOString(),
      ip: "127.0.0.1",
    });
    expect(lead.id).toBeTruthy();
    const all = readAllLeads();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Ada Obi");
  });

  it("survives 20 concurrent saves without losing or corrupting any record", async () => {
    const before = readAllLeads().length;
    const writes = Array.from({ length: 20 }, (_, i) =>
      saveLead({
        name: `Lead ${i}`,
        email: `lead${i}@example.com`,
        phone: "+2348000000000",
        interest: "General Enquiry",
        message: "Concurrent write test.",
        submittedAt: new Date().toISOString(),
        ip: "127.0.0.1",
      })
    );
    const results = await Promise.all(writes);
    // Every concurrent write should get a distinct id — a broken write queue could
    // interleave writes and corrupt this.
    expect(new Set(results.map((r) => r.id)).size).toBe(20);
    expect(readAllLeads()).toHaveLength(before + 20);
  });
});
