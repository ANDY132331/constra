---
name: field-testing
description: A full run through Constra the way a real crew uses it — phone size, camera and GPS, signal dropping mid-shift, clock-in through timesheets and invoice PDFs, and what each role can reach. Use this before a store build or release, after changing time tracking, offline sync, permissions, roles, exports or invoices, when the user says "make sure everything works" or "test the app", and when a crew-facing bug is reported. Use the ui-review skill for how a screen looks and behaves; use this for whether the job gets done from start to finish.
---

# Field testing

`ui-review` asks whether a screen is right. This asks whether a foreman can get through a Friday: clock
the crew in, lose signal, clock them out, export hours, send the invoice. Bugs here cost real money,
such as a short-paid worker or a lost clock-in, and they live between screens, so a page-by-page
sweep walks straight past them.

## Run it

Start the `constra-offline` preview, then use the port it reports:

```bash
node .claude/skills/field-testing/scripts/field-run.mjs 3004
```

It takes about two minutes on sample data with no real database. Each step prints PASS or FAIL, and
failures save a screenshot to `.tmp-field/` (gitignored). Look at the screenshot before deciding
anything. Stop the dev server before running a build.

| Area | Checked |
|---|---|
| Clock-in | Foreman clocks a worker in through project, GPS and live photo; the shift saves with GPS |
| Duplicates | The same worker can't be clocked in twice, which would pay them twice |
| Lost signal | The page says it's offline, stays usable, clock-out works, and the notice clears on return |
| Hours | No negative hours on the Time screen |
| Timesheets | CSV has a header and rows, and says which running shifts it left out |
| Invoices | Download PDF produces a real PDF |
| Search | Nothing matching says so, and clearing it brings the data back |
| Roles | A worker can't reach invoices, budget, crew or reports, or clock in other people |

## When a step fails

Suspect the script first, then confirm a second way before calling it an app bug. Every one of these
produced a false failure while this script was being written:

- **Wrapper matches.** A locator like `main div` with a worker's name also matches the whole list, and
  its first button is someone else's. Scope to the smallest row, as `rowFor` does.
- **Saved data lags the toast.** The store writes to `localStorage` just after the state change. Wait
  before reading it.
- **Photos aren't in saved data.** The store strips `data:` images from `localStorage` on purpose to
  stay under the quota. A missing `clockInPhoto` there is expected.
- **Menus on phones.** Download PDF is inside the ⋮ menu on an invoice. If a button isn't visible, look
  at the screenshot before calling it missing.
- **Hidden duplicates.** Many pages render a phone and a desktop copy, so use `:visible`.

When something does turn out to be an app bug, fix it, rerun, and report what you measured. When a
new crew-facing bug gets reported, add a step that would have caught it, so it can't come back quietly.

## What this run can't prove

Say these out loud when reporting; a green run doesn't cover them.

- **Real sync, in this run.** With no database, offline changes never queue or replay here. Use the
  sync test below for that.
- **Server rules.** RLS and role triggers aren't running, so the role steps prove only the app's route
  guard. A determined user could call the API directly. Those rules are tested in `database-changes`.
- **Native behaviour.** The share sheet, iOS permission prompts and the status bar only exist in
  TestFlight. Android's no-pricing check only sees a real launch on an Android phone.
- **Real conditions.** Fake camera and GPS don't show sunlight glare, gloves, slow networks or weak GPS.
  `field-app-design` has the rules for those; on a real device, try them.

## Offline sync test

Run this after touching `lib/offline-queue.ts`, `bg()` in `lib/store.tsx`, `public/sw.js`, or any upload.
It uses a production build (the service worker doesn't run in dev) and a mock Supabase that records
what arrives, so it never touches the live database. Takes about five minutes.

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 NEXT_PUBLIC_SUPABASE_ANON_KEY=test npm run build
# preview_start constra-sync-test (next start on 3006, same two variables plus a dummy service key)
node .claude/skills/field-testing/scripts/offline-sync.mjs
```

Stop the server and rebuild normally afterwards, because this build has the mock's address in it.

It covers: all screens pre-downloaded, unopened pages and invoices loading offline, tasks, safety
reports, photos, documents and clock-ins queued, surviving a reload, files uploading before their
rows, weak signal where requests die while the phone thinks it's online, and a refused change being
reported without blocking the rest.

**How it works, so new code stays covered:** every `bg()` write is captured by `writeRecorder`, so a
new store action queues automatically. It only understands `from().insert/update/delete` with
`.eq("id", ...)`; anything else tells the user it wasn't saved. A new column holding a file needs an
entry in `FILE_COLUMNS`. A new page goes in `APP_PAGES` in `public/sw.js`. Bump `CACHE` when you
change that file.

**Limits worth saying out loud:** an offline update replaces the whole row, so the last save wins if
someone else edited the same record meanwhile. Emulated offline occasionally lets one queued insert
out unseen by Playwright's listeners. It's harmless because the replay gets 23505, but don't assert
that no rows arrive.

For a release, finish with the owner's TestFlight checklist in `store-release`: sign in, clock in with
real permissions, Download PDF, light theme, a voice message.
