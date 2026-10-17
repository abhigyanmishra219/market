import React from "react";
import { Metadata } from "next";
import { connection } from "next/server";
import { requirePageAdmin } from "@/lib/auth-guards";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import {
  AdminModerationDashboard,
  AdminMetrics,
} from "@/components/admin/AdminModerationDashboard";

export const metadata: Metadata = {
  title: "Admin Moderation Console — Marketplace",
  description: "Administrative moderation and user governance portal.",
};

export default async function AdminPage() {
  await connection();
  const session = await requirePageAdmin();
  const { user } = session;

  await connectToDatabase();

  // Query live database counts concurrently for fast server rendering
  const [
    propertiesTotal,
    servicesTotal,
    pendingProperties,
    pendingServices,
    approvedProperties,
    approvedServices,
    rejectedProperties,
    rejectedServices,
    pausedTotal,
    archivedTotal,
    usersTotal,
  ] = await Promise.all([
    Listing.countDocuments({ type: "PROPERTY" }),
    Listing.countDocuments({ type: "SERVICE" }),
    Listing.countDocuments({ type: "PROPERTY", status: "PENDING_REVIEW" }),
    Listing.countDocuments({ type: "SERVICE", status: "PENDING_REVIEW" }),
    Listing.countDocuments({ type: "PROPERTY", status: "APPROVED" }),
    Listing.countDocuments({ type: "SERVICE", status: "APPROVED" }),
    Listing.countDocuments({ type: "PROPERTY", status: "REJECTED" }),
    Listing.countDocuments({ type: "SERVICE", status: "REJECTED" }),
    Listing.countDocuments({ status: "PAUSED" }),
    Listing.countDocuments({ status: "ARCHIVED" }),
    User.countDocuments(),
  ]);

  const initialMetrics: AdminMetrics = {
    propertiesTotal,
    servicesTotal,
    pendingProperties,
    pendingServices,
    approvedProperties,
    approvedServices,
    rejectedProperties,
    rejectedServices,
    pendingTotal: pendingProperties + pendingServices,
    approvedTotal: approvedProperties + approvedServices,
    rejectedTotal: rejectedProperties + rejectedServices,
    pausedTotal,
    archivedTotal,
    usersTotal,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <AdminModerationDashboard
        initialMetrics={initialMetrics}
        adminUser={{
          name: user.name,
          email: user.email,
          role: user.role,
        }}
      />
    </div>
  );
}
