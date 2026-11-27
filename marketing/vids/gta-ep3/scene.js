import { createEpisode } from "/gta/core.js";
const names = [["MARCO", "42.5 HRS"], ["AISHA", "40.0 HRS"], ["DEV", "38.5 HRS"], ["JUN", "44.0 HRS"], ["SOFIA", "40.0 HRS"], ["LUIS", "36.5 HRS"]];
export default createEpisode({
  mood: "dawn", seed: 31, title: "DELIVER PAYROLL", objective: "MISSION: PAY THE CREW", big: "PAID!", wanted: "LATE PAY", cash: 20000,
  radio: "SUNRISE FM — \"FRIDAY\"",
  items: names.map(([n, t]) => ({ title: n + " PAID", sub: t + "  ·  TIMESHEET APPROVED", tag: n })),
  stats: [["CREW PAID", "6 / 6"], ["PAYROLL ERRORS", "0"], ["HOURS ADDED BY HAND", "0"], ["PAYROLL SENT", "YES"]],
  brand: ["TIMESHEETS TO PAYROLL.", "EXPORT IT IN A TAP."], siteLine: "PAYDAY · CONSTRA",
  music: { bpm: 124, roots: [58.27, 43.65, 51.91, 65.41], chords: [[233.1, 293.7, 349.2], [174.6, 220, 261.6], [207.7, 261.6, 311.1], [261.6, 329.6, 392]], lead: "triangle" },
  shots: [[0, "chaseHigh"], [1.7, "passby"], [3.2, "sideLow"], [4.6, "hood"], [6.1, "frontLow"], [7.5, "wheel"], [8.9, "droneSide"], [10.3, "passby"], [11.7, "chaseLow"], [13.1, "frontLow"], [14.5, "sideHigh"], [15.9, "drone"], [17.3, "hood"], [18.7, "passby"], [20.0, "chaseBrake"], [22.0, "orbit"]],
});
