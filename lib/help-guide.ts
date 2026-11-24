// Built-in help for the in-app assistant. It needs no outside AI service and no keys: it matches
// what the person typed against a guide of how Constra works and returns the best steps.
// /api/chat uses it whenever the AI provider is not configured or is unavailable.

type Topic = {
  id: string;
  words: string[]; // lowercase words/phrases; longer phrases score higher
  answer: string;
  /** hide from the store apps (no prices or payment instructions there) */
  billing?: boolean;
};

const TOPICS: Topic[] = [
  {
    id: "clock-in",
    words: ["clock in", "clock out", "clocking", "punch in", "punch out", "start shift", "end shift", "start my day", "time clock"],
    answer: "To clock in: open the app, tap **Time** (or the big Clock In button on your home screen), allow location, take a quick photo if it asks, then confirm. Tap **Clock Out** when you finish.\n\nNo signal? It still works. Your clock-in saves on the phone and sends itself when you're back online.",
  },
  {
    id: "cant-clock",
    words: ["cant clock", "can't clock", "cannot clock", "wont clock", "won't clock", "gps", "location", "not on site", "too far", "wrong location", "geofence"],
    answer: "If clocking in won't work:\n1. Turn location on for the app (phone Settings → Apps → Constra → Permissions → Location → Allow).\n2. If it asks for a photo, allow the camera too.\n3. Step outside or near a window for a better GPS lock and try again.\n4. No signal is fine. It saves and syncs later.\n\nStill stuck? Tell your foreman or admin. They can fix your time from Time Tracking → your name → Edit entry.",
  },
  {
    id: "edit-time",
    words: ["edit time", "fix my time", "wrong hours", "forgot to clock", "missed punch", "change hours", "edit entry", "adjust hours", "forgot clock", "wrong time"],
    answer: "Hours are fixed by a foreman, project manager or admin: Time Tracking → tap the person → **Edit entry** (change the in and out times or add a missed shift). Workers can't edit their own hours, so message your foreman and they'll correct it.",
  },
  {
    id: "timesheets",
    words: ["timesheet", "timesheets", "export hours", "download hours", "hours report", "weekly hours", "pdf hours"],
    answer: "Timesheets: menu → **Timesheets**. Pick the dates, a person and a job, then tap **Download PDF** or **Download Excel**. Both carry your company logo and have one page per worker.\n\nAdmins can also tap **Email it now** to send the PDF and Excel to the payroll email you saved.",
  },
  {
    id: "payroll",
    words: ["payroll", "pay run", "gusto", "quickbooks", "overtime", "pay period", "paycheque", "paycheck", "salary", "salaried"],
    answer: "Payroll (admins): **Reports → Export Payroll**. Pick Gusto for a CSV, or QuickBooks (Online gets a summary of hours to enter by hand, Desktop gets an IIF file). Overtime is worked out from the hours automatically. People set to **Salary** show as Salary with no hourly pay.\n\nTo set a person as hourly or salary: Crew → tap them → Edit → Pay type.",
  },
  {
    id: "my-pay",
    words: ["my pay", "how much will i get", "est pay", "estimated pay", "my earnings", "what do i earn", "my rate"],
    answer: "Workers see their own hours and estimated pay on the home screen (**Est. Pay**). It only shows your own numbers. If it says **No rate set**, ask your admin to enter your pay rate on the Crew screen.",
  },
  {
    id: "invite",
    words: ["invite", "add worker", "add crew", "add someone", "new worker", "new crew", "join company", "invite code", "sign up code", "qr code", "add employee", "add a worker"],
    answer: "To add someone: **Crew → Add Worker**. Share the company invite code (or its QR) from Crew or Settings → Company. They download the app, sign up and enter the code (it looks like CN-XXXX-XXXX, upper or lower case both work).\n\nCode not working? Check it's typed exactly. An admin can make a new one in Settings → Company.",
  },
  {
    id: "roles",
    words: ["role", "roles", "permission", "permissions", "access", "cant see", "can't see", "cannot see", "missing page", "foreman", "project manager", "admin only", "who can see"],
    answer: "Roles: **Worker** (clock in, own hours, schedule, punch list, messages), **Foreman** and **Project Manager** (plus tasks, RFIs, equipment, materials, documents, reports), **Admin** (everything, including crew, money and settings).\n\nIf someone can't see a page they need, an admin can change their role (Crew → tap them → Edit) or give them a specific page (Settings → Access Control).",
  },
  {
    id: "crew-plan",
    words: ["crew plan", "assign", "assignments", "who is working", "tomorrow", "send to crew", "job for the day", "plan the day", "daily plan"],
    answer: "Crew Plan (foreman or admin): pick the day, add people to each job, set a start time, then tap **Send to crew**. Everyone gets a notification with the job, start time and address. One job per person per day.\n\nWorkers see their own job under **My plan**.",
  },
  {
    id: "time-off",
    words: ["time off", "day off", "days off", "vacation", "sick", "request off", "holiday", "leave"],
    answer: "Time off: menu → **Time Off** → ask for days (a reason is optional). Foremen and admins get a notification and tap Approve or Decline, and you're notified of the answer. Approved days show as **Off** in the crew plan.",
  },
  {
    id: "schedule",
    words: ["schedule", "calendar", "shift schedule", "my schedule", "events"],
    answer: "Schedule: menu → **Schedule**. Workers see their own jobs and events, and foremen and admins see the whole crew. Add an event with the + button, choose the job, day and time.",
  },
  {
    id: "projects",
    words: ["project", "projects", "job site", "new job", "create project", "add project", "archive", "address"],
    answer: "Projects: menu → **Projects → New project**. Add the name, job site address, dates and crew. Each project holds its own tasks, RFIs, documents, photos and budget. When a job's done, **archive** it. Nothing is deleted.",
  },
  {
    id: "tasks",
    words: ["task", "tasks", "to do", "todo", "assign task"],
    answer: "Tasks: menu → **Tasks**. Foremen and above can create, assign and edit tasks per project. Workers see the tasks assigned to them and can mark them done.",
  },
  {
    id: "punch",
    words: ["punch list", "deficiency", "deficiencies", "snag", "closeout", "close-out"],
    answer: "Punch list: menu → **Punch List**. Add an item, attach a photo and assign it. Everyone on the job can see it, and each item has a PDF button. Tick items off as they're fixed.",
  },
  {
    id: "rfi",
    words: ["rfi", "rfis", "request for information", "clarification"],
    answer: "RFIs: menu → **RFIs → New RFI**. Write the question, pick the project and who it goes to. When it's answered, add the answer and close it. Each RFI has a PDF button with your company logo.",
  },
  {
    id: "daily-report",
    words: ["daily report", "daily reports", "site report", "diary", "weather"],
    answer: "Daily reports: menu → **Daily Reports → New report**. Add the date, job, crew on site, work done, weather and photos. They save offline and sync later, and each one has a PDF button.",
  },
  {
    id: "photos",
    words: ["photo", "photos", "pictures", "pics", "camera", "upload picture"],
    answer: "Photos: menu → **Photos**, or add one inside a task, punch item or daily report. Photos taken without signal are stored on the phone and upload when you're back online. If the camera won't open, allow Camera for the app in phone Settings.",
  },
  {
    id: "documents",
    words: ["document", "documents", "blueprint", "blueprints", "drawing", "drawings", "plans", "upload file", "pdf plans"],
    answer: "Documents and blueprints: menu → **Documents** or **Blueprints** (foreman and above). Open a project and upload files. They're shared with everyone assigned to that job.",
  },
  {
    id: "equipment",
    words: ["equipment", "tool", "tools", "machine", "materials", "material", "inventory"],
    answer: "Equipment and materials: menu → **Equipment** or **Materials** (foreman and above). Add the item, set the job and who has it, and update it as it moves.",
  },
  {
    id: "safety",
    words: ["safety", "incident", "toolbox", "hazard", "injury", "near miss"],
    answer: "Safety: menu → **Safety**. Log an observation, incident or toolbox talk with the date, job, people involved and photos. Incidents have a PDF button.\n\nIn an emergency, call local emergency services first. The app is for the record afterwards.",
  },
  {
    id: "messages",
    words: ["message", "messages", "chat", "text crew", "group chat", "dm", "direct message"],
    answer: "Messages: tap **Messages** to chat with your crew by project or company-wide. Messages sent without signal send when you reconnect.",
  },
  {
    id: "invoices",
    words: ["invoice", "invoices", "bill client", "send invoice", "estimate", "estimates", "quote", "change order", "change orders", "budget"],
    answer: "Money tools (admin only): **Estimates**, **Invoices**, **Change Orders** and **Budget** are in the menu. Create one, pick the project, add line items, then email it or download the PDF. Invoices can also export to QuickBooks as a CSV.\n\nClients pay the contractor directly. There is no online card payment inside Constra.",
  },
  {
    id: "reports",
    words: ["report", "reports", "summary", "totals", "labour cost", "labor cost"],
    answer: "Reports (admins): menu → **Reports**. You get a payroll summary, hours by person and job, and project costs. Download any of them as PDF or CSV. The **Payroll Summary** card shows each person's hours and pay at a glance.",
  },
  {
    id: "offline",
    words: ["offline", "no signal", "no internet", "no service", "no wifi", "no wi-fi", "sync", "syncing", "not syncing", "doesnt sync", "doesn't sync", "reconnect"],
    answer: "Constra works with no signal. Clock-ins, reports, tasks, photos, messages and more save on the phone and send themselves when you reconnect. To force it, pull down to refresh on any screen.\n\nThings that need a connection: adding a new crew member, emailing an invoice, and seeing changes other people just made.",
  },
  {
    id: "install",
    words: ["install", "download app", "play store", "google play", "app store", "iphone", "android", "home screen", "get the app", "update the app"],
    answer: "Android: install **Constra: Crew Timesheets & GPS** from Google Play. iPhone: open getconstra.com in Safari → Share → **Add to Home Screen**.\n\nThe app updates itself. If something looks old, close it fully and open it again, or clear the app's storage (your account and data stay safe online).",
  },
  {
    id: "login",
    words: ["login", "log in", "sign in", "password", "forgot password", "reset password", "locked out", "cant log", "can't log", "cannot log"],
    answer: "Can't sign in? On the sign-in screen tap **Forgot password**. We email you a reset link (check spam). Make sure you use the same email you signed up with. To change your password later: Settings → Security.\n\nStill stuck? Email support@getconstra.com.",
  },
  {
    id: "notifications",
    words: ["notification", "notifications", "alerts", "not getting", "push", "reminder", "reminders"],
    answer: "Notifications: Settings → **Notifications**, make sure they're on. Also allow notifications for the app in your phone settings. Owners get an alert when someone leaves a job site while clocked in, and anyone still clocked in after 10 hours gets a reminder.",
  },
  {
    id: "settings",
    words: ["settings", "dark mode", "light mode", "theme", "text size", "bigger text", "font", "language", "logo", "company name"],
    answer: "Settings: menu → **Settings**. There you can change theme (dark or light), text size (Normal, Large, Extra large) and language. Admins also set the company name, logo and invite code. The logo shows up on every PDF.",
  },
  {
    id: "delete",
    words: ["delete account", "delete my account", "remove account", "close account", "cancel account", "privacy", "my data"],
    answer: "To delete your account: Settings → Security → **Delete account**. This is permanent. Your privacy details are at getconstra.com/privacy. Questions about your data? Email support@getconstra.com.",
  },
  {
    id: "price",
    billing: true,
    words: ["price", "pricing", "cost", "how much", "free", "pay for", "subscription", "plan", "upgrade", "cancel plan", "billing", "pro plan", "trial"],
    answer: "Constra is free while we launch, with every feature, unlimited projects and unlimited crew. Plan changes go through support@getconstra.com, no penalties and no hidden fees.",
  },
  {
    id: "feedback",
    words: ["feedback", "suggest", "suggestion", "idea", "feature request", "bug", "broken", "problem", "issue", "not working", "doesnt work", "doesn't work", "glitch", "crash", "error"],
    answer: "Sorry about that. Try these first: close the app fully and reopen it, check you're online, and pull down to refresh.\n\nStill broken? Menu → **Send feedback** goes straight to the Constra team, who reply by email. You can also reach us at support@getconstra.com or 672-338-9890.",
  },
];

const GREETING = /^(hi|hello|hey|yo|good (morning|afternoon|evening)|sup|help)\b/i;
const THANKS = /\b(thanks|thank you|thx|cheers|ty)\b/i;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
}

function score(question: string, words: string[]): number {
  let total = 0;
  for (const w of words) {
    const nw = normalize(w);
    if (!nw) continue;
    if (nw.includes(" ")) { if (question.includes(nw)) total += 3 + nw.split(" ").length; }
    else if (new RegExp(`(^| )${nw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`).test(question)) total += 2;
  }
  return total;
}

export const HELP_FOLLOWUP = "Anything else? You can also call 672-338-9890 or email support@getconstra.com.";

/** Best answer for a question, or a friendly menu when nothing matches. `storeApp` hides price/plan topics. */
export function answerLocally(question: string, opts: { storeApp?: boolean; role?: string } = {}): string {
  const q = normalize(question);
  if (!q) return "Ask me anything about Constra, like clocking in, timesheets, crew or payroll.";
  if (THANKS.test(q) && q.split(" ").length <= 4) return "You're welcome! Ask if you need anything else.";
  const topics = TOPICS.filter((t) => !(opts.storeApp && t.billing));
  const ranked = topics.map((t) => ({ t, s: score(q, t.words) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  if (ranked.length) {
    const best = ranked[0];
    const second = ranked[1] && ranked[1].s >= best.s - 1 && ranked[1].s >= 3 ? ranked[1] : null;
    return second ? `${best.t.answer}\n\n---\n\n${second.t.answer}` : best.t.answer;
  }
  if (GREETING.test(q) && q.split(" ").length <= 4) {
    return "Hi! I can help with clocking in, timesheets, payroll, crew, schedules, time off, projects, safety and more. What do you need?";
  }
  return "I'm not sure about that one. Try asking about clocking in, timesheets, payroll, adding crew, the schedule, time off, projects, photos or offline use.\n\nFor anything else, call 672-338-9890 or email support@getconstra.com and a person will help.";
}
