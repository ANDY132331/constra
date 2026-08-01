import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}

export const FROM = process.env.EMAIL_FROM ?? "Constra <notifications@constra.app>";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://constra.app";

type Attachment = { filename: string; content: string; type: string; disposition: "attachment" };

export async function sendEmail({ to, subject, html, attachments }: { to: string; subject: string; html: string; attachments?: Attachment[] }) {
  return getResend().emails.send({ from: FROM, to, subject, html, ...(attachments ? { attachments } : {}) });
}

// ── Shared template shell ─────────────────────────────────────────────────────
export function emailShell({
  company,
  preheader,
  body,
}: {
  company: string;
  preheader: string;
  body: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${preheader}</title>
<style>
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  .wrap{max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .hd{background:#111;padding:20px 28px;display:flex;align-items:center;gap:10px}
  .hd-logo{font-size:16px;font-weight:800;color:#f59e0b;letter-spacing:-0.3px}
  .hd-co{font-size:12px;color:#ffffff60;margin-left:4px}
  .bd{padding:28px}
  .ft{padding:14px 28px;background:#f9f9f9;border-top:1px solid #e5e5e5;font-size:11px;color:#999;line-height:1.5}
  .cta{display:inline-block;background:#f59e0b;color:#000!important;font-weight:700;font-size:13px;padding:11px 22px;border-radius:8px;text-decoration:none;margin-top:20px}
  h2{font-size:18px;font-weight:700;color:#111;margin:0 0 10px}
  p{font-size:14px;color:#444;line-height:1.6;margin:0 0 14px}
  .chip{display:inline-block;background:#f4f4f5;border-radius:6px;padding:4px 10px;font-size:12px;color:#555;margin-bottom:14px}
  .quote{border-left:3px solid #f59e0b;padding:10px 14px;background:#fffbeb;border-radius:0 8px 8px 0;font-size:13px;color:#555;font-style:italic;margin:14px 0}
</style>
</head>
<body>
<div class="wrap">
  <div class="hd">
    <span class="hd-logo">⚡ Constra</span>
    <span class="hd-co">· ${company}</span>
  </div>
  <div class="bd">${body}</div>
  <div class="ft">
    You're receiving this because you're a member of <strong>${company}</strong> on Constra.<br/>
    Manage notification preferences in Settings → Notifications.
  </div>
</div>
</body>
</html>`;
}

// ── Per-event templates ───────────────────────────────────────────────────────

export function crewMessageEmail({
  company,
  senderName,
  projectName,
  message,
}: {
  company: string;
  senderName: string;
  projectName: string;
  message: string;
}) {
  return emailShell({
    company,
    preheader: `${senderName} sent a message in ${projectName}`,
    body: `
      <h2>New message in ${projectName}</h2>
      <span class="chip">💬 Crew Chat</span>
      <div class="quote">${message.length > 300 ? message.slice(0, 300) + "…" : message}</div>
      <p><strong>${senderName}</strong> sent a message in the <strong>${projectName}</strong> crew chat.</p>
      <a class="cta" href="${APP_URL}/messages">View conversation →</a>
    `,
  });
}

export function safetyIncidentEmail({
  company,
  reporterName,
  projectName,
  description,
  severity,
}: {
  company: string;
  reporterName: string;
  projectName: string;
  description: string;
  severity?: string;
}) {
  const color = severity === "Critical" ? "#ef4444" : severity === "High" ? "#f97316" : "#f59e0b";
  return emailShell({
    company,
    preheader: `Safety incident reported on ${projectName}`,
    body: `
      <h2 style="color:#ef4444">⚠️ Safety Incident Reported</h2>
      <p><strong>${reporterName}</strong> logged a safety incident on <strong>${projectName}</strong>.</p>
      ${severity ? `<span class="chip" style="background:${color}18;color:${color}">${severity} severity</span>` : ""}
      <div class="quote">${description.length > 400 ? description.slice(0, 400) + "…" : description}</div>
      <p style="color:#555">Please review and take appropriate action as soon as possible.</p>
      <a class="cta" style="background:#ef4444" href="${APP_URL}/safety">View Safety Log →</a>
    `,
  });
}

export function taskAssignedEmail({
  company,
  assigneeName,
  assignerName,
  taskName,
  projectName,
  dueDate,
}: {
  company: string;
  assigneeName: string;
  assignerName: string;
  taskName: string;
  projectName: string;
  dueDate?: string;
}) {
  return emailShell({
    company,
    preheader: `You've been assigned: ${taskName}`,
    body: `
      <h2>New task assigned to you</h2>
      <span class="chip">📋 ${projectName}</span>
      <p>Hi <strong>${assigneeName}</strong>,</p>
      <p><strong>${assignerName}</strong> has assigned you a task on <strong>${projectName}</strong>:</p>
      <div class="quote">${taskName}</div>
      ${dueDate ? `<p style="color:#888;font-size:13px">Due: <strong style="color:#444">${dueDate}</strong></p>` : ""}
      <a class="cta" href="${APP_URL}/tasks">View task →</a>
    `,
  });
}

export function clockInEmail({
  company,
  workerName,
  projectName,
  time,
  action,
}: {
  company: string;
  workerName: string;
  projectName: string;
  time: string;
  action: "in" | "out";
}) {
  return emailShell({
    company,
    preheader: `${workerName} clocked ${action} — ${projectName}`,
    body: `
      <h2>${action === "in" ? "🟢" : "🔴"} ${workerName} clocked ${action}</h2>
      <p><strong>${workerName}</strong> clocked ${action === "in" ? "in to" : "out of"} <strong>${projectName}</strong> at ${time}.</p>
      <a class="cta" href="${APP_URL}/time-tracking">View time tracking →</a>
    `,
  });
}

export function welcomeEmail({
  firstName,
  companyName,
  inviteCode,
}: {
  firstName: string;
  companyName: string;
  inviteCode: string;
}) {
  return emailShell({
    company: companyName,
    preheader: `Welcome to Constra — your account is ready`,
    body: `
      <h2>Welcome to Constra, ${firstName}! 👋</h2>
      <p>Your company <strong>${companyName}</strong> is set up and ready to go. Here's everything you need to start running your job site.</p>

      <h3 style="font-size:14px;color:#111;margin:20px 0 8px">Your company invite code</h3>
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;font-family:monospace;font-size:20px;font-weight:800;color:#92400e;letter-spacing:3px;text-align:center;margin-bottom:16px">${inviteCode}</div>
      <p style="font-size:13px;color:#666">Share this code with your crew so they can join your workspace at <strong>constra.app/login</strong> → "Join Company".</p>

      <h3 style="font-size:14px;color:#111;margin:20px 0 8px">What to do first</h3>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;font-size:13px;color:#444">1.</td><td style="padding:6px 0;font-size:13px;color:#444">Add your first project with a budget and timeline</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#444">2.</td><td style="padding:6px 0;font-size:13px;color:#444">Invite your crew using the invite code above</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#444">3.</td><td style="padding:6px 0;font-size:13px;color:#444">Have workers clock in from their phone — GPS verified</td></tr>
      </table>

      <a class="cta" href="${APP_URL}/dashboard">Go to your dashboard →</a>

      <p style="color:#aaa;font-size:12px;margin-top:24px">Questions? Reply to this email — we read every one.</p>
    `,
  });
}
