// An original 30-second soundtrack for the ad, synthesised from scratch (no samples, nothing
// licensed). 120 BPM, A minor (Am F C G). Cues line up with the cuts in ad.html:
// hits on the hook, pops on the texts, the beat drops when the phone arrives, a phone ping on
// the site alert, whooshes on scene changes, and a big hit on the end card.
// Runs in the browser: window.makeSoundtrack() → AudioBuffer (48 kHz stereo).

// Cue sheet for the original 30-second cut. The voiced cut passes its own (see ad2.html).
const V1_CUES = {
  hook: { hits: [0.15, 0.75], riserAt: 2.2 },
  texts: { start: 3.2, beats: 7, pops: [3.6, 4.2, 4.8], womp: 5.6, whooshOut: 6.15 },
  dropAt: 6.6,
  chipPops: [9.0, 9.35],
  alert: { whoosh: 10.75, ping: 11.32 },
  whooshes: [14.4, 18.2, 22.6],
  docPops: [19.9, 20.5],
  end: { riserAt: 25.4, hitAt: 26.4, ctaPop: 28.1 },
  duck: [[11.2, 13.4, 0.45]],
  voice: [],
};

window.makeSoundtrack = async function makeSoundtrack(duration = 30, cues = V1_CUES) {
  const SR = 48000;
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * duration), SR);
  const BEAT = 0.5; // 120 BPM

  // Master: glue compressor and a final fade
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.9, 0);
  master.gain.setValueAtTime(0.9, duration - 1.2);
  master.gain.linearRampToValueAtTime(0, duration - 0.05);
  comp.connect(master).connect(ctx.destination);

  // Music bus, ducked where the cue sheet says (the site alert ping, every spoken line)
  const music = ctx.createGain();
  music.connect(comp);
  music.gain.setValueAtTime(1, 0);
  for (const [a, b, level] of [...(cues.duck ?? [])].sort((x, y) => x[0] - y[0])) {
    music.gain.setValueAtTime(1, Math.max(0, a - 0.15));
    music.gain.linearRampToValueAtTime(level, a);
    music.gain.setValueAtTime(level, b);
    music.gain.linearRampToValueAtTime(1, b + 0.4);
  }
  const sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(comp);
  // Voice skips the bus compressor so it stays clear and on top
  const vox = ctx.createGain(); vox.gain.value = 1.0;
  const voxEq = ctx.createBiquadFilter(); voxEq.type = "highpass"; voxEq.frequency.value = 90;
  const voxPresence = ctx.createBiquadFilter(); voxPresence.type = "peaking"; voxPresence.frequency.value = 3000; voxPresence.gain.value = 3;
  vox.connect(voxEq).connect(voxPresence).connect(master);
  for (const v of cues.voice ?? []) {
    const s = ctx.createBufferSource(); s.buffer = v.buffer; s.connect(vox); s.start(v.at);
  }

  // White noise, shared
  const noise = ctx.createBuffer(1, SR * 2, SR);
  { const d = noise.getChannelData(0); let seed = 7; for (let i = 0; i < d.length; i++) { seed = (seed * 16807) % 2147483647; d[i] = (seed / 2147483647) * 2 - 1; } }
  const noiseSrc = (t, dur) => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.start(t, Math.random() * 1.5); s.stop(t + dur); return s; };
  const env = (g, t, a, peak, d, sustain = 0) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t + a + d); };
  const pan = (v) => { const p = ctx.createStereoPanner(); p.pan.value = v; return p; };

  // ── Drums ──
  function kick(t, out = music, vol = 1) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    env(g, t, 0.002, 0.95 * vol, 0.38);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.45);
    // click
    const n = noiseSrc(t, 0.02); const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3000; const ng = ctx.createGain(); env(ng, t, 0.001, 0.25 * vol, 0.015); n.connect(hp).connect(ng).connect(out);
  }
  function clap(t, vol = 1) {
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1700; bp.Q.value = 0.9;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    for (const [dt, a] of [[0, 0.55], [0.011, 0.45], [0.022, 0.6]]) { g.gain.setValueAtTime(a * vol, t + dt); g.gain.exponentialRampToValueAtTime(0.05 * vol, t + dt + 0.009); }
    g.gain.setValueAtTime(0.5 * vol, t + 0.033); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    noiseSrc(t, 0.3).connect(bp).connect(g).connect(music);
  }
  function hat(t, vol = 1, open = false) {
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 8200;
    const g = ctx.createGain(); env(g, t, 0.001, 0.22 * vol, open ? 0.22 : 0.045);
    noiseSrc(t, open ? 0.3 : 0.08).connect(hp).connect(g).connect(pan(0.25)).connect(music);
  }

  // ── Bass and chords: Am F C G, one bar each ──
  const roots = [55, 43.65, 65.41, 49]; // A1 F1 C2 G1
  const triads = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 261.63, 329.63], [196, 246.94, 293.66]];
  function bass(t, f, dur, vol = 1) {
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f * 2;
    const sub = ctx.createOscillator(); sub.type = "sine"; sub.frequency.value = f;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(220, t + dur); lp.Q.value = 6;
    const g = ctx.createGain(); env(g, t, 0.006, 0.32 * vol, dur * 0.9, 0.001);
    const sg = ctx.createGain(); env(sg, t, 0.006, 0.5 * vol, dur * 0.9, 0.001);
    o.connect(lp).connect(g).connect(music); sub.connect(sg).connect(music);
    o.start(t); sub.start(t); o.stop(t + dur + 0.05); sub.stop(t + dur + 0.05);
  }
  function stab(t, notes, dur, vol = 1, side = 0) {
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(700, t + dur);
    const g = ctx.createGain(); env(g, t, 0.01, 0.075 * vol, dur, 0.0005);
    lp.connect(g).connect(pan(side)).connect(music);
    for (const f of notes) for (const det of [-7, 7]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }
  }
  function pad(t, notes, dur, vol = 1) {
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 * vol, t + 0.6); g.gain.setValueAtTime(0.05 * vol, t + dur - 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    lp.connect(g).connect(music);
    for (const f of notes) for (const det of [-10, 0, 10]) { const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = f / 2; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }
  }

  // ── Effects ──
  function whoosh(t, dur = 0.45, vol = 1, up = true) {
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(up ? 300 : 3500, t); bp.frequency.exponentialRampToValueAtTime(up ? 4200 : 250, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    noiseSrc(t, dur + 0.05).connect(bp).connect(g).connect(sfx);
  }
  function impact(t, vol = 1) {
    kick(t, sfx, 1.1 * vol);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.8);
    const g = ctx.createGain(); env(g, t, 0.003, 0.7 * vol, 0.9); o.connect(g).connect(sfx); o.start(t); o.stop(t + 1);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; const ng = ctx.createGain(); env(ng, t, 0.002, 0.45 * vol, 0.6);
    noiseSrc(t, 0.7).connect(lp).connect(ng).connect(sfx);
  }
  function pop(t, f = 700, vol = 1) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.1, t + 0.06);
    const g = ctx.createGain(); env(g, t, 0.002, 0.35 * vol, 0.09); o.connect(g).connect(sfx); o.start(t); o.stop(t + 0.15);
  }
  function ping(t) {
    for (const [dt, f] of [[0, 1318.5], [0.13, 1760]]) {
      for (const [mult, a] of [[1, 0.32], [2.01, 0.08], [3.02, 0.03]]) {
        const o = ctx.createOscillator(); o.frequency.value = f * mult; const g = ctx.createGain(); env(g, t + dt, 0.003, a, 0.9);
        o.connect(g).connect(sfx); o.start(t + dt); o.stop(t + dt + 1);
      }
    }
  }
  function riser(t, dur) {
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.setValueAtTime(400, t); hp.frequency.exponentialRampToValueAtTime(7000, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + dur); g.gain.setValueAtTime(0.0001, t + dur + 0.01);
    noiseSrc(t, dur + 0.05).connect(hp).connect(g).connect(sfx);
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + dur);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.06, t + dur); og.gain.setValueAtTime(0.0001, t + dur + 0.01);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2500;
    o.connect(lp).connect(og).connect(sfx); o.start(t); o.stop(t + dur + 0.02);
  }
  function sadWomp(t) {
    const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(196, t + 0.45);
    const g = ctx.createGain(); env(g, t, 0.01, 0.22, 0.5); o.connect(g).connect(sfx); o.start(t); o.stop(t + 0.6);
  }

  // ── Arrangement, from the cue sheet ──
  const c = cues;
  const hookEnd = c.texts.start;
  // hook: tense drone and hits
  pad(0, [220, 261.63, 329.63], hookEnd + 0.1, 0.9);
  bass(0, 55, hookEnd - 0.1, 0.6);
  whoosh(0, 0.32, 0.9);
  c.hook.hits.forEach((t, i) => impact(t, i ? 1 : 0.9));
  riser(c.hook.riserAt, 1.0);
  // the texts: half-time groove, pops on each message
  for (let b = 0; b < c.texts.beats; b++) {
    const t = c.texts.start + b * BEAT;
    if (b % 2 === 0) kick(t, music, 0.7);
    hat(t + BEAT / 2, 0.6);
  }
  pad(c.texts.start, triads[1], c.dropAt - c.texts.start + 0.2, 0.7);
  c.texts.pops.forEach((t, i) => pop(t, 650 + i * 55));
  if (c.texts.womp != null) sadWomp(c.texts.womp);
  whoosh(c.texts.whooshOut, 0.45, 1);
  // the drop: full groove under the product, until the end card fades
  impact(c.dropAt, 0.8);
  const start = c.dropAt, end = duration - 0.4;
  for (let i = 0, t = start; t < end - 0.01; i++, t = start + i * BEAT) {
    const bar = Math.floor(i / 4), inBar = i % 4;
    const chord = bar % 4;
    kick(t, music, 0.9);
    if (inBar === 1 || inBar === 3) clap(t, 0.8);
    hat(t + BEAT / 2, 0.75, inBar === 3);
    hat(t, 0.35);
    bass(t, roots[chord], BEAT * 0.45);
    bass(t + BEAT / 2, roots[chord], BEAT * 0.4, 0.8);
    if (inBar === 0) stab(t + BEAT * 0.5, triads[chord], 0.22, 1, -0.3);
    if (inBar === 2) stab(t + BEAT * 0.75, triads[chord], 0.18, 0.8, 0.3);
  }
  // cues on the product scenes
  c.chipPops.forEach((t, i) => pop(t, 900 + i * 100, 0.9));
  if (c.alert) { whoosh(c.alert.whoosh, 0.3, 0.6, false); ping(c.alert.ping); }
  c.whooshes.forEach((t) => whoosh(t, 0.4, 0.9));
  c.docPops.forEach((t, i) => pop(t, 800 + i * 80));
  riser(c.end.riserAt, 1.0);
  impact(c.end.hitAt, 1.1);
  pad(c.end.hitAt, triads[0], duration - c.end.hitAt, 1.2);
  pop(c.end.ctaPop, 1100, 0.8);

  return await ctx.startRendering();
};
