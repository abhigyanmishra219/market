import mongoose from "mongoose";
import { DatabaseConnectionError } from "@/lib/errors";

interface MongooseGlobalCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseGlobalCache: MongooseGlobalCache | undefined;
}

const cached: MongooseGlobalCache = global.mongooseGlobalCache || {
  conn: null,
  promise: null,
};

if (!global.mongooseGlobalCache) {
  global.mongooseGlobalCache = cached;
}

/**
 * Connect to MongoDB Atlas using Mongoose with connection pooling and caching.
 * Ensures only a single connection pool is established across Next.js re-renders.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new DatabaseConnectionError(
      "MONGODB_URI is not defined in environment variables. Please check your .env.local file."
    );
  }

  // Avoid calling mongoose.connection.readyState directly because in Mongoose 9,
  // the readyState getter checks heartbeat staleness via Date.now(), which triggers
  // Next.js 'blocking-prerender-current-time' errors during static prerendering.
  // Accessing the underlying _readyState avoids calling Date.now().
  const rawReadyState =
    (mongoose.connection as unknown as { _readyState?: number })._readyState ??
    (cached.conn?.connection as unknown as { _readyState?: number })?._readyState;

  if (cached.conn && rawReadyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .then((mongooseInstance) => {
        return mongooseInstance;
      })
      .catch((error) => {
        cached.promise = null;
        console.error("[DATABASE_CONNECTION_ERROR]", error);
        throw new DatabaseConnectionError(
          `Failed to establish connection to MongoDB: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

/**
 * Check current database connection state.
 * Returns: 'connected' | 'connecting' | 'disconnecting' | 'disconnected'
 */
export function getDatabaseConnectionState(): {
  status: "connected" | "connecting" | "disconnecting" | "disconnected";
  readyState: number;
} {
  const readyState =
    (mongoose.connection as unknown as { _readyState?: number })._readyState ??
    (cached.conn?.connection as unknown as { _readyState?: number })?._readyState ??
    0;
  const states: Record<number, "disconnected" | "connected" | "connecting" | "disconnecting"> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    status: states[readyState] || "disconnected",
    readyState,
  };
}

/**
 * Gracefully disconnect from database (used for testing or clean shutdowns).
 */
export async function disconnectFromDatabase(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}
