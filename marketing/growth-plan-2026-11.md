# Constra growth plan and production check (2026-11-26)

Builds on `promotion-plan.md` (2026-11-15). No result is guaranteed: this is the work most likely to bring real crews in, measured weekly.

## 1. Production check, 2026-11-26

| Check | Result |
|---|---|
| Live pages (home, login, support, privacy, terms, delete account, sitemap, robots, assetlinks) | all load |
| Type check and production build (local) | pass |
| Store preflight | 37/37 |
| Crew flows on the offline test server (clock-in, offline sync notice, CSV, invoice PDF, role limits) | 12/12 |
| Screen sweep (owner, foreman, worker) | owner 27/27 clean; foreman and worker only show the expected role redirects |
| Help assistant and pay logic tests | pass |
| Database migrations 013 to 015 (status script) | applied; 016 to 020 were verified on 2026-11-23 |
| Outgoing email domain (Resend) | verified |
| Incoming mail (MX) | ImprovMX forwarding |
| Sign-up | accounts are created already confirmed, so Supabase's 2-per-hour built-in email cap does not block sign-ups |

Not tested: a real phone, real push notifications, load with many users.

## 2. What breaks first if many users arrive

Check each plan in its dashboard; the plan actually in use was not verified.

1. **Resend free plan:** 100 emails a day, 3,000 a month. Password resets, invites and reminders stop after that and are not retried. ([limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits))
2. **Supabase free plan:** 500 MB database, 1 GB file storage, 5 GB egress, no automatic backups, pauses after a quiet week. Clock-in photos fill storage: at an assumed 100 KB each, 1 GB is about 10,000 photos. Pro starts at US$25 a month with daily backups. ([pricing](https://supabase.com/pricing))
3. **Vercel Hobby plan:** terms limit it to non-commercial use. If the project is on Hobby, move to Pro before charging anyone or advertising. ([terms](https://vercel.com/legal/terms))
4. **No error monitoring.** Crashes on users' phones are invisible unless someone writes in.
5. **Rate limiting is per server instance** (`lib/rate-limit.ts`). Fine now; replace with a shared store if abuse shows up.

## 3. How promotion runs

- **Weekly batch.** Claude prepares the week's posts (video, caption, link, time). The owner reads the list and says yes. Claude schedules them with each platform's own scheduler (YouTube Studio, Meta Business Suite, TikTok's scheduler), so they go out on their own.
- **Replies.** Claude drafts answers to comments and questions; the owner approves before they are sent.
- **Owner only:** creating accounts, passwords, verification codes, anything paid.
- **Never:** bots posting every hour, mass messages, extra accounts, invented reviews or user numbers. These get accounts banned. In Canada, commercial messages also need consent under [CASL](https://crtc.gc.ca/eng/com500/faq500.htm).

## 4. Channels, in order

| Priority | Channel | What to do | Needs from owner |
|---|---|---|---|
| 1 | YouTube Shorts (@getconstra, exists) | 1 a day from the private drafts | yes to the batch |
| 2 | Instagram Reels and Facebook Page | same vertical videos | create or sign in |
| 3 | TikTok | same videos | create or sign in |
| 4 | Direct asks | 20 contractors you know, one by one (template in `promotion-plan.md`) | send them yourself |
| 5 | Directories | [Capterra](https://www.capterra.com/vendors/) (free profile), [ConTechFinder](https://contechfinder.com/) (says free), Product Hunt (can schedule a month ahead; ask for feedback, never upvotes), AlternativeTo and SaaSHub (check their submit pages) | accounts |
| 6 | Reddit | r/smallbusiness promo thread only; r/Construction answer questions with no links; r/SideProject allows own projects. Rules from third-party summaries: read each sidebar first | account |
| 7 | Google Search Console | the domain already has a verification record; submit `sitemap.xml` and watch which `/for` and `/solutions` pages get searches | sign in |
| 8 | Local, in person | QR flyer at supply counters, lumber yards, union halls | in person |
| Later | Paid ads | only after sign-ups and week-one use are being measured | budget |

## 5. First week batch (waiting for approval, nothing scheduled)

Files are in `marketing/youtube-drafts/` (already on YouTube as private).

| Day | Video | Caption |
|---|---|---|
| 1 | 01 clock in the crew | Mission: get the whole crew clocked in. GPS-verified, no paper. |
| 2 | 04 invoice dash | Send the invoice before you leave the driveway. |
| 3 | 02 night shift | Know who is on site, even at 7 PM in the rain. |
| 4 | 03 payday run | Friday payroll without the spreadsheet. |
| 5 | 05 missed punch | Somebody forgot to clock out. Fix it and approve it. |
| 6 | 06 safety first | Daily report, photos and safety log in one app. |
| 7 | `story-notebook` | Payroll day, and the notebook got bitten. (Already public on YouTube; use on the other platforms.) |

Footer: `Free while we launch. getconstra.com/?utm_source=<platform>&utm_medium=social`

Watch each video once with sound before approving it. The six mission videos have only been checked as still frames.

## 6. Weekly scorecard

Views per video, visits (Vercel Analytics), new companies signed up, companies with a clock-in in the last 7 days, Play installs. Keep the formats that bring sign-ups, drop the rest.

## 7. Open items

- Google Play listing shows the owner's name, address, phone and personal Gmail. Owner wants only Constra emails, has no separate business address or phone. Postponed to 2026-11-27.
- Google Play test track pause is not published (shows "Beta" to testers).
