"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import {
  User as UserIcon,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role: "USER" | "ADMIN";
    status: "ACTIVE" | "SUSPENDED" | "DELETED";
    phone?: string | null;
    whatsapp?: string | null;
    contactPreferences?: {
      showPhone: boolean;
      showWhatsapp: boolean;
    };
    createdAt?: string | Date;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [whatsapp, setWhatsapp] = useState(user.whatsapp || "");
  const [showPhone, setShowPhone] = useState(user.contactPreferences?.showPhone ?? true);
  const [showWhatsapp, setShowWhatsapp] = useState(user.contactPreferences?.showWhatsapp ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          contactPreferences: {
            showPhone,
            showWhatsapp,
          },
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || "Failed to update profile");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

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
        month: "short",
        year: "numeric",
      })
    : "Recent";

  return (
    <div className="space-y-6">
      {/* Profile Overview Card */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-forest-green/20 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-light-green text-forest-green font-bold text-2xl flex items-center justify-center shrink-0">
                {user.name?.charAt(0) || "U"}
              </div>
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-dark-text tracking-tight">{user.name}</h2>
                <Badge
                  variant={user.role === "ADMIN" ? "primary" : "neutral"}
                  size="sm"
                  className="uppercase text-[10px]"
                >
                  {user.role}
                </Badge>
              </div>
              <span className="text-xs text-muted-text mt-0.5">{user.email}</span>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-text">
                <Calendar className="w-3.5 h-3.5" />
                <span>Member since {memberSince}</span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            isLoading={isSigningOut}
            leftIcon={<LogOut className="w-4 h-4 text-red-600" />}
            className="border-gray-200 text-dark-text hover:bg-gray-50 hover:text-red-600"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Editable Settings Form */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-8 shadow-xs">
        <div className="pb-4 mb-6 border-b border-border-subtle">
          <h3 className="text-base font-bold text-dark-text">Account Details & Contact Preferences</h3>
          <p className="text-xs text-muted-text mt-1">
            Configure how your details are displayed when you post property or service listings.
          </p>
        </div>

        {saveSuccess && (
          <div className="mb-6 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-800 font-medium">
              Profile details successfully updated and persisted to database.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-xs text-red-800 font-medium">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Display Name */}
            <FormField label="Full Name" required htmlFor="name">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                leftIcon={<UserIcon className="w-4 h-4" />}
                required
              />
            </FormField>

            {/* Google Email (Read-Only) */}
            <FormField
              label="Google Email Address"
              htmlFor="email"
              helperText="Managed by Google Identity. Email cannot be modified."
            >
              <Input
                id="email"
                value={user.email}
                disabled
                leftIcon={<Mail className="w-4 h-4" />}
                className="bg-gray-50 cursor-not-allowed text-muted-text"
              />
            </FormField>

            {/* Primary Phone */}
            <FormField
              label="Contact Phone Number"
              optional
              htmlFor="phone"
              helperText="Used when buyers, tenants, or customers tap 'Call Owner/Pro'."
            >
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                leftIcon={<Phone className="w-4 h-4" />}
              />
            </FormField>

            {/* WhatsApp Number */}
            <FormField
              label="WhatsApp Number"
              optional
              htmlFor="whatsapp"
              helperText="Used to generate direct WhatsApp chat links with listing context."
            >
              <Input
                id="whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+91 98765 43210"
                leftIcon={<MessageSquare className="w-4 h-4" />}
              />
            </FormField>
          </div>

          {/* Contact Visibility Toggles */}
          <div className="pt-4 border-t border-border-subtle/80 space-y-3">
            <h4 className="text-xs font-bold text-dark-text uppercase tracking-wider">
              Default Listing Privacy Controls
            </h4>

            <div className="space-y-2.5">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border-subtle bg-off-white/50 hover:bg-off-white transition-colors">
                <input
                  type="checkbox"
                  checked={showPhone}
                  onChange={(e) => setShowPhone(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-forest-green focus:ring-forest-green"
                />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-dark-text">
                    Display Phone Number on Listings
                  </span>
                  <span className="text-[11px] text-muted-text">
                    Enables the &quot;Call&quot; button on your property and service advertisements
                    (protected by scraping rate-limits).
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border-subtle bg-off-white/50 hover:bg-off-white transition-colors">
                <input
                  type="checkbox"
                  checked={showWhatsapp}
                  onChange={(e) => setShowWhatsapp(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-forest-green focus:ring-forest-green"
                />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-dark-text">
                    Allow Direct WhatsApp Enquiries
                  </span>
                  <span className="text-[11px] text-muted-text">
                    Enables visitors to message you on WhatsApp with pre-filled listing information.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
