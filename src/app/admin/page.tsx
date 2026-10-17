import React from "react";
import { Metadata } from "next";
import { requirePageAdmin } from "@/lib/auth-guards";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, CheckCircle2, Clock, AlertTriangle, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Admin Moderation Console — Marketplace",
  description: "Administrative moderation and user governance portal.",
};

export default async function AdminPage() {
  const session = await requirePageAdmin();
  const { user } = session;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-6 sm:p-8 mb-8 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-purple-700" />
          <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
            Administrative Portal
          </span>
          <Badge variant="primary" size="sm">
            {user.role}
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
          Marketplace Moderation Console
        </h1>
        <p className="text-xs text-muted-text mt-1">
          Authorized administrator: {user.name} ({user.email}). Access restricted to verified platform staff.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-700">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-text font-medium">Pending Reviews</span>
            <h3 className="text-xl font-bold text-dark-text">0 Listings</h3>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-text font-medium">Approved Listings</span>
            <h3 className="text-xl font-bold text-dark-text">0 Live</h3>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-lg bg-red-50 text-red-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-text font-medium">User Reports</span>
            <h3 className="text-xl font-bold text-dark-text">0 Open</h3>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-700">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-text font-medium">Total Accounts</span>
            <h3 className="text-xl font-bold text-dark-text">Active</h3>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-8 text-center">
        <p className="text-xs text-muted-text">
          Full listing inspection drawers, bulk review actions, and audit logs will be connected in Phase W8.
        </p>
      </div>
    </div>
  );
}
