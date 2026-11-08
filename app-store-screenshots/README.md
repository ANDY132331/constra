# App Store screenshots

iPhone 6.9" set, 1290 × 2796 (App Store Connect → your app → iOS App → Previews and Screenshots → 6.9" Display). Apple scales these down for smaller iPhones, so this one set is enough.

Upload in this order:

1. `iphone-6.9-1-dashboard.png`: home screen with crew on site, site alerts and time off
2. `iphone-6.9-2-time.png`: this week's hours, by day and by person
3. `iphone-6.9-3-crew-plan.png`: who works where tomorrow
4. `iphone-6.9-4-timesheets.png`: timesheet ready to download or email
5. `iphone-6.9-5-crew.png`: the crew list
6. `iphone-6.9-6-time-off.png`: approving time off

All sample data (a made-up company, "Patel Contracting"). Regenerate with `node app-store-screenshots/capture.mjs` (writes to `.tmp-shots/out`) against the `constra-offline` server if screens change.
