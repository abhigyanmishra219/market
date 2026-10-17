import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

import type { MongoClient } from "mongodb";

/**
 * Adapter client retriever that provides the connected MongoClient
 * from our cached Mongoose connection, ensuring a single shared connection pool.
 */
const getAdapterClient = async (): Promise<MongoClient> => {
  const mongooseInstance = await connectToDatabase();
  return mongooseInstance.connection.getClient() as unknown as MongoClient;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(getAdapterClient, {
    collections: {
      Users: "users",
      Accounts: "accounts",
      Sessions: "sessions",
      VerificationTokens: "verificationTokens",
    },
  }),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
      allowDangerousEmailAccountLinking: false, // Prevent account takeover
    }),
  ],
  session: {
    strategy: "database", // MongoDB-backed database sessions
    maxAge: 30 * 24 * 60 * 60, // 30 Days rolling expiration
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;

        // Fetch application-level attributes from Mongoose User model
        try {
          await connectToDatabase();
          const dbUser = await User.findById(user.id).select(
            "name email role status phone whatsapp contactPreferences"
          );

          if (dbUser) {
            // Safe idempotent admin bootstrap:
            // Check if server environment has configured ADMIN_EMAIL for initial bootstrap.
            // Never expose via NEXT_PUBLIC_; normalize with trim().toLowerCase().
            const configuredAdmin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
            const normalizedUserEmail = dbUser.email?.trim().toLowerCase();

            if (
              configuredAdmin &&
              normalizedUserEmail &&
              normalizedUserEmail === configuredAdmin &&
              dbUser.role !== "ADMIN"
            ) {
              dbUser.role = "ADMIN";
              await dbUser.save();
            }

            session.user.role = dbUser.role || "USER";
            session.user.status = dbUser.status || "ACTIVE";
            session.user.phone = dbUser.phone || null;
            session.user.whatsapp = dbUser.whatsapp || null;
            session.user.contactPreferences = dbUser.contactPreferences || {
              showPhone: true,
              showWhatsapp: true,
            };
          }
        } catch (error) {
          console.error("[AUTH_SESSION_CALLBACK_ERROR]", error);
        }
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Safe bootstrap for first-time account initialization
      const configuredAdmin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const normalizedUserEmail = user.email?.trim().toLowerCase();

      if (
        configuredAdmin &&
        normalizedUserEmail &&
        normalizedUserEmail === configuredAdmin
      ) {
        try {
          await connectToDatabase();
          await User.findByIdAndUpdate(user.id, { role: "ADMIN" });
        } catch (error) {
          console.error("[AUTH_CREATE_USER_ADMIN_BOOTSTRAP_ERROR]", error);
        }
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
