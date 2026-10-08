import axios from "axios";
import type {
  Insight,
  Project,
  Property,
  Service,
  StrapiListResponse,
  StrapiSingleResponse,
  TeamMember,
} from "./cms-types";

/**
 * Set VITE_CMS_URL in .env for staging/production. Falls back to the local Strapi dev
 * server so `pnpm dev` works out of the box against a locally running CMS.
 */
const CMS_URL = import.meta.env.VITE_CMS_URL || "http://localhost:1337";

/** Strapi returns media URLs relative to the CMS origin (or absolute if using a CDN/S3 provider). */
export function resolveMediaUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${CMS_URL}${url}`;
}

const cms = axios.create({
  baseURL: `${CMS_URL}/api`,
  timeout: 8000,
});

/**
 * Strapi returns network/5xx errors as thrown AxiosErrors and "not found" as a 404 with
 * an empty `data`. Callers use `CmsNotFoundError` to distinguish "nothing here" from
 * "something broke" — the two need different UI per page (see CmsState.tsx).
 */
export class CmsNotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "CmsNotFoundError";
  }
}

async function getList<T>(path: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const { data } = await cms.get<StrapiListResponse<T>>(path, { params });
  return data.data;
}

async function getBySlug<T>(path: string, slug: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data } = await cms.get<StrapiListResponse<T>>(path, {
    params: { ...params, filters: { slug: { $eq: slug } } },
  });
  const item = data.data[0];
  if (!item) throw new CmsNotFoundError(path);
  return item;
}

// --- Services ---------------------------------------------------------------

export function getServices() {
  return getList<Service>("/services", { sort: "sortOrder:asc" });
}

export function getServiceBySlug(slug: string) {
  return getBySlug<Service>("/services", slug);
}

// --- Projects -----------------------------------------------------------------

export function getProjects() {
  return getList<Project>("/projects", {
    sort: "sortOrder:asc",
    populate: ["heroImage", "gallery"],
  });
}

export function getProjectBySlug(slug: string) {
  return getBySlug<Project>("/projects", slug, { populate: ["heroImage", "gallery"] });
}

// --- Properties -----------------------------------------------------------------

export function getProperties(filters?: { category?: string }) {
  return getList<Property>("/properties", {
    populate: ["image", "project"],
    ...(filters?.category && filters.category !== "All"
      ? { filters: { category: { $eq: filters.category } } }
      : {}),
  });
}

export function getPropertyBySlug(slug: string) {
  return getBySlug<Property>("/properties", slug, { populate: ["image", "gallery", "project"] });
}

// --- Insights -----------------------------------------------------------------

export function getInsights() {
  return getList<Insight>("/insights", {
    sort: "publishDate:desc",
    populate: ["coverImage"],
  });
}

export function getInsightBySlug(slug: string) {
  return getBySlug<Insight>("/insights", slug, { populate: ["coverImage"] });
}

// --- Team members -----------------------------------------------------------------

export function getTeamMembers() {
  return getList<TeamMember>("/team-members", {
    sort: "sortOrder:asc",
    populate: ["photo"],
  });
}

// Re-exported so pages can `import { type Project, ... } from "@/lib/cms-client"`
// without a second import from "./cms-types".
export type { Insight, Project, Property, Service, StrapiMedia, TeamMember } from "./cms-types";
