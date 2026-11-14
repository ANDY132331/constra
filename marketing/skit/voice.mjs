import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import fs from "fs";
// "The Case of the Missing Hours": a noir skit. Neural voices via Edge's free read-aloud service; "Constra" is spelled "Konstra" so it reads CON-stra.
const K = "Konstra", M = "en-US-AndrewMultilingualNeural", J = "en-US-AvaMultilingualNeural", D = "en-US-BrianMultilingualNeural";
export const LINES = [
  { id: 1, v: M, rate: "-12%", pitch: "-6Hz", t: "Friday. Payroll day. And somewhere on this site... three hours had gone missing." },
  { id: 2, v: J, rate: "+6%", pitch: "+0Hz", t: "Mac! Dev's timesheet says forty-one hours. I only saw him for thirty-eight!" },
  { id: 3, v: M, rate: "-12%", pitch: "-6Hz", t: "Three hours. Somebody's lying." },
  { id: 4, v: M, rate: "-8%", pitch: "-4Hz", t: "Dev. Where were you Tuesday... at eleven forty-two?" },
  { id: 5, v: D, rate: "+8%", pitch: "+2Hz", t: "Me? I was framing! All day! Ask anyone!" },
  { id: 6, v: M, rate: "-8%", pitch: "-4Hz", t: `Funny. Because ${K} says otherwise.` },
  { id: 7, v: M, rate: "-2%", pitch: "-2Hz", t: "Left the site Tuesday. Wednesday. Thursday. One hour each. Same taco truck." },
  { id: 8, v: D, rate: "-6%", pitch: "+0Hz", t: "...It was a really good taco." },
  { id: 9, v: J, rate: "+8%", pitch: "+2Hz", t: "Case closed!" },
  { id: 10, v: M, rate: "+0%", pitch: "+0Hz", t: "No guessing. No arguing. Every hour, on record, for the whole crew." },
  { id: 11, v: M, rate: "-2%", pitch: "+0Hz", t: `${K}. Twenty-six tools, one app. Free while it's launching.` },
  { id: 12, v: M, rate: "-6%", pitch: "-2Hz", t: "Run the job, not the paperwork." },
];
if (process.argv[1].endsWith("voice.mjs")) {
  const OUT = process.env.OUT || "../../.tmp-ad/skit/vo";
  fs.mkdirSync(OUT, { recursive: true });
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
