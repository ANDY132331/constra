"use client";

import { useState, useMemo, useRef } from "react";
import {
  Package, Plus, Trash2, TrendingDown, TrendingUp,
  Search, X, Check, FileText,
} from "lucide-react";
import { exportMaterialsPdf } from "@/lib/pdf-export";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { ConfirmModal } from "@/components/confirm-modal";
import type { MaterialEntry, MaterialType } from "@/lib/mock-data";
import { TRADE_MATERIALS } from "@/lib/mock-data";

const TRADES = Object.keys(TRADE_MATERIALS);

const TRADE_COLORS: Record<string, string> = {
  "Framing":             "#f59e0b",
  "Drywall":             "#60a5fa",
  "Concrete":            "#94a3b8",
  "Roofing":             "#f97316",
  "Electrical":          "#facc15",
  "Plumbing":            "#38bdf8",
  "Insulation":          "#a78bfa",
  "Flooring":            "#34d399",
  "Painting":            "#fb7185",
  "HVAC":                "#22d3ee",
  "Masonry":             "#d97706",
  "Steel / Structural":  "#64748b",
  "Siding":              "#a3e635",
  "Windows & Doors":     "#c084fc",
  "Landscaping / Site Work": "#4ade80",
};

export default function MaterialsPage() {
  const { projects, materialTypes, materialEntries, addMaterialType, addMaterialEntry, deleteMaterialEntry, currentUser, companyName } = useStore();

  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedTrade, setSelectedTrade] = useState<string>("all");
  const [entryType, setEntryType] = useState<"delivery" | "usage">("delivery");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  // Material picker state
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerTrade, setPickerTrade] = useState<string>(TRADES[0]);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType | null>(null);
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [entryDate, setEntryDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [entryProjectId, setEntryProjectId] = useState<string>("");

  const searchRef = useRef<HTMLInputElement>(null);

  // Build a combined material library: built-in suggestions + user-saved custom types
  const libraryForTrade = useMemo(() => {
    const builtIn = (TRADE_MATERIALS[pickerTrade] ?? []).map((m) => {
      const existing = materialTypes.find(
        (mt) => mt.name === m.name && mt.trade === pickerTrade
      );
      if (existing) return existing;
      return { id: `_builtin_${pickerTrade}_${m.name}`, name: m.name, unit: m.unit, trade: pickerTrade, useCount: 0 };
    });
    const custom = materialTypes.filter((mt) => mt.trade === pickerTrade && mt.isCustom);
    return [...builtIn, ...custom];
  }, [pickerTrade, materialTypes]);

  const filteredLibrary = useMemo(() => {
    if (!pickerSearch.trim()) return libraryForTrade;
    const q = pickerSearch.toLowerCase();
    return libraryForTrade.filter((m) => m.name.toLowerCase().includes(q));
  }, [libraryForTrade, pickerSearch]);

  // Sort: recently used first, then alphabetical
  const sortedLibrary = useMemo(() => {
    return [...filteredLibrary].sort((a, b) => {
      if (b.useCount !== a.useCount) return b.useCount - a.useCount;
      return a.name.localeCompare(b.name);
    });
  }, [filteredLibrary]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return materialEntries.filter((e) => {
      if (selectedProject !== "all" && e.projectId !== selectedProject) return false;
      if (selectedTrade !== "all" && e.trade !== selectedTrade) return false;
      if (searchQuery && !e.materialName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [materialEntries, selectedProject, selectedTrade, searchQuery]);

  // Per-project summary grouped by trade
  const projectSummary = useMemo(() => {
    if (selectedProject === "all") return null;
    const entries = materialEntries.filter((e) => e.projectId === selectedProject);
    const byTrade: Record<string, { deliveries: number; usage: number; unit: string; name: string }[]> = {};
    for (const e of entries) {
      if (!byTrade[e.trade]) byTrade[e.trade] = [];
      const existing = byTrade[e.trade].find((x) => x.name === e.materialName);
      if (existing) {
        if (e.type === "delivery") existing.deliveries += e.quantity;
        else existing.usage += e.quantity;
      } else {
        byTrade[e.trade].push({
          name: e.materialName, unit: e.unit,
          deliveries: e.type === "delivery" ? e.quantity : 0,
          usage: e.type === "usage" ? e.quantity : 0,
        });
      }
    }
    return byTrade;
  }, [materialEntries, selectedProject]);

  function handleAddEntry() {
    if (!selectedMaterial || !quantity || !entryProjectId) return;
    const q = parseFloat(quantity);
    if (isNaN(q) || q <= 0) return;

    // Ensure material type exists in store
    let typeId = selectedMaterial.id;
    if (typeId.startsWith("_builtin_")) {
      const existing = materialTypes.find(
        (mt) => mt.name === selectedMaterial.name && mt.trade === selectedMaterial.trade
      );
      if (existing) {
        typeId = existing.id;
      } else {
        const newType = addMaterialType({
          name: selectedMaterial.name,
          unit: selectedMaterial.unit,
          trade: selectedMaterial.trade,
        });
        typeId = newType.id;
      }
    }

    const entry: Omit<MaterialEntry, "id"> = {
      projectId: entryProjectId,
      materialTypeId: typeId,
      materialName: selectedMaterial.name,
      unit: selectedMaterial.unit,
      trade: selectedMaterial.trade,
      quantity: q,
      type: entryType,
      date: new Date(entryDate),
      note: note.trim() || undefined,
    };
    addMaterialEntry(entry);

    // Reset form
    setSelectedMaterial(null);
    setQuantity("");
    setNote("");
    setPickerSearch("");
    setShowAddModal(false);
  }

  const color = (trade: string) => TRADE_COLORS[trade] ?? "#f59e0b";

  return (
    <div className="space-y-5 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Materials</h2>
          <p className="text-[12px] text-white/35 mt-0.5">Track deliveries and usage across all job sites</p>
        </div>
        <div className="flex items-center gap-2">
          {projectSummary && Object.keys(projectSummary).length > 0 && (
            <button
              onClick={async () => {
                setPdfLoading(true);
                try {
                  const proj = projects.find((p) => p.id === selectedProject);
                  await exportMaterialsPdf(proj?.name ?? "Project", projectSummary, companyName);
                } finally {
                  setPdfLoading(false); }
              }}
              disabled={pdfLoading}
              className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.07] text-white/60 font-bold text-[13px] px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <FileText size={14} />
              {pdfLoading ? "Generating…" : "Export PDF"}
            </button>
          )}
          <button
            onClick={() => { setShowAddModal(true); setEntryProjectId(projects[0]?.id ?? ""); }}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Log Material
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search materials…"
            className="bg-[#111] border border-white/[0.07] rounded-lg ps-8 pe-3 py-2 text-[13px] text-white placeholder-white/25 outline-none focus:border-amber-500/40 w-48"
          />
        </div>

        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="bg-[#111] border border-white/[0.07] rounded-lg px-3 py-2 text-[13px] text-white/70 outline-none"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={selectedTrade}
          onChange={(e) => setSelectedTrade(e.target.value)}
          className="bg-[#111] border border-white/[0.07] rounded-lg px-3 py-2 text-[13px] text-white/70 outline-none"
        >
          <option value="all">All Trades</option>
          {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <div className="flex items-center gap-1 bg-[#111] border border-white/[0.07] rounded-lg p-1">
          {(["delivery", "usage"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setEntryType(t)}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold capitalize transition-colors ${entryType === t ? "bg-amber-500 text-black" : "text-white/40 hover:text-white/70"}`}
            >
              {t === "delivery" ? "Deliveries" : "Usage"}
            </button>
          ))}
        </div>
      </div>

      {/* Project Summary */}
      {projectSummary && Object.keys(projectSummary).length > 0 && (
        <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-[13px] font-bold text-white/70 mb-4 uppercase tracking-wider">
            Project Summary — {projects.find((p) => p.id === selectedProject)?.name}
          </h3>
          <div className="space-y-4">
            {Object.entries(projectSummary).map(([trade, items]) => (
              <div key={trade}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color(trade) }} />
                  <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: color(trade) }}>{trade}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-white/25">
                        <th className="text-left py-1 pr-4 font-semibold">Material</th>
                        <th className="text-right py-1 pr-4 font-semibold">Delivered</th>
                        <th className="text-right py-1 pr-4 font-semibold">Used</th>
                        <th className="text-right py-1 font-semibold">On Hand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const onHand = item.deliveries - item.usage;
                        return (
                          <tr key={item.name} className="border-t border-white/[0.04]">
                            <td className="py-1.5 pr-4 text-white/80">{item.name}</td>
                            <td className="py-1.5 pr-4 text-right text-emerald-400">{item.deliveries} {item.unit}</td>
                            <td className="py-1.5 pr-4 text-right text-amber-400">{item.usage} {item.unit}</td>
                            <td className={`py-1.5 text-right font-semibold ${onHand < 0 ? "text-red-400" : "text-white/60"}`}>
                              {onHand} {item.unit}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log entries */}
      <div className="bg-[#111] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-[12px] font-bold text-white/40 uppercase tracking-wider">
            {filteredEntries.filter((e) => e.type === entryType).length} {entryType === "delivery" ? "deliveries" : "usage entries"}
          </span>
        </div>
        {filteredEntries.filter((e) => e.type === entryType).length === 0 ? (
          <div className="py-16 text-center">
            <Package size={28} className="text-white/15 mx-auto mb-3" />
            <p className="text-[13px] text-white/25">No {entryType} logs yet</p>
            <p className="text-[11px] text-white/15 mt-1">Click "Log Material" to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filteredEntries.filter((e) => e.type === entryType).map((entry) => {
              const project = projects.find((p) => p.id === entry.projectId);
              const tradeColor = color(entry.trade);
              return (
                <div key={entry.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] group transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: tradeColor + "18" }}>
                    {entry.type === "delivery"
                      ? <TrendingUp size={15} style={{ color: tradeColor }} />
                      : <TrendingDown size={15} className="text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-white/90">{entry.materialName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                        style={{ backgroundColor: tradeColor + "22", color: tradeColor }}>
                        {entry.trade}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/35 mt-0.5">
                      {project?.name ?? "Unknown"} · {format(new Date(entry.date), "MMM d, yyyy")}
                      {entry.note && <span className="ml-2 italic">"{entry.note}"</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-[15px] font-bold ${entry.type === "delivery" ? "text-emerald-400" : "text-amber-400"}`}>
                      {entry.type === "delivery" ? "+" : "-"}{entry.quantity}
                    </div>
                    <div className="text-[10px] text-white/30">{entry.unit}</div>
                  </div>
                  <button onClick={() => setDeleteConfirm(entry.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-[#141414] border border-white/[0.1] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <h3 className="text-[15px] font-bold text-white">Log Material</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Type toggle */}
              <div className="flex gap-2">
                {(["delivery", "usage"] as const).map((t) => (
                  <button key={t} onClick={() => setEntryType(t)}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-bold capitalize transition-colors ${entryType === t ? "bg-amber-500 text-black" : "bg-white/5 text-white/40 hover:text-white/70"}`}>
                    {t === "delivery" ? "Delivery" : "Usage / Install"}
                  </button>
                ))}
              </div>

              {/* Project */}
              <div>
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Project</label>
                <select
                  value={entryProjectId}
                  onChange={(e) => setEntryProjectId(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-amber-500/40"
                >
                  <option value="">Select project…</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Trade picker */}
              <div>
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Trade</label>
                <div className="flex flex-wrap gap-1.5">
                  {TRADES.map((t) => (
                    <button key={t} onClick={() => { setPickerTrade(t); setPickerSearch(""); setSelectedMaterial(null); }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${pickerTrade === t ? "text-black" : "bg-white/[0.05] text-white/40 hover:text-white/70"}`}
                      style={pickerTrade === t ? { backgroundColor: color(t) } : undefined}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Material search */}
              <div>
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Material</label>
                <div className="relative mb-2">
                  <Search size={12} className="absolute start-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    ref={searchRef}
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search or type a new material…"
                    className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-lg ps-8 pe-3 py-2.5 text-[13px] text-white placeholder-white/25 outline-none focus:border-amber-500/40"
                  />
                </div>
                <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg max-h-40 overflow-y-auto">
                  {sortedLibrary.length === 0 && pickerSearch && (
                    <button
                      onClick={() => setSelectedMaterial({ id: `_custom_${Date.now()}`, name: pickerSearch, unit: "pieces", trade: pickerTrade, useCount: 0, isCustom: true })}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-amber-400 hover:bg-amber-500/5 text-left"
                    >
                      <Plus size={12} /> Add "{pickerSearch}" as custom material
                    </button>
                  )}
                  {sortedLibrary.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMaterial(m)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-[12px] transition-colors text-left ${selectedMaterial?.name === m.name && selectedMaterial?.trade === m.trade ? "bg-amber-500/15 text-amber-300" : "text-white/70 hover:bg-white/[0.04] hover:text-white"}`}
                    >
                      <span>{m.name}</span>
                      <span className="text-white/25 text-[10px]">{m.unit}{m.useCount > 0 ? ` · used ${m.useCount}×` : ""}</span>
                    </button>
                  ))}
                </div>
                {selectedMaterial && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <Check size={12} className="text-amber-400 flex-shrink-0" />
                    <span className="text-[12px] text-amber-300">{selectedMaterial.name} <span className="text-amber-400/60">({selectedMaterial.unit})</span></span>
                  </div>
                )}
              </div>

              {/* Quantity + date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">
                    Quantity {selectedMaterial && <span className="text-white/25 normal-case font-normal">({selectedMaterial.unit})</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-amber-500/40"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Date</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-amber-500/40"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Note (optional)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Delivered by XYZ Supply, Job #34…"
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-white/20 outline-none focus:border-amber-500/40"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleAddEntry}
                disabled={!selectedMaterial || !quantity || !entryProjectId}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold text-[14px] rounded-lg transition-colors"
              >
                Log {entryType === "delivery" ? "Delivery" : "Usage"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Material Entry"
        body="Delete this material log entry? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirm) deleteMaterialEntry(deleteConfirm); setDeleteConfirm(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
