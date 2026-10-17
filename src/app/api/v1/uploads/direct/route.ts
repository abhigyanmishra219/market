import { NextRequest } from "next/server";
import crypto from "crypto";
import { requireAuth } from "@/lib/auth-guards";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";
import {
  validateUploadMetadata,
  generateStorageKey,
  saveLocalUpload,
} from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    // Only authenticated users may upload images
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      throw new ValidationError("No valid image file provided in form data.");
    }

    const fileName = (file as { name?: string }).name || "photo.jpg";
    const fileType = file.type;
    const fileSize = file.size;

    const { extension } = validateUploadMetadata(fileName, fileType, fileSize);
    const storageKey = generateStorageKey("listings", extension);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url, key } = await saveLocalUpload(buffer, storageKey);

    return apiSuccess(
      {
        id: crypto.randomUUID(),
        url,
        key,
        isPrimary: false,
      },
      201
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
