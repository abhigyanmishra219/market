import React from "react";
import { connection } from "next/server";
import { requirePageAdmin } from "@/lib/auth-guards";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const session = await requirePageAdmin();

  return (
    <AdminShell
      adminUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
