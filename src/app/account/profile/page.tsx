import React from "react";
import { Metadata } from "next";
import { requirePageAuth } from "@/lib/auth-guards";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { ProfileForm } from "@/components/account/ProfileForm";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Account Profile & Preferences — Marketplace",
  description: "Manage your personal profile, contact information, and listing privacy preferences.",
};

export default async function ProfilePage() {
  const session = await requirePageAuth("/account/profile");
  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();

  if (!user) {
    notFound();
  }

  const serializedUser = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image || null,
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-7 shadow-xs">
        <span className="text-xs font-semibold text-forest-green uppercase tracking-wider block mb-1">
          Identity & Contact Channels
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
          Account Profile & Contact Details
        </h1>
        <p className="text-xs text-muted-text mt-1 max-w-xl">
          Review your verified identity and configure communication channels for your marketplace listings.
        </p>
      </div>

      <ProfileForm user={serializedUser} />
    </div>
  );
}
