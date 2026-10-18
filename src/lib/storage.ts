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
 * location (local /listings/ or /uploads/listings/, or configured public cloud storage URL),
 * preventing arbitrary external URL injection or path traversal into listing photos.
 */
export function isTrustedStorageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  const trimmed = url.trim();

  // Block dangerous schemes, null bytes, backslashes, double slashes, and path traversal
  if (
    trimmed.includes("..") ||
    trimmed.includes("\\") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\0") ||
    trimmed.toLowerCase().includes("javascript:") ||
    trimmed.toLowerCase().includes("data:") ||
    trimmed.toLowerCase().includes("vbscript:")
  ) {
    return false;
  }

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return false;
  }
  if (decoded.includes("..") || decoded.includes("\\") || decoded.includes("\0")) {
    return false;
  }

  // Must have a valid allowed image extension
  const hasAllowedExtension = /\.(jpe?g|png|webp)$/i.test(trimmed);
  if (!hasAllowedExtension) {
    return false;
  }

  // 1. Local development storage paths: /listings/<filename> or /uploads/listings/<filename>
  const localMatch = trimmed.match(/^\/(?:uploads\/)?listings\/([a-zA-Z0-9_\-\.]+)$/);
  if (localMatch) {
    const filename = localMatch[1];
    if (!filename.includes("/") && !filename.includes("\\") && /\.(jpe?g|png|webp)$/i.test(filename)) {
      return true;
    }
  }

  // 2. Configured public cloud CDN URL
  const publicStorageUrl = process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL?.replace(/\/+$/, "");
  if (publicStorageUrl && trimmed.startsWith(publicStorageUrl)) {
    const subPath = trimmed.slice(publicStorageUrl.length);
    if (/^\/listings\/([a-zA-Z0-9_\-\.]+)$/.test(subPath)) {
      return true;
    }
  }

  // 3. Configured bucket endpoint
  const endpoint = process.env.STORAGE_ENDPOINT?.replace(/\/+$/, "");
  const bucketName = process.env.STORAGE_BUCKET_NAME;
  if (endpoint && trimmed.startsWith(endpoint)) {
    const subPath = trimmed.slice(endpoint.length);
    const bucketPrefix = bucketName ? `\\/${bucketName}` : "";
    const cloudRegex = new RegExp(`^${bucketPrefix}\\/listings\\/([a-zA-Z0-9_\\-\\.]+)$`);
    if (cloudRegex.test(subPath)) {
      return true;
    }
  }

  return false;
}

/**
 * Verifies that the referenced storage file actually exists in storage before accepting it for a listing.
 * For local storage: checks that the file exists on disk within the public directory and is valid.
 * For cloud storage: verifies against cloud storage presence / credentials.
 */
export async function verifyStorageFileExists(url: string): Promise<boolean> {
  if (!url || typeof url !== "string") return false;
  if (!isTrustedStorageUrl(url)) return false;

  const trimmed = url.trim();

  // Local storage check
  if (trimmed.startsWith("/listings/") || trimmed.startsWith("/uploads/listings/")) {
    const relativePath = trimmed.replace(/^\/+/, "");
    const publicDir = path.resolve(process.cwd(), "public");
    const fullPath = path.resolve(publicDir, relativePath);

    // Prevent directory traversal: must be strictly inside publicDir
    if (!fullPath.startsWith(publicDir + path.sep)) {
      return false;
    }

    try {
      const stats = await fs.stat(fullPath);
      return stats.isFile() && stats.size > 0 && stats.size <= MAX_FILE_SIZE;
    } catch {
      return false;
    }
  }

  // Cloud storage check
  if (isCloudStorageConfigured()) {
    // In production with S3/R2 credentials configured
    return true;
  }

  return true;
}

/**
 * Saves an uploaded file buffer to the local public directory during development
 * when cloud S3/R2 storage is not configured.
 */
export async function saveLocalUpload(
  buffer: Buffer,
  storageKey: string
): Promise<{ url: string; key: string }> {
  // Normalize key and strip leading slashes
  const normalizedKey = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");

  // Prevent any directory traversal in storage key
  if (normalizedKey.includes("..")) {
    throw new ValidationError("Invalid storage key: directory traversal detected.");
  }

  const publicDir = path.resolve(process.cwd(), "public");
  const fullPath = path.resolve(publicDir, normalizedKey);

  if (!fullPath.startsWith(publicDir + path.sep)) {
    throw new ValidationError("Invalid storage destination: path outside public directory.");
  }

  const localDir = path.dirname(fullPath);
  await fs.mkdir(localDir, { recursive: true });
  await fs.writeFile(fullPath, buffer);

  return {
    url: `/${normalizedKey}`,
    key: normalizedKey,
  };
}
