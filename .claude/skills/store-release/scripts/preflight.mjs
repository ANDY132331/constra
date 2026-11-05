// Store release preflight. Run from the repo root: node .claude/skills/store-release/scripts/preflight.mjs
// Read-only. Checks what Apple's upload, App Review and Google Play reject on most often, using
// the repo, the App Store kit on the Desktop (if it's on this machine) and the live site.
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const results = [];
const check = (group, name, ok, detail = "") => results.push({ group, name, ok, detail });
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const png = (p) => {
  const b = fs.readFileSync(p);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: b[25] === 4 || b[25] === 6 };
};

// ── iOS project ──────────────────────────────────────────────────────────────
const icon = png("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
check("iOS", "App icon is 1024x1024", icon.w === 1024 && icon.h === 1024, `${icon.w}x${icon.h}`);
check("iOS", "App icon has no alpha channel (ITMS-90717)", !icon.alpha);

const plist = read("ios/App/App/Info.plist") ?? "";
for (const key of ["NSLocationWhenInUseUsageDescription", "NSCameraUsageDescription", "NSMicrophoneUsageDescription", "NSSpeechRecognitionUsageDescription", "NSPhotoLibraryUsageDescription", "ITSAppUsesNonExemptEncryption", "WKAppBoundDomains"]) {
  check("iOS", `Info.plist declares ${key}`, plist.includes(`<key>${key}</key>`));
}
const pbx = read("ios/App/App.xcodeproj/project.pbxproj") ?? "";
check("iOS", "Privacy manifest is in the Xcode project", pbx.includes("PrivacyInfo.xcprivacy") && fs.existsSync("ios/App/App/PrivacyInfo.xcprivacy"));
check("iOS", "iPhone only (no iPad screenshots needed)", /TARGETED_DEVICE_FAMILY = 1;/.test(pbx) && !/TARGETED_DEVICE_FAMILY = "?1,2"?;/.test(pbx));
check("iOS", "Bundle id is com.getconstra.app", pbx.includes("PRODUCT_BUNDLE_IDENTIFIER = com.getconstra.app;"));

const pkg = JSON.parse(read("package.json"));
const spm = read("ios/App/CapApp-SPM/Package.swift") ?? "";
const plugins = Object.keys(pkg.dependencies).filter((d) => d.startsWith("@capacitor/") && d !== "@capacitor/core");
const missing = plugins.filter((d) => !spm.includes(`node_modules/${d}`));
check("iOS", "Every Capacitor plugin is in Package.swift", missing.length === 0, missing.length ? `run npx cap sync ios: ${missing.join(", ")}` : "");
const lock = read("package-lock.json") ?? "";
const unlocked = plugins.filter((d) => !lock.includes(`"node_modules/${d}"`));
check("iOS", "package-lock has every plugin (npm ci would fail)", unlocked.length === 0, unlocked.join(", "));

const cm = read("codemagic.yaml") ?? "";
check("iOS", 'Codemagic uses the "Constra ASC" integration', cm.includes("app_store_connect: Constra ASC"));

// ── App Store kit (only on the owner's machine) ──────────────────────────────
const kit = [path.join(os.homedir(), "OneDrive/Desktop/Constra App Store Kit"), path.join(os.homedir(), "Desktop/Constra App Store Kit")].find((p) => fs.existsSync(p));
if (kit) {
  const dir = path.join(kit, "screenshots-6.9in");
  const shots = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".png")) : [];
  check("Kit", "Has 3–10 screenshots", shots.length >= 3 && shots.length <= 10, `${shots.length} found`);
  const bad = shots.filter((f) => { const s = png(path.join(dir, f)); return s.w !== 1320 || s.h !== 2868 || s.alpha; });
  check("Kit", "Screenshots are 1320x2868 with no alpha", bad.length === 0, bad.join(", "));
  const notes = read(path.join(kit, "3 - App Review notes.txt")) ?? "";
  check("Kit", "Review notes have no real password saved", /Password:\s+\[FILL IN\]/.test(notes), "the login belongs only in App Store Connect");
} else {
  check("Kit", "App Store kit folder found", false, "not on this machine; skipped screenshot checks");
}

// ── Android ──────────────────────────────────────────────────────────────────
const twa = JSON.parse(read("play-store-assets/twa-manifest.json"));
check("Android", "TWA package is com.getconstra.app", twa.packageId === "com.getconstra.app", twa.packageId);
check("Android", "TWA host is the apex domain (www only redirects)", twa.host === "getconstra.com", twa.host);
const links = JSON.parse(read("public/.well-known/assetlinks.json"));
check("Android", "assetlinks.json names the same package", links[0]?.target?.package_name === twa.packageId);
const readme = read("play-store-assets/README.md") ?? "";
const title = /Title \(30 max\): \*\*(.+?)\*\*/.exec(readme)?.[1] ?? "";
check("Android", "Play title fits 30 characters", title.length > 0 && title.length <= 30, `"${title}" (${title.length})`);
check("Android", "Listing doesn't claim it's free with no subscription", !/No subscription required/i.test(readme));

// ── Code rules ───────────────────────────────────────────────────────────────
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.tsx?$/.test(e.name)) yield p;
  }
}
const source = [...walk("app"), ...walk("components"), ...walk("lib")].map((p) => [p.replace(/\\/g, "/"), read(p)]);
const hits = (re, allow = []) => source.filter(([p, s]) => re.test(s) && !allow.some((a) => p.includes(a))).map(([p]) => p);

// A print pop-up is fine for browsers as long as the same file hands the iOS app a saveFile() instead
const rawDownloads = hits(/<a\b[^>]*\bdownload\b|\bdoc\.save\(|window\.open\(\s*["']{2}/, ["lib/native.ts"])
  .filter((p) => { const s = source.find(([q]) => q === p)[1]; return !(/isNativeApp\(\)/.test(s) && /saveFile\(/.test(s) && !/<a\b[^>]*\bdownload\b|\bdoc\.save\(/.test(s)); });
check("Code", "No raw downloads (WKWebView can't save them; use saveFile)", rawDownloads.length === 0, rawDownloads.join(", "));
const rawGps = hits(/navigator\.geolocation\.(get|watch)/, ["lib/native.ts"]);
check("Code", "GPS goes through lib/native.ts", rawGps.length === 0, rawGps.join(", "));
// Marketing, terms, the web-only half of the assistant and the web branch of the upgrade gate (its
// store-app branch is checked just below) may name prices
const prices = hits(/\$\s?29\b|\$\s?\d+[^"'`\n]{0,12}\/\s?mo(nth)?\b/, ["app/page.tsx", "app/api/chat/route.ts", "components/landing/", "config/plans", "app/terms/", "components/upgrade-gate.tsx"]);
check("Code", "No subscription price in in-app screens", prices.length === 0, prices.join(", "));
const gate = read("components/upgrade-gate.tsx") ?? "";
check("Code", "Upgrade gate uses isStoreApp (covers Android too)", gate.includes("isStoreApp()"));
const signIns = hits(/signInWithOAuth/);
check("Code", "No social login (else Sign in with Apple is required, 4.8)", signIns.length === 0, signIns.join(", "));

// ── Dependencies ─────────────────────────────────────────────────────────────
// npm audit exits non-zero when it finds anything, so read its output from the error too.
// Production only: warnings in dev tools never reach users. Remote code execution bugs in Next.js
// sat unnoticed here for months, on a site using the affected features.
let audit;
try { audit = execSync("npm audit --omit=dev --json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
catch (e) { audit = e.stdout; }
try {
  const n = JSON.parse(audit).metadata.vulnerabilities;
  check("Dependencies", "No critical or high warnings in shipped packages", !n.critical && !n.high, `${n.critical} critical, ${n.high} high: read them, then npm audit fix`);
} catch { check("Dependencies", "npm audit could run", false, "no answer from the registry"); }

// ── Live site ────────────────────────────────────────────────────────────────
const SITE = "https://getconstra.com";
const status = async (p, headers = {}) => {
  try {
    const r = await fetch(SITE + p, { redirect: "manual", headers });
    return { code: r.status, to: r.headers.get("location") ?? "" };
  } catch (e) { return { code: 0, to: String(e.message) }; }
};
for (const p of ["/privacy", "/support", "/terms", "/delete-account", "/.well-known/assetlinks.json"]) {
  const r = await status(p);
  check("Live", `${p} loads`, r.code === 200, String(r.code));
}
for (const [who, headers] of [["iOS app", { "user-agent": "Mozilla/5.0 ConstraApp-iOS" }], ["Android app", { cookie: "constra_app=android" }]]) {
  const r = await status("/", headers);
  check("Live", `${who} skips the pricing page`, r.code >= 300 && r.code < 400 && r.to.includes("/dashboard"), `${r.code} ${r.to}`);
}
const web = await status("/");
check("Live", "Normal browsers still get the homepage", web.code === 200, String(web.code));

// ── Report ───────────────────────────────────────────────────────────────────
let failed = 0;
for (const group of [...new Set(results.map((r) => r.group))]) {
  console.log(`\n${group}`);
  for (const r of results.filter((x) => x.group === group)) {
    if (!r.ok) failed++;
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail && !r.ok ? `  -> ${r.detail}` : ""}`);
  }
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;
