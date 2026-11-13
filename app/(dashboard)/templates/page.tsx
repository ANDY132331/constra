"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Banknote, CalendarRange, ClipboardList, FileSpreadsheet, ImagePlus, Loader2, Sparkles, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { isAdminOrAbove } from "@/lib/permissions";
import { saveFile } from "@/lib/native";
import { CustomSelect } from "@/components/ui/custom-select";
import { CATEGORY_LABELS, TEMPLATES, type Category, type Template, type TemplateData } from "@/lib/excel-templates";

const CATEGORY_ICON: Record<Category, React.ComponentType<{ size?: number; className?: string }>> = {
  money: Banknote, crew: Users, site: ClipboardList, plans: CalendarRange,
};

export default function TemplatesPage() {
  const {
    companyName, companyLogo, currency, currentUser, workers, projects, invoices, rfis, punchItems, safetyIncidents,
    equipment, materialEntries, dailyReports, changeOrders, budgetLines, insurancePolicies,
  } = useStore();
  const isAdmin = isAdminOrAbove(currentUser.role);
  const [category, setCategory] = useState<Category | "all">("all");
  const [projectId, setProjectId] = useState("none");
  const [busy, setBusy] = useState<string | null>(null);

  const data: TemplateData = useMemo(() => ({
    currency, workers, projects, invoices, rfis, punchItems, safetyIncidents, equipment, materialEntries, dailyReports,
    changeOrders, budgetLines, insurancePolicies,
  }), [currency, workers, projects, invoices, rfis, punchItems, safetyIncidents, equipment, materialEntries, dailyReports, changeOrders, budgetLines, insurancePolicies]);

  const visible = useMemo(
    () => TEMPLATES.filter((t) => (isAdmin || !t.admin) && (category === "all" || t.category === category)),
    [isAdmin, category],
  );
  const counts = useMemo(() => new Map(TEMPLATES.map((t) => [t.id, t.prefill ? t.prefill(data).length : 0])), [data]);
  const categories = (Object.keys(CATEGORY_LABELS) as Category[]).filter((c) => TEMPLATES.some((t) => (isAdmin || !t.admin) && t.category === c));
  const projectName = projects.find((p) => p.id === projectId)?.name ?? "";

  async function download(t: Template, withData: boolean) {
    const key = `${t.id}:${withData ? "data" : "blank"}`;
    setBusy(key);
    try {
      const { buildTemplateXlsx, templateFileName } = await import("@/lib/excel-templates");
      const blob = await buildTemplateXlsx(t, {
        company: companyName, logo: companyLogo, currency, project: projectName, preparedBy: currentUser.name,
        data: withData ? data : undefined,
      });
      await saveFile(blob, templateFileName(companyName, t));
      toast.success(`${t.title} downloaded`);
    } catch {
      toast.error("That sheet couldn't be built. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const projectOptions = [{ value: "none", label: "No project (leave blank)" }, ...projects.map((p) => ({ value: p.id, label: p.name }))];

  return (
    <div className="max-w-5xl mx-auto pb-36 lg:pb-12 space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white">Excel templates</h2>
        <p className="text-[13px] text-white/60 mt-1 max-w-xl">
          Ready-made sheets with your logo on top. Download one blank, or start from your own records, then change anything you like in Excel.
        </p>
      </div>

      <section aria-label="Template options" className="bg-[#111111] border border-white/[0.07] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none" role="radiogroup" aria-label="Kind of sheet">
          {([["all", "All"], ...categories.map((c) => [c, CATEGORY_LABELS[c]])] as [Category | "all", string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={category === id}
              onClick={() => setCategory(id)}
              className={`flex-shrink-0 min-h-[40px] px-4 rounded-full text-[13px] font-semibold transition-colors ${category === id ? "bg-amber-500 text-black" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3 items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50 mb-1.5">Project name on the sheet</p>
            <CustomSelect value={projectId} onChange={setProjectId} options={projectOptions} />
          </div>
          {!companyLogo && (
            <Link href="/settings" className="flex items-center gap-2 text-[12px] text-white/60 hover:text-white/80 transition-colors min-h-[44px]">
              <ImagePlus size={14} className="text-amber-400 flex-shrink-0" />
              Add your company logo in Settings and it goes on every sheet.
            </Link>
          )}
        </div>
      </section>

      <ul className="grid sm:grid-cols-2 gap-4">
        {visible.map((t) => {
          const Icon = CATEGORY_ICON[t.category];
          const n = counts.get(t.id) ?? 0;
          const shown = t.cols.slice(0, 5).map((c) => c.label);
          const more = t.cols.length - shown.length;
          const blankKey = `${t.id}:blank`, dataKey = `${t.id}:data`;
          return (
            <li key={t.id} className="bg-[#111111] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-500/[0.12] text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-bold text-white leading-tight">{t.title}</h3>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50 mt-1">{CATEGORY_LABELS[t.category]}</p>
                </div>
              </div>
              <p className="text-[13px] text-white/70 leading-relaxed">{t.blurb}</p>
              <p className="text-[12px] text-white/55 leading-relaxed">
                {shown.join(" · ")}{more > 0 ? ` · +${more} more` : ""}
              </p>
              <div className="mt-auto pt-1 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => download(t, false)}
                  disabled={!!busy}
                  className="flex-1 inline-flex items-center justify-center gap-2 min-h-[46px] rounded-full bg-amber-500 hover:bg-amber-400 text-black text-[13px] font-bold transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  {busy === blankKey ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />} Download blank
                </button>
                {t.prefill && (
                  <button
                    type="button"
                    onClick={() => download(t, true)}
                    disabled={!!busy || n === 0}
                    title={n === 0 ? `You don't have any ${t.prefillLabel?.replace(/^my /, "")} yet` : undefined}
                    className="flex-1 inline-flex items-center justify-center gap-2 min-h-[46px] rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-white text-[13px] font-bold transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {busy === dataKey ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    {n > 0 ? `With ${t.prefillLabel} (${n})` : `No ${t.prefillLabel?.replace(/^my /, "")} yet`}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-[12px] text-white/50">
        Every sheet is a normal Excel file. Type under the last row to add more, use the arrows in the header to filter, and change the drop-down lists if you want your own.
      </p>
    </div>
  );
}
