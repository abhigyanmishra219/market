import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requirePageAuth } from "@/lib/auth-guards";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { AccountSettingsClient } from "@/components/account/AccountSettingsClient";

export const metadata: Metadata = {
  title: "Account Settings — Marketplace",
  description: "View account credentials, session details, and privacy configurations.",
};

export default async function AccountSettingsPage() {
  await connection();
  const session = await requirePageAuth("/account/settings");

  await connectToDatabase();
  const user = await User.findById(session.user.id).lean();

  if (!user) {
    notFound();
  }

  const serializedUser = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.phone || null,
    whatsapp: user.whatsapp || null,
    contactPreferences: user.contactPreferences || {
      showPhone: true,
      showWhatsapp: true,
    },
    createdAt: user.createdAt ? user.createdAt.toISOString() : undefined,
  };

  return <AccountSettingsClient user={serializedUser} />;
}
