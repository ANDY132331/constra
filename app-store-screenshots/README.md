# App Store screenshots

iPhone 6.9" set, 1320 × 2868, no transparency (App Store Connect → your app → iOS App → Previews and Screenshots → 6.9" Display). Apple scales these down for smaller iPhones, so this one set is enough.

Upload in this order:

1. `iphone-6.9-01-dashboard.png`: home screen with crew on site, site alerts and time off
2. `iphone-6.9-02-hours-this-week.png`: this week's hours, by day and by person
3. `iphone-6.9-03-timesheets.png`: timesheet ready to download or email
4. `iphone-6.9-04-excel-templates.png`: the 23 ready-made Excel sheets
5. `iphone-6.9-05-crew-plan.png`: who works where tomorrow
6. `iphone-6.9-06-invoices.png`: invoices with QuickBooks export
7. `iphone-6.9-07-time-off.png`: approving time off
8. `iphone-6.9-08-crew.png`: the crew list

All sample data (a made-up company, "Patel Contracting"). Regenerate with `node app-store-screenshots/capture.mjs` (writes `apple-*` and `play-*` files to `.tmp-shots/out`) against the `constra-offline` server if screens change, then copy the `apple-*` files here and into the kit with the names above.
