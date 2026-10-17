"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { UserNav } from "@/components/layout/UserNav";
import {
  Building2,
  Wrench,
  PlusCircle,
  LogIn,
  MapPin,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const cityName = process.env.NEXT_PUBLIC_LAUNCH_CITY_NAME || "Launch City";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-white/95 backdrop-blur-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & City Badge */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-forest-green flex items-center justify-center text-white font-bold text-lg shadow-xs group-hover:bg-forest-green-hover transition-colors">
                M
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-dark-text tracking-tight text-base leading-none">
                  Marketplace
                </span>
                <span className="text-[10px] text-muted-text font-medium tracking-wider uppercase mt-0.5">
                  Properties & Services
                </span>
              </div>
            </Link>

            <div className="hidden sm:flex items-center ml-2 pl-3 border-l border-border-subtle">
              <Badge variant="neutral" size="sm" className="gap-1 font-normal text-muted-text">
                <MapPin className="w-3 h-3 text-forest-green shrink-0" />
                <span>{cityName}</span>
              </Badge>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/properties"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-dark-text hover:text-forest-green hover:bg-light-green/30 rounded-md transition-colors"
            >
              <Building2 className="w-4 h-4 text-forest-green" />
              <span>Properties</span>
            </Link>
            <Link
              href="/services"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-dark-text hover:text-forest-green hover:bg-light-green/30 rounded-md transition-colors"
            >
              <Wrench className="w-4 h-4 text-purple-700" />
              <span>Local Services</span>
            </Link>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/dashboard/properties/new">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<PlusCircle className="w-4 h-4" />}
              >
                Post Listing
              </Button>
            </Link>
            {/* Dynamic User Navigation Dropdown / Sign-In Button */}
            <UserNav />
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-muted-text hover:text-dark-text hover:bg-gray-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-border-subtle bg-white px-4 pt-3 pb-6 flex flex-col gap-3 shadow-lg">
          <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
            <MapPin className="w-3.5 h-3.5 text-forest-green" />
            <span className="text-xs text-muted-text">Active Market:</span>
            <span className="text-xs font-semibold text-dark-text">{cityName}</span>
          </div>
          <Link
            href="/properties"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-dark-text hover:bg-light-green/30 rounded-md"
          >
            <Building2 className="w-4 h-4 text-forest-green" />
            <span>Browse Properties</span>
          </Link>
          <Link
            href="/services"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-dark-text hover:bg-light-purple/30 rounded-md"
          >
            <Wrench className="w-4 h-4 text-purple-700" />
            <span>Discover Services</span>
          </Link>

          <div className="flex flex-col gap-2 pt-2 border-t border-border-subtle mt-1">
            <Link
              href="/dashboard/properties/new"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full"
            >
              <Button
                variant="outline"
                size="md"
                className="w-full justify-center"
                leftIcon={<PlusCircle className="w-4 h-4" />}
              >
                Post a Listing
              </Button>
            </Link>

            {session?.user ? (
              <>
                <Link
                  href="/account/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-dark-text hover:bg-light-green/30 rounded-md"
                >
                  <UserIcon className="w-4 h-4 text-forest-green" />
                  <span>Profile & Settings ({session.user.name})</span>
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-dark-text hover:bg-light-green/30 rounded-md"
                >
                  <LayoutDashboard className="w-4 h-4 text-forest-green" />
                  <span>My Activity</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                    leftIcon={<LogIn className="w-4 h-4" />}
                  >
                    Sign In with Google
                  </Button>
                </Link>
                <Link href="/create-account" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full justify-center"
                  >
                    Create Account
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
