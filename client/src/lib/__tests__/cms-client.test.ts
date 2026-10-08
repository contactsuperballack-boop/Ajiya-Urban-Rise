import { describe, expect, it } from "vitest";
import { resolveMediaUrl } from "../cms-client";

describe("resolveMediaUrl", () => {
  it("returns an empty string for null or undefined", () => {
    expect(resolveMediaUrl(null)).toBe("");
    expect(resolveMediaUrl(undefined)).toBe("");
  });

  it("prefixes a relative Strapi media path with the CMS origin", () => {
    // Falls back to http://localhost:1337 when VITE_CMS_URL is unset, which is the case
    // in the test environment.
    expect(resolveMediaUrl("/uploads/hero.jpg")).toBe("http://localhost:1337/uploads/hero.jpg");
  });

  it("leaves an already-absolute https URL unchanged", () => {
    expect(resolveMediaUrl("https://cdn.example.com/x.jpg")).toBe("https://cdn.example.com/x.jpg");
  });

  it("leaves an already-absolute http URL unchanged", () => {
    expect(resolveMediaUrl("http://cdn.example.com/x.jpg")).toBe("http://cdn.example.com/x.jpg");
  });
});
