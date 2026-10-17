import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { ValidationError } from "@/lib/errors";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Megabytes
export const MAX_PHOTOS_PER_LISTING = 12;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_TO_EXT: Record<AllowedMimeType, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/**
 * Checks whether cloud object storage (S3 / Cloudflare R2) is fully configured via environment variables.
 */
export function isCloudStorageConfigured(): boolean {
  return Boolean(
    process.env.STORAGE_BUCKET_NAME &&
      process.env.STORAGE_ACCESS_KEY_ID &&
      process.env.STORAGE_SECRET_ACCESS_KEY
  );
}

/**
 * Validates file metadata prior to upload authorization.
 */
export function validateUploadMetadata(
  fileName: string,
  fileType: string,
  fileSize: number
): { extension: string } {
  if (!ALLOWED_MIME_TYPES.includes(fileType as AllowedMimeType)) {
    throw new ValidationError(
      `Unsupported file type "${fileType}". Only JPG, PNG, and WebP images are permitted.`
    );
  }

  if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    throw new ValidationError(
      `File size exceeds the 5MB limit (provided: ${(fileSize / (1024 * 1024)).toFixed(2)} MB).`
    );
  }

  const ext = MIME_TO_EXT[fileType as AllowedMimeType] || path.extname(fileName).toLowerCase();
  return { extension: ext };
}

/**
 * Generates an unpredictable, cryptographically random storage key to prevent directory traversal.
 * Format: listings/{uuid}.{ext}
 */
export function generateStorageKey(prefix: string = "listings", extension: string): string {
  const randomId = crypto.randomUUID();
  const safeExt = extension.startsWith(".") ? extension : `.${extension}`;
  return `${prefix}/${randomId}${safeExt}`;
}

/**
 * Verifies that a client-submitted photo URL originates strictly from our trusted storage
 * location (local /uploads/ or configured public cloud storage URL), preventing arbitrary
 * external URL injection into listing photos.
 */
export function isTrustedStorageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  const trimmed = url.trim();

  // Local development upload path
  if (trimmed.startsWith("/uploads/listings/")) {
    return true;
  }

  // Configured public cloud CDN URL
  const publicStorageUrl = process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL;
  if (publicStorageUrl && trimmed.startsWith(publicStorageUrl)) {
    return true;
  }

  // Configured bucket endpoint
  const endpoint = process.env.STORAGE_ENDPOINT;
  if (endpoint && trimmed.startsWith(endpoint)) {
    return true;
  }

  return false;
}

/**
 * Saves an uploaded file buffer to the local public/uploads directory during development
 * when cloud S3/R2 storage is not configured.
 */
export async function saveLocalUpload(
  buffer: Buffer,
  storageKey: string
): Promise<{ url: string; key: string }> {
  // Safe relative path extraction inside public/uploads
  const normalizedKey = storageKey.replace(/\\/g, "/");
  const localDir = path.join(process.cwd(), "public", path.dirname(normalizedKey));
  await fs.mkdir(localDir, { recursive: true });

  const fullPath = path.join(process.cwd(), "public", normalizedKey);
  await fs.writeFile(fullPath, buffer);

  return {
    url: `/${normalizedKey}`,
    key: normalizedKey,
  };
}
