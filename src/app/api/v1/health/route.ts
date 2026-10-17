import { apiSuccess } from "@/lib/api-response";
import { connectToDatabase, getDatabaseConnectionState } from "@/lib/db";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = getDatabaseConnectionState().status;
  let dbMessage = "Database ready";

  // If MONGODB_URI is provided, test/ensure connection
  if (process.env.MONGODB_URI) {
    try {
      await connectToDatabase();
      dbStatus = getDatabaseConnectionState().status;
    } catch (error) {
      dbStatus = "disconnected";
      dbMessage = error instanceof Error ? error.message : "Failed to connect to MongoDB";
    }
  } else {
    dbMessage = "MONGODB_URI not configured in environment variables";
  }

  const responseTimeMs = Date.now() - startTime;

  return apiSuccess({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "0.1.0",
    database: {
      status: dbStatus,
      configured: Boolean(process.env.MONGODB_URI),
      message: dbMessage,
    },
    responseTimeMs,
  });
}
