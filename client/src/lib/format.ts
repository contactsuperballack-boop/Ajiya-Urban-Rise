import type { Property } from "@/lib/cms-client";

/** Initials from a person's name, e.g. "Ada Obi" -> "AO". Used as an avatar fallback. */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export interface PropertyFilters {
  category: string; // "All" or a specific PropertyCategory value
  query: string;
  maxBudget: number;
}

/** Filters a property list by category, indicative budget ceiling, and a free-text search. */
export function filterProperties(list: Property[], filters: PropertyFilters): Property[] {
  const query = filters.query.toLowerCase();
  return list.filter((item) => {
    const matchesCategory = filters.category === "All" || item.category === filters.category;
    const matchesBudget = item.priceGuide <= filters.maxBudget;
    const haystack = `${item.name} ${item.location} ${item.features.join(" ")}`.toLowerCase();
    return matchesCategory && matchesBudget && haystack.includes(query);
  });
}
