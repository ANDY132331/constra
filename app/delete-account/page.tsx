import Link from "next/link";
import { HardHat, Trash2, Mail, AlertTriangle } from "lucide-react";

export const metadata = { title: "Delete Account — Constra" };

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-5 py-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
          <HardHat size={13} className="text-amber-400" strokeWidth={2.5} />
        </div>
        <span className="text-[15px] font-bold text-white/90 tracking-tight">Constra</span>
        <Link href="/" className="ml-auto text-[13px] text-white/40 hover:text-white/70 transition-colors">← Back to home</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <h1 className="text-[28px] font-bold text-white tracking-tight">Delete Your Account</h1>
        </div>
        <p className="text-white/45 text-[14px] mb-10 leading-relaxed">
          You can request deletion of your Constra account and all associated data at any time.
          This page explains what gets deleted, what we retain, and how to submit your request.
        </p>

        {/* What gets deleted */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 mb-5">
          <h2 className="text-[16px] font-bold text-white mb-3">What gets deleted</h2>
          <ul className="space-y-2 text-[13px] text-white/60">
            {[
              "Your account profile (name, email, role)",
              "All time entries and clock-in records associated with your profile",
              "Photos uploaded by you (clock-in selfies, job site photos)",
              "Messages you sent in crew chats",
              "Any personal settings and preferences",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* What we retain */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 mb-5">
          <h2 className="text-[16px] font-bold text-white mb-3">What we may retain</h2>
          <ul className="space-y-2 text-[13px] text-white/60">
            {[
              "Aggregated, anonymised records required for legal or tax compliance (retained for up to 7 years as required by law)",
              "Records necessary to resolve disputes or enforce our Terms of Service",
              "Data that cannot be deleted without affecting other users in your company workspace (e.g. project records created by your company account)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Company admin note */}
        <div className="bg-amber-500/[0.07] border border-amber-500/20 rounded-2xl p-5 mb-8 flex gap-3">
          <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-amber-200/70 leading-relaxed">
            <span className="font-bold text-amber-300">Company admins:</span> Deleting your admin account will also delete your entire company workspace, including all workers, projects, and records. This action is irreversible. All crew members will lose access immediately.
          </p>
        </div>

        {/* How to request */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 mb-5">
          <h2 className="text-[16px] font-bold text-white mb-1">How to delete your account</h2>
          <p className="text-[13px] text-white/45 mb-4">You can delete your account in two ways:</p>

          <div className="space-y-4">
            <div>
              <p className="text-[13px] font-bold text-white/80 mb-1">Option 1 — In the app</p>
              <p className="text-[13px] text-white/50 leading-relaxed">
                Sign in → Settings → scroll to the bottom → <span className="text-red-400 font-semibold">Delete Account</span>. Your data will be permanently deleted within 30 days.
              </p>
            </div>
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-[13px] font-bold text-white/80 mb-1">Option 2 — Email request</p>
              <p className="text-[13px] text-white/50 leading-relaxed mb-3">
                Send an email to the address below from the email associated with your Constra account. Include your full name and company name. We will process your request within a few business days.
              </p>
              <a
                href="mailto:privacy@getconstra.com?subject=Account Deletion Request&body=Please delete my Constra account.%0A%0AName: %0AEmail: %0ACompany: "
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2.5 rounded-xl transition-colors"
              >
                <Mail size={14} />
                privacy@getconstra.com
              </a>
            </div>
          </div>
        </div>

        <p className="text-[12px] text-white/25 text-center mt-8">
          Questions? Contact us at{" "}
          <a href="mailto:privacy@getconstra.com" className="text-amber-400/60 hover:text-amber-400 transition-colors">
            privacy@getconstra.com
          </a>
        </p>
      </div>
    </div>
  );
}
