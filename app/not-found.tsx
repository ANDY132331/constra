import Link from "next/link";
import { HardHat } from "lucide-react";

export const metadata = { title: "Page Not Found — Constra" };

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mx-auto mb-6">
          <HardHat size={24} className="text-black" />
        </div>
        <h1 className="text-6xl font-black text-white/10 mb-2">404</h1>
        <h2 className="text-[20px] font-bold text-white mb-2">Page not found</h2>
        <p className="text-[13px] text-white/40 mb-8">This page doesn&apos;t exist or was moved.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-5 py-2.5 rounded-xl transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
