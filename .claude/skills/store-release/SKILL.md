---
name: store-release
description: Getting Constra onto and through the Apple App Store and Google Play — the store rules this app has to meet, a preflight script that checks them, what needs a new build versus a normal deploy, and how to answer a rejection. Use this before any iOS or Android build or submission, whenever Codemagic, TestFlight, PWABuilder, App Store Connect or Play Console comes up, when pasting a build error or a rejection message, when a change touches pricing, downloads, GPS, permissions, data collection or sign-in, and whenever the user asks about publishing or "the app store", even if they don't name a store.
---

# Store release

Run the preflight before anything goes to a store, and after any change that touches what the
stores care about. It is read-only and takes seconds, and a failed upload costs a 20-minute build.

```bash
node .claude/skills/store-release/scripts/preflight.mjs
```

It covers the icon, screenshots, permission strings, privacy manifest, plugin sync, Android package
and domain, the code rules below, and the live site. Fix anything it fails before starting a build.
If you learn a new way to get rejected, add a check to it, so the next release can't repeat it.

## How the apps are built

| | iOS | Android |
|---|---|---|
| What it is | Capacitor 8 shell loading getconstra.com/dashboard | Trusted Web Activity (Chrome, no browser bar) |
| Built by | Codemagic (`codemagic.yaml`), no Mac needed | PWABuilder, by the owner |
| Identity | Bundle id `com.getconstra.app` | Package `com.getconstra.app`, existing keystore only |
| Detected by | `ConstraApp-iOS` user agent | `android-app://com.getconstra.app` referrer, then `constra_app=android` cookie |

Both load the live site, so **most changes reach the apps with a normal push to master.** A new store
build is needed only for changes to the shell: Info.plist, the icon, a Capacitor plugin, the privacy
manifest, `capacitor.config.ts`, or the TWA manifest. Don't send the owner through a rebuild for a
web change, and don't assume a shell change reached anyone without one.

The owner's kit is `OneDrive\Desktop\Constra App Store Kit\` (listing, privacy answers, review notes,
screenshots). The Android guide is `play-store-assets/README.md`. The step-by-step checklist they
tick is https://claude.ai/artifact/CiTiEExCMVEh9NaVDBWtXA; read it first to see where they are.

## Rules the code has to keep

Each exists because the store rejects without it, or because the app breaks in a way only the store
build shows.

- **No prices, plans, upgrade buttons or "subscribe on our site" in either app** (App Store 3.1.1,
  Play payments policy). Check with `isStoreApp()` on the client or `fromStoreApp(request)` on the
  server. `isNativeApp()` misses Android. Invoice payments by a contractor's client are fine: they
  pay for real-world work.
- **Downloads go through `saveFile()`.** WKWebView silently does nothing with `<a download>`,
  `doc.save()` or a print pop-up, so the button looks dead on iPhone and works everywhere else.
- **GPS goes through `getCurrentPosition()`** in `lib/native.ts`, which owns the iOS prompt.
- **New permission, new string.** Touching the camera, mic, location, photos or speech without its
  Info.plist string crashes the iOS app on first use.
- **New data collected or new third party:** update `app/privacy/page.tsx`,
  `ios/App/App/PrivacyInfo.xcprivacy`, the kit's privacy answers and the Play Data safety answers
  together. Reviewers compare them.
- **Account deletion stays reachable in the app** (Settings › Security). Apple 5.1.1(v), Play too.
- **No social sign-in** unless Sign in with Apple is added at the same time (4.8).
- **PNG icons and screenshots have no alpha channel,** even when every pixel is solid (ITMS-90717).

## What only the owner can do

Create accounts, pay, sign in, and handle secrets. Never ask for the `.p8` key, keystore passwords or
the reviewer password in chat; each goes straight into Codemagic, PWABuilder or the store console.
Group these into one short list instead of asking one at a time, and write for someone who isn't a
developer: exact buttons, exact values.

The demo company for reviewers: they create the Admin account and add crew, because crew are real
sign-ins. `node scripts/seed-review-account.mjs <email>` previews sample data for it; ask before
running it with `--apply`, because it writes to the live database.

## Build failures

Ask for the red text from the Codemagic log and read it before guessing. Common causes:

| Symptom | Cause and fix |
|---|---|
| Integration `Constra ASC` not found | Named differently in Codemagic; it must match `codemagic.yaml` exactly |
| No profiles / bundle id not found | App or bundle id isn't registered in the developer account yet |
| `npm ci` fails | `package-lock.json` out of sync: `npm install`, commit the lock file |
| Missing Swift package | `npx cap sync ios` wasn't committed after adding a plugin |
| ITMS-90717 | Alpha channel on the icon |
| Redundant binary / build number | The counter step in `codemagic.yaml` didn't apply; check it ran |

## Answering a rejection

Read the whole message and find the guideline number. Say what it means in plain language, decide
whether it needs a code change or only a reply, and draft the reply for the owner to send. Don't
argue with a rejection that's correct. Don't overstate what the app does in a reply.

| Rejection | What it usually means here | Response |
|---|---|---|
| Apple 2.1, couldn't sign in | The demo login failed or the password changed | Owner checks the login on a phone, then resubmits |
| Apple 3.1.1 | The reviewer saw a price or a route to buying | Find the screen, gate it with `isStoreApp()`; cite 3.1.3(c) Enterprise in the reply if it's about sign-in without purchase |
| Apple 4.2, minimum functionality | "It's just a website" | List what's native: GPS clock-in, live photo, share sheet, offline queue. If it persists, add a native feature such as push |
| Apple 5.1.1(v) | Couldn't find account deletion | Give the exact path; fix it if the path is really buried |
| Apple 1.2, user content | Crew chat seen as social | Explain messages are private to one company's verified crew |
| Play, misleading claims or broken functionality | Listing doesn't match the app, or the demo login failed | Fix the copy, or restore the login |
| Play, Data safety mismatch | Answers differ from the privacy policy | Align both, then resubmit |
| Play, not enough testing | Fewer than 12 testers stayed opted in for 14 days | The clock restarts; recruit more and keep them opted in |
| Android shows a browser bar | Not a rejection: assetlinks doesn't match Google's signing key | Add the SHA-256 from Play Console › App integrity to `assetlinks.json`, keeping the existing entry |

Before relying on a rule here, check the current guideline text if the stakes are high; both stores
change their policies.
