import { createEpisode } from "/gta/core.js";
const items = [["INVOICE 1041", "SENT  ·  PDF READY"], ["INVOICE 1042", "SENT  ·  PDF READY"], ["ESTIMATE 207", "SENT  ·  PDF READY"], ["INVOICE 1043", "SENT  ·  PDF READY"], ["CHANGE ORDER 12", "SENT  ·  PDF READY"], ["INVOICE 1044", "SENT  ·  PDF READY"]];
export default createEpisode({
  mood: "day", seed: 43, title: "GET PAID", objective: "MISSION: SEND THE INVOICES", big: "SENT!", wanted: "UNPAID", cash: 4200,
  radio: "DOWNTOWN FM — \"CLOSING DEALS\"", ring: "#ffd23a",
  items: items.map(([a, b]) => ({ title: a + " SENT", sub: b, tag: a.split(" ").slice(0, 2).join(" ") })),
  stats: [["INVOICES SENT", "6 / 6"], ["PAPERWORK IN THE TRUCK", "0"], ["CHASING EMAILS", "0"], ["PDF EXPORT", "DONE"]],
  brand: ["INVOICES. ESTIMATES. CHANGE ORDERS.", "SEND THEM FROM THE TRUCK."], siteLine: "BILLED · CONSTRA", truck: "#2c3040",
  music: { bpm: 126, roots: [65.41, 49, 55, 73.42], chords: [[261.6, 329.6, 392], [196, 246.9, 293.7], [220, 261.6, 329.6], [293.7, 370, 440]], lead: "square" },
  shots: [[0, "chaseLow"], [1.7, "passby"], [3.2, "sideHigh"], [4.6, "frontLow"], [6.1, "hood"], [7.5, "drone"], [8.9, "passby"], [10.3, "wheel"], [11.7, "chaseHigh"], [13.1, "sideLow"], [14.5, "hood"], [15.9, "droneSide"], [17.3, "frontLow"], [18.7, "passby"], [20.0, "chaseBrake"], [22.0, "orbit"]],
});
