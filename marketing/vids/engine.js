// Shared 2D video engine for the promo-videos folder.
// A scene (./scene.js) default-exports { endHold?, voices:{who:{pan,gain}}, init?(E,ctx), draw(t,c,E), audio(h,E) }.
// The engine loads lines.json + the TTS files, builds the timeline, mixes voice + music, and encodes H.264 + AAC.
const MODE = new URLSearchParams(location.search).get("mode") === "h" ? "h" : "v";
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => (t = clamp(t), t * t * (3 - 2 * t));
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const easeBack = (t) => { t = clamp(t); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
export const easeElastic = (t) => { t = clamp(t); return t === 0 || t === 1 ? t : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1; };
export const rnd = (s) => { s = (s * 16807) % 2147483647; return s / 2147483647; };
export const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("img " + src)); i.src = src; });

export async function start(scene) {
  const V = MODE === "v", W = V ? 1080 : 1920, H = V ? 1920 : 1080, FPS = 30;
  const out = document.getElementById("out"); out.width = W; out.height = H; const ctx = out.getContext("2d");
  const lines = await (await fetch("/lines.json")).json(); const N = lines.length;
  const bufs = [], words = [], gains = [], VO_AT = [], VO_END = [];
  let DURATION = 0;
  const E = { W, H, V, FPS, lines, N, words, VO_AT, VO_END, scene, get DURATION() { return DURATION; } };
  E.L = (i) => VO_AT[i]; E.LE = (i) => VO_END[i];
  E.W_ = (i, re, fb = 0) => { const ws = words[i]; const k = ws.findIndex((w) => re.test(w.w)); const last = ws[ws.length - 1]; return VO_AT[i] + (k >= 0 ? ws[k].t : (last ? (last.t + last.d) * fb : 0)); };
  E.lineAt = (t) => { for (let i = 0; i < N; i++) if (t >= VO_AT[i] - 0.05 && t < VO_END[i] + 0.05) return i; return -1; };
  // which display word (of m) is being spoken at time t in line i; used for karaoke highlight
  E.wordIndex = (i, t, m) => { const ws = words[i]; if (!ws.length) return -1; const rel = t - VO_AT[i]; let n = -1; for (let k = 0; k < ws.length; k++) if (rel >= ws[k].t - 0.02) n = k; if (n < 0) return -1; return Math.min(m - 1, Math.floor(n * m / ws.length + (m / ws.length) * 0.5)); };
  E.speaking = (who, t) => { const i = E.lineAt(t); return i >= 0 && lines[i].who === who ? i : -1; };
  // 0..1 mouth/loudness for a speaker at t, from word timings (a stand-in for lip movement)
  E.mouth = (who, t) => { const i = E.speaking(who, t); if (i < 0) return 0; const ws = words[i], rel = t - VO_AT[i]; for (let k = 0; k < ws.length; k++) if (rel >= ws[k].t - 0.02 && rel < ws[k].t + ws[k].d + 0.04) return 0.45 + 0.55 * Math.abs(Math.sin((rel - ws[k].t) * 17 + k)); return 0.08; };

  window.prepare = async () => {
    const dec = new OfflineAudioContext(1, 48000, 48000); let t = scene.lead ?? 0.2;
    for (let i = 0; i < N; i++) {
      const n = String(i + 1).padStart(2, "0");
      const b = await dec.decodeAudioData(await (await fetch(`/vo/vo-${n}.mp3`)).arrayBuffer()); bufs.push(b); words.push(await (await fetch(`/vo/vo-${n}.json`)).json());
      const d = b.getChannelData(0); let s = 0, c = 0; for (let k = 0; k < d.length; k++) if (Math.abs(d[k]) > 0.01) { s += d[k] * d[k]; c++; } const rms = Math.sqrt(s / Math.max(1, c)); gains.push(clamp(0.115 / Math.max(rms, 0.01), 0.55, 2.4));
      t += lines[i].gap ?? 0.35; VO_AT.push(t); const lw = words[i][words[i].length - 1], sp = lw ? lw.t + lw.d : b.duration; const dur = Math.min(b.duration, sp + 0.4); VO_END.push(t + dur); t += dur;
    }
    DURATION = t + (scene.endHold ?? 3);
    if (scene.init) await scene.init(E, ctx);
    return { duration: +DURATION.toFixed(2), lines: VO_AT.map((a, i) => [+a.toFixed(2), +VO_END[i].toFixed(2)]), W, H };
  };

  window.drawFrame = (t) => { ctx.save(); ctx.clearRect(0, 0, W, H); scene.draw(t, ctx, E); ctx.restore(); };

  async function mixAudio() {
    const SR = 48000, A = new OfflineAudioContext(2, Math.ceil(SR * DURATION), SR);
    const master = A.createGain(); master.gain.setValueAtTime(0.95, 0); master.gain.setValueAtTime(0.95, DURATION - 1.2); master.gain.linearRampToValueAtTime(0, DURATION - 0.05);
    const comp = A.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2; comp.connect(master).connect(A.destination);
    const vox = A.createGain(); vox.gain.value = 1.3; const hp = A.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 90;
    const warm = A.createBiquadFilter(); warm.type = "lowshelf"; warm.frequency.value = 200; warm.gain.value = 2.5; const pres = A.createBiquadFilter(); pres.type = "peaking"; pres.frequency.value = 3200; pres.gain.value = 2.4; pres.Q.value = 0.9;
    const air = A.createBiquadFilter(); air.type = "highshelf"; air.frequency.value = 8500; air.gain.value = 1.5; vox.connect(hp).connect(warm).connect(pres).connect(air); air.connect(comp);
    const ir = A.createBuffer(2, Math.round(SR * (scene.room ?? 0.6)), SR); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let s = 11 + c * 7; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / d.length, 3.2); } }
    const conv = A.createConvolver(); conv.buffer = ir; const wet = A.createGain(); wet.gain.value = scene.reverb ?? 0.1; air.connect(conv).connect(wet).connect(comp);
    bufs.forEach((b, i) => { const v = scene.voices?.[lines[i].who] || {}; const s = A.createBufferSource(); s.buffer = b; const gn = A.createGain(); gn.gain.value = gains[i] * (v.gain ?? 1); const pan = A.createStereoPanner(); pan.pan.value = v.pan ?? 0; s.connect(gn).connect(pan).connect(vox); s.start(VO_AT[i]); });
    const noiseBuf = A.createBuffer(1, SR * 2, SR); { const d = noiseBuf.getChannelData(0); let s = 5; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } }
    // music and sfx routed through "duck" dip under every spoken line
    const bed = A.createGain(); bed.gain.value = scene.bedGain ?? 0.42; bed.connect(comp); const duck = A.createGain(); duck.gain.setValueAtTime(1, 0); duck.connect(bed);
    for (let i = 0; i < N; i++) { const a = VO_AT[i] - 0.05, b = VO_END[i]; duck.gain.setValueAtTime(1, Math.max(0, a - 0.15)); duck.gain.linearRampToValueAtTime(scene.duckTo ?? 0.35, a + 0.06); duck.gain.setValueAtTime(scene.duckTo ?? 0.35, b); duck.gain.linearRampToValueAtTime(1, b + 0.45); }
    const note = (f, t, d, type, vol, lpf, dest = duck) => { const o = A.createOscillator(); o.type = type; o.frequency.value = f; const g = A.createGain(), lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = lpf; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(lp).connect(g).connect(dest); o.start(t); o.stop(t + d + 0.05); };
    const hat = (t, v, dest = duck) => { const s = A.createBufferSource(); s.buffer = noiseBuf; const hf = A.createBiquadFilter(); hf.type = "highpass"; hf.frequency.value = 7500; const g = A.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(hf).connect(g).connect(dest); s.start(t); s.stop(t + 0.08); };
    const kick = (t, v, dest = duck) => { const o = A.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.1); const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(g).connect(dest); o.start(t); o.stop(t + 0.28); };
    const snare = (t, v, dest = duck) => { const s = A.createBufferSource(); s.buffer = noiseBuf; const bp = A.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1900; bp.Q.value = 0.7; const g = A.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); s.connect(bp).connect(g).connect(dest); s.start(t); s.stop(t + 0.2); };
    const burst = (t, f, q, dur, v, type = "bandpass", dest = comp) => { const s = A.createBufferSource(); s.buffer = noiseBuf; const bp = A.createBiquadFilter(); bp.type = type; bp.frequency.setValueAtTime(f[0], t); bp.frequency.exponentialRampToValueAtTime(f[1], t + dur); bp.Q.value = q; const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(bp).connect(g).connect(dest); s.start(t); s.stop(t + dur + 0.05); };
    const ding = (t, f, v = 0.12, dest = comp) => { const o = A.createOscillator(); o.type = "sine"; o.frequency.value = f; const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(g).connect(dest); o.start(t); o.stop(t + 0.6); };
    // f can be a number or [from,to] for a glide
    const tone = (f, t, d, v, type = "sine", dest = comp) => { const o = A.createOscillator(); o.type = type; o.frequency.setValueAtTime(Array.isArray(f) ? f[0] : f, t); if (Array.isArray(f)) o.frequency.exponentialRampToValueAtTime(f[1], t + d); const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(dest); o.start(t); o.stop(t + d + 0.05); };
    scene.audio?.({ A, comp, duck, bed, note, hat, kick, snare, burst, ding, tone, noiseBuf, SR }, E);
    return await A.startRendering();
  }
  const b64 = async (x) => { const u = new Uint8Array(x instanceof Blob ? await x.arrayBuffer() : x); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
  window.still = async (t) => { window.drawFrame(t); return await b64(await new Promise((r) => out.toBlob(r, "image/png"))); };
  window.encodeAll = async (bitrate, abr = 192000, cbr = false, scale = 1) => {
    const { Muxer, ArrayBufferTarget } = window.Mp4Muxer; const EW = Math.round(W * scale / 2) * 2, EH = Math.round(H * scale / 2) * 2, sc = scale < 1 ? Object.assign(document.createElement("canvas"), { width: EW, height: EH }) : out, sg = scale < 1 ? sc.getContext("2d") : null;
    const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: EW, height: EH, frameRate: FPS }, audio: { codec: "aac", numberOfChannels: 2, sampleRate: 48000 }, fastStart: "in-memory" });
    let err = null; const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { err = String(e); } });
    venc.configure({ codec: V ? "avc1.640033" : "avc1.640034", width: EW, height: EH, bitrate, framerate: FPS, latencyMode: cbr ? "realtime" : "quality", bitrateMode: cbr ? "constant" : "variable" });
    const audio = await mixAudio(), Lc = audio.getChannelData(0), Rc = audio.getChannelData(1); let peak = 0; for (let i = 0; i < Lc.length; i++) peak = Math.max(peak, Math.abs(Lc[i]), Math.abs(Rc[i])); const g = peak > 0.97 ? 0.97 / peak : 1;
    const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { err = String(e); } }); aenc.configure({ codec: "mp4a.40.2", sampleRate: 48000, numberOfChannels: 2, bitrate: abr });
    for (let off = 0; off < Lc.length; off += 1024) { const n = Math.min(1024, Lc.length - off), d = new Float32Array(n * 2); for (let k = 0; k < n; k++) { d[k] = Lc[off + k] * g; d[n + k] = Rc[off + k] * g; } const ad = new AudioData({ format: "f32-planar", sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(off / 48000 * 1e6), data: d }); aenc.encode(ad); ad.close(); }
    await aenc.flush(); const total = Math.round(DURATION * FPS);
    for (let i = 0; i < total; i++) { window.drawFrame(i / FPS); if (sg) sg.drawImage(out, 0, 0, EW, EH); const f = new VideoFrame(sc, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) }); venc.encode(f, { keyFrame: i % 60 === 0 }); f.close(); while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 8)); if (i % 150 === 0) console.log(`frame ${i}/${total}`); }
    await venc.flush(); muxer.finalize(); if (err) throw new Error(err);
    return { video: await b64(muxer.target.buffer), peak: +peak.toFixed(3), gain: +g.toFixed(3) };
  };

  // drawing helpers a scene can call
  E.wrap = (c, text, maxW) => { const res = []; for (const p of text.split("\n")) { let line = ""; for (const w of p.split(" ")) { const tt = line ? line + " " + w : w; if (c.measureText(tt).width > maxW && line) { res.push(line); line = w; } else line = tt; } res.push(line); } return res; };
  // karaoke captions for the current line: the spoken word lights up
  E.caption = (c, t, o = {}) => {
    const i = E.lineAt(t); if (i < 0) return; const txt = lines[i].text; const size = o.size ?? (V ? 58 : 50), maxW = o.maxW ?? (V ? W - 160 : W * 0.62);
    c.font = `${o.weight ?? 800} ${size}px ${o.font ?? "'Barlow Condensed', 'Arial Narrow', sans-serif"}`; c.textBaseline = "middle";
    const ws = txt.split(" "), ls = []; { let line = []; for (const w of ws) { const test = [...line, w].join(" "); if (c.measureText(test).width > maxW && line.length) { ls.push(line); line = [w]; } else line.push(w); } ls.push(line); }
    const cur = E.wordIndex(i, t, ws.length), fade = Math.min(ease((t - E.L(i) + 0.05) / 0.12), 1 - ease((t - E.LE(i)) / 0.15)); const lh = size * 1.2, y0 = (o.y ?? H * 0.82) - ((ls.length - 1) * lh) / 2; let k = 0;
    c.globalAlpha = clamp(fade); c.textAlign = "left"; c.lineJoin = "round";
    ls.forEach((line, li) => { const w = c.measureText(line.join(" ")).width; let x = (o.cx ?? W / 2) - w / 2; for (const wd of line) { const ww = c.measureText(wd + " ").width; const on = k === cur; c.lineWidth = size * 0.22; c.strokeStyle = o.stroke ?? "rgba(0,0,0,0.85)"; c.strokeText(wd, x, y0 + li * lh); c.fillStyle = on ? (o.hi ?? "#F5C400") : (o.fg ?? "#fff"); c.fillText(wd, x, y0 + li * lh); x += ww; k++; } });
    c.globalAlpha = 1; c.textAlign = "center";
  };
  return E;
}
