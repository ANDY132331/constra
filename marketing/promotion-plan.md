# Constra promotion plan

How to get Constra in front of contractors, with copy ready to paste. Written 2026-11-15.
Pair it with `marketing/ad-copy.md` (paid Meta ads) and the videos in `marketing/promo-videos/`.

## 0. Before you promote (do this first)

1. **Run migrations 013, 014 and 015** in the Supabase SQL Editor (one combined paste: `run-013-014-015.sql`). As of today none of them are live, so Crew Plan, the Schedule, Time Off and Email to payroll fail for new users. Several videos show those screens. Check with `node .claude/skills/database-changes/scripts/status.mjs`.
2. Go through `prelaunch_checklist.md`: Groq billing for the AI assistant, a Supabase plan that can take real traffic, and the store items if you will mention the apps.
3. Sign up on a real phone as a new owner, invite one worker, clock in with a photo, and download a timesheet. If any step breaks, fix it before you send a single person.

**Which videos are safe today** (they only show clock-in, timesheets, offline, PDF/Excel):
`story-notebook`, `story-monster`, `explainers/group-chat`.
**Hold these until the migrations are applied** (they show or mention Crew Plan or Schedules):
`story-newguy`, `story-cooking`, `story-interview`, `explainers/watch-it-work`, `explainers/paperwork-stop`, `explainers/field-guide`.

## 1. Where contractors actually are

| Where | How to use it | Effort |
|---|---|---|
| TikTok, Instagram Reels, YouTube Shorts | The sketches. Same vertical file on all three. Post 4 to 5 times a week. | Low |
| Facebook groups (small contractors, framers, electricians, "contractor business" groups) | Be useful first. Answer questions about payroll and timesheets, share the funniest sketch when it fits, follow each group's self-promotion rule. | Medium |
| Reddit (r/Construction, r/Contractor, r/electricians, r/smallbusiness) | Most have strict self-promo rules. Comment helpfully for a week, then post "I built a free timesheet app, honest feedback wanted" where it is allowed. | Medium |
| YouTube | Upload the wide cuts. Title them for search: "Construction time tracking app for small crews". | Low |
| LinkedIn | For owners and project managers: the `story-monster` and `field-guide` cuts, with a short text post about Friday payroll. | Low |
| Google Search ads | Intent traffic: "construction timesheet app", "contractor time tracking app", "GPS time clock for crews". Start at CAD $10 a day. | Medium |
| Meta ads (Facebook and Instagram) | The test plan in `ad-copy.md`. Use the sketches as the video creative. | Medium |
| Local and offline | A QR flyer at trade supply counters, lumber yards and union halls. Ask foremen you know to try it with one crew. | Medium |
| Directories | Capterra, GetApp, Product Hunt, "best construction apps" list owners. Free listings. | Low, once |

## 2. A 4-week schedule

- **Week 1:** post `story-notebook` and `story-monster`. Join 5 Facebook groups and 3 subreddits and only comment. Set up a Google Business Profile if you have a business address.
- **Week 2:** post `story-cooking` and `story-newguy` (after migrations). Start Meta ads at CAD $10 to 15 a day. Message 20 small contractors one by one (template below).
- **Week 3:** post `story-interview`. Keep the best performer running as an ad. Add a Google Search campaign. Post a "how I run Friday payroll in 5 minutes" screen recording.
- **Week 4:** repost the winner with a fresh hook. Ask the first real users for a short honest review or quote (with permission) and use only real ones.

## 3. Captions (paste and post)

Use the platform's "AI-generated content" label where it exists. The voices are synthetic.
Link everything with a tag so you can see what works: `https://getconstra.com/?utm_source=tiktok&utm_medium=video&utm_campaign=story-notebook` (change the source and campaign each time).

**story-notebook** (hook: "Who worked Tuesday?")
> Payroll day when the notebook got rained on, spilled on, and bitten. 😅 Constra: clock in with a photo and GPS, timesheets build themselves, free while we launch. getconstra.com
> #construction #contractor #foreman #payroll #timesheets #tradesman

**story-monster**
> Friday night. One man. One pen. One timesheet that eats overtime. 📄👹 Constra works out the hours for you. Link in bio.
> #constructionlife #contractor #smallbusiness #payroll #constructionhumor

**story-cooking**
> Cooking with Constra: the recipe for a stress-free Friday. Photo, GPS, simmer, serve. Free while we launch. getconstra.com
> #contractor #constructionhumor #timesheets #smallbusiness #foreman

**story-newguy**
> New site. New crew. No paperwork. Kai's first day on the block. Constra runs the job, not the paperwork. getconstra.com
> #construction #electrician #tradesman #constructionlife #contractor

**story-interview**
> We interviewed two candidates for site timekeeper. One of them is a notebook. 😂 getconstra.com
> #constructionhumor #contractor #foreman #timesheets #smallbusiness

**explainers/watch-it-work** (best as an ad, or the first thing a curious visitor sees)
> Everything your crew needs, in one app: GPS clock-in, timesheets, schedules, invoices, daily reports, 23 Excel templates. Works offline. Free while we launch.

## 4. Outreach message (send one at a time, to real people)

> Hi [name], I saw [their company or job]. I built a free app for small crews: workers clock in on their phones with a photo and GPS, and the timesheets build themselves, PDF or Excel, overtime included. Happy to set up one crew for you and listen to what is missing. getconstra.com. No pressure at all.

Keep it to one message and one follow-up. Do not paste it in bulk.

## 5. Rules that protect you

- No fake testimonials, customer logos, user counts or ratings. Only real ones, with permission.
- No bought followers, comments or reviews, and no bots. Platforms ban for it and contractors can tell.
- Do not promise numbers ("saves 10 hours a week") until real customers tell you so.
- Store apps (App Store and Google Play) must not show prices, plans or upgrade buttons. Keep pricing talk to the website and posts.
- Reply to every comment in the first hour. Replies matter more than the post.

## 6. What to measure

Sign-ups per source (the UTM tags), not views. After two weeks keep the one or two formats that bring sign-ups and drop the rest.

## 7. Landing pages (live on the site)

Twelve trade pages (`/for/<trade>`) and six keyword pages (`/solutions/<slug>`) are in the sitemap for search and make good ad destinations. Each ad should point to the page that matches its audience, for example electricians to `/for/electricians`, GPS-time-clock ads to `/solutions/gps-time-tracking-for-crews`, and "free timesheet template" ads to `/solutions/free-construction-timesheet-template`. The Start free buttons already carry `utm_source=seo` and a campaign tag. Add your own `utm_source` (tiktok, meta, google) in the ad link.
The copy only describes features that work today (clock-in with photo and GPS, timesheets, daily reports, invoices, Excel templates, offline). Crew Plan and Schedule are left out until migrations 013 to 015 are applied.
