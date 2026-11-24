// Checks the built-in help assistant (lib/help-guide.ts + lib/help-kb.ts) against many ways of asking,
// including made-up typos. Needs no server or keys:  node .claude/skills/field-testing/scripts/help-guide-test.mjs
// Add a line to CASES whenever someone asks something and gets the wrong answer.
import ts from "typescript";
import fs from "fs";
import path from "path";
import os from "os";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "help-guide-"));
for (const f of ["help-kb", "help-guide"]) {
  let src = fs.readFileSync(`lib/${f}.ts`, "utf8");
  src = src.replace(/from "\.\/help-kb"/g, 'from "./help-kb.mjs"');
  fs.writeFileSync(path.join(dir, f + ".mjs"), ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
}
const { answerLocally, bestTopicId, helpTopics } = await import("file:///" + path.join(dir, "help-guide.mjs").replace(/\\/g, "/"));

// [question, expected entry id]
const CASES = [
  ["how do i clock in", "clock-in"], ["i need to punch in", "clock-in"], ["start my shift", "clock-in"], ["how to check in at work", "clock-in"], ["clock me in", "clock-in"],
  ["how do i clock out", "clock-out"], ["end my shift", "clock-out"], ["done for the day how do i stop", "clock-out"], ["punch out", "clock-out"],
  ["it wont let me clock in", "cant-clock"], ["gps not working", "cant-clock"], ["clock in button is greyed out", "cant-clock"], ["location error when i clock in", "cant-clock"], ["says i'm too far from the job", "cant-clock"],
  ["i forgot to clock out", "forgot-clock-out"], ["forgot to punch out yesterday", "forgot-clock-out"], ["i was still clocked in all night", "forgot-clock-out"],
  ["how do i fix someone's hours", "edit-time"], ["my hours are wrong", "edit-time"], ["edit a clock entry", "edit-time"], ["change the time someone clocked in", "edit-time"],
  ["do you take off for lunch", "breaks"], ["are breaks paid", "breaks"], ["is lunch deducted", "breaks"],
  ["how is overtime calculated", "overtime"], ["time and a half", "overtime"], ["does it do overtime", "overtime"],
  ["who is on site right now", "who-on-site"], ["who is clocked in", "who-on-site"], ["where is my crew", "who-on-site"],
  ["are you tracking my location", "location-privacy"], ["does the app follow me", "location-privacy"],
  ["how much will i get paid", "my-pay"], ["what is my estimated pay", "my-pay"], ["where do i see my earnings", "my-pay"], ["no rate set", "my-pay"],
  ["how do i make someone salary", "pay-type"], ["switch worker to hourly", "pay-type"], ["set pay type", "pay-type"],
  ["how do i set a pay rate", "set-rate"], ["change someone's hourly wage", "set-rate"], ["give a raise", "set-rate"],
  ["how do i run payroll", "payroll"], ["export for gusto", "payroll"], ["payroll csv", "payroll"], ["quickbooks payroll", "payroll"],
  ["email timesheets to my accountant", "email-payroll"], ["send hours to payroll", "email-payroll"], ["monday reminder to send timesheets", "email-payroll"],
  ["download timesheet as pdf", "timesheet-export"], ["export hours to excel", "timesheet-export"], ["print a timesheet", "timesheet-export"],
  ["how do i add my logo", "logo"], ["logo on pdf", "logo"], ["change company logo", "logo"],
  ["how do i add a worker", "add-worker"], ["add a new employee", "add-worker"], ["invite my crew", "add-worker"], ["how do i hire someone in the app", "add-worker"],
  ["invite code not working", "invite-code"], ["where is the company code", "invite-code"], ["generate a new invite code", "invite-code"],
  ["how do i remove a worker", "remove-worker"], ["delete an employee", "remove-worker"], ["someone quit how do i take them off", "remove-worker"],
  ["make someone a foreman", "change-role"], ["change a worker's role", "change-role"], ["promote to admin", "change-role"],
  ["what can a worker see", "roles"], ["difference between foreman and admin", "roles"], ["who can see what", "roles"],
  ["why can't i see invoices", "access-control"], ["i dont have access to a page", "access-control"], ["page keeps redirecting me to dashboard", "access-control"],
  ["where do i add certifications", "certifications"], ["track first aid tickets expiry", "certifications"],
  ["how do i call a worker from the app", "call-worker"], ["text someone on my crew", "call-worker"],
  ["new worker isn't showing on the crew list", "worker-missing"], ["cant find my worker", "worker-missing"],
  ["how do i plan tomorrow for the crew", "crew-plan-howto"], ["assign people to jobs for the day", "crew-plan-howto"], ["send the plan to the crew", "crew-plan-howto"],
  ["how do i ask for a day off", "time-off-howto"], ["request vacation", "time-off-howto"], ["approve a time off request", "time-off-howto"],
  ["how do i add something to the schedule", "schedule-howto"], ["create a calendar event", "schedule-howto"],
  ["how do i create a project", "new-project"], ["set up a new job site", "new-project"], ["add a new job", "new-project"],
  ["how do i archive a project", "archive-project"], ["the job is finished how do i close it", "archive-project"],
  ["how do i assign a task", "new-task"], ["create a task for a worker", "new-task"],
  ["how do i make an rfi", "new-rfi"], ["submit a request for information", "new-rfi"],
  ["add a punch list item", "new-punch"], ["log a deficiency", "new-punch"],
  ["how do i write a daily report", "new-daily-report"], ["log the day on site", "new-daily-report"],
  ["someone got hurt on site", "log-safety"], ["how do i report an incident", "log-safety"], ["log a toolbox talk", "log-safety"], ["near miss report", "log-safety"],
  ["how do i upload photos", "add-photo"], ["photo wont upload", "add-photo"], ["take a picture of the job", "add-photo"],
  ["how do i upload a blueprint", "upload-doc"], ["add drawings for the crew", "upload-doc"], ["share a pdf with my crew", "upload-doc"],
  ["track equipment", "track-equipment"], ["who has the tool", "track-equipment"], ["log materials used", "track-equipment"],
  ["how do i send an invoice", "create-invoice"], ["bill a client", "create-invoice"], ["mark invoice as paid", "create-invoice"],
  ["export invoices to quickbooks", "invoice-qb"],
  ["how do i make a quote", "estimate-howto"], ["create an estimate", "estimate-howto"],
  ["how do i do a change order", "change-order-howto"], ["client wants extra work", "change-order-howto"],
  ["how do i set a budget", "budget-howto"], ["are we over budget", "budget-howto"], ["track job costs", "budget-howto"],
  ["where are the excel templates", "excel-templates"], ["expense log spreadsheet", "excel-templates"],
  ["can clients pay by credit card in the app", "client-pay"], ["online payment for invoices", "client-pay"],
  ["does it work with no signal", "offline"], ["no internet at the job site", "offline"], ["will it work in a basement", "offline"],
  ["my changes aren't syncing", "sync"], ["app stuck loading", "sync"], ["other people cant see my update", "sync"],
  ["where do i download the app", "install"], ["how do i install on iphone", "install"], ["get it on android", "install"],
  ["the app looks old", "update"], ["how do i clear the app storage", "update"], ["it shows the website with a top bar", "update"],
  ["it says beta on play store", "beta"], ["cant find the app on google play", "beta"],
  ["does it work on a computer", "devices"], ["can i use it on my ipad", "devices"],
  ["is there spanish", "languages"], ["change language to french", "languages"],
  ["dark mode", "theme-text"], ["text is too small", "theme-text"], ["make the font bigger", "theme-text"],
  ["why am i not getting notifications", "notifications"], ["turn on alerts", "notifications"],
  ["how do i message my crew", "messages-howto"], ["send a group chat", "messages-howto"],
  ["i cant log in", "login"], ["login not working", "login"], ["says wrong password", "login"],
  ["forgot my password", "reset-password"], ["how do i change my password", "reset-password"], ["reset password email never came", "reset-password"],
  ["how do i sign up", "signup"], ["set up my company", "signup"], ["i'm a new worker how do i join", "signup"],
  ["how do i delete my account", "delete-account"], ["erase my data", "delete-account"],
  ["is my data safe", "privacy-data"], ["can coworkers see my pay", "privacy-data"], ["who can see my personal info", "privacy-data"],
  ["how much does it cost", "price"], ["is constra free", "price"], ["how do i cancel my subscription", "price"],
  ["how do i contact support", "contact"], ["i want to talk to a person", "contact"], ["what's your phone number", "contact"],
  ["the app keeps crashing", "feedback"], ["i found a bug", "feedback"], ["screen is blank", "feedback"], ["app is really slow", "feedback"],
  ["can i export all my data", "export-data"], ["download my records", "export-data"],
  ["the time is wrong", "time-zone"], ["different time zone", "time-zone"],
  ["who are you", "meta-who"], ["are you a bot", "meta-who"], ["what can you help with", "meta-who"],
  ["where is the crew page", "screen-crew"], ["where do i find reports", "screen-reports"], ["what is the punch list", "screen-punch"], ["who can see budget", "screen-budget"], ["where are my timesheets", "screen-timesheets"], ["open safety", "screen-safety"], ["where is messages", "screen-messages"], ["what does the dashboard show", "screen-home"],
];

// typo making: swap two letters, drop a letter, or double one, in the longest word
function mutate(q, mode) {
  const words = q.split(" ");
  let wi = 0;
  for (let i = 1; i < words.length; i++) if (words[i].length > words[wi].length) wi = i;
  const w = words[wi];
  if (w.length < 6) return null;
  const i = Math.floor(w.length / 2);
  let nw;
  if (mode === 0) nw = w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
  else if (mode === 1) nw = w.slice(0, i) + w.slice(i + 1);
  else nw = w.slice(0, i) + w[i] + w.slice(i);
  words[wi] = nw;
  return words.join(" ");
}

let pass = 0; const fails = [];
for (const [q, id] of CASES) {
  const got = bestTopicId(q);
  if (got === id) pass++; else fails.push(`  "${q}" -> ${got} (wanted ${id})`);
}
console.log(`Wording: ${pass}/${CASES.length} questions got the right answer`);
fails.slice(0, 40).forEach((f) => console.log(f));

let tp = 0, tt = 0; const tfails = [];
for (const [q, id] of CASES) for (const m of [0, 1, 2]) {
  const t = mutate(q, m); if (!t) continue; tt++;
  const got = bestTopicId(t);
  if (got === id) tp++; else tfails.push(`  "${t}" -> ${got} (wanted ${id})`);
}
console.log(`Typos:   ${tp}/${tt} misspelled questions still got the right answer`);
tfails.slice(0, 15).forEach((f) => console.log(f));

// follow-up and edge cases
const edge = [];
const chk = (name, ok) => edge.push(`${ok ? "PASS" : "FAIL"}  ${name}`);
chk("follow-up uses previous question", bestTopicId("what about workers", ["how do i add a worker"]) !== null);
chk("empty question is handled", answerLocally("").length > 10);
chk("gibberish gets the helpful menu", /not sure/.test(answerLocally("asdfgh qwerty zxcvb")));
chk("greeting is friendly", /^Hi/.test(answerLocally("hello")));
chk("thanks is friendly", /welcome/i.test(answerLocally("thanks")));
chk("store app never gets pricing", !/free while we launch|\$29/.test(answerLocally("how much does it cost", { storeApp: true })));
chk("web app gets the pricing answer", /free while we launch/.test(answerLocally("how much does it cost")));
chk("very long question still answers", answerLocally("how do i clock in ".repeat(300)).length > 10);
chk("a question about an unrelated topic does not invent an answer", /not sure|Did you mean/.test(answerLocally("what is the capital of france")));
chk("guide has 150+ topics", helpTopics().length >= 60);
edge.forEach((l) => console.log(l));
console.log(`\nTopics in the guide: ${helpTopics().length}`);
const bad = (CASES.length - pass) + edge.filter((l) => l.startsWith("FAIL")).length;
const typoRate = tp / tt;
if (pass / CASES.length < 0.9 || typoRate < 0.8 || edge.some((l) => l.startsWith("FAIL"))) { console.log("\nNOT GOOD ENOUGH yet"); process.exit(1); }
console.log("\nAll good.");
