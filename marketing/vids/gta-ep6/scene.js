import { createEpisode } from "/gta/core.js";
const items = [["PPE CHECK", "6:40 AM"], ["TOOLBOX TALK", "6:50 AM"], ["HAZARD REPORT", "7:05 AM"], ["SITE PHOTOS", "7:20 AM"], ["DAILY REPORT", "3:30 PM"], ["SIGN-OFF", "3:45 PM"]];
export default createEpisode({
  mood: "dawn", seed: 67, title: "SAFETY FIRST", objective: "MISSION: DAILY SAFETY", big: "LOGGED!", wanted: "UNLOGGED", cash: 15000,
  radio: "SUNRISE FM — \"HARD HATS ON\"", ring: "#2eaa62",
  items: items.map(([a, b]) => ({ title: a + " DONE", sub: "LOGGED  ·  " + b, tag: a })),
  stats: [["CHECKS DONE", "6 / 6"], ["INCIDENTS", "0"], ["PAPERWORK LEFT", "NONE"], ["SAFETY LOG", "UP TO DATE"]],
  brand: ["SAFETY LOGS. DAILY REPORTS. PHOTOS.", "ALL IN ONE APP."], siteLine: "SAFETY FIRST · CONSTRA", truck: "#33424f",
  music: { bpm: 120, roots: [49, 55, 41.2, 43.65], chords: [[196, 246.9, 293.7], [220, 277.2, 329.6], [164.8, 207.7, 246.9], [174.6, 220, 261.6]], lead: "triangle" },
  shots: [[0, "passby"], [1.7, "chaseLow"], [3.2, "frontLow"], [4.6, "sideHigh"], [6.1, "hood"], [7.5, "chaseHigh"], [8.9, "wheel"], [10.3, "passby"], [11.7, "drone"], [13.1, "sideLow"], [14.5, "droneSide"], [15.9, "hood"], [17.3, "frontLow"], [18.7, "passby"], [20.0, "chaseBrake"], [22.0, "orbit"]],
});
