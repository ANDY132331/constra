import { createEpisode } from "/gta/core.js";
const names = [["MARCO", "EDITED 3:30 PM"], ["AISHA", "EDITED 4:00 PM"], ["DEV", "EDITED 3:45 PM"], ["JUN", "EDITED 4:15 PM"], ["SOFIA", "EDITED 3:30 PM"], ["LUIS", "EDITED 4:05 PM"]];
export default createEpisode({
  mood: "sunset", seed: 55, title: "FIX THE TIMESHEETS", objective: "MISSION: FIX THE MISSED PUNCHES", big: "FIXED!", wanted: "MISSED PUNCH", cash: 9900,
  radio: "GOLDEN HOUR FM — \"FORGOT TO CLOCK OUT\"", ring: "#ff7ab8",
  items: names.map(([n, t]) => ({ title: n + " FIXED", sub: "CLOCK-OUT  ·  " + t, tag: n })),
  stats: [["TIMESHEETS FIXED", "6 / 6"], ["MISSING CLOCK-OUTS", "0"], ["ARGUMENTS", "0"], ["READY FOR PAYROLL", "YES"]],
  brand: ["ADD, EDIT AND APPROVE TIMES.", "ONE TAP, DONE."], siteLine: "PUNCH LIST · CONSTRA", truck: "#4a2d3a",
  music: { bpm: 122, roots: [55, 49, 43.65, 61.74], chords: [[220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [246.9, 311.1, 370]], lead: "sawtooth" },
  shots: [[0, "hood"], [1.7, "chaseHigh"], [3.2, "passby"], [4.6, "sideLow"], [6.1, "chaseLow"], [7.5, "droneSide"], [8.9, "frontLow"], [10.3, "passby"], [11.7, "wheel"], [13.1, "hood"], [14.5, "sideHigh"], [15.9, "frontLow"], [17.3, "drone"], [18.7, "passby"], [20.0, "chaseBrake"], [22.0, "orbit"]],
});
