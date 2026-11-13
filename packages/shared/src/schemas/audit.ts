import { z } from "zod";

export const DeviceModeSchema = z.enum(["MOBILE", "DESKTOP", "BOTH"]);
export const SingleDeviceSchema = z.enum(["MOBILE", "DESKTOP"]);

export const TechStackSchema = z.enum([
  "WORDPRESS",
  "WOOCOMMERCE",
  "SHOPIFY",
  "NEXTJS",
  "REACT",
  "LARAVEL",
  "CUSTOM",
  "UNKNOWN",
]);

export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  description: z.string().max(500).optional(),
  primaryDomain: z.string().min(1, "Primary domain is required"),
  techStack: TechStackSchema.default("UNKNOWN"),
});

export const BulkUrlIngestSchema = z.object({
  urls: z.array(z.string().min(1)).min(1, "At least one URL must be provided").max(500),
});

export const TriggerAuditSchema = z.object({
  projectId: z.string().uuid("Valid project ID is required"),
  deviceMode: DeviceModeSchema.default("BOTH"),
  urls: z.array(z.string().url("Must be valid URL")).min(1, "At least one URL is required").max(500),
});

export const SitemapImportSchema = z.object({
  sitemapUrl: z.string().url("Valid sitemap URL is required"),
  maxUrls: z.number().int().min(1).max(500).default(50),
});
