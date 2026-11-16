// Copy for the public search and ad landing pages (/for/<trade> and /solutions/<slug>).
// Only describe what the app does today. Crew Plan, Schedule, Time Off and Email to payroll are left out on purpose until their database update is live.
// No made-up customers, numbers, ratings or testimonials.

export type Faq = { q: string; a: string };
export type TradePage = { slug: string; name: string; who: string; hook: string; pains: [string, string][]; helps: [string, string][]; faq: Faq[]; shot: string };
export type SolutionPage = { slug: string; title: string; h1: string; hook: string; steps: [string, string][]; helps: [string, string][]; faq: Faq[]; shot: string };

const ALWAYS: Faq[] = [
  { q: "Does it cost anything?", a: "Constra is free while it launches. Set up your company, add your crew and start tracking time without a credit card." },
  { q: "Does it work without cell signal?", a: "Yes. Clock-ins and notes are saved on the phone and sync on their own when the signal comes back." },
];

export const TRADES: TradePage[] = [
  {
    slug: "general-contractors", name: "General Contractors", who: "general contractors", shot: "app-dashboard",
    hook: "Run every job, crew and invoice from one app, with real hours from real phones.",
    pains: [["Hours scattered across jobs", "Subs, labourers and foremen each report time a different way, and the week ends with a pile of guesses."], ["Paperwork after the work", "Daily reports, safety notes and change orders get written on Friday night from memory."], ["Slow invoicing", "Billing waits until someone has pulled the numbers together."]],
    helps: [["GPS and photo clock-in", "Every punch has a time, a location and a photo, so payroll is based on what happened."], ["Projects with budgets", "Track hours and spend against each job so you see a problem while you can still fix it."], ["Daily reports and safety log", "Weather, work done, photos and near misses are captured on site, in a minute."], ["Estimates to invoices", "Turn an estimate into an invoice and send a branded PDF the same day."]],
    faq: [{ q: "Can I track several jobs at once?", a: "Yes. Each project has its own crew, hours, reports and photos, and the dashboard shows who is on site right now." }, { q: "Who can see the money?", a: "Roles control it. Admins and project managers see costs and invoices; workers only see their own time." }, ...ALWAYS],
  },
  {
    slug: "framers", name: "Framers", who: "framing crews", shot: "app-clock",
    hook: "Know who was on which lot, to the minute, without chasing notebooks.",
    pains: [["Crews moving lot to lot", "People split the day across sites and nobody remembers the split on Friday."], ["Rain and delays", "Lost hours to weather rarely make it into the record."], ["Cash-flow gaps", "Late timesheets mean late invoices to the builder."]],
    helps: [["One-tap clock-in at the lot", "Workers clock in on their own phone with a photo and GPS, so every site gets the right hours."], ["Weather in the daily report", "Note rain days and delays with photos while you are standing there."], ["Timesheets as PDF or Excel", "Download hours per worker with overtime worked out, with your logo on top."], ["Punch list", "Track deficiencies and who is fixing them before the final walk."]],
    faq: [{ q: "Our guys have old phones. Will it run?", a: "Constra runs in the phone's browser and installs like an app. Cheap and old phones work, and it keeps working offline." }, { q: "Can piece-rate crews use it?", a: "Constra tracks hours. For piece work you can still log the hours worked per site and keep notes on the daily report." }, ...ALWAYS],
  },
  {
    slug: "electricians", name: "Electricians", who: "electrical contractors", shot: "app-daily-report",
    hook: "Track every hour by job, so billing and payroll match what the crew actually did.",
    pains: [["Hours that belong to different jobs", "Service calls and rough-ins blur together when time is written down later."], ["Safety paperwork", "Near misses and toolbox notes get skipped when the day is busy."], ["Billing lag", "Invoices wait on timesheets that are still in someone's truck."]],
    helps: [["Per-job time tracking", "Clock in against a project so labour lands on the right job every time."], ["Safety log with photos", "Record hazards, near misses and corrective actions with a photo and location."], ["Daily reports", "Capture the day's work and attach site photos before you leave the panel room."], ["Invoices and Excel templates", "Send branded invoices, and use ready-made Excel sheets for the rest."]],
    faq: [{ q: "Can I track a service van and a job site separately?", a: "Yes. Create a project for each job or customer and clock in against it." }, { q: "Can I export hours for my bookkeeper?", a: "Yes. Download timesheets as PDF or Excel for any date range." }, ...ALWAYS],
  },
  {
    slug: "plumbers", name: "Plumbers", who: "plumbing contractors", shot: "app-clock",
    hook: "Turn every service call and install into hours you can bill and pay with confidence.",
    pains: [["Many small jobs a day", "Short calls are the first to go missing from handwritten timesheets."], ["Proof of attendance", "Customers dispute arrival times and you have nothing to show."], ["Invoice follow-up", "Open invoices drift because nobody has the full picture."]],
    helps: [["Photo and GPS on every punch", "A time-stamped location and photo is clear proof of when your tech arrived."], ["Hours by job", "Clock in against a customer or project and see the total labour at a glance."], ["Invoices with status", "See what is sent, paid and overdue in one list."], ["Photos and files", "Keep before-and-after photos with the job."]],
    faq: [{ q: "Can I use it for one-person jobs?", a: "Yes. A crew of one works the same way as a crew of ten." }, { q: "Where are photos stored?", a: "They are attached to the job in your company's account, with the punch or report they belong to." }, ...ALWAYS],
  },
  {
    slug: "hvac-contractors", name: "HVAC Contractors", who: "HVAC contractors", shot: "app-dashboard",
    hook: "See who is on site, log the day, and bill the job without the paperwork backlog.",
    pains: [["Seasonal rushes", "Busy weeks leave no time for admin, so records fall behind."], ["Techs across many sites", "You cannot see who is where right now."], ["Commissioning paperwork", "Photos and notes live on personal phones."]],
    helps: [["Live view of who is on site", "The dashboard shows who has clocked in and where."], ["Daily reports with photos", "Equipment installed, readings noted and photos attached on site."], ["Punch list", "Track the last items to close out a job."], ["Timesheets and overtime", "Overtime is worked out in the export, so payroll is quick."]],
    faq: [{ q: "Can techs clock in from a rooftop with no signal?", a: "Yes. The punch is saved on the phone and syncs when the signal returns." }, { q: "Can I limit what a tech can see?", a: "Yes. Workers see their own time; managers and admins see more." }, ...ALWAYS],
  },
  {
    slug: "roofers", name: "Roofers", who: "roofing crews", shot: "app-clock",
    hook: "Clock in on the roof, even without signal, and keep weather days on the record.",
    pains: [["Weather ruins plans", "Rain days and short days need to be recorded, not remembered."], ["Crews on the move", "Tear-off crews and installers work different sites in the same week."], ["Photo documentation", "Insurance and customers want proof of the work."]],
    helps: [["Offline clock-in", "Punches and photos are saved on the phone and sync later."], ["Daily reports", "Weather, crew and progress photos in one report."], ["Photos and files", "Keep dated job photos with the project."], ["Safety log", "Log near misses and hazards with a photo."]],
    faq: [{ q: "Do photos help with insurance claims?", a: "Dated photos attached to the project give you a record to point to. Check your insurer's own requirements." }, { q: "How do short days affect pay?", a: "Timesheets show the actual hours clocked, so pay follows the real day." }, ...ALWAYS],
  },
  {
    slug: "concrete-contractors", name: "Concrete Contractors", who: "concrete crews", shot: "app-daily-report",
    hook: "Track early starts, long pours and every hour in between.",
    pains: [["Long pour days", "Overtime piles up and is hard to reconstruct later."], ["Many subs and suppliers", "Each one reports differently."], ["Records for disputes", "Pour times and conditions matter when something is questioned."]],
    helps: [["Overtime worked out", "Timesheet exports show regular and overtime hours."], ["Daily reports", "Record pour details, weather and crew with photos."], ["Project budgets", "Compare hours and costs to the job budget."], ["Change orders", "Raise a change order when scope grows and keep it with the project."]],
    faq: [{ q: "Can I see hours by day for a pour week?", a: "Yes. Pick a date range and download or review the daily hours per worker." }, ...ALWAYS],
  },
  {
    slug: "drywall-and-painters", name: "Drywall and Painters", who: "drywall and painting crews", shot: "app-clock",
    hook: "Keep tight schedules honest with real hours per site and a punch list that actually closes.",
    pains: [["Back-to-back sites", "Finishing crews bounce between jobs and lose track of time."], ["Touch-up lists", "Deficiency lists live in texts and photos."], ["Small margins", "Unrecorded hours eat the profit."]],
    helps: [["Per-site hours", "Clock in at each site with a photo and GPS."], ["Punch list", "Track touch-ups with photos, priority and who owns them."], ["Estimates and invoices", "Price the job, then bill it from the same estimate."], ["Excel templates", "Use ready-made sheets for material and job tracking."]],
    faq: [{ q: "Can my painters share one phone?", a: "Each worker should clock in on their own account so the record is accurate." }, ...ALWAYS],
  },
  {
    slug: "landscapers", name: "Landscapers", who: "landscaping crews", shot: "app-dashboard",
    hook: "Know which crew spent how long at which property.",
    pains: [["Many properties a day", "Short visits are the hardest to record."], ["Seasonal staff", "New hires need something simple on day one."], ["Billing by visit", "You need hours per property to price jobs well."]],
    helps: [["Quick clock-in", "A photo and GPS punch takes seconds, even for first-day staff."], ["Hours per project", "Make a project per property or contract and see the labour on each."], ["Invoices", "Send branded PDF invoices from the job."], ["Photos", "Keep before-and-after photos with each property."]],
    faq: [{ q: "Is it simple enough for seasonal workers?", a: "Workers mostly use one screen: clock in, clock out. Managers do the rest." }, ...ALWAYS],
  },
  {
    slug: "excavation-and-civil", name: "Excavation and Civil Contractors", who: "excavation and civil crews", shot: "app-daily-report",
    hook: "Track crews, equipment days and site conditions across long, multi-site jobs.",
    pains: [["Big crews, remote sites", "Signal is poor and sites are spread out."], ["Heavy compliance", "Safety logs and daily reports are expected, every day."], ["Cost control", "Labour overruns show up too late."]],
    helps: [["Offline-ready", "Clock-ins and notes sync when the signal comes back."], ["Safety log and daily reports", "Capture conditions, hazards and progress with photos."], ["Budgets by project", "See hours and spend against the job budget."], ["RFIs and change orders", "Track questions and scope changes with the project."]],
    faq: [{ q: "Can I record equipment days?", a: "Use the Equipment section to track equipment, and note it on the daily report." }, ...ALWAYS],
  },
  {
    slug: "flooring-installers", name: "Flooring Installers", who: "flooring crews", shot: "app-clock",
    hook: "Hours and job photos in one place, so every install is documented and billed.",
    pains: [["Install windows", "Tight schedules and rework hours need a clear record."], ["Customer disputes", "Photos and times protect you."], ["Material tracking", "Waste and leftovers are rarely written down."]],
    helps: [["Photo and GPS punches", "Time at the customer's address, on record."], ["Materials log", "Track materials used for each project."], ["Photos and files", "Store before-and-after photos with the job."], ["Invoices", "Bill from the same project when the job is done."]],
    faq: [{ q: "Can I attach a floor plan or PDF?", a: "Yes. Documents and drawings can be stored with the project." }, ...ALWAYS],
  },
  {
    slug: "renovation-contractors", name: "Renovation Contractors", who: "renovation contractors", shot: "app-invoices",
    hook: "Keep scope changes, hours and invoices tied to the same job.",
    pains: [["Scope creep", "Extra work happens on site and never gets billed."], ["Mixed crews", "Own staff and subs all track time differently."], ["Client updates", "Homeowners want proof of progress."]],
    helps: [["Change orders", "Price extra work, send it, and keep the approved amount with the project."], ["Daily reports and photos", "Show clients progress with dated photos."], ["Timesheets", "Export hours per worker as PDF or Excel."], ["Invoices", "See what is sent, paid and overdue."]],
    faq: [{ q: "Can homeowners see anything?", a: "You can share documents and invoices with a client by link. They do not need an account." }, ...ALWAYS],
  },
];

export const SOLUTIONS: SolutionPage[] = [
  {
    slug: "timesheet-app-for-contractors", title: "Timesheet App for Contractors", h1: "A timesheet app built for contractors, not offices", shot: "app-clock",
    hook: "Your crew clocks in on their phones. You download clean timesheets with overtime worked out.",
    steps: [["Add your crew", "Invite workers by code. They sign up on their own phone."], ["They clock in on site", "One tap, with a photo and GPS location."], ["Download timesheets", "Pick the dates and get a PDF or Excel file with your logo on top."]],
    helps: [["Overtime worked out", "Regular and overtime hours are separated for you."], ["PDF and Excel", "Hand them to your bookkeeper or payroll person as they are."], ["Works offline", "Punches sync when the signal returns."], ["Free while we launch", "Start without a credit card."]],
    faq: [{ q: "Can I get hours for a past week?", a: "Yes. Choose any date range and download the timesheets." }, { q: "Can workers edit their time?", a: "Managers can review and correct entries, so the record stays accurate." }, ...ALWAYS],
  },
  {
    slug: "construction-time-clock-app", title: "Construction Time Clock App", h1: "A time clock for the job site, in every worker's pocket", shot: "app-clock",
    hook: "Replace the paper time card with a one-tap clock-in that proves where and when.",
    steps: [["Open the app", "Workers install it from the browser, no app store needed."], ["Tap to clock in", "A photo and GPS fix are saved with the punch."], ["Tap to clock out", "Hours add up on their own."]],
    helps: [["Geofence flags", "Punches far from the site are flagged for review."], ["Live dashboard", "See who is on site right now."], ["Per-project time", "Hours land on the right job."], ["Offline ready", "No signal, no problem."]],
    faq: [{ q: "Is a photo required?", a: "Photos are part of the clock-in so the record shows who punched. Your team's phone must allow camera access." }, { q: "When does it check location?", a: "At clock-in, and every few minutes while the app is open during a shift, to notice when someone leaves the job circle. It cannot follow a phone with the app fully closed, and the owner view says so." }, ...ALWAYS],
  },
  {
    slug: "gps-time-tracking-for-crews", title: "GPS Time Tracking for Crews", h1: "GPS time tracking that your crew will actually use", shot: "app-dashboard",
    hook: "Every punch records where it happened, so you can stop guessing.",
    steps: [["Set the job site", "Add the address to the project."], ["Crew clocks in", "Their location is saved with the punch."], ["Review the exceptions", "Anything far from the site is flagged."]],
    helps: [["Location on every punch", "See where each clock-in happened."], ["Photo proof", "Add a photo so the person is on record too."], ["Hours by project", "Labour lands on the right job."], ["Clear limits", "Location is read at punch time and, while the app is open on a shift, every few minutes. A closed app is not followed."]],
    faq: [{ q: "Do workers have to consent?", a: "If you track employee or contractor location and photos you are responsible for any consent your local laws require. Tell your crew what you collect." }, ...ALWAYS],
  },
  {
    slug: "construction-daily-report-app", title: "Construction Daily Report App", h1: "Daily reports done in a minute, with the photos attached", shot: "app-daily-report",
    hook: "Capture weather, crew, work done and photos on site, then share the report.",
    steps: [["Start a report", "Pick the project and date."], ["Add the day", "Weather, work completed, issues and photos."], ["Share it", "Download or send the report to the client or office."]],
    helps: [["Hours already included", "Crew hours come from the clock-ins."], ["Photos with the report", "Dated photos stay with the project."], ["Safety log", "Hazards and near misses are logged in the same app."], ["Punch list", "Track items still open."]],
    faq: [{ q: "Can I use it offline?", a: "Yes. Reports sync when the signal returns." }, ...ALWAYS],
  },
  {
    slug: "free-construction-timesheet-template", title: "Free Construction Timesheet Template (Excel)", h1: "Free construction timesheet templates in Excel, ready to fill", shot: "app-invoices",
    hook: "Skip the blank spreadsheet. Download Excel sheets with your logo on top and the totals already worked out.",
    steps: [["Open Excel Templates", "Pick a sheet: timesheets, payment tracker, crew and time and more."], ["Fill it in right there", "Totals are worked out as you type."], ["Download it", "Save it as Excel or PDF."]],
    helps: [["23 ready-made templates", "Money, crew, time and more, for contractors."], ["Your logo on top", "Add your company logo once."], ["Start from your own data", "Pre-fill from your invoices in the app."], ["Free while we launch", "No credit card."]],
    faq: [{ q: "Do I need Excel?", a: "You can fill the sheets in the app and download them as an Excel file or PDF." }, ...ALWAYS],
  },
  {
    slug: "offline-time-tracking-app", title: "Offline Time Tracking App for Job Sites", h1: "Time tracking that works when the signal doesn't", shot: "app-clock",
    hook: "Basements, rooftops and rural sites: clock in anyway and let it sync later.",
    steps: [["Clock in without signal", "The punch and photo are stored on the phone."], ["Keep working", "Notes and reports are saved too."], ["Back online? It syncs", "Everything uploads on its own."]],
    helps: [["No lost punches", "Nothing disappears when the network drops."], ["Photo and GPS", "Saved with the punch even offline."], ["Works on cheap phones", "Runs in the browser."], ["Free while we launch", "No credit card."]],
    faq: [{ q: "What if the phone is off for a day?", a: "Anything saved stays on the phone until it can sync. Open the app online to upload it." }, ...ALWAYS],
  },
];

export const ALL_PATHS = [...TRADES.map((t) => `/for/${t.slug}`), ...SOLUTIONS.map((s) => `/solutions/${s.slug}`)];
