import React from "react";
import { Metadata } from "next";
import { connection } from "next/server";
import { requirePageAuth } from "@/lib/auth-guards";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Account & Profile | Marketplace",
  description: "Manage your personal profile, verified contact numbers, and marketplace communication preferences.",
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const session = await requirePageAuth("/account/profile");

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
