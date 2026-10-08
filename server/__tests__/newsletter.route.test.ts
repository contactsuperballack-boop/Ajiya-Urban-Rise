import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { _resetRateLimitStateForTests } from "../rateLimit";

let server: Server;
let baseUrl: string;
let testDir: string;

beforeAll(async () => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), "newsletter-route-test-"));
  process.env.NEWSLETTER_STORE_DIR = testDir;

  const { newsletterRouter } = await import("../routes/newsletter");

  const app = express();
  app.use(express.json());
  app.use("/api/newsletter", newsletterRouter);

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
  delete process.env.NEWSLETTER_STORE_DIR;
  fs.rmSync(testDir, { recursive: true, force: true });
});

async function postSubscribe(body: unknown) {
  const res = await fetch(`${baseUrl}/api/newsletter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

describe("POST /api/newsletter", () => {
  it("returns 201 for a valid new subscription", async () => {
    const { status, body } = await postSubscribe({ email: "reader@example.com" });
    expect(status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.alreadySubscribed).toBe(false);
  });

  it("returns 201 with alreadySubscribed true for a duplicate", async () => {
    const { status, body } = await postSubscribe({ email: "reader@example.com" });
    expect(status).toBe(201);
    expect(body.alreadySubscribed).toBe(true);
  });

  it("returns 400 for an invalid email", async () => {
    const { status, body } = await postSubscribe({ email: "not-an-email" });
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it("returns 201 but does not persist a honeypot submission", async () => {
    const { readAllSubscribers } = await import("../newsletterStore");
    const before = readAllSubscribers().length;

    const { status } = await postSubscribe({ email: "bot@example.com", companyWebsite: "filled-by-a-bot" });
    expect(status).toBe(201);

    const after = readAllSubscribers();
    expect(after).toHaveLength(before);
    expect(after.some((s) => s.email === "bot@example.com")).toBe(false);
  });
});
