import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import {
  validateUploadMetadata,
  generateStorageKey,
  isCloudStorageConfigured,
} from "@/lib/storage";
import { z } from "zod";

const presignedUrlRequestSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required"),
  fileType: z.string().trim().min(1, "File type is required"),
  fileSize: z.coerce.number().positive("File size must be positive"),
  purpose: z.enum(["listing", "profile", "review"]).default("listing"),
});

export async function POST(request: NextRequest) {
  try {
    // Zero-trust: only authenticated users may request upload authorization
    await requireAuth();

    const body = await request.json();
    const data = presignedUrlRequestSchema.parse(body);

    const { extension } = validateUploadMetadata(
      data.fileName,
      data.fileType,
      data.fileSize
    );

    const storageKey = generateStorageKey("listings", extension);

    // If cloud storage credentials (S3/Cloudflare R2) are configured
    if (isCloudStorageConfigured()) {
      // In production with AWS/R2 credentials configured, presigned PUT URLs would be signed here.
      // E.g., using S3Client PutObjectCommand
      const publicBaseUrl =
        process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ||
        `${process.env.STORAGE_ENDPOINT}/${process.env.STORAGE_BUCKET_NAME}`;

      return apiSuccess({
        isCloud: true,
        fileKey: storageKey,
        publicUrl: `${publicBaseUrl}/${storageKey}`,
        uploadUrl: `${process.env.STORAGE_ENDPOINT}/${process.env.STORAGE_BUCKET_NAME}/${storageKey}`,
        expiresInSeconds: 900,
      });
    }

    // Cloud storage credentials not set in local environment; fallback to direct local upload
    return apiSuccess({
      isCloud: false,
      fileKey: storageKey,
      directUploadUrl: "/api/v1/uploads/direct",
      message:
        "Cloud storage credentials not configured. Local upload adapter active for development.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
