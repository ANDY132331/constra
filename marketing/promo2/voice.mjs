import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import fs from "fs";
// v2 of the infomercial parody: more natural, conversational lines. "Constra" is spelled "Konstra" so it reads CON-stra.
const K = "Konstra", M = "en-US-AndrewMultilingualNeural", J = "en-US-AvaMultilingualNeural", D = "en-US-BrianMultilingualNeural", A = "en-US-GuyNeural";
export const LINES = [
  { id: 1, v: A, rate: "+8%", pitch: "-2Hz", t: "Are you tired of paperwork? Buried in it? Drowning in it?" },
  { id: 2, v: D, rate: "+12%", pitch: "+4Hz", t: "Help! I can't find the timesheet!" },
  { id: 3, v: A, rate: "+8%", pitch: "-2Hz", t: "Lost hours? Missed invoices? A crew who swears they were at Queen Street?" },
  { id: 4, v: J, rate: "+6%", pitch: "+2Hz", t: "I swear, I was at Queen Street!" },
  { id: 5, v: M, rate: "+2%", pitch: "+0Hz", t: "Okay. That's enough. There has to be a better way!" },
  { id: 6, v: A, rate: "-6%", pitch: "-2Hz", t: `Introducing... ${K}!` },
  { id: 7, v: M, rate: "+4%", pitch: "+0Hz", t: "Watch this. Clock in, with a photo and GPS." },
  { id: 8, v: J, rate: "+6%", pitch: "+2Hz", t: "Timesheets? Done. PDF or Excel, with overtime already worked out." },
  { id: 9, v: M, rate: "+4%", pitch: "+0Hz", t: "Schedules, daily tasks, progress at a glance. And an AI assistant that answers anything." },
  { id: 10, v: J, rate: "+8%", pitch: "+2Hz", t: "Twenty-six tools, in one app!" },
  { id: 11, v: A, rate: "+8%", pitch: "-2Hz", t: "But wait... there's more! Twenty-three more tools!" },
  { id: 12, v: M, rate: "+2%", pitch: "+0Hz", t: "Now, how much would you pay? Ten thousand dollars? Five thousand?" },
  { id: 13, v: A, rate: "+10%", pitch: "-2Hz", t: "Nope! It's free while it's launching!" },
  { id: 14, v: D, rate: "+6%", pitch: "+2Hz", t: "And I'm done by noon!" },
  { id: 15, v: M, rate: "+0%", pitch: "+0Hz", t: `${K}. Run the job, not the paperwork!` },
];
if (process.argv[1].endsWith("voice.mjs")) {
  const OUT = process.env.OUT || "promo2/vo"; fs.mkdirSync(OUT, { recursive: true });
  for (const L of LINES) {
    if (process.env.ONLY && +process.env.ONLY !== L.id) continue;
    let chunks, words;
    for (let a = 0; a < 3; a++) {
      const t = new MsEdgeTTS(); await t.setMetadata(L.v, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
      const r = t.toStream(L.t, { rate: L.rate, pitch: L.pitch }); chunks = []; words = [];
      r.audioStream.on("data", (d) => chunks.push(d)); r.audioStream.on("error", () => {});
      r.metadataStream?.on("data", (d) => { try { for (const m of JSON.parse(d.toString()).Metadata) if (m.Type === "WordBoundary") words.push({ w: m.Data.text.Text, t: m.Data.Offset / 1e7, d: m.Data.Duration / 1e7 }); } catch {} });
      await new Promise((res) => { r.audioStream.on("close", res); r.audioStream.on("end", res); setTimeout(res, 20000); });
      await new Promise((r2) => setTimeout(r2, 300));
      if (chunks.length) break;
    }
    const n = String(L.id).padStart(2, "0");
    fs.writeFileSync(`${OUT}/vo-${n}.mp3`, Buffer.concat(chunks)); fs.writeFileSync(`${OUT}/vo-${n}.json`, JSON.stringify(words));
    console.log(L.id, Buffer.concat(chunks).length, "bytes", words.length, "words");
  }
}
