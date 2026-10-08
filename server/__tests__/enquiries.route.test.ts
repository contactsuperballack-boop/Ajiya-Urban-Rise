import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { _resetRateLimitStateForTests } from "../rateLimit";

/**
 * Real HTTP integration tests: an actual Express app, actually listening on a real
 * (ephemeral, OS-assigned) port, hit with real native fetch() requests — not mocked req/res
 * objects. This is the "integration test: enquiry submission, API validation, failure
 * scenarios" layer the engineering directive asks for, using no extra dependency (no
 * supertest) since none could be installed here without network access.
 *
 * Like the store tests, this could not actually be executed in this sandbox (no installed
 * express/zod to run against) — written to the real API contract and reviewed carefully,
 * but `pnpm test` is the real verification step.
 */

let server: Server;
let baseUrl: string;
let testDir: string;

beforeAll(async () => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), "enquiries-route-test-"));
  process.env.LEAD_STORE_DIR = testDir;
  // ENQUIRY_WEBHOOK_URL deliberately left unset — notify.ts falls back to a console log,
  // so these tests don't need a mock webhook server.

  const { enquiriesRouter } = await import("../routes/enquiries");

  const app = express();
  app.use(express.json());
  app.use("/api/enquiries", enquiriesRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterEach(() => {
  _resetRateLimitStateForTests();
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  delete process.env.LEAD_STORE_DIR;
  fs.rmSync(testDir, { recursive: true, force: true });
});

const validPayload = {
  name: "Ada Obi",
  email: "ada@example.com",
  phone: "+2348012345678",
  interest: "Land",
  message: "I would like to discuss a land opportunity in Kubwa.",
};

async function postEnquiry(body: unknown) {
  const res = await fetch(`${baseUrl}/api/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

describe("POST /api/enquiries", () => {
  it("returns 201 and an id for a valid submission", async () => {
    const { status, body } = await postEnquiry(validPayload);
    expect(status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.id).toBeTruthy();
  });

  it("returns 400 with field errors for an invalid submission", async () => {
    const { status, body } = await postEnquiry({ ...validPayload, email: "not-an-email" });
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.fieldErrors?.email).toBeTruthy();
  });

  it("returns 400 when required fields are missing entirely", async () => {
    const { status, body } = await postEnquiry({});
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it("silently accepts (201) but does not persist when the honeypot field is filled", async () => {
    const { readAllLeads } = await import("../leadStore");
    const before = readAllLeads().length;

    const honeypotEmail = "bot-should-not-be-saved@example.com";
    const { status, body } = await postEnquiry({ ...validPayload, email: honeypotEmail, companyWebsite: "https://spam.example.com" });

    expect(status).toBe(201);
    expect(body.ok).toBe(true);

    const after = readAllLeads();
    expect(after).toHaveLength(before); // nothing new was persisted
    expect(after.some((lead) => lead.email === honeypotEmail)).toBe(false);
  });

  it("returns 429 after exceeding the rate limit for one IP", async () => {
    _resetRateLimitStateForTests();
    // The route allows 5 per 10 minutes per IP; all requests in this test share the test
    // runner's IP since they hit the same loopback address.
    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const { status } = await postEnquiry({ ...validPayload, email: `flood${i}@example.com` });
      lastStatus = status;
    }
    expect(lastStatus).toBe(429);
  });
});
