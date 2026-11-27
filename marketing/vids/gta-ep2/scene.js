import { createEpisode } from "/gta/core.js";
const names = [["MARCO", "6:55 PM"], ["AISHA", "6:58 PM"], ["DEV", "6:59 PM"], ["JUN", "7:00 PM"], ["SOFIA", "6:57 PM"], ["LUIS", "7:01 PM"]];
export default createEpisode({
  mood: "night", seed: 19, title: "ENTER THE GEOFENCE", objective: "MISSION: GET THE CREW ON SITE", big: "ON SITE!", wanted: "BUDDY PUNCH", cash: 8400,
  radio: "MIDNIGHT FM — \"NIGHT SHIFT\"", ring: "#19d3ff",
  items: names.map(([n, t]) => ({ title: n + " ARRIVED", sub: t + "  ·  GEOFENCE ENTERED", tag: n })),
  stats: [["CREW ON SITE", "6 / 6"], ["BUDDY PUNCHES", "0"], ["OFF-SITE CLOCK-INS", "0"], ["GPS PROOF", "ON FILE"]],
  brand: ["GPS CLOCK-IN WITH PHOTO PROOF.", "KNOW WHO'S ON SITE."], siteLine: "NIGHT SHIFT · CONSTRA",
  music: { bpm: 118, roots: [49, 41.2, 55, 43.65], chords: [[196, 233.1, 293.7], [164.8, 196, 246.9], [220, 261.6, 329.6], [174.6, 220, 261.6]], lead: "sawtooth" },
  shots: [[0, "chaseLow"], [1.6, "sideLow"], [3.2, "hood"], [4.6, "passby"], [6.1, "frontLow"], [7.4, "droneSide"], [8.9, "wheel"], [10.3, "passby"], [11.7, "chaseHigh"], [13.1, "sideHigh"], [14.5, "frontLow"], [15.9, "hood"], [17.3, "drone"], [18.7, "passby"], [20.0, "chaseBrake"], [22.0, "orbit"]],
});
