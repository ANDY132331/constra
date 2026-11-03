# Constra — Play Store Visual Assets

**Live URL:** https://getconstra.com  
**Package ID:** com.getconstra.app (never change it — it is the app's identity on Google Play)

All HTML files here are **pixel-accurate mockups** of the real app UI.
Open each in Chrome, screenshot it, and upload to Google Play Console.

---

## Files

| File | Type | Required size | Screen |
|------|------|---------------|--------|
| `constra-feature-graphic.html` | Feature Graphic | 1024 × 500 px | Landing banner |
| `phone1-dashboard.html` | Phone screenshot | 1080 × 1920 px (9:16) | Admin Dashboard |
| `phone2-clockin.html` | Phone screenshot | 1080 × 1920 px (9:16) | Worker Clock-In |
| `phone3-messages.html` | Phone screenshot | 1080 × 1920 px (9:16) | Crew Chat |
| `phone4-invoices.html` | Phone screenshot | 1080 × 1920 px (9:16) | Invoices |
| `phone5-projects.html` | Phone screenshot | 1080 × 1920 px (9:16) | Projects List |
| `phone6-clockedin.html` | Phone screenshot | 1080 × 1920 px (9:16) | Worker Clocked In (live timer) |
| `phone7-reports.html` | Phone screenshot | 1080 × 1920 px (9:16) | Reports & Analytics |
| `phone8-crew.html` | Phone screenshot | 1080 × 1920 px (9:16) | Crew Management |
| `tablet7-landscape.html` | 7" Tablet screenshot | 960 × 600 px (16:9) | Dashboard |
| `tablet7-projects.html` | 7" Tablet screenshot | 960 × 600 px (16:9) | Projects split view |
| `tablet10-landscape.html` | 10" Tablet screenshot | 1280 × 800 px (16:9) | Invoices split-panel |
| `tablet10-reports.html` | 10" Tablet screenshot | 1280 × 800 px (16:9) | Reports & Analytics |
| `twa-manifest.json` | TWA config | — | For PWABuilder / bubblewrap |

---

## How to capture screenshots

### Phone screenshots (must be ≥1080 × 1920)
1. Open the `.html` file in **Chrome**
2. Open DevTools → `Ctrl+Shift+M` (Device toolbar)
3. Set viewport: **Width 390, Height 844**
4. Set **DPR (Device Pixel Ratio) = 3** → gives 1170 × 2532 px ✓
5. Three-dot menu → **Capture screenshot** → saves a PNG

### Feature graphic (must be 1024 × 500)
1. Open `constra-feature-graphic.html` in Chrome
2. DevTools → viewport **1024 × 500**, DPR = 2
3. Capture screenshot → 2048 × 1000 (Play Console accepts this)

### Tablet screenshots
| File | Viewport | DPR | Output |
|------|----------|-----|--------|
| 7" tablet | 960 × 600 | 2 | 1920 × 1200 |
| 10" tablet | 1280 × 800 | 2 | 2560 × 1600 |

---

## How to build and submit the Android app

### Step 1 — Build the AAB with PWABuilder, signed with the EXISTING key

1. Go to **https://pwabuilder.com** and enter `https://getconstra.com` → **Start**.
   No `www.` — www only redirects, and Android verifies the exact domain it is given.
2. **Package for stores** → **Android** → **Options**:
   - Package ID: `com.getconstra.app`
   - App name / launcher name: `Constra`
   - Start URL: `/dashboard`
   - Theme and background colour: `#0a0a0a`
   - App version code: one higher than the last upload (Play rejects a repeat)
   - **Signing key: "Use mine"** → upload `Desktop\Constra-Signing-Key\signing.keystore`,
     alias `my-key-alias`, passwords from that folder's README.
     **Never pick "Create new"** — a new key can't update the existing Play app.
3. **Generate** → download the ZIP → upload `app-release-bundle.aab` to Play Console.

### Step 2 — assetlinks.json (already live; only touch it if Android shows a browser bar)

`public/.well-known/assetlinks.json` must contain the SHA-256 of the key **Google** signs the
app with: Play Console → the app → **Test and release → App integrity → App signing** →
"App signing key certificate" → SHA-256. If it differs from the one in the file, add it to the
`sha256_cert_fingerprints` array (keep the existing entry), push, and check
https://getconstra.com/.well-known/assetlinks.json shows it.

### Step 3 — Submit to Play Console

1. Go to **https://play.google.com/console**
2. Open the **Constra** app (create it only once, ever — every later build updates the same app) → the closed testing track until 12 testers have been opted in for 14 days, then Production
3. Fill in listing details:
   - Title (30 max): **Constra: Crew & Job Manager**
   - Short description: **GPS clock-in, crew scheduling & invoicing for construction teams**
   - Long description: (see below)
   - Package name: `com.getconstra.app`
4. Upload **Feature Graphic** (from `constra-feature-graphic.html` screenshot)
5. Upload **Phone screenshots** (all 8: `phone1-` through `phone8-`)
6. Upload **7" Tablet screenshots** (`tablet7-landscape.html`, `tablet7-projects.html`)
7. Upload **10" Tablet screenshots** (`tablet10-landscape.html`, `tablet10-reports.html`)
8. Upload **App bundle**: `app-release-bundle.aab`
9. Submit for review

---

## Play Store listing copy

**Short description (80 chars):**
GPS clock-in, crew scheduling & invoicing for construction teams

**Long description:**
Constra is the all-in-one field management app built for construction crews. Track who's on site in real time with GPS-verified clock-in, assign jobs and schedules, communicate via crew chat, and send professional invoices — all from your phone.

**Key features:**
• GPS clock-in with photo proof
• Real-time crew tracking dashboard
• Job scheduling and project management
• Professional invoices with PDF export
• Team chat for every project
• Daily reports and analytics
• Crew management with role-based access
• Keeps working when the signal drops — clock-ins sync when you're back online

Constra needs a company account. Your company admin can invite you, or you can create one at getconstra.com.

**Tags:**
construction management, crew scheduling, time tracking, invoicing, field service
