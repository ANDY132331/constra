// Built-in help for the in-app assistant. It needs no outside AI service and no keys.
// It reads the knowledge base in help-kb.ts and finds the best answer for whatever the person typed:
// it ignores filler words, treats synonyms alike (punch = clock, crew = team = workers), stems words
// (clocking = clock), forgives typos (clokc), and uses the previous question for short follow-ups.
// /api/chat uses it whenever the AI provider is not configured or is unavailable.

import { ENTRIES as KB, type Entry } from "./help-kb";

export const HELP_FOLLOWUP = "Anything else? You can also call 672-338-9890 or email support@getconstra.com.";

// ---------- words ----------

const STOP = new Set(("a an the to of in on at for and or but if so as is it its be am are was were been being do does did done have has had having " +
  "i me my mine we us our you your he she they them their this that these those there here what whats where when why who whom whose which how " +
  "can could would should will shall may might must just really very also too please pls hi hello hey tell show give let lets want need get got gets " +
  "know like about some any with without from into over than then now up out off again still ever one thing things stuff way ok okay thanks thank " +
  "im ive id ill youre thats whats theres page screen tab menu button section right now currently actually exactly today tonight").split(" "));

// Groups of words that mean the same thing for our purposes. The first word is the shared root.
const SYN_GROUPS: string[][] = [
  ["clock", "punch", "checkin", "timeclock"],
  ["pay", "wage", "paycheck", "paycheque", "earn", "income", "payslip", "compensation"],
  ["crew", "team", "worker", "employee", "staff", "guy", "people", "labourer", "laborer", "member", "personnel"],
  ["job", "project", "site", "jobsite", "worksite"],
  ["admin", "boss", "owner", "supervisor", "employer"],
  ["photo", "picture", "pic", "image", "selfie", "camera"],
  ["remove", "delete", "erase", "terminate", "kick", "discard"],
  ["add", "create", "new", "make", "register", "setup"],
  ["edit", "fix", "change", "correct", "update", "adjust", "modify", "wrong"],
  ["cant", "cannot", "unable", "wont", "couldnt", "wouldnt"],
  ["not", "doesnt", "isnt", "dont", "didnt", "wasnt", "never", "wont"],
  ["export", "download", "save", "backup"],
  ["pdf", "print", "printout"],
  ["email", "mail", "gmail"],
  ["signal", "internet", "wifi", "connection", "reception", "offline", "online", "network"],
  ["login", "signin", "logon"],
  ["invoice", "bill"],
  ["estimate", "quote", "bid", "proposal", "quotation"],
  ["alert", "notification", "notify", "reminder", "push", "ping"],
  ["bug", "glitch", "crash", "freeze", "lag", "laggy", "slow", "broken", "error", "problem", "issue", "hang", "stuck"],
  ["incident", "accident", "injury", "hurt", "injured", "hazard", "unsafe"],
  ["vacation", "holiday", "pto", "leave", "sick"],
  ["break", "lunch", "coffee"],
  ["overtime", "ot"],
  ["salary", "salaried"],
  ["phone", "mobile", "cell", "smartphone"],
  ["app", "application", "software"],
  ["hour", "hours"],
  ["worker", "labor"],
  ["plan", "planning", "dispatch"],
  ["schedule", "calendar", "roster"],
  ["remove", "cancel"],
  ["password", "passcode", "pin"],
  ["price", "pricing", "cost", "fee", "subscription", "charge", "billing"],
  ["doc", "document", "file", "paperwork"],
  ["drawing", "blueprint", "plans"],
  ["where", "locate", "find", "look"],
  ["open", "access", "reach", "go"],
];

const ROOT = new Map<string, string>();
for (const g of SYN_GROUPS) for (const w of g) if (!ROOT.has(w)) ROOT.set(w, g[0]);

function stem(w: string): string {
  let s = w;
  if (s.length > 5 && s.endsWith("ing")) s = s.slice(0, -3);
  else if (s.length > 4 && s.endsWith("ied")) s = s.slice(0, -3) + "y";
  else if (s.length > 4 && s.endsWith("ed")) s = s.slice(0, -2);
  else if (s.length > 4 && s.endsWith("ies")) s = s.slice(0, -3) + "y";
  else if (s.length > 4 && s.endsWith("es") && !s.endsWith("ses")) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss")) s = s.slice(0, -1);
  if (s.length > 4 && s.endsWith("e")) s = s.slice(0, -1);
  if (s.length > 3 && /(.)\1$/.test(s) && !s.endsWith("ll") && !s.endsWith("ss")) s = s.slice(0, -1); // clockk, adding -> add
  return s;
}

function canon(w: string): string {
  const direct = ROOT.get(w);
  if (direct) return stem(direct);
  const st = stem(w);
  return stem(ROOT.get(st) ?? st);
}

/** words -> comparable tokens (no apostrophes, no filler, stemmed, synonyms merged) */
function tokens(text: string, keepStop = false): string[] {
  const clean = text.toLowerCase().replace(/[’`]/g, "'").replace(/'/g, "").replace(/[^a-z0-9 ]+/g, " ");
  const out: string[] = [];
  for (const raw of clean.split(/\s+/)) {
    if (!raw) continue;
    if (!keepStop && STOP.has(raw)) continue;
    out.push(canon(raw));
  }
  return out;
}

// ---------- index (built once) ----------

type Indexed = { entry: Entry; w: Map<string, number>; bigrams: Set<string>; size: number; phrases: { text: string; n: number }[] };

function norm(text: string): string {
  return text.toLowerCase().replace(/[’`]/g, "'").replace(/'/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/ +/g, " ").trim();
}

let INDEX: Indexed[] | null = null;
let IDF = new Map<string, number>();
let VOCAB: string[] = [];
const RAWSTEM = new Map<string, { word: string; n: number }>(); // the same words by stem, for typo matching
const RAW = new Map<string, number>(); // every real word we know (before synonyms merge), with how often it appears

const META: Entry[] = [
  { id: "meta-who", title: "About this assistant", k: "who are you|what are you|are you a bot|are you ai|are you real|are you a person|are you human|what can you do|what can i ask|what can you help with|help me|how do you work|are you chatgpt|your name",
    a: "I'm Constra's built-in help assistant. I answer from the app's own guide, so I know how Constra works: clocking in, timesheets, payroll, crew, schedule, time off, projects, safety, invoices, offline use and your account. I'm not a person, so for anything I can't answer call 672-338-9890 or email support@getconstra.com." },
];

function build() {
  if (INDEX) return;
  const all = [...KB, ...META];
  const df = new Map<string, number>();
  const idx: Indexed[] = all.map((entry) => {
    const w = new Map<string, number>();
    const bigrams = new Set<string>();
    for (const t of tokens(entry.title)) w.set(t, Math.max(w.get(t) ?? 0, 1.4));
    const phrases: { text: string; n: number }[] = [];
    for (const word of norm(entry.title + " " + entry.k.split("|").join(" ")).split(" ")) if (word.length >= 5 || (word.length >= 4 && !STOP.has(word))) RAW.set(word, (RAW.get(word) ?? 0) + 1);
    for (const phrase of entry.k.split("|")) {
      const text = norm(phrase);
      if (text) phrases.push({ text, n: text.split(" ").length });
      const toks = tokens(phrase);
      for (const t of toks) if (!w.has(t)) w.set(t, 1);
      for (let i = 0; i + 1 < toks.length; i++) bigrams.add(toks[i] + " " + toks[i + 1]);
    }
    for (const t of w.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return { entry, w, bigrams, size: w.size, phrases };
  });
  const n = idx.length;
  for (const [t, d] of df) IDF.set(t, Math.log(1 + n / d));
  VOCAB = [...df.keys()];
  for (const g of SYN_GROUPS) for (const w of g) if (w.length >= 4) RAW.set(w, (RAW.get(w) ?? 0) + 0.5);
  for (const [w, n] of RAW) { const st = stem(w); const cur = RAWSTEM.get(st); if (!cur || n > cur.n) RAWSTEM.set(st, { word: w, n }); }
  INDEX = idx;
}

// ---------- typo forgiveness ----------

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2: number[] = [];
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, (prev2[j - 2] ?? 99) + 1); // swapped letters
      cur[j] = v;
    }
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

/** Fix a misspelled word by finding the closest word we know (ties go to the more common word). */
function fixWord(word: string): string {
  if (word.length < 4 || STOP.has(word) || RAW.has(word) || /d/.test(word)) return word;
  const ws = stem(word);
  if (RAWSTEM.has(ws)) return word; // a real word in another form (clocked, workers)
  const max = ws.length <= 5 ? 1 : 2;
  let best = word, bestD = max + 1, bestN = -1;
  for (const [v, info] of RAWSTEM) {
    const d = editDistance(ws, v, max);
    if (d < bestD || (d === bestD && info.n > bestN)) { best = info.word; bestD = d; bestN = info.n; }
  }
  return bestD <= max ? best : word;
}

/** The question with every misspelled word fixed, still in plain words (used for whole-phrase matching). */
function fixedNorm(text: string): string {
  build();
  return norm(text).split(" ").map((w) => (w ? fixWord(w) : w)).join(" ");
}

/** Question -> comparable tokens, with typos fixed first. */
function queryTokens(text: string): string[] {
  build();
  const out: string[] = [];
  for (const raw of fixedNorm(text).split(" ")) {
    if (!raw || STOP.has(raw)) continue;
    out.push(canon(raw));
  }
  return out;
}

// ---------- ranking ----------

type Ranked = { e: Indexed; score: number; coverage: number };

function rank(weights: Map<string, number>, seq: string[], qNorm: string, where: boolean, howTo: boolean): Ranked[] {
  build();
  let mass = 0;
  for (const [t, wt] of weights) mass += (IDF.get(t) ?? 1.2) * wt;
  const padded = ` ${qNorm} `;
  const out: Ranked[] = [];
  for (const e of INDEX!) {
    let s = 0, matched = 0;
    for (const [t, wt] of weights) {
      const ew = e.w.get(t);
      if (!ew) continue;
      const v = (IDF.get(t) ?? 1.2) * wt;
      s += v * ew;
      matched += v;
    }
    // a whole phrase from the guide appearing in the question is the strongest signal
    let phrase = 0;
    for (const p of e.phrases) if (p.n >= 2 ? padded.includes(` ${p.text} `) : false) phrase = Math.max(phrase, 4 + 0.8 * p.n);
    if (padded === ` ${qNorm} ` && e.phrases.some((p) => p.text === qNorm)) phrase += 6;
    s += phrase;
    if (s === 0) continue;
    for (let i = 0; i + 1 < seq.length; i++) if (e.bigrams.has(seq[i] + " " + seq[i + 1])) s += 1.6 * Math.min(IDF.get(seq[i]) ?? 1, IDF.get(seq[i + 1]) ?? 1);
    s = s / Math.pow(e.size, 0.12);
    const isScreen = e.entry.id.startsWith("screen-");
    if (where && isScreen) s *= 1.25;
    if (howTo && isScreen) s *= 0.8;
    if (howTo && !isScreen && !e.entry.id.startsWith("meta")) s *= 1.08;
    out.push({ e, score: s, coverage: phrase ? Math.max(matched / (mass || 1), 0.6) : matched / (mass || 1) });
  }
  return out.sort((a, b) => b.score - a.score);
}

const GREETING = /^(hi|hello|hey|yo|hiya|howdy|sup|good (morning|afternoon|evening|day)|hola|bonjour)\b/i;
const THANKS = /\b(thanks|thank you|thx|thankyou|cheers|appreciate|ty)\b/i;
const BYE = /^(bye|goodbye|see you|later|cya|that is all|that's all|thats all|no thanks)\b/i;

/** Best answer for a question. `history` is the person's earlier questions, used for short follow-ups. */
export function answerLocally(question: string, opts: { storeApp?: boolean; role?: string; history?: string[] } = {}): string {
  const raw = (question ?? "").trim();
  if (!raw) return "Ask me anything about Constra, like clocking in, timesheets, crew or payroll.";
  const plain = raw.toLowerCase().replace(/[’]/g, "'");
  const words = plain.split(/\s+/).filter(Boolean);
  if (words.length <= 4 && THANKS.test(plain) && !/\b(how|where|why|what)\b/.test(plain)) return "You're welcome! Ask if you need anything else.";
  if (words.length <= 4 && BYE.test(plain)) return "Take care! I'm here whenever you need help.";
  build();

  const seqRaw = queryTokens(raw);
  const qNorm = fixedNorm(raw);
  const seq = seqRaw;

  const where = /\b(where|find|locate|open|which (menu|tab|screen|page)|what is|what does|who can see)\b/.test(plain);
  const howTo = /\b(how|steps|way to|can i|do i)\b/.test(plain);
  const weights = new Map<string, number>();
  for (const t of seq) weights.set(t, 1);

  let ranked = rank(weights, seq, qNorm, where, howTo);
  let best = ranked[0];

  // Short follow-ups ("what about workers?", "and pay?") borrow from the previous question.
  const prev = (opts.history ?? []).filter((h) => h && h.trim().toLowerCase() !== plain).slice(-1)[0];
  if (prev && (seq.length <= 3 || !best || best.coverage < 0.5)) {
    const ptoks = queryTokens(prev);
    const merged = new Map(weights);
    for (const t of ptoks) if (!merged.has(t)) merged.set(t, 0.45);
    const r2 = rank(merged, [...ptoks, ...seq], fixedNorm(prev + " " + raw), where, howTo);
    if (r2[0] && (!best || r2[0].score > best.score * 1.15)) { ranked = r2; best = r2[0]; }
  }

  const usable = (r: Ranked) => !(opts.storeApp && r.e.entry.billing);
  ranked = ranked.filter(usable);
  best = ranked[0];

  if (!best) {
    if (GREETING.test(plain)) return "Hi! I can help with clocking in, timesheets, payroll, crew, schedules, time off, projects, safety and more. What do you need?";
    return fallback(opts.storeApp);
  }

  const strong = best.coverage >= 0.5 && best.score >= 1.8;
  const maybe = best.coverage >= 0.28 && best.score >= 1.0;
  if (!strong && !maybe) {
    if (GREETING.test(plain)) return "Hi! I can help with clocking in, timesheets, payroll, crew, schedules, time off, projects, safety and more. What do you need?";
    return fallback(opts.storeApp, ranked.slice(0, 3).filter((r) => r.score >= 0.6).map((r) => r.e.entry.title));
  }

  const related = ranked.slice(1).filter((r) => r.score >= best.score * (strong ? 0.82 : 0.7) && r.coverage >= 0.35).slice(0, 2);
  let text = strong ? best.e.entry.a : `I think you're asking about **${best.e.entry.title}**:\n\n${best.e.entry.a}`;
  if (related.length) text += `\n\nRelated: ${related.map((r) => `**${r.e.entry.title}**`).join(", ")}. Ask about any of them.`;
  return text;
}

function fallback(storeApp?: boolean, suggestions: string[] = []): string {
  void storeApp;
  const list = suggestions.length ? `\n\nDid you mean: ${suggestions.map((s) => `**${s}**`).join(", ")}?` : "";
  return "I'm not sure about that one. Try asking about clocking in, timesheets, payroll, adding crew, the schedule, time off, projects, photos, invoices or offline use." + list + "\n\nFor anything else, call 672-338-9890 or email support@getconstra.com and a person will help.";
}

/** Titles of everything the guide knows, for a help menu or tests. */
export function helpTopics(): { id: string; title: string }[] {
  return KB.map((e) => ({ id: e.id, title: e.title }));
}

/** For tests: which entry id wins for a question (no formatting). */
export function bestTopicId(question: string, history: string[] = []): string | null {
  const text = answerLocally(question, { history });
  const hit = [...KB, ...META].find((e) => text.includes(e.a.slice(0, 60)));
  return hit?.id ?? null;
}
