import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import fs from "fs";
// Run from the .tmp-ad folder (that is where msedge-tts is installed):
//   node vids-voice.mjs <name>  (copy of this file placed in .tmp-ad so msedge-tts resolves)     -> reads marketing/vids/<name>/lines.json, writes vids/<name>/vo/vo-NN.mp3 + .json
//   ONLY=7 node ../marketing/vids/voice.mjs <name>   -> redo one line (the endpoint sometimes returns 0 bytes)
const name = process.argv[2]; const here = "../marketing/vids/";
const lines = JSON.parse(fs.readFileSync(`${here}${name}/lines.json`, "utf8"));
const OUT = process.env.OUT || `vids/${name}/vo`; fs.mkdirSync(OUT, { recursive: true });
for (let i = 0; i < lines.length; i++) {
  const L = lines[i], id = i + 1; if (process.env.ONLY && +process.env.ONLY !== id) continue;
  const n0 = String(id).padStart(2, "0"); if (!process.env.FORCE && fs.existsSync(`${OUT}/vo-${n0}.mp3`) && fs.statSync(`${OUT}/vo-${n0}.mp3`).size > 2000) { console.log(id, "kept"); continue; }
  let chunks, words;
  for (let a = 0; a < 6; a++) {
    const t = new MsEdgeTTS(); await t.setMetadata(L.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
    const r = t.toStream((L.say ?? L.text).replace(/Constra/g, "Konstra"), { rate: L.rate ?? "+0%", pitch: L.pitch ?? "+0Hz" }); chunks = []; words = [];
    r.audioStream.on("data", (d) => chunks.push(d)); r.audioStream.on("error", () => {});
    r.metadataStream?.on("data", (d) => { try { for (const m of JSON.parse(d.toString()).Metadata) if (m.Type === "WordBoundary") words.push({ w: m.Data.text.Text, t: m.Data.Offset / 1e7, d: m.Data.Duration / 1e7 }); } catch {} });
    await new Promise((res) => { r.audioStream.on("close", res); r.audioStream.on("end", res); setTimeout(res, 20000); });
    await new Promise((r2) => setTimeout(r2, 300));
    if (chunks.length) break;
  }
  const n = String(id).padStart(2, "0");
  fs.writeFileSync(`${OUT}/vo-${n}.mp3`, Buffer.concat(chunks)); fs.writeFileSync(`${OUT}/vo-${n}.json`, JSON.stringify(words));
  console.log(id, Buffer.concat(chunks).length, "bytes", words.length, "words");
}
