# Constra — Play Store Visual Assets

**Live URL:** https://www.getconstra.com  
**Package ID:** com.constra.app

All HTML files here are **pixel-accurate mockups** of the real app UI.
Open each in Chrome, screenshot it, and upload to Google Play Console.

---

## Files

| File | Type | Required size | Screen |
|------|------|---------------|--------|
| `constra-feature-graphic.html` | Feature Graphic | 1024 × 500 px | Landing banner |
| `phone1-dashboard.html` | Phone screenshot | 1080 × 1920 px (9:16) | Dashboard |
| `phone2-clockin.html` | Phone screenshot | 1080 × 1920 px (9:16) | Clock-In |
| `phone3-messages.html` | Phone screenshot | 1080 × 1920 px (9:16) | Crew Chat |
| `phone4-invoices.html` | Phone screenshot | 1080 × 1920 px (9:16) | Invoices |
| `tablet7-landscape.html` | 7" Tablet screenshot | 960 × 600 px (16:9) | Dashboard |
| `tablet10-landscape.html` | 10" Tablet screenshot | 1280 × 800 px (16:9) | Invoices split-panel |
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

### Step 1 — Generate the AAB with PWABuilder (no Java needed)

1. Go to **https://pwabuilder.com**
2. Enter `https://www.getconstra.com` → click **Start**
3. Click **Build My PWA** → choose **Android**
4. Settings to confirm:
   - Package ID: `com.constra.app`
   - App name: `Constra`
   - Start URL: `/dashboard`
   - Theme color: `#0a0a0a`
   - Background color: `#0a0a0a`
5. Click **Generate Package** → download the ZIP
6. Inside the ZIP you'll find:
   - `app-release-bundle.aab` ← upload this to Play Console
   - `signing-key-info.txt` ← contains the **SHA-256 fingerprint**

### Step 2 — Update assetlinks.json

After downloading the ZIP, open `signing-key-info.txt` and copy the SHA-256 fingerprint.

Then update this file: `public/.well-known/assetlinks.json`

Replace `PASTE_YOUR_SHA256_FINGERPRINT_HERE` with the real fingerprint.

```json
{
  "sha256_cert_fingerprints": [
    "AB:CD:12:34:..."  ← paste here
  ]
}
```

### Step 3 — Push to GitHub (auto-deploys to getconstra.com)

```bash
git add public/.well-known/assetlinks.json
git commit -m "fix: add real SHA-256 fingerprint for TWA"
git push
```

Wait ~1 minute for Vercel to deploy. Then verify the file is live:
`https://www.getconstra.com/.well-known/assetlinks.json`

### Step 4 — Submit to Play Console

1. Go to **https://play.google.com/console**
2. Create a new app → Production track
3. Fill in listing details:
   - Title: **Constra — Field Workforce Management**
   - Short description: **GPS clock-in, crew scheduling & invoicing for construction teams**
   - Long description: (see below)
   - Package name: `com.constra.app`
4. Upload **Feature Graphic** (from `constra-feature-graphic.html` screenshot)
5. Upload **Phone screenshots** (all 4 from `phone1-` through `phone4-`)
6. Upload **7" Tablet screenshots** (from `tablet7-landscape.html`)
7. Upload **10" Tablet screenshots** (from `tablet10-landscape.html`)
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
• Daily reports and punch-list tracking
• Change order management
• Works offline (PWA)

Free to use. No subscription required.

**Tags:**
construction management, crew scheduling, time tracking, invoicing, field service
