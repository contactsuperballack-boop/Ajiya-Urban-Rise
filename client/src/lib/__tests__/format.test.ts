import { describe, expect, it } from "vitest";
import { initials, filterProperties } from "../format";
import type { Property } from "../cms-client";

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Ada Obi")).toBe("AO");
  });

  it("handles a single-word name", () => {
    expect(initials("Cher")).toBe("C");
  });

  it("collapses extra whitespace between words", () => {
    expect(initials("  Ada   Obi  ")).toBe("AO");
  });

  it("only uses the first two words even for longer names", () => {
    expect(initials("Development team lead")).toBe("DT");
  });

  it("uppercases the result regardless of input case", () => {
    expect(initials("ada obi")).toBe("AO");
  });
});

describe("filterProperties", () => {
  const props: Property[] = [
    {
      documentId: "1",
      id: 1,
      name: "Land opportunities",
      slug: "land",
      category: "Land",
      location: "Kubwa",
      priceGuide: 5,
      description: "",
      features: ["Land", "Investment"],
      image: null,
      project: null,
    },
    {
      documentId: "2",
      id: 2,
      name: "Residential opportunities",
      slug: "residential",
      category: "Residential",
      location: "Abuja",
      priceGuide: 15,
      description: "",
      features: ["Residential"],
      image: null,
      project: null,
    },
    {
      documentId: "3",
      id: 3,
      name: "Commercial spot",
      slug: "commercial",
      category: "Commercial",
      location: "CBD",
      priceGuide: 35,
      description: "",
      features: ["Commercial"],
      image: null,
      project: null,
    },
  ];

  it("returns everything when category is All and budget covers all", () => {
    expect(filterProperties(props, { category: "All", query: "", maxBudget: 100 })).toHaveLength(3);
  });

  it("filters by exact category", () => {
    const result = filterProperties(props, { category: "Land", query: "", maxBudget: 100 });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("land");
  });

  it("filters out anything over the budget ceiling", () => {
    expect(filterProperties(props, { category: "All", query: "", maxBudget: 10 })).toHaveLength(1);
  });

  it("matches a free-text query against name, location, and features", () => {
    expect(filterProperties(props, { category: "All", query: "kubwa", maxBudget: 100 })).toHaveLength(1);
  });

  it("free-text search is case-insensitive", () => {
    expect(filterProperties(props, { category: "All", query: "KUBWA", maxBudget: 100 })).toHaveLength(1);
  });

  it("requires category, budget, AND query to all match", () => {
    expect(filterProperties(props, { category: "Commercial", query: "kubwa", maxBudget: 100 })).toHaveLength(0);
  });
});
