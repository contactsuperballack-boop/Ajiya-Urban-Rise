/**
 * Types mirror Strapi v5's Document Service API response shape: flat fields on each
 * document (no v4-style nested `attributes`), media fields as StrapiMedia objects.
 */

export interface StrapiMedia {
  id: number;
  url: string;
  alternativeText?: string | null;
  width?: number;
  height?: number;
}

export interface StrapiListResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiSingleResponse<T> {
  data: T | null;
}

export interface Service {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  index: string;
  cue?: string;
  shortDescription: string;
  intro: string;
  body: string;
  points: string[];
  sortOrder: number;
}

export type ProjectType = "Residential" | "Commercial" | "Mixed-Use" | "Land";
export type ProjectStatus = "Planning" | "Development" | "Construction" | "Completed";

export interface ProjectUnit {
  type: string;
  size?: string;
  price: string;
}

export interface Project {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  number?: string;
  type: ProjectType;
  status: ProjectStatus;
  location: string;
  eyebrow?: string;
  description: string;
  heroImage: StrapiMedia | null;
  gallery: StrapiMedia[];
  sortOrder: number;
  seoDescription?: string;
  documentationStatus?: string;
  units?: ProjectUnit[];
  deliveryTimeline?: string;
  landmarks?: string[];
}

export type PropertyCategory = "Land" | "Residential" | "Commercial" | "Investment";
export type PropertyAvailability = "Available" | "Limited Units" | "Reserved" | "Sold Out";

export interface Property {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  category: PropertyCategory;
  location: string;
  priceGuide: number;
  description: string;
  features: string[];
  image: StrapiMedia | null;
  gallery?: StrapiMedia[];
  size?: string;
  bedrooms?: number;
  availabilityStatus?: PropertyAvailability;
  documentationStatus?: string;
  paymentInfo?: string;
  project: Pick<Project, "id" | "documentId" | "name" | "slug"> | null;
}

export interface Insight {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  body: string;
  readTime?: string;
  publishDate: string;
  author?: string;
  featured: boolean;
  coverImage: StrapiMedia | null;
  videoUrl?: string;
}

export interface TeamMember {
  id: number;
  documentId: string;
  name: string;
  role: string;
  note?: string;
  photo: StrapiMedia | null;
  verified: boolean;
  sortOrder: number;
}
