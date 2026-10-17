import React from "react";
import Link from "next/link";
import { Building2, Wrench, ShieldCheck, PhoneCall } from "lucide-react";

export function Footer() {
  const cityName = process.env.NEXT_PUBLIC_LAUNCH_CITY_NAME || "Launch City";

  return (
    <footer className="border-t border-border-subtle bg-white text-dark-text mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-forest-green flex items-center justify-center text-white font-bold text-sm">
                M
              </div>
              <span className="font-bold text-dark-text tracking-tight text-base">Marketplace</span>
            </div>
            <p className="text-xs text-muted-text leading-relaxed">
              A unified public marketplace for verified living spaces and trusted local service
              professionals in {cityName}.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-forest-green font-medium bg-light-green/60 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero Brokerage Fees</span>
              </span>
            </div>
          </div>

          {/* Properties Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-dark-text">
              <Building2 className="w-4 h-4 text-forest-green" />
              <span>Properties</span>
            </div>
            <ul className="space-y-2 text-xs text-muted-text">
              <li>
                <Link href="/#properties" className="hover:text-forest-green transition-colors">
                  Apartments for Rent
                </Link>
              </li>
              <li>
                <Link href="/#properties" className="hover:text-forest-green transition-colors">
                  Properties for Sale
                </Link>
              </li>
              <li>
                <Link href="/#properties" className="hover:text-forest-green transition-colors">
                  PG & Co-Living Spaces
                </Link>
              </li>
              <li>
                <Link href="/#properties" className="hover:text-forest-green transition-colors">
                  Commercial Properties
                </Link>
              </li>
            </ul>
          </div>

          {/* Services Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-dark-text">
              <Wrench className="w-4 h-4 text-purple-700" />
              <span>Local Services</span>
            </div>
            <ul className="space-y-2 text-xs text-muted-text">
              <li>
                <Link href="/#services" className="hover:text-forest-green transition-colors">
                  Plumbing Specialists
                </Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-forest-green transition-colors">
                  Electrical & Wiring
                </Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-forest-green transition-colors">
                  Carpentry & Woodwork
                </Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-forest-green transition-colors">
                  Deep Cleaning & Painting
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Contact Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-dark-text">
              <PhoneCall className="w-4 h-4 text-forest-green" />
              <span>Direct Contact</span>
            </div>
            <p className="text-xs text-muted-text leading-relaxed">
              Connect directly with owners and trade pros via phone or WhatsApp. No middlemen, no
              in-app messaging delays.
            </p>
            <div className="pt-1 text-xs text-muted-text">
              <span>Platform: Next.js App Router</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-text">
          <p>© 2026 Marketplace. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Contact Support</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
