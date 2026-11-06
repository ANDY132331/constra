@AGENTS.md

# Constra — working notes for Claude

Construction crew & job management SaaS. Live at **getconstra.com** (never "constra.app"). Repo `ANDY132331/constra`, branch `master`; a push to master deploys to Vercel.

Stack: Next.js 16 (Turbopack, middleware lives in `proxy.ts`), React 19, Tailwind v4, Supabase (auth, Postgres with RLS, storage), Groq for AI, Stripe (test mode only), Resend email, Vercel crons (`vercel.json`). Android = PWABuilder TWA; iOS = Capacitor 8 shell in `ios/` built on Codemagic (`codemagic.yaml`).

## Commands

- Type check: `npx tsc --noEmit`
- Build: `set -o pipefail && npm run build 2>&1 | tail` — without pipefail, `tail` hides a failed exit code
- Lint one file: `npx eslint <path>`
- Dev server: use the Browser preview tool with `.claude/launch.json` (`construction-web`, or `constra-offline` to run without Supabase). Never start servers from Bash.
- Stop the dev server before `npm run build`. If tsc complains about `.next/dev/types/validator.ts`, run `rm -rf .next/dev`.
- Browser testing: see `.claude/skills/browser-testing/` (Playwright, `channel: "msedge"`, scripts in a `.tmp-*` folder).
- Before a store build: `node .claude/skills/store-release/scripts/preflight.mjs` (the `store-release` skill).
- Which migrations are live: `node .claude/skills/database-changes/scripts/status.mjs` (the `database-changes` skill).
- Crew flows end to end, with `constra-offline` running: `node .claude/skills/field-testing/scripts/field-run.mjs <port>` (the `field-testing` skill).
- Real offline sync against a mock database: `offline-sync.mjs` in the same skill. Run it after changing the offline queue, `bg()`, `public/sw.js` or uploads.

## Shipping

- The owner has approved pushing fixes straight to master once tsc **and** build pass. Ask first for anything that changes the database, infra, billing or env vars.
- Many files are CRLF. Edit tool handles it; if scripting replacements, normalise to LF to match, then restore CRLF.

## Map

- `lib/store.tsx` — the whole client data layer: loads every table for the company, optimistic updates, writes via `bg(...)` with an offline queue (`lib/offline-queue.ts`). Row mappers in `lib/supabase/db.ts` (`dbToX` / `xToDb`).
- `app/(dashboard)/*` — app screens; `app/(dashboard)/layout.tsx` has the route guard (`ALWAYS_ALLOWED`, `PAGE_MIN_LEVEL`).
- `lib/permissions.ts` — roles. DB `profiles.role` values: `Admin`, `Project Manager`, `Foreman`, `Worker`.
- `app/api/*` — server routes. Every route: `supabase.auth.getUser()` guard, then `rateLimit()` from `lib/rate-limit.ts`.
- `app/api/chat` — in-app support assistant (Groq, gets a per-user snapshot through the user's session). `app/api/ask-constra` — finance/ops Q&A over a client-sent company snapshot.
- `lib/native.ts` — Capacitor helpers: `isNativeApp()`, `getCurrentPosition()`, `saveFile()`, `setNativeStatusBar()`.
- DB migrations are loose files `supabase-migration-NNN.sql` in the repo root, applied by hand in the Supabase SQL editor (project ref `twusgbelcyocbwnvricz`). Check whether one is live with a read-only REST call using the service-role key from `.env.local` (e.g. `schedule_events` 404 ⇒ 013 not applied; `invoices?select=last_reminded_at` 400 ⇒ 014 not applied).

## Rules that are easy to break

- **Downloads:** WKWebView can't download. Every file save goes through `saveFile()` in `lib/native.ts`. Never add `<a download>`, `doc.save()` or a `window.open("")` print pop-up.
- **GPS:** use `getCurrentPosition()` from `lib/native.ts`, not `navigator.geolocation` directly.
- **Store billing rules (App Store 3.1.1, Play payments policy):** neither store app may show prices, plans, upgrade/subscribe buttons or tell users to pay on the website. Check with `isStoreApp()` (client, `lib/native.ts`) or `fromStoreApp(request)` (server, `lib/store-app.ts`) — not `isNativeApp()`, which misses the Android TWA. iOS is detected by the `ConstraApp-iOS` user agent; Android by its `android-app://com.getconstra.app` launch referrer, remembered in the `constra_app=android` cookie. `proxy.ts` sends `/` to `/dashboard` for both. There is no billing screen in the app; plan changes go through support@getconstra.com.
- **`isPro` is hardcoded `true`** (free during launch) — not a bug, don't "fix" it.
- **No fake social proof:** no invented testimonials, customer logos, user counts or ratings.
- **Secrets:** keys live only in `.env.local` (never committed) or Vercel env vars. Never ask the owner to paste keys in chat. `.env.local` can't be `source`d (an `EMAIL_FROM` value contains `<>`); pull single values with `grep '^NAME=' .env.local | cut -d= -f2-`.
- **Android signing key:** always reuse the existing keystore in `Desktop\Constra-Signing-Key\`; never let PWABuilder generate a new one.
- **Privacy:** if you add a new kind of data collection or a new third-party processor, update `app/privacy/page.tsx` and `ios/App/App/PrivacyInfo.xcprivacy` in the same change.
- **AI routes:** keep the iOS no-pricing instruction in `/api/chat`; cap any client-supplied text/snapshot before sending it to the model.

## Things the owner must do (Claude can't)

Create accounts, sign in with passwords, pay, or handle the App Store `.p8` key. Batch these into one short list instead of asking piecemeal, and prefer one-time connectors (e.g. the Supabase connector) over repeated manual steps.
