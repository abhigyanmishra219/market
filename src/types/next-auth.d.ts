import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      status: "ACTIVE" | "SUSPENDED" | "DELETED";
      phone?: string | null;
      whatsapp?: string | null;
      contactPreferences?: {
        showPhone: boolean;
        showWhatsapp: boolean;
      };
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: "USER" | "ADMIN";
    status?: "ACTIVE" | "SUSPENDED" | "DELETED";
    phone?: string | null;
    whatsapp?: string | null;
    contactPreferences?: {
      showPhone: boolean;
      showWhatsapp: boolean;
    };
  }
}
