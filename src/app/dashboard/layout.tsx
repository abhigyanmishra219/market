import React from "react";
import { Metadata } from "next";
import { connection } from "next/server";
import { requirePageAuth } from "@/lib/auth-guards";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "User Dashboard | Marketplace",
  description: "Unified activity hub for managing property listings, professional services, and booking requests.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const session = await requirePageAuth("/dashboard");

  return (
    <DashboardShell
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role,
      }}
    >
      {children}
    </DashboardShell>
  );
}
