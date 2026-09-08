"use client";

import { use } from "react";
import { CheckCircle2, HardHat, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function PaySuccessPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  void use(params); // resolves params — not needed in UI but required by React

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "var(--app-bg-1, #f5f5f5)" }}>
      <div className="max-w-sm w-full space-y-6">

        {/* Icon */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl scale-150" />
            <div className="relative w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <CheckCircle2 size={36} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Message */}
        <div>
          <h1 className="text-[28px] font-black" style={{ color: "var(--app-text, #111)" }}>
            Payment received!
          </h1>
          <p className="text-[15px] mt-2" style={{ color: "var(--app-text-2, #555)" }}>
            Thank you — your payment has been processed and the invoice has been marked as paid.
          </p>
        </div>

        {/* Next steps */}
        <div className="rounded-2xl px-5 py-4 text-left space-y-2"
          style={{
            background: "var(--app-bg-2, #fff)",
            border: "1px solid var(--app-border, rgba(0,0,0,0.08))",
          }}>
          <p className="text-[12px] font-bold uppercase tracking-widest"
            style={{ color: "var(--app-text-3, #888)" }}>What happens next</p>
          {[
            "A receipt will be emailed to you by Stripe",
            "Your contractor has been notified of the payment",
            "Keep this page URL as your payment reference",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2.5">
              <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-[13px]" style={{ color: "var(--app-text-2, #555)" }}>{item}</p>
            </div>
          ))}
        </div>

        {/* Powered by */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-amber-500 rounded-md flex items-center justify-center">
              <HardHat size={11} className="text-black" />
            </div>
            <span className="font-black text-[13px]" style={{ color: "var(--app-text, #111)" }}>
              Constra
            </span>
          </div>
          <p className="text-[11px]" style={{ color: "var(--app-text-3, rgba(0,0,0,0.3))" }}>
            Construction management software
          </p>
          <Link
            href="https://getconstra.com"
            className="flex items-center gap-1 text-[12px] text-amber-600 hover:text-amber-500 transition-colors font-semibold"
          >
            Learn more about Constra <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
