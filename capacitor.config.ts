import type { CapacitorConfig } from "@capacitor/cli";

// The iOS app is a native shell around the live site, so a deploy to getconstra.com updates
// the app without an App Store resubmission. Native plugins (location, status bar, app
// lifecycle) are bridged into those pages by Capacitor.
const config: CapacitorConfig = {
  appId: "com.getconstra.app", // same id as the Android app
  appName: "Constra",
  // Bundled fallback, shown only if the very first launch has no connection.
  webDir: "mobile-shell",
  server: {
    url: "https://getconstra.com/dashboard",
    // keep sign-in, invoices and pay links inside the app; everything else opens in Safari
    allowNavigation: ["getconstra.com", "www.getconstra.com"],
    errorPath: "offline.html",
  },
  // Lets the server tell the app apart from Safari (used to skip the marketing/pricing page,
  // which App Review treats as selling a subscription outside in-app purchase).
  appendUserAgent: "ConstraApp-iOS",
  backgroundColor: "#0a0a0a",
  ios: {
    // Service workers (offline cache + queued clock-ins) only run in WKWebView for
    // App-Bound Domains; the matching WKAppBoundDomains list is in ios/App/App/Info.plist.
    limitsNavigationsToAppBoundDomains: true,
    contentInset: "never",
    backgroundColor: "#0a0a0a",
  },
  plugins: {
    StatusBar: { style: "DARK", overlaysWebView: true },
  },
};

export default config;
