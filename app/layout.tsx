import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Barlow_Condensed, IBM_Plex_Sans, IBM_Plex_Mono, Archivo } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { StoreProvider } from "@/lib/store";
import PwaInstall from "@/components/pwa-install";
import ErrorReporter from "@/components/error-reporter";
import { ThemeApplier } from "@/components/theme-applier";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Only a fallback behind Plex, so it isn't fetched up front
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  // Small labels only; not worth delaying the first screen for
  preload: false,
});

// Big friendly headlines on the homepage
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getconstra.com"),
  title: "Constra: Crew Timesheets & GPS | Run the job, not the paperwork",
  description: "The free crew app for small contractors: GPS clock-in with a photo, timesheets and payroll export, invoices and daily reports. Works offline. Free while we launch.",
  keywords: ["crew timesheets", "GPS clock in", "contractor time tracking", "construction payroll", "crew scheduling", "construction app", "construction management", "invoicing", "punch list", "works offline"],
  authors: [{ name: "Constra" }],
  openGraph: {
    title: "Constra: Crew Timesheets & GPS | Run the job, not the paperwork",
    description: "The free crew app for small contractors: GPS clock-in with a photo, timesheets and payroll export, invoices and daily reports. Works offline. Free while we launch.",
    type: "website",
    url: "https://getconstra.com",
    locale: "en_CA",
    siteName: "Constra",
    images: [
      {
        url: "https://getconstra.com/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Constra — Run the job, not the paperwork",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Constra: Crew Timesheets & GPS | Run the job, not the paperwork",
    description: "The free crew app for small contractors: GPS clock-in with a photo, timesheets and payroll export, invoices and daily reports. Works offline. Free while we launch.",
    images: ["https://getconstra.com/opengraph-image"],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Constra" },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-to-zoom stays on (WCAG 1.4.4). Inputs are already forced to 16px on touch screens in
  // globals.css, so iOS no longer needs the zoom lock to stop it zooming when a field is focused
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E7E5E0" },
    { media: "(prefers-color-scheme: dark)", color: "#141516" },
  ],
  // Tells Android Chrome to resize the visual viewport when the keyboard opens
  // so form inputs scroll into view automatically.
  interactiveWidget: "resizes-visual",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${plexSans.variable} ${plexMono.variable} ${barlowCondensed.variable} ${archivo.variable} dark antialiased`}
      data-theme="light"
      style={{ height: "100dvh", overflow: "hidden" }}
      suppressHydrationWarning
    >
      <body className="bg-[#0a0a0a] text-foreground">
        {/* Apply saved theme before hydration to prevent a flash */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('constra_theme');if(!t){var s=JSON.parse(localStorage.getItem('constra_v1')||'null');t=(s&&s.theme)||'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}try{var z=localStorage.getItem('constra_text_size');if(z==='large'||z==='xl')document.documentElement.setAttribute('data-text-size',z);}catch(e){}})();`}
        </Script>
        <StoreProvider>
          {/* Keeps data-theme in sync with the store everywhere in the app */}
          <ThemeApplier />
          {children}
          <PwaInstall />
          <ErrorReporter />
          <Analytics />
          <Toaster richColors position="top-center" />
        </StoreProvider>
      </body>
    </html>
  );
}
