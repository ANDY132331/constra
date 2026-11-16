# Ad campaigns, ready but not running

Nothing here is live. No money has been spent and nothing has been posted. Everything below is set up so you can switch it on in an afternoon.
The 100 short videos are in `marketing/promo-videos/drafts/` (the list, with a caption and a landing page for each, is `CATALOG.csv` in the same folder). Only a few are on the Constra YouTube channel so far: YouTube stopped uploads after 10 videos today (the daily limit for a new, unverified channel). Verify the channel with your phone in YouTube Studio to raise the limit, then the rest can go up as private drafts, a few at a time. Upload defaults (private, with the description and link) are already set on the channel.

## Before any money is spent

1. Run migrations 013, 014 and 015 in the Supabase SQL Editor (`run-013-014-015.sql`). Until then Crew Plan, Schedule, Time Off and Email to payroll fail for new users. None of the 100 videos show those screens, but sign-ups will find them.
2. Check `prelaunch_checklist.md`: Groq billing for the AI assistant, a Supabase plan that can take traffic, and a test sign-up on a real phone (invite a worker, clock in with a photo, download a timesheet).
3. Do the YouTube channel verification (Studio, Settings, Feature eligibility) so links in descriptions are clickable.

## Reddit (first test)

- **Why:** contractors are in trade subreddits and read posts, not just scroll. Reddit ads are cheap to test and promoted posts can look like normal posts.
- **Account:** you create the Reddit Ads account and add the payment method. I cannot do either.
- **Campaign:** objective Traffic (then Conversions once the pixel is installed). Start at USD 10 to 15 a day for 7 days.
- **Targeting (communities):** r/Construction, r/Carpentry, r/electricians, r/Plumbing, r/HVAC, r/Roofing, r/Contractor, r/smallbusiness, r/Concrete, r/Landscaping. Add interest targeting for "Construction" and "Home improvement". Exclude r/ProRevenge and anything unrelated.
- **Creative:** the vertical sketches, one ad per video. If Reddit asks for 4:5 or 1:1, crop to the middle or re-render with `LIGHT=1 node marketing/vids/render.mjs sh-sNNN video v`.
- **Headlines (up to 300 characters, keep them plain):** "Friday payroll took me 3 hours. Now it takes none." / "We made a free app for crews to clock in with a photo and GPS." / "Free timesheet app for small contractors. No credit card."
- **Landing page by subreddit:** r/electricians goes to `/for/electricians`, r/Plumbing to `/for/plumbers`, r/HVAC to `/for/hvac-contractors`, r/Roofing to `/for/roofers`, r/Concrete to `/for/concrete-contractors`, r/Landscaping to `/for/landscapers`, r/Carpentry to `/for/framers`, the rest to `/for/general-contractors`.
- **Tag every link:** `?utm_source=reddit&utm_medium=paid&utm_campaign=<video id>`.
- **Tone:** Reddit dislikes slick ads. Say what it is, say it is free while it launches, and answer every comment as the builder. Do not fake accounts or upvotes.
- **Rules:** read each community's advertising and self-promotion rules. Organic posts in those subreddits are separate from ads and need the rules checked first.

## Meta (Facebook and Instagram)

Plan is in `marketing/ad-copy.md` (CAD 10 to 15 a day, 25 to 60, construction interests). Use the sketches as Reels placements. Judge on sign-ups.

## TikTok and YouTube Shorts ads

Same videos, run as Spark Ads (TikTok) after posting them organically first. TikTok needs the phone-app account first.

## Google Search ads

CAD 10 a day. One ad group per landing page.

| Ad group | Landing page | Keywords (phrase match) |
|---|---|---|
| Timesheet app | `/solutions/timesheet-app-for-contractors` | "timesheet app for contractors", "construction timesheet app", "contractor timesheet app" |
| Time clock | `/solutions/construction-time-clock-app` | "construction time clock app", "job site time clock", "crew time clock" |
| GPS tracking | `/solutions/gps-time-tracking-for-crews` | "gps time tracking for construction", "gps time clock for crews" |
| Daily reports | `/solutions/construction-daily-report-app` | "construction daily report app", "daily log app for contractors" |
| Free template | `/solutions/free-construction-timesheet-template` | "free construction timesheet template", "contractor timesheet template excel" |
| Offline | `/solutions/offline-time-tracking-app` | "offline time tracking app", "time tracking no signal" |

- **Headlines (30 characters max):** "Timesheets for Contractors" / "GPS + Photo Clock-In" / "Free While We Launch" / "Works Without Signal" / "Excel Templates Included"
- **Descriptions (90 characters max):** "Crews clock in with a photo and GPS. Timesheets build themselves. Free while we launch." / "Daily reports, invoices and 23 Excel templates in one app. No credit card."
- **Negative keywords:** jobs, salary, course, free download crack, payroll software for restaurants, nurse, uber.

## What to measure

Sign-ups per source and per video (the `utm_campaign` tag). After a week keep the top two videos, pause the rest, and put the money into the winners. Do not spend more than you can afford to lose until the first 20 real sign-ups show whether people stay.

## Rules that protect you

- No fake testimonials, customer logos, user counts or ratings.
- Do not promise numbers such as "saves 10 hours a week" until real customers say so.
- The videos use synthetic voices. Use each platform's AI-content label where it exists.
- App Store and Google Play listings must not show prices, plans or upgrade buttons.
