"use client";

import { useEffect } from "react";
import Link from "next/link";
import { HardHat, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mx-auto mb-6">
          <HardHat size={24} className="text-black" />
        </div>
        <h1 className="text-[22px] font-black text-white mb-2">Something went wrong</h1>
        <p className="text-[13px] text-white/40 mb-8">
          An unexpected error occurred. Try refreshing the page — if it keeps happening, contact{" "}
          <a href="mailto:hello@constra.app" className="text-amber-400 hover:text-amber-300">hello@constra.app</a>.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-5 py-2.5 rounded-xl transition-colors"
          >
            <RefreshCw size={14} />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white font-bold text-[13px] px-5 py-2.5 rounded-xl transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
