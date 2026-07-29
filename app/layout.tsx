import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import PwaInstall from "@/components/pwa-install";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Constra — Field Workforce Management for Construction & Trades",
  description: "Run your entire job site from one app. Time tracking, crew scheduling, invoicing, punch lists, safety logs, and more — built for construction and trade contractors.",
  keywords: ["construction management", "workforce management", "time tracking", "crew scheduling", "invoicing", "punch list", "construction app", "trade contractor software"],
  authors: [{ name: "Constra" }],
  openGraph: {
    title: "Constra — Field Workforce Management",
    description: "Run your entire job site from one app. Built for construction, civil, HVAC, electrical and every trade.",
    type: "website",
    locale: "en_CA",
    siteName: "Constra",
  },
  twitter: {
    card: "summary_large_image",
    title: "Constra — Field Workforce Management",
    description: "Time tracking, invoicing, punch lists, crew scheduling — all in one construction app.",
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Constra" },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="h-full bg-[#0a0a0a] text-foreground overflow-hidden">
        <StoreProvider>{children}</StoreProvider>
        <PwaInstall />
      </body>
    </html>
  );
}
