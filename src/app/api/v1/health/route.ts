import { apiSuccess } from "@/lib/api-response";
import { connectToDatabase, getDatabaseConnectionState } from "@/lib/db";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = getDatabaseConnectionState().status;
  let isHealthy = true;

  // If MONGODB_URI is provided, test/ensure connection
  if (process.env.MONGODB_URI) {
    try {
      await connectToDatabase();
      dbStatus = getDatabaseConnectionState().status;
      if (dbStatus !== "connected") {
        isHealthy = false;
      }
    } catch (error) {
      isHealthy = false;
      dbStatus = "disconnected";
      // Log internally without leaking to the HTTP client
      console.error("[HEALTH_CHECK_DB_ERROR]", error instanceof Error ? error.message : "Database connection failure");
    }
  } else {
    isHealthy = false;
    dbStatus = "disconnected";
  }

  const responseTimeMs = Date.now() - startTime;

  return apiSuccess({
    status: isHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV === "production" ? "production" : "development",
    version: "0.1.0",
    database: {
      status: dbStatus,
      connected: dbStatus === "connected",
    },
    responseTimeMs,
  });
}
