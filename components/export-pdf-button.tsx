"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { DocCtx } from "@/lib/doc-pdfs";

/** Company details and lookups every PDF needs, taken from the store */
export function useDocCtx(): DocCtx {
  const { companyName, companyLogo, companyAddress, currency, projects, workers } = useStore();
  return useMemo(
    () => ({ brand: { company: companyName || "Your company", logo: companyLogo || undefined, address: companyAddress || undefined }, currency, projects, workers }),
    [companyName, companyLogo, companyAddress, currency, projects, workers],
  );
}

/**
 * A "PDF" button that loads the PDF code only when tapped (it is large), builds the document with
 * the company logo, and hands it to saveFile. `run` gets the PDF module and the company details.
 */
export function ExportPdfButton({
  run, label = "PDF", title, iconOnly = false, bare = false, className = "",
}: {
  run: (m: typeof import("@/lib/doc-pdfs"), ctx: DocCtx) => Promise<unknown>;
  label?: string;
  title?: string;
  iconOnly?: boolean;
  /** no built-in look, for placing it inside an existing row of icons */
  bare?: boolean;
  className?: string;
}) {
  const ctx = useDocCtx();
  const [busy, setBusy] = useState(false);

  async function click(e: React.MouseEvent) {
    e.stopPropagation();
    setBusy(true);
    try {
      const m = await import("@/lib/doc-pdfs");
      await run(m, ctx);
    } catch {
      toast.error("The PDF couldn't be made. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      aria-label={title ?? `Download ${label} as PDF`}
      title={title ?? `Download ${label} as PDF`}
      className={bare ? `${className} disabled:opacity-50` : `inline-flex items-center justify-center gap-1.5 min-h-[40px] ${iconOnly ? "min-w-[40px] px-2.5" : "px-4"} rounded-full border border-white/[0.12] text-white/80 hover:bg-white/[0.06] active:bg-white/[0.1] text-[13px] font-bold transition-colors disabled:opacity-50 ${className}`}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
      {!iconOnly && label}
    </button>
  );
}
