import { createEpisode } from "/gta/core.js";
const names = [["MARCO", "6:55 AM"], ["AISHA", "6:58 AM"], ["DEV", "6:59 AM"], ["JUN", "7:00 AM"], ["SOFIA", "6:57 AM"], ["LUIS", "7:01 AM"]];
export default createEpisode({
  mood: "sunset", seed: 7, title: "CLOCK IN THE CREW", objective: "MISSION: CLOCK IN THE CREW", big: "CLOCKED IN!", wanted: "PAPERWORK",
  radio: "GOLDEN HOUR FM — \"OVERTIME\"",
  items: names.map(([n, t]) => ({ title: n + " CLOCKED IN", sub: t + "  ·  GPS VERIFIED", tag: n })),
  stats: [["CREW CLOCKED IN", "6 / 6"], ["LATE ARRIVALS", "0"], ["TIMESHEET ERRORS", "0"], ["PAPERWORK LEFT", "NONE"]],
  brand: ["GPS CLOCK-IN. TIMESHEETS. PAYROLL.", "ONE APP FOR THE WHOLE CREW."], siteLine: "CONSTRA · CREW ONLY",
});
