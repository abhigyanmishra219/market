import crypto from "crypto";

/**
 * Generates a URL-friendly slug from a title string, appended with a short
 * random alphanumeric suffix to ensure global uniqueness across listings.
 */
export function generateListingSlug(title: string): string {
  const sanitized = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove non-word characters (except spaces and dashes)
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/-+/g, "-") // Replace multiple dashes with single dash
    .slice(0, 60); // Keep reasonable slug length

  const randomSuffix = crypto.randomBytes(3).toString("hex"); // 6 hex chars e.g. 'a4f8b2'
  return `${sanitized || "property"}-${randomSuffix}`;
}
