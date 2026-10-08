import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * Same dynamic-import requirement and same empirical-dry-run-first approach as
 * leadStore.test.ts — see that file's header comment. The 15-way concurrent-duplicate case
 * here specifically re-creates the race a first draft of newsletterStore.ts got wrong
 * (checking "already subscribed?" outside the write queue instead of inside it, so two
 * concurrent requests for a brand-new email could both see "not subscribed yet" and both
 * write a record). This test is the regression guard for that exact bug.
 */

describe("newsletterStore", () => {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "newsletterstore-test-"));
  let subscribe: typeof import("../newsletterStore").subscribe;
  let readAllSubscribers: typeof import("../newsletterStore").readAllSubscribers;

  beforeAll(async () => {
    process.env.NEWSLETTER_STORE_DIR = testDir;
    const mod = await import("../newsletterStore");
    subscribe = mod.subscribe;
    readAllSubscribers = mod.readAllSubscribers;
  });

  afterAll(() => {
    delete process.env.NEWSLETTER_STORE_DIR;
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("records a new subscriber as not already subscribed", async () => {
    const result = await subscribe("reader@example.com", "127.0.0.1");
    expect(result.alreadySubscribed).toBe(false);
  });

  it("flags a duplicate subscription and does not write a second record", async () => {
    const result = await subscribe("reader@example.com", "127.0.0.1");
    expect(result.alreadySubscribed).toBe(true);
    const matching = readAllSubscribers().filter((s) => s.email === "reader@example.com");
    expect(matching).toHaveLength(1);
  });

  it("treats email matching as case-insensitive", async () => {
    const result = await subscribe("Reader@Example.com", "127.0.0.1");
    expect(result.alreadySubscribed).toBe(true);
    const matching = readAllSubscribers().filter((s) => s.email.toLowerCase() === "reader@example.com");
    expect(matching).toHaveLength(1);
  });

  it("only records one subscriber out of 15 concurrent identical requests", async () => {
    const writes = Array.from({ length: 15 }, () => subscribe("race@example.com", "127.0.0.1"));
    const results = await Promise.all(writes);
    const newOnes = results.filter((r) => r.alreadySubscribed === false);
    expect(newOnes).toHaveLength(1);

    const stored = readAllSubscribers().filter((s) => s.email.toLowerCase() === "race@example.com");
    expect(stored).toHaveLength(1);
  });
});
