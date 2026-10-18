"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Badge } from "@/components/ui/Badge";
import {
  LayoutDashboard,
  Building2,
  Wrench,
  PlusCircle,
  CalendarCheck,
  Inbox,
  User as UserIcon,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

export interface DashboardShellProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isCreateAction?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      console.error("[SIGN_OUT_ERROR]", err);
      setIsSigningOut(false);
    }
  };

  const navSections: NavSection[] = [
    {
      title: "Overview",
      items: [
        {
          name: "Dashboard Home",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "My Listings",
      items: [
        {
          name: "My Properties",
          href: "/dashboard/properties",
          icon: Building2,
        },
        {
          name: "My Services",
          href: "/dashboard/services",
          icon: Wrench,
        },
        {
          name: "Create Property",
          href: "/dashboard/properties/new",
          icon: PlusCircle,
          isCreateAction: true,
        },
        {
          name: "Create Service",
          href: "/dashboard/services/new",
          icon: PlusCircle,
          isCreateAction: true,
        },
      ],
    },
    {
      title: "Bookings",
      items: [
        {
          name: "My Booking Requests",
          href: "/dashboard/my-bookings",
          icon: CalendarCheck,
        },
        {
          name: "Incoming Requests",
          href: "/dashboard/bookings",
          icon: Inbox,
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          name: "My Profile",
          href: "/account/profile",
          icon: UserIcon,
        },
        {
          name: "Account Settings",
          href: "/account/settings",
          icon: Settings,
        },
      ],
    },
  ];

  // Helper to determine whether an item is currently active
  const isItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (href === "/dashboard/properties/new") {
      return pathname === "/dashboard/properties/new";
    }
    if (href === "/dashboard/services/new") {
      return pathname === "/dashboard/services/new";
    }
    if (href === "/dashboard/properties") {
      return (
        pathname === "/dashboard/properties" ||
        (pathname.startsWith("/dashboard/properties/") &&
          pathname !== "/dashboard/properties/new")
      );
    }
    if (href === "/dashboard/services") {
      return (
        pathname === "/dashboard/services" ||
        (pathname.startsWith("/dashboard/services/") &&
          pathname !== "/dashboard/services/new")
      );
    }
    if (href === "/dashboard/my-bookings") {
      return pathname.startsWith("/dashboard/my-bookings");
    }
    if (href === "/dashboard/bookings") {
      return (
        pathname === "/dashboard/bookings" ||
        (pathname.startsWith("/dashboard/bookings/") &&
          !pathname.startsWith("/dashboard/my-bookings"))
      );
    }
    if (href === "/account/profile") {
      return pathname === "/account/profile";
    }
    if (href === "/account/settings") {
      return pathname === "/account/settings";
    }
    return pathname.startsWith(href);
  };

  const getActivePageName = () => {
    for (const section of navSections) {
      for (const item of section.items) {
        if (isItemActive(item.href)) {
          return item.name;
        }
      }
    }
    return "Dashboard";
  };

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "U";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Mobile Top Navigation Bar (< lg screens) */}
      <div className="lg:hidden mb-6 bg-white rounded-2xl border border-border-subtle p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-9 h-9 rounded-full object-cover border border-forest-green/20 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-light-green text-forest-green font-bold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs font-bold text-dark-text truncate max-w-[150px]">
                {user.name}
              </span>
              <span className="text-[11px] text-muted-text flex items-center gap-1 font-medium">
                {getActivePageName()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl border border-border-subtle text-dark-text hover:bg-light-green/30 transition-colors focus:outline-none focus:ring-2 focus:ring-forest-green"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-dark-text" /> : <Menu className="w-5 h-5 text-dark-text" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        {mobileMenuOpen && (
          <div className="mt-4 pt-4 border-t border-border-subtle space-y-5 animate-in fade-in duration-150">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-text px-2">
                  {section.title}
                </span>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = isItemActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          active
                            ? "bg-light-green text-forest-green font-semibold shadow-xs"
                            : "text-dark-text hover:bg-off-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              active
                                ? "text-forest-green"
                                : item.isCreateAction
                                ? "text-forest-green/80"
                                : "text-muted-text"
                            }`}
                          />
                          <span>{item.name}</span>
                        </div>
                        {active && <ChevronRight className="w-3.5 h-3.5 text-forest-green" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main 2-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        {/* Desktop Sidebar (visible on lg screens) */}
        <aside
          className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-24"
          aria-label="Dashboard Sidebar Navigation"
        >
          <div className="bg-white rounded-2xl border border-border-subtle p-5 shadow-xs space-y-6">
            {/* User Profile Mini Banner */}
            <div className="flex items-center gap-3.5 pb-5 border-b border-border-subtle">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="w-12 h-12 rounded-full object-cover border-2 border-forest-green/20 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-light-green text-forest-green font-bold text-sm flex items-center justify-center shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-dark-text truncate">
                    {user.name}
                  </span>
                  <Badge
                    variant={user.role === "ADMIN" ? "primary" : "neutral"}
                    size="sm"
                    className="text-[9px] uppercase px-1 py-0 shrink-0"
                  >
                    {user.role || "USER"}
                  </Badge>
                </div>
                <span className="text-[11px] text-muted-text truncate">
                  {user.email}
                </span>
              </div>
            </div>

            {/* Navigation Groups */}
            <nav className="space-y-5" aria-label="Dashboard sections">
              {navSections.map((section) => (
                <div key={section.title} className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-text px-2.5">
                    {section.title}
                  </div>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = isItemActive(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            active
                              ? "bg-light-green text-forest-green font-semibold border-l-2 border-forest-green shadow-xs"
                              : "text-dark-text hover:bg-off-white hover:text-forest-green"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={`w-4 h-4 shrink-0 transition-colors ${
                                active
                                  ? "text-forest-green"
                                  : item.isCreateAction
                                  ? "text-forest-green/80 group-hover:text-forest-green"
                                  : "text-muted-text group-hover:text-dark-text"
                              }`}
                            />
                            <span className="truncate">{item.name}</span>
                          </div>
                          {active && (
                            <ChevronRight className="w-3.5 h-3.5 text-forest-green shrink-0" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Sign Out Action Button */}
            <div className="pt-4 border-t border-border-subtle">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Content Column */}
        <main className="flex-1 min-w-0 w-full" id="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}
