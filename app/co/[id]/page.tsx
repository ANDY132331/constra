"use client";

import { use, useEffect, useState } from "react";
import { HardHat, Check, X, Loader2 } from "lucide-react";

type CO = {
  number: string;
  title: string;
  description: string;
  reason: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  projectName: string;
  clientName: string;
  companyName: string;
  currency: string;
};

const C = {
  ground: "#E7E5E0", paper: "#F5F4F1", ink: "#151617", ink2: "#4B4D50", rule: "rgba(21,22,23,0.14)",
  hv: "#F5C400", hvInk: "#1A1600", go: "#1E7A45", stop: "#B9382C",
};

function money(n: number, currency: string) {
  try { return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(n); }
  catch { return `$${n.toFixed(2)}`; }
}

function day(d: string | null) {
  return d ? new Date(d).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" }) : "";
}

export default function ChangeOrderApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [co, setCo] = useState<CO | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/co/${id}`)
      .then(async (r) => (r.ok ? setCo(await r.json()) : setNotFound(true)))
      .catch(() => setNotFound(true));
  }, [id]);

  async function decide(decision: "approve" | "reject") {
    setError("");
    if (name.trim().length < 2) { setError("Type your full name to sign."); return; }
    if (decision === "approve" && !agree) { setError("Tick the box to confirm you approve the change and its cost."); return; }
    setBusy(decision);
    try {
      const r = await fetch(`/api/co/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, name: name.trim(), agree }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok || r.status === 409) setCo((prev) => ({ ...(prev as CO), ...j }));
      if (!r.ok) setError(j.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, overflowY: "auto", background: C.ground, color: C.ink, fontFamily: "var(--font-plex-sans), system-ui, sans-serif" }}>
      <div style={{ height: 12, background: `repeating-linear-gradient(135deg, ${C.ink} 0 12px, ${C.hv} 12px 24px)` }} />
      <div role="main" style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ width: 30, height: 30, background: C.hv, borderRadius: 3, display: "grid", placeItems: "center" }}>
            <HardHat size={16} color={C.hvInk} strokeWidth={2.5} />
          </span>
          <span style={{ fontFamily: "var(--font-barlow-condensed), sans-serif", fontWeight: 800, fontSize: 20, textTransform: "uppercase" }}>
            {co?.companyName ?? "Constra"}
          </span>
        </div>

        {notFound ? (
          <div style={{ background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 6, padding: 24 }}>
            <h1 style={{ fontFamily: "var(--font-barlow-condensed), sans-serif", fontWeight: 800, fontSize: 28, textTransform: "uppercase", margin: "0 0 8px" }}>Link not found</h1>
            <p style={{ color: C.ink2, margin: 0 }}>This change order link is invalid or has been withdrawn. Contact your contractor for a new link.</p>
          </div>
        ) : !co ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 className="animate-spin" size={24} /></div>
        ) : (
          <div style={{ background: C.paper, border: `1.5px solid ${C.ink}`, borderRadius: 6, boxShadow: `6px 6px 0 ${C.ink}` }}>
            <div style={{ padding: "20px 22px", borderBottom: `1px solid ${C.rule}` }}>
              <p style={{ fontFamily: "var(--font-plex-mono), monospace", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: C.ink2, margin: "0 0 6px" }}>
                Change order {co.number}{co.projectName ? ` · ${co.projectName}` : ""}
              </p>
              <h1 style={{ fontFamily: "var(--font-barlow-condensed), sans-serif", fontWeight: 800, fontSize: 32, lineHeight: 1, textTransform: "uppercase", margin: 0 }}>{co.title}</h1>
            </div>

            <div style={{ padding: "18px 22px", display: "grid", gap: 14, borderBottom: `1px solid ${C.rule}` }}>
              {co.description && <div><p style={label}>What changes</p><p style={body}>{co.description}</p></div>}
              {co.reason && <div><p style={label}>Why</p><p style={body}>{co.reason}</p></div>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <p style={label}>{co.amount < 0 ? "Credit" : "Added cost"}</p>
                <p style={{ fontFamily: "var(--font-barlow-condensed), sans-serif", fontWeight: 800, fontSize: 34, margin: 0, fontVariantNumeric: "tabular-nums" }}>
                  {money(co.amount, co.currency)}
                </p>
              </div>
              <p style={{ fontSize: 12, color: C.ink2, margin: 0 }}>Sent {day(co.submittedAt)} by {co.companyName}</p>
            </div>

            {co.status === "pending" ? (
              <div style={{ padding: "18px 22px", display: "grid", gap: 14 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={label}>Your full name (signature)</span>
                  <input
                    id="co-sign-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    maxLength={80}
                    placeholder={co.clientName || "First and last name"}
                    style={{ minHeight: 46, padding: "0 12px", border: `1.5px solid ${C.ink}`, borderRadius: 4, background: "#fff", fontSize: 16, color: C.ink }}
                  />
                </label>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: C.ink2, cursor: "pointer" }}>
                  <input id="co-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, accentColor: C.ink }} />
                  <span>I approve this change to the work and agree to the {co.amount < 0 ? "credit" : "added cost"} of {money(co.amount, co.currency)}.</span>
                </label>
                {error && <p role="alert" style={{ color: C.stop, fontSize: 14, margin: 0 }}>{error}</p>}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={() => decide("approve")} disabled={!!busy} style={{ ...btn, background: C.hv, color: C.hvInk, flex: 2 }}>
                    {busy === "approve" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Approve and sign
                  </button>
                  <button onClick={() => decide("reject")} disabled={!!busy} style={{ ...btn, background: "transparent", color: C.ink, flex: 1, boxShadow: `inset 0 0 0 1.5px ${C.ink}` }}>
                    {busy === "reject" ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Decline
                  </button>
                </div>
                <p style={{ fontSize: 12, color: C.ink2, margin: 0 }}>Typing your name and approving counts as your signature. {co.companyName} will be notified right away.</p>
              </div>
            ) : (
              <div style={{ padding: "18px 22px", display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", background: co.status === "approved" ? C.go : C.stop, color: "#fff", flexShrink: 0 }}>
                  {co.status === "approved" ? <Check size={18} /> : <X size={18} />}
                </span>
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{co.status === "approved" ? "Approved" : "Declined"}{co.decidedAt ? ` on ${day(co.decidedAt)}` : ""}</p>
                  {co.decidedBy && <p style={{ fontSize: 13, color: C.ink2, margin: "2px 0 0" }}>Signed by {co.decidedBy.replace(" (client, signed online)", "")}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        <p style={{ fontSize: 12, color: C.ink2, textAlign: "center", marginTop: 28 }}>Sent with Constra · getconstra.com</p>
      </div>
    </div>
  );
}

const label: React.CSSProperties = { fontFamily: "var(--font-plex-mono), monospace", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#4B4D50", margin: 0 };
const body: React.CSSProperties = { fontSize: 15, lineHeight: 1.55, margin: "4px 0 0", whiteSpace: "pre-wrap" };
const btn: React.CSSProperties = {
  minHeight: 48, padding: "0 18px", border: 0, borderRadius: 4, fontWeight: 600, fontSize: 15, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
  boxShadow: "inset 0 0 0 1.5px #1A1600, 0 3px 0 #1A1600",
};
