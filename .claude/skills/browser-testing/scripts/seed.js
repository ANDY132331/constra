// Sample company for browser testing: 6 crew, 3 projects, a week of clock entries,
// 4 invoices, a daily report and a safety incident.
//
// Run this with p.evaluate() after the app has loaded once (the store must have hydrated).
// It builds times around 3:10pm today, so freeze the browser clock to match or running
// shifts come out in the future and read as negative:
//   const d = new Date(); d.setHours(15, 10, 0, 0);
//   await ctx.clock.install({ time: d }); await ctx.clock.resume();

(() => {
  const s = JSON.parse(localStorage.getItem("constra_v1") || "{}");
  const now = new Date(); now.setHours(15, 10, 0, 0);
  const at = (h, m, dayOffset = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const W = [
    ["w-aisha", "Aisha Patel", "AP", "Admin", "Admin / Owner", "#F5C400", 52],
    ["w-marco", "Marco Rossi", "MR", "Foreman", "Framing lead", "#1F6F8B", 42],
    ["w-dev", "Dev Lal", "DL", "Worker", "Labourer", "#3D6B2E", 26],
    ["w-jen", "Jen Huang", "JH", "Worker", "Electrician", "#8B5A1F", 38.5],
    ["w-sam", "Sam Okafor", "SO", "Worker", "Apprentice", "#6B3D6B", 22],
    ["w-tyler", "Tyler Brooks", "TB", "Foreman", "Site foreman", "#B9382C", 44],
  ];
  s.workers = W.map(([id, name, initials, role, customRole, color, hourlyRate], i) => ({
    id, name, initials, role, customRole, color, hourlyRate,
    email: "", phone: "", projectIds: [], clockedIn: i < 4,
    clockInTime: i < 4 ? at(i === 0 ? 7 : 6, i === 0 ? 2 : 58) : undefined,
  }));

  const P = [
    ["p-dundas", "Dundas St Reno", "Rivera Family", "#F5C400", 85000],
    ["p-queen", "Queen St Condo", "Northline Developments", "#3b82f6", 240000],
    ["p-harbour", "Harbourfront Fit-out", "Bayside Retail Co.", "#22c55e", 128000],
  ];
  // The store may not have hydrated yet, so constra_v1 can be {} with no projects array.
  // Reading s.projects[0] then throws and the whole seed fails with a confusing message.
  const base = (Array.isArray(s.projects) && s.projects[0]) || {};
  s.projects = P.map(([id, name, client, color, budget]) => ({
    ...base, id, name, client, color, budget, status: "active",
    address: "Toronto, ON", startDate: at(7, 0, -28), endDate: at(17, 0, 60),
    gps: { lat: 43.6532, lng: -79.3832 }, geofenceRadius: 500,
    tasks: [
      { id: id + "-t1", name: "Framing", progress: 100, workerId: "w-marco", startDate: at(7, 0, -24), endDate: at(17, 0, -8), status: "completed", color },
      { id: id + "-t2", name: "Electrical rough-in", progress: 65, workerId: "w-jen", startDate: at(7, 0, -6), endDate: at(17, 0, 9), status: "in-progress", color },
      { id: id + "-t3", name: "Drywall", progress: 15, workerId: "w-dev", startDate: at(7, 0, 2), endDate: at(17, 0, 20), status: "in-progress", color },
    ],
  }));

  const entries = [];
  let n = 0;
  for (let d = -6; d <= 0; d++) {
    for (const [id] of W.slice(0, 5)) {
      const open = d === 0 && ["w-aisha", "w-marco", "w-dev", "w-jen"].includes(id);
      entries.push({
        id: "ce-" + (n++), workerId: id,
        projectId: ["p-dundas", "p-queen", "p-harbour"][n % 3],
        clockIn: at(id === "w-aisha" ? 7 : 6, 58, d),
        clockOut: open ? undefined : at(id === "w-marco" ? 17 : 15, 30, d),
        gps: { lat: 43.6532, lng: -79.3832 },
      });
    }
  }
  s.clockEntries = entries;

  const items = (desc, qty, rate) => [{ description: desc, qty, rate }];
  s.invoices = [
    { id: "inv-1", number: "INV-2026-014", clientName: "Rivera Family", clientEmail: "", clientAddress: "", projectId: "p-dundas", status: "sent", issueDate: at(9, 0, -9), dueDate: at(9, 0, 21), items: [{ description: "Drywall, 2nd floor", qty: 1, rate: 5600 }, { description: "CO-07 Pot lights", qty: 1, rate: 1180 }], taxRate: 13, notes: "" },
    { id: "inv-2", number: "INV-2026-013", clientName: "Northline Developments", clientEmail: "", clientAddress: "", projectId: "p-queen", status: "paid", issueDate: at(9, 0, -34), dueDate: at(9, 0, -4), items: items("Framing, levels 2-4", 1, 24800), taxRate: 13, notes: "" },
    { id: "inv-3", number: "INV-2026-012", clientName: "Bayside Retail Co.", clientEmail: "", clientAddress: "", projectId: "p-harbour", status: "overdue", issueDate: at(9, 0, -52), dueDate: at(9, 0, -12), items: items("Site prep and demo", 1, 9400), taxRate: 13, notes: "" },
    { id: "inv-4", number: "INV-2026-015", clientName: "Rivera Family", clientEmail: "", clientAddress: "", projectId: "p-dundas", status: "draft", issueDate: at(9, 0, 0), dueDate: at(9, 0, 30), items: items("Electrical rough-in", 38.5, 92), taxRate: 13, notes: "" },
  ];

  s.dailyReports = [{
    id: "dr-1", projectId: "p-dundas", date: at(17, 0, -1), weather: "Overcast", temperatureF: 54,
    crewCount: 6, crewOnSite: ["Marco Rossi", "Dev Lal", "Jen Huang"],
    workCompleted: "Completed electrical rough-in on the second floor. Started drywall delivery staging in the garage.",
    delays: "Lumber delivery arrived two hours late.", materialsUsed: "40 sheets 1/2\" drywall, 12 boxes screws",
    visitorLog: "City inspector, 10:30am", notes: "", submittedById: "w-marco", createdAt: at(17, 5, -1),
  }];

  s.safetyIncidents = [{
    id: "si-1", projectId: "p-dundas", reportedById: "w-tyler", date: at(12, 35, -1),
    type: "near-miss", severity: "medium", description: "Open trench near the north wall was not barricaded. Taped off and foreman notified.",
    location: "North elevation", status: "resolved", actionTaken: "Barricade installed", photos: [],
  }];

  s.punchItems = [
    { id: "pi-1", projectId: "p-dundas", title: "Touch up paint, hallway", description: "", status: "open", priority: "low", assignedToId: "w-dev", createdAt: at(9, 0, -2), dueDate: at(17, 0, 4), photos: [] },
    { id: "pi-2", projectId: "p-queen", title: "Replace cracked outlet cover", description: "", status: "open", priority: "high", assignedToId: "w-jen", createdAt: at(9, 0, -1), dueDate: at(17, 0, 1), photos: [] },
  ];

  s.companyName = "Patel Contracting";
  s.currency = "CAD";
  s.onboarded = true;
  s.theme = "dark";
  s.authUserId = "w-aisha";
  localStorage.setItem("constra_v1", JSON.stringify(s));
  return "seeded " + s.workers.length + "w " + s.projects.length + "p " + s.clockEntries.length + "ce";
})()
