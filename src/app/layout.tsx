import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Marketplace — Verified Properties & Skilled Local Services",
  description:
    "Discover rental apartments, properties for sale, PG accommodations, and trusted local service professionals in your city with zero platform fees.",
  keywords: [
    "real estate",
    "apartments for rent",
    "properties for sale",
    "PG accommodation",
    "local services",
    "plumbers",
    "electricians",
    "home repair",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col bg-off-white text-dark-text antialiased font-sans">
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
