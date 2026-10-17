import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiErrorDetail, ApiPaginationMeta, ApiResponse } from "@/types/api";
import { AppError } from "@/lib/errors";

/**
 * Creates a standardized success JSON response.
 */
export function apiSuccess<T>(
  data: T,
  status: number = 200,
  meta?: ApiPaginationMeta
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    },
    { status }
  );
}

/**
 * Creates a standardized error JSON response from any unknown thrown error.
 */
export function apiError(
  message: string,
  statusCode: number = 500,
  code: string = "INTERNAL_SERVER_ERROR",
  details?: ApiErrorDetail[]
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status: statusCode }
  );
}

/**
 * Central error handler for Route Handlers.
 * Parses ZodErrors, AppErrors, and unexpected errors securely.
 */
export function handleRouteError(error: unknown): NextResponse<ApiResponse<never>> {
  if (error instanceof ZodError) {
    const details: ApiErrorDetail[] = error.issues.map((err) => ({
      field: err.path.join("."),
      issue: err.message,
    }));

    return apiError("Validation failed for request payload", 422, "VALIDATION_FAILED", details);
  }

  if (error instanceof AppError) {
    return apiError(error.message, error.statusCode, error.code, error.details);
  }

  // Rethrow Next.js internal dynamic render signals (Next.js 16 Partial Prerender bailouts)
  const digest = (error as { digest?: string })?.digest;
  if (digest && (digest.startsWith("NEXT_") || digest === "HANGING_PROMISE_REJECTION")) {
    throw error;
  }

  // Generic fallback: Log internally and return sanitized client message
  console.error("[API_UNHANDLED_ERROR]", error);
  return apiError(
    process.env.NODE_ENV === "development" && error instanceof Error
      ? error.message
      : "An unexpected internal server error occurred",
    500,
    "INTERNAL_SERVER_ERROR"
  );
}
