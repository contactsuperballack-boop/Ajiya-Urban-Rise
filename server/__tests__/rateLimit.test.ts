import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, _resetRateLimitStateForTests } from "../rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    _resetRateLimitStateForTests();
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("key-a", 3, 10_000).allowed).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("key-b", 3, 10_000);
    const result = checkRateLimit("key-b", 3, 10_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("key-c", 3, 10_000);
    // A different key should not be affected by key-c's usage.
    expect(checkRateLimit("key-d", 3, 10_000).allowed).toBe(true);
  });

  it("allows requests again once the window has passed", () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);
    for (let i = 0; i < 3; i++) checkRateLimit("key-e", 3, 1000);
    expect(checkRateLimit("key-e", 3, 1000).allowed).toBe(false);

    vi.setSystemTime(now + 1500); // past the 1000ms window
    expect(checkRateLimit("key-e", 3, 1000).allowed).toBe(true);
    vi.useRealTimers();
  });
});
