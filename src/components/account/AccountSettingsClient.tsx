"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ShieldCheck,
  Mail,
  User as UserIcon,
  Calendar,
  Lock,
  LogOut,
  ExternalLink,
  Phone,
  MessageSquare,
  AlertTriangle,
  Info,
} from "lucide-react";

interface AccountSettingsClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: "USER" | "ADMIN";
    status: "ACTIVE" | "SUSPENDED" | "DELETED";
    phone?: string | null;
    whatsapp?: string | null;
    contactPreferences?: {
      showPhone: boolean;
      showWhatsapp: boolean;
    };
    createdAt?: string;
  };
}

export function AccountSettingsClient({ user }: AccountSettingsClientProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      console.error("[SIGN_OUT_ERROR]", err);
      setIsSigningOut(false);
    }
  };

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Recently joined";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-forest-green uppercase tracking-wider">
                Account & Security
              </span>
              <Badge variant={user.role === "ADMIN" ? "primary" : "neutral"} size="sm">
                {user.role}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
              Account Settings
            </h1>
            <p className="text-xs text-muted-text mt-1 max-w-xl">
              Review your verified account credentials, session security, contact preferences, and data lifecycle policies.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            isLoading={isSigningOut}
            leftIcon={<LogOut className="w-4 h-4 text-red-600" />}
            className="border-gray-200 text-dark-text hover:bg-gray-50 hover:text-red-600 self-start sm:self-auto"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Account Information Card */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-7 shadow-xs">
        <div className="pb-4 mb-5 border-b border-border-subtle">
          <h2 className="text-base font-bold text-dark-text">Account Information</h2>
          <p className="text-xs text-muted-text mt-0.5">
            Your primary identity is authenticated and verified via Google OAuth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Identity Provider */}
          <div className="p-4 rounded-xl border border-border-subtle bg-off-white/60 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-light-green text-forest-green shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted-text uppercase tracking-wider block">
                Identity Provider
              </span>
              <span className="text-sm font-bold text-dark-text mt-0.5 block">
                Google OAuth 2.0
              </span>
              <span className="text-[11px] text-muted-text mt-1 block">
                Managed by Google Identity. Passwordless authentication.
              </span>
            </div>
          </div>

          {/* Email Address */}
          <div className="p-4 rounded-xl border border-border-subtle bg-off-white/60 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-light-green text-forest-green shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-muted-text uppercase tracking-wider block">
                Verified Email
              </span>
              <span className="text-sm font-bold text-dark-text mt-0.5 truncate block">
                {user.email}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                ✓ Verified by Google
              </span>
            </div>
          </div>

          {/* Account Role */}
          <div className="p-4 rounded-xl border border-border-subtle bg-off-white/60 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-light-green text-forest-green shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted-text uppercase tracking-wider block">
                Authorization Role
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={user.role === "ADMIN" ? "primary" : "neutral"} size="sm">
                  {user.role}
                </Badge>
                <span className="text-xs text-muted-text">
                  {user.role === "ADMIN" ? "Platform Administrator" : "Standard Marketplace User"}
                </span>
              </div>
              <span className="text-[11px] text-muted-text mt-1 block">
                Roles are server-controlled and immutable from client input.
              </span>
            </div>
          </div>

          {/* Member Since & Account Status */}
          <div className="p-4 rounded-xl border border-border-subtle bg-off-white/60 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-light-green text-forest-green shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted-text uppercase tracking-wider block">
                Account Status
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="success" size="sm">
                  {user.status}
                </Badge>
                <span className="text-xs text-muted-text">Joined {memberSince}</span>
              </div>
              <span className="text-[11px] text-muted-text mt-1 block">
                Account ID: <code className="font-mono text-[10px]">{user.id}</code>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Session & Security */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-7 shadow-xs">
        <div className="pb-4 mb-5 border-b border-border-subtle">
          <h2 className="text-base font-bold text-dark-text">Session & Authentication Security</h2>
          <p className="text-xs text-muted-text mt-0.5">
            Your login session is securely maintained using database-backed Auth.js session tokens.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-border-subtle bg-off-white/60">
            <Lock className="w-5 h-5 text-forest-green shrink-0 mt-0.5" />
            <div className="text-xs text-dark-text leading-relaxed">
              <span className="font-bold text-dark-text block">Database Session Management</span>
              Session state is synchronized with the MongoDB cluster. Signing out immediately revokes your database session record and purges client session cookies, preventing stale session reuse.
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-text">
              Want to terminate this session and sign out across this browser?
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              isLoading={isSigningOut}
              leftIcon={<LogOut className="w-4 h-4 text-red-600" />}
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              Terminate Session & Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Contact Preferences Summary */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-bold text-dark-text">Contact & Privacy Summary</h2>
            <p className="text-xs text-muted-text mt-0.5">
              Current communication settings applied to your published listings.
            </p>
          </div>
          <Link href="/account/profile">
            <Button variant="outline" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
              Edit Profile
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl border border-border-subtle bg-off-white/40 flex items-center gap-3">
            <Phone className="w-4 h-4 text-forest-green shrink-0" />
            <div>
              <span className="font-semibold text-dark-text block">
                Primary Phone: {user.phone || "Not configured"}
              </span>
              <span className="text-[11px] text-muted-text">
                Visibility: {user.contactPreferences?.showPhone ? "Enabled on listings" : "Hidden"}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border-subtle bg-off-white/40 flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-forest-green shrink-0" />
            <div>
              <span className="font-semibold text-dark-text block">
                WhatsApp Enquiries: {user.whatsapp || "Not configured"}
              </span>
              <span className="text-[11px] text-muted-text">
                Direct Chat: {user.contactPreferences?.showWhatsapp ? "Active" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Lifecycle & Data Retention (Documented Policy) */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 sm:p-7 shadow-xs">
        <div className="flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-amber-950">
              Account Deletion & Data Retention Policy
            </h3>
            <p className="text-xs text-amber-900 leading-relaxed">
              To protect marketplace trust and prevent fraud, user accounts cannot be instantaneously purged while associated with live property listings, professional service offerings, booking transaction histories, or administrative moderation logs.
            </p>
            <p className="text-xs text-amber-900 leading-relaxed">
              In accordance with platform specifications, permanent account deactivation workflows and compliant retention archiving are scheduled for Phase W9 production compliance. If you wish to stop receiving calls or bookings immediately, you can pause your active listings or disable phone visibility in your <Link href="/account/profile" className="font-semibold underline hover:text-amber-950">Profile Settings</Link>.
            </p>
            <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium text-amber-800">
              <Info className="w-3.5 h-3.5" />
              <span>Full self-service data erasure workflows documented as future work.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
