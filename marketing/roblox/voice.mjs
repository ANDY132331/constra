// Needs msedge-tts: run from a folder that can resolve it (e.g. cd .tmp-ad && node ../marketing/roblox/voice.mjs), writes .tmp-ad/roblox/vo.
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import fs from "fs";
// Neural voices via Edge's free read-aloud service (no key). Tags are rejected, so pauses come from punctuation
// and "Constra" is respelled "Konstra" so it reads CON-stra.
const K = "Konstra";
export const LINES = [
  { id: 1, who: "mac", v: "en-US-AndrewMultilingualNeural", rate: "-4%", t: "Hey, I'm Mac. I run a framing crew." },
  { id: 2, who: "mac", v: "en-US-AndrewMultilingualNeural", rate: "+2%", t: "Every Friday, same story... who worked Tuesday?" },
  { id: 3, who: "jess", v: "en-US-AvaMultilingualNeural", rate: "+8%", t: "Mac! I was on Queen Street!" },
  { id: 4, who: "mac", v: "en-US-AndrewMultilingualNeural", rate: "-2%", t: "Or was it the other job? Honestly... nobody knows." },
  { id: 5, who: "mac", v: "en-US-AndrewMultilingualNeural", rate: "-4%", t: `So I put my whole crew on ${K}.` },
  { id: 6, who: "jess", v: "en-US-AvaMultilingualNeural", rate: "+6%", t: "Clocked in. Photo, location, done." },
  { id: 7, who: "mac", v: "en-US-AndrewMultilingualNeural", rate: "-2%", t: "And now I can actually see who's on site." },
  { id: 8, who: "mac", v: "en-US-AndrewMultilingualNeural", rate: "+2%", t: "Wait... Dev just left the site. On the clock!" },
  { id: 9, who: "dev", v: "en-US-BrianMultilingualNeural", rate: "+0%", t: "Uh... lunch run?" },
  { id: 10, who: "mac", v: "en-US-AndrewMultilingualNeural", rate: "-2%", t: `${K} told me. The exact time, and how far you went.` },
  { id: 11, who: "mac", v: "en-US-AndrewMultilingualNeural", rate: "-2%", t: "Come Friday, the timesheets are just there. My logo on top. PDF or Excel. Overtime already worked out." },
  { id: 12, who: "mac", v: "en-US-AndrewMultilingualNeural", rate: "+2%", t: "Hours track themselves. Every worker, every job." },
  { id: 13, who: "mac", v: "en-US-AndrewMultilingualNeural", rate: "+2%", t: "I plan the crew's schedule, and see daily tasks and progress at a glance." },
  { id: 14, who: "mac", v: "en-US-AndrewMultilingualNeural", rate: "+0%", t: "There's even an AI assistant. Just ask it. How many hours did Jess work?" },
  { id: 15, who: "mac", v: "en-US-AndrewMultilingualNeural", rate: "+0%", t: "Twenty-six tools, in one app. Estimates, invoices, R F Is, change orders, plus twenty-three more tools. And it all works when the signal drops." },
  { id: 16, who: "mac", v: "en-US-AndrewMultilingualNeural", rate: "-4%", t: `It's free while it's launching. Get your crew on ${K}.` },
  { id: 17, who: "mac", v: "en-US-AndrewMultilingualNeural", rate: "-6%", t: `${K}. Run the job, not the paperwork.` },
];
if (process.argv[1].endsWith("voice.mjs")) {
  for (const L of LINES) {
    const t = new MsEdgeTTS();
    await t.setMetadata(L.v, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
    let r, chunks, words;
    for (let a = 0; a < 3; a++) {
      r = t.toStream(L.t, { rate: L.rate }); chunks = []; words = [];
      r.audioStream.on("data", (d) => chunks.push(d));
      r.metadataStream?.on("data", (d) => { try { for (const m of JSON.parse(d.toString()).Metadata) if (m.Type === "WordBoundary") words.push({ w: m.Data.text.Text, t: m.Data.Offset / 1e7, d: m.Data.Duration / 1e7 }); } catch {} });
      r.audioStream.on("error", () => {});
      await new Promise((res) => { r.audioStream.on("close", res); r.audioStream.on("end", res); setTimeout(res, 20000); });
      await new Promise((r2) => setTimeout(r2, 300));
      if (chunks.length) break;
    }
    const n = String(L.id).padStart(2, "0");
    fs.writeFileSync(`../../.tmp-ad/roblox/vo/vo-${n}.mp3`, Buffer.concat(chunks));
    fs.writeFileSync(`../../.tmp-ad/roblox/vo/vo-${n}.json`, JSON.stringify(words));
    console.log(L.id, L.who, Buffer.concat(chunks).length, "bytes", words.length, "words");
  }
}
