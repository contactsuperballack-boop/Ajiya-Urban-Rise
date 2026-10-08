import { describe, expect, it } from "vitest";
import { enquirySchema, newsletterSchema } from "../enquiry";

describe("enquirySchema", () => {
  const valid = {
    name: "Ada Obi",
    email: "ada@example.com",
    phone: "+2348012345678",
    interest: "Land",
    message: "I would like to discuss a land opportunity in Kubwa.",
  };

  it("accepts a fully valid enquiry", () => {
    const result = enquirySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects a missing name", () => {
    const result = enquirySchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = enquirySchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a message under the 10-character minimum", () => {
    const result = enquirySchema.safeParse({ ...valid, message: "too short" });
    expect(result.success).toBe(false);
  });

  it("rejects a message over the 2000-character maximum", () => {
    const result = enquirySchema.safeParse({ ...valid, message: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from string fields", () => {
    const result = enquirySchema.safeParse({ ...valid, name: "  Ada Obi  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Ada Obi");
  });

  it("accepts optional relatedProjectSlug/relatedPropertySlug when present", () => {
    const result = enquirySchema.safeParse({ ...valid, relatedProjectSlug: "signature-estate" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.relatedProjectSlug).toBe("signature-estate");
  });

  it("accepts a request with no honeypot field filled", () => {
    const result = enquirySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects a filled honeypot field (would indicate a bot)", () => {
    const result = enquirySchema.safeParse({ ...valid, companyWebsite: "https://spam.example.com" });
    expect(result.success).toBe(false);
  });
});

describe("newsletterSchema", () => {
  it("accepts a valid email", () => {
    const result = newsletterSchema.safeParse({ email: "reader@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = newsletterSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a filled honeypot field", () => {
    const result = newsletterSchema.safeParse({ email: "reader@example.com", companyWebsite: "bot-fill" });
    expect(result.success).toBe(false);
  });
});
