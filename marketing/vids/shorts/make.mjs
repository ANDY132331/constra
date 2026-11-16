// Shorts factory.
//   node marketing/vids/shorts/make.mjs prep [ids...]     writes .tmp-ad/vids/sh-<id>/{lines,scenario}.json from scripts-*.json
//   node marketing/vids/shorts/make.mjs run [ids...]      prep + voices + 720p render into marketing/promo-videos/drafts (3 at a time)
// Every script: { id, title, bg: site|office|kitchen|night, cast: [...], hook, lines: [[who, text, mood, reactMood, popText, sfx]], feature, featureAt, chips, props, music, sign }
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const ROOT = path.resolve(new URL("../../..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const DIR = path.join(ROOT, "marketing/vids/shorts");
const VOICE = {
  Mac: ["en-US-AndrewMultilingualNeural", "+2%", "+0Hz"], Jess: ["en-US-AvaMultilingualNeural", "+6%", "+0Hz"], Dev: ["en-US-BrianMultilingualNeural", "+2%", "+0Hz"], Kai: ["en-US-ChristopherNeural", "-2%", "+0Hz"],
  Priya: ["en-US-JennyNeural", "+4%", "+0Hz"], Tony: ["en-US-EricNeural", "-4%", "-4Hz"], Bea: ["en-US-MichelleNeural", "+4%", "+0Hz"], Voice: ["en-US-GuyNeural", "-4%", "-3Hz"],
};
const all = fs.readdirSync(DIR).filter((f) => /^scripts-.*\.json$/.test(f)).sort().flatMap((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")));
const [cmd = "prep", ...ids] = process.argv.slice(2); const pick = ids.length ? all.filter((s) => ids.includes(s.id)) : all;
const slug = (s) => s.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, " ");

function prep(s) {
  const dir = path.join(ROOT, ".tmp-ad/vids", "sh-" + s.id); fs.mkdirSync(dir, { recursive: true });
  const lines = s.lines.map(([who, text], i) => ({ who, voice: VOICE[who][0], rate: VOICE[who][1], pitch: VOICE[who][2], gap: i === 0 ? 0.55 : 0.28, text }));
  lines.push({ who: "Voice", voice: VOICE.Voice[0], rate: VOICE.Voice[1], pitch: VOICE.Voice[2], gap: 0.55, text: "Constra. Run the job, not the paperwork." });
  fs.writeFileSync(path.join(dir, "lines.json"), JSON.stringify(lines));
  fs.writeFileSync(path.join(dir, "scenario.json"), JSON.stringify({ ...s, lines: s.lines }));
}
const sh = (c, args, cwd, env = {}) => new Promise((res) => { const p = spawn(c, args, { cwd, env: { ...process.env, ...env }, stdio: "ignore", shell: false }); p.on("close", res); });
async function voices(s) {
  const cwd = path.join(ROOT, ".tmp-ad");
  for (let a = 0; a < 5; a++) {
    await sh("node", ["vids-voice.mjs", "sh-" + s.id], cwd);
    const vo = path.join(cwd, "vids", "sh-" + s.id, "vo"); const n = s.lines.length + 1;
    const ok = fs.existsSync(vo) && Array.from({ length: n }, (_, i) => path.join(vo, `vo-${String(i + 1).padStart(2, "0")}.mp3`)).every((f) => fs.existsSync(f) && fs.statSync(f).size > 2000);
    if (ok) return true;
  }
  return false;
}
async function one(s) {
  prep(s); if (!(await voices(s))) { console.log("VOICE FAIL", s.id); return; }
  const out = path.join(ROOT, "marketing/promo-videos/drafts", `${s.id} ${slug(s)}.mp4`); fs.mkdirSync(path.dirname(out), { recursive: true });
  await sh("node", ["marketing/vids/render.mjs", "sh-" + s.id, "video", "v"], ROOT, { CBR: "1", SCALE: "0.6667", BR: "800000", AB: "96000", OUTFILE: out });
  console.log(fs.existsSync(out) ? "done " + s.id + " " + Math.round(fs.statSync(out).size / 1024) + "KB" : "RENDER FAIL " + s.id);
}
if (cmd === "prep") { pick.forEach(prep); console.log("prepped", pick.length); }
else {
  const queue = pick.filter((s) => !fs.existsSync(path.join(ROOT, "marketing/promo-videos/drafts")) || !fs.readdirSync(path.join(ROOT, "marketing/promo-videos/drafts")).some((f) => f.startsWith(s.id + " ")));
  const N = +(process.env.PAR || 3); let i = 0;
  await Promise.all(Array.from({ length: N }, async () => { while (i < queue.length) { const s = queue[i++]; await one(s); } }));
  console.log("batch finished");
}
