"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Badge } from "@/components/ui/Badge";
import {
  ShieldCheck,
  LayoutDashboard,
  Building2,
  Wrench,
  Flag,
  Users,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";

interface AdminShellProps {
  adminUser: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  children: React.ReactNode;
}

export function AdminShell({ adminUser, children }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    {
      label: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      label: "Property Moderation",
      href: "/admin/properties",
      icon: Building2,
      active: pathname.startsWith("/admin/properties"),
    },
    {
      label: "Service Moderation",
      href: "/admin/services",
      icon: Wrench,
      active: pathname.startsWith("/admin/services"),
    },
    {
      label: "Listing Reports",
      href: "/admin/reports",
      icon: Flag,
      active: pathname.startsWith("/admin/reports"),
    },
    {
      label: "User Accounts",
      href: "/admin/users",
      icon: Users,
      active: pathname.startsWith("/admin/users"),
    },
  ];

  return (
    <div className="min-h-screen bg-off-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-border-subtle shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand / Admin Identity */}
            <div className="flex items-center gap-3">
              <Link href="/admin" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-forest-green text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-dark-text text-sm sm:text-base tracking-tight">
                      Admin Console
                    </span>
                    <Badge variant="primary" size="sm" className="bg-purple-100 text-purple-900 border-purple-200 text-[10px]">
                      STAFF
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-text block leading-none">
                    Marketplace Moderation & Governance
                  </span>
                </div>
              </Link>
            </div>

            {/* Right: Quick Links & Admin Profile */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-text hover:text-forest-green transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-border-subtle"
              >
                <span>Live Marketplace</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <div className="h-5 w-px bg-border-subtle" />

              <div className="flex items-center gap-2.5 text-xs text-right">
                <div>
                  <div className="font-semibold text-dark-text truncate max-w-[140px]">
                    {adminUser.name || "Administrator"}
                  </div>
                  <div className="text-[11px] text-muted-text truncate max-w-[140px]">
                    {adminUser.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/admin/login" })}
                  title="Sign out of Admin Console"
                  className="p-2 rounded-lg text-muted-text hover:text-red-700 hover:bg-red-50 border border-border-subtle transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-muted-text hover:bg-gray-100 transition-colors"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Horizontal Subnav */}
        <div className="hidden md:block bg-gray-50/70 border-t border-border-subtle/60 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1 py-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    item.active
                      ? "bg-white text-forest-green shadow-xs border border-border-subtle"
                      : "text-muted-text hover:text-dark-text hover:bg-gray-100/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${item.active ? "text-forest-green" : "text-muted-text"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border-subtle bg-white px-4 py-3 space-y-1 animate-in slide-in-from-top-1">
            <div className="p-2.5 rounded-lg bg-gray-50 border border-border-subtle mb-2 text-xs">
              <div className="font-semibold text-dark-text">{adminUser.name || "Administrator"}</div>
              <div className="text-muted-text text-[11px] truncate">{adminUser.email}</div>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    item.active
                      ? "bg-forest-green text-white font-semibold"
                      : "text-dark-text hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
              <Link
                href="/"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-muted-text hover:text-forest-green py-1.5"
              >
                <span>Marketplace</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
                className="inline-flex items-center gap-1.5 text-red-600 font-medium py-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Admin Footer */}
      <footer className="border-t border-border-subtle bg-white py-4 text-center text-xs text-muted-text">
        <div className="max-w-7xl mx-auto px-4">
          <p>Marketplace Administrative Console • Staff Governance Portal</p>
        </div>
      </footer>
    </div>
  );
}
