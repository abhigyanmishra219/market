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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
          Account Profile & Settings
        </h1>
        <p className="text-sm text-muted-text mt-1">
          Review your verified identity and configure communication channels for your marketplace listings.
        </p>
      </div>

      <ProfileForm user={serializedUser} />
    </div>
  );
}
