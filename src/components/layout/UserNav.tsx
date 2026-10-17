"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  User as UserIcon,
  LayoutDashboard,
  Building2,
  ShieldCheck,
  LogOut,
  LogIn,
  ChevronDown,
} from "lucide-react";

export function UserNav() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse shrink-0" />;
  }

  if (!session?.user) {
    return (
      <Link href="/auth/signin">
        <Button variant="primary" size="sm" leftIcon={<LogIn className="w-4 h-4" />}>
          Sign In
        </Button>
      </Link>
    );
  }

  const { user } = session;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "U";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-forest-green"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name || "User"}
            className="w-8 h-8 rounded-full object-cover border border-forest-green/20 shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-light-green text-forest-green font-bold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
        )}
        <span className="hidden lg:block text-xs font-semibold text-dark-text max-w-[120px] truncate">
          {user.name}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-text" />
      </button>

      {/* Dropdown Menu Surface */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border-subtle bg-white py-2 shadow-lg z-50 text-left">
          {/* User Info Header */}
          <div className="px-4 py-2.5 border-b border-border-subtle">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-dark-text truncate">{user.name}</span>
              <Badge
                variant={user.role === "ADMIN" ? "primary" : "neutral"}
                size="sm"
                className="text-[9px] uppercase px-1.5 py-0"
              >
                {user.role}
              </Badge>
            </div>
            <span className="text-[11px] text-muted-text truncate block mt-0.5">{user.email}</span>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href="/account/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-dark-text hover:bg-light-green/30 transition-colors"
            >
              <UserIcon className="w-4 h-4 text-forest-green" />
              <span>Profile & Settings</span>
            </Link>

            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-dark-text hover:bg-light-green/30 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-forest-green" />
              <span>Activity Hub</span>
            </Link>

            <Link
              href="/dashboard/properties"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-dark-text hover:bg-light-green/30 transition-colors"
            >
              <Building2 className="w-4 h-4 text-forest-green" />
              <span>My Properties</span>
            </Link>

            {/* Admin Portal Link (Only rendered for authorized ADMIN role) */}
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-dark-text hover:bg-purple-50 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span>Admin Moderation</span>
              </Link>
            )}
          </div>

          {/* Sign Out */}
          <div className="border-t border-border-subtle pt-1 mt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
