"use client";
import { toast } from "sonner";

import { useState } from "react";
import { MessageSquare, Plus, Search, Clock, CheckCircle2, XCircle, ChevronDown, ChevronRight, X, Trash2, Pencil } from "lucide-react";
import { useStore } from "@/lib/store";
import { ConfirmModal } from "@/components/confirm-modal";
import { EmptyState } from "@/components/empty-state";
import { MicButton } from "@/components/mic-button";
import { CustomSelect } from "@/components/ui/custom-select";

const STATUS_CONFIG = {
  open: { label: "Open", className: "bg-red-500/15 text-red-400", icon: Clock },
  answered: { label: "Answered", className: "bg-green-500/15 text-green-400", icon: CheckCircle2 },
  closed: { label: "Closed", className: "bg-white/8 text-white/40", icon: XCircle },
};

const PRIORITY_CONFIG = {
  routine: { label: "ROUTINE", className: "bg-blue-500/10 text-blue-400" },
  urgent: { label: "URGENT", className: "bg-amber-500/12 text-amber-400" },
  critical: { label: "CRITICAL", className: "bg-red-500/15 text-red-400" },
};

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

type RFIForm = {
  projectId: string; subject: string; question: string;
  submittedById: string; assignedToId: string;
  priority: "routine" | "urgent" | "critical";
  dueDate: string;
};

const blank: RFIForm = {
  projectId: "", subject: "", question: "",
  submittedById: "", assignedToId: "",
  priority: "routine", dueDate: "",
};

export default function RFIsPage() {
  const { rfis, projects, workers, addRFI, updateRFI, deleteRFI, getWorkerById, getProjectById } = useStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [closeNoAnswerConfirm, setCloseNoAnswerConfirm] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<RFIForm>(blank);
  const [answerRfiId, setAnswerRfiId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "answered" | "closed">("all");

  const filtered = rfis.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return r.subject.toLowerCase().includes(search.toLowerCase()) || r.number.toLowerCase().includes(search.toLowerCase());
  });

  const nextNumber = (() => {
    const nums = rfis.map((r) => parseInt(r.number.replace("RFI-", "")) || 0);
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `RFI-${String(max + 1).padStart(3, "0")}`;
  })();

  const openEdit = (rfi: typeof rfis[0]) => {
    setEditId(rfi.id);
    setForm({
      projectId: rfi.projectId,
      subject: rfi.subject,
      question: rfi.question,
      submittedById: rfi.submittedById,
      assignedToId: rfi.assignedToId,
      priority: rfi.priority,
      dueDate: rfi.dueDate.toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.subject.trim()) return;
    if (editId) {
      updateRFI(editId, {
        subject: form.subject.trim(),
        question: form.question.trim(),
        assignedToId: form.assignedToId || undefined,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
      });
    } else {
      addRFI({
        projectId: form.projectId || (projects[0]?.id ?? ""),
        number: nextNumber,
        subject: form.subject.trim(),
        question: form.question.trim(),
        submittedById: form.submittedById || (workers[0]?.id ?? ""),
        assignedToId: form.assignedToId || (workers[0]?.id ?? ""),
        status: "open",
        priority: form.priority,
        createdAt: new Date(),
        dueDate: form.dueDate ? new Date(form.dueDate) : new Date(Date.now() + 7 * 86400000),
      });
    }
    setForm(blank);
    setEditId(null);
    setShowModal(false);
    toast.success(editId ? "RFI updated" : "RFI submitted");
  };

  const handleAnswer = (rfiId: string) => {
    if (!answerText.trim()) return;
    updateRFI(rfiId, { status: "answered", answer: answerText.trim() });
    setAnswerRfiId(null);
    setAnswerText("");
  };

  return (
    <>
      {/* MOBILE */}
      <div className="lg:hidden -mx-5 -mt-5 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h1 className="text-[22px] font-bold text-white">RFIs</h1>
          <button
            onClick={() => { setEditId(null); setForm(blank); setShowModal(true); }}
            className="flex items-center gap-1.5 bg-amber-500 active:bg-amber-600 text-black font-bold text-[13px] px-4 py-2 rounded-full transition-colors"
          >
            <Plus size={14} /> New RFI
          </button>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 px-5 pb-4 overflow-x-auto [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
          <button
            onClick={() => setStatusFilter("all")}
            className={`flex-shrink-0 snap-start px-3.5 py-2 rounded-full text-[12px] font-semibold transition-all ${statusFilter === "all" ? "bg-white/15 text-white border border-white/20" : "bg-[#131110] border border-white/[0.07] text-white/40"}`}
          >
            All ({rfis.length})
          </button>
          {(["open", "answered", "closed"] as const).map((status) => {
            const cfg = STATUS_CONFIG[status];
            const count = rfis.filter((r) => r.status === status).length;
            return (
              <button key={status}
                onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                className={`flex-shrink-0 snap-start px-3.5 py-2 rounded-full text-[12px] font-semibold transition-all border ${statusFilter === status ? cfg.className + " border-current/20" : "bg-[#131110] border-white/[0.07] text-white/40"}`}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2.5 bg-[#131110] border border-white/[0.07] mx-5 mb-4 px-3.5 py-3 rounded-xl">
          <Search size={13} className="text-white/30" />
          <input
            className="bg-transparent text-[13px] text-white/70 placeholder:text-white/25 outline-none flex-1"
            placeholder="Search RFIs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="px-5 pb-4 space-y-2.5">
          {rfis.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No RFIs yet"
              body="Submit a Request For Information to get formal answers on design or site questions."
              action={{ label: "Submit RFI", onClick: () => setShowModal(true) }}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No RFIs found"
              body="Try a different status filter or clear your search."
              isFiltered
            />
          ) : (
            filtered.map((rfi) => {
              const project = getProjectById(rfi.projectId);
              const statusCfg = STATUS_CONFIG[rfi.status];
              const prioCfg = PRIORITY_CONFIG[rfi.priority];
              const isOverdue = rfi.dueDate < new Date() && rfi.status === "open";
              const borderColor = rfi.priority === "critical" ? "#ef4444" : rfi.priority === "urgent" ? "#F5C400" : "#3b82f6";
              return (
                <button
                  key={rfi.id}
                  onClick={() => { setExpanded(expanded === rfi.id ? null : rfi.id); }}
                  className={`card-hover w-full text-left bg-[#131110] border rounded-2xl p-4 active:scale-[0.985] active:opacity-90 ${isOverdue ? "border-red-500/25" : "border-white/[0.07] hover:border-white/[0.12]"}`}
                  style={{ borderLeftColor: borderColor, borderLeftWidth: 3 }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-white/30 font-mono">{rfi.number}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${prioCfg.className}`}>{prioCfg.label}</span>
                      {isOverdue && <span className="text-[9px] font-bold bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">OVERDUE</span>}
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.className}`}>{statusCfg.label}</span>
                  </div>
                  <p className="text-[14px] font-bold text-white/85 mb-1.5 text-left">{rfi.subject}</p>
                  {rfi.question && (
                    <p className="text-[12px] text-white/40 mb-2 line-clamp-2 text-left">{rfi.question}</p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-white/30">
                    {project ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: project.color }} />
                        {project.name}
                      </span>
                    ) : <span />}
                    <span className={isOverdue ? "text-red-400 font-semibold" : ""}>Due {rfi.dueDate.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
                  </div>
                  {/* Expanded answer view on mobile */}
                  {expanded === rfi.id && rfi.answer && (
                    <div className="mt-3 bg-green-500/[0.06] border border-green-500/15 rounded-xl px-3 py-2.5 text-left">
                      <p className="text-[9px] font-bold text-green-400/60 uppercase tracking-wider mb-1">Answer</p>
                      <p className="text-[12px] text-white/65 leading-relaxed">{rfi.answer}</p>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:block">
        <div className="space-y-5 max-w-[900px]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">RFIs</h2>
              <p className="text-white/35 text-sm mt-0.5">Request For Information — formal clarification and design queries</p>
            </div>
            <button onClick={() => { setEditId(null); setForm(blank); setShowModal(true); }}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-full transition-colors">
              <Plus size={15} />
              New RFI
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(["open", "answered", "closed"] as const).map((status) => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              const count = rfis.filter((r) => r.status === status).length;
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(active ? "all" : status)}
                  className={`bg-[#111111] border rounded-xl p-4 flex items-center gap-3 transition-all text-left ${active ? "border-amber-500/40 bg-amber-500/[0.04]" : "border-white/[0.06] hover:border-white/10"}`}
                >
                  <Icon size={20} className={cfg.className.split(" ")[1]} />
                  <div>
                    <p className="text-2xl font-bold text-white">{count}</p>
                    <p className="text-[11px] text-white/40">{cfg.label}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-lg px-3 py-2 max-w-64">
            <Search size={13} className="text-white/30" />
            <input className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none flex-1"
              placeholder="Search RFIs…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="space-y-2">
            {rfis.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No RFIs yet"
                body="Submit a Request For Information to get formal answers on design or site questions."
                action={{ label: "Submit RFI", onClick: () => setShowModal(true) }}
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No RFIs match"
                body="Try a different status filter or clear your search."
                isFiltered
              />
            ) : null}
            {filtered.map((rfi) => {
              const project = getProjectById(rfi.projectId);
              const submitter = getWorkerById(rfi.submittedById);
              const assignee = getWorkerById(rfi.assignedToId);
              const statusCfg = STATUS_CONFIG[rfi.status];
              const prioCfg = PRIORITY_CONFIG[rfi.priority];
              const StatusIcon = statusCfg.icon;
              const isOpen = expanded === rfi.id;
              const isOverdue = rfi.dueDate < new Date() && rfi.status === "open";

              return (
                <div key={rfi.id} className={`card-hover bg-[#111111] border rounded-2xl overflow-hidden ${isOverdue ? "border-red-500/20 hover:border-red-500/35" : "border-white/[0.06] hover:border-white/[0.12]"}`}
                  style={{ borderLeftColor: rfi.priority === "critical" ? "#ef4444" : rfi.priority === "urgent" ? "#F5C400" : "#3b82f6", borderLeftWidth: 3 }}>
                  <button className="w-full flex items-center gap-4 px-5 py-4 text-left"
                    onClick={() => setExpanded(isOpen ? null : rfi.id)}>
                    <StatusIcon size={16} className={statusCfg.className.split(" ")[1]} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[11px] text-white/30 font-mono">{rfi.number}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prioCfg.className}`}>{prioCfg.label}</span>
                        {isOverdue && <span className="text-[10px] font-bold bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">OVERDUE</span>}
                      </div>
                      <p className="text-[14px] font-bold text-white/85 truncate">{rfi.subject}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-white/30">
                        {project && <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} /><span>{project.name}</span></div>}
                        <span>Due {rfi.dueDate.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statusCfg.className}`}>{statusCfg.label}</span>
                      {isOpen ? <ChevronDown size={15} className="text-white/30" /> : <ChevronRight size={15} className="text-white/20" />}
                      <button onClick={(e) => { e.stopPropagation(); openEdit(rfi); }}
                        className="p-1 rounded hover:bg-white/8 text-white/20 hover:text-white/60 transition-colors">
                        <Pencil size={12} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(rfi.id); }}
                        className="p-1 rounded hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-0 border-t border-white/[0.05]">
                      <div className="pt-4 space-y-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">Question</p>
                          <p className="text-[13px] text-white/65 leading-relaxed">{rfi.question}</p>
                        </div>
                        {rfi.answer && (
                          <div className="bg-green-500/[0.06] border border-green-500/15 rounded-xl p-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-green-400 mb-2">Response</p>
                            <p className="text-[13px] text-white/65 leading-relaxed">{rfi.answer}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-6 text-[11px] text-white/30">
                          {submitter && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                                style={{ backgroundColor: submitter.color + "25", color: submitter.color }}>{submitter.initials}</div>
                              <span>Submitted by {submitter.name}</span>
                            </div>
                          )}
                          {assignee && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                                style={{ backgroundColor: assignee.color + "25", color: assignee.color }}>{assignee.initials}</div>
                              <span>Assigned to {assignee.name}</span>
                            </div>
                          )}
                        </div>
                        {rfi.status === "open" && (
                          answerRfiId === rfi.id ? (
                            <div className="space-y-2">
                              <textarea className={inp + " resize-none"} rows={3} placeholder="Type your response..."
                                value={answerText} onChange={(e) => setAnswerText(e.target.value)} />
                              <div className="flex gap-2">
                                <button onClick={() => handleAnswer(rfi.id)}
                                  className="text-[12px] font-semibold bg-green-500/10 text-green-400 hover:bg-green-500/15 px-3 py-1.5 rounded-full transition-colors">
                                  Submit Answer
                                </button>
                                <button onClick={() => setAnswerRfiId(null)}
                                  className="text-[12px] font-semibold bg-white/5 text-white/40 hover:bg-white/8 px-3 py-1.5 rounded-full transition-colors">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => { setAnswerRfiId(rfi.id); setAnswerText(""); }}
                                className="text-[12px] font-semibold bg-green-500/10 text-green-400 hover:bg-green-500/15 px-3 py-1.5 rounded-full transition-colors">
                                Submit Answer
                              </button>
                              <button onClick={() => {
                                if (!rfi.answer) { setCloseNoAnswerConfirm(rfi.id); return; }
                                updateRFI(rfi.id, { status: "closed" }); toast.success("RFI closed");
                              }}
                                className="text-[12px] font-semibold bg-white/5 text-white/40 hover:bg-white/8 px-3 py-1.5 rounded-full transition-colors">
                                Close RFI
                              </button>
                            </div>
                          )
                        )}
                        {rfi.status === "answered" && (
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => { updateRFI(rfi.id, { status: "closed" }); toast.success("RFI closed"); }}
                              className="text-[12px] font-semibold bg-white/5 text-white/40 hover:bg-white/8 px-3 py-1.5 rounded-full transition-colors">
                              Close RFI
                            </button>
                            <button onClick={() => { updateRFI(rfi.id, { status: "open", answer: undefined }); toast.success("RFI reopened"); }}
                              className="text-[12px] font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/15 px-3 py-1.5 rounded-full transition-colors">
                              Reopen
                            </button>
                          </div>
                        )}
                        {rfi.status === "closed" && (
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => updateRFI(rfi.id, { status: "open" })}
                              className="text-[12px] font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/15 px-3 py-1.5 rounded-full transition-colors">
                              Reopen RFI
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="sheet bg-[#161616] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-bold text-white">
                {editId ? "Edit RFI" : <>New RFI <span className="text-white/30 font-normal text-[13px]">{nextNumber}</span></>}
              </h3>
              <button onClick={() => { setShowModal(false); setEditId(null); }} className="w-10 h-10 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/5 active:bg-white/10 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-scroll overscroll-y-contain p-6 space-y-4" style={{touchAction:"pan-y"}}>
              <div>
                <label className={lbl}>Subject *</label>
                <input className={inp} placeholder="e.g. Footing depth variance at grid C-4"
                  value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-white/35 uppercase tracking-wider">Question</label>
                  <MicButton size="sm" onResult={(t) => setForm((f) => ({ ...f, question: (f.question ? f.question + " " : "") + t.trim() }))} />
                </div>
                <textarea className={inp + " resize-none"} rows={3} placeholder="Describe the issue or question..."
                  value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {!editId && (
                  <div>
                    <label className={lbl}>Project</label>
                    <CustomSelect
                      className={inp}
                      value={form.projectId}
                      onChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
                      options={[
                        { value: "", label: "Select project" },
                        ...projects.map((p) => ({ value: p.id, label: p.name })),
                      ]}
                    />
                  </div>
                )}
                <div className={editId ? "col-span-2" : ""}>
                  <label className={lbl}>Priority</label>
                  <CustomSelect
                    className={inp}
                    value={form.priority}
                    onChange={(v) => setForm((f) => ({ ...f, priority: v as RFIForm["priority"] }))}
                    options={[
                      { value: "routine", label: "Routine" },
                      { value: "urgent", label: "Urgent" },
                      { value: "critical", label: "Critical" },
                    ]}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {!editId && (
                  <div>
                    <label className={lbl}>Submitted By</label>
                    <CustomSelect
                      className={inp}
                      value={form.submittedById}
                      onChange={(v) => setForm((f) => ({ ...f, submittedById: v }))}
                      options={[
                        { value: "", label: "Select worker" },
                        ...workers.map((w) => ({ value: w.id, label: w.name })),
                      ]}
                    />
                  </div>
                )}
                <div>
                  <label className={lbl}>Assigned To</label>
                  <CustomSelect
                    className={inp}
                    value={form.assignedToId}
                    onChange={(v) => setForm((f) => ({ ...f, assignedToId: v }))}
                    options={[
                      { value: "", label: "Select worker" },
                      ...workers.map((w) => ({ value: w.id, label: w.name })),
                    ]}
                  />
                </div>
              </div>
              <div>
                <label className={lbl}>Due Date</label>
                <input className={inp} type="date" value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex-shrink-0 flex gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06]">
              <button onClick={() => { setShowModal(false); setEditId(null); }}
                className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={!form.subject.trim()}
                className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {editId ? "Save Changes" : "Submit RFI"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete RFI"
        body="Delete this RFI and all its responses? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirm) deleteRFI(deleteConfirm); setDeleteConfirm(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />
      <ConfirmModal
        open={!!closeNoAnswerConfirm}
        title="Close Without Answer?"
        body="This RFI has no answer yet. Close it anyway?"
        confirmLabel="Close RFI"
        danger={false}
        onConfirm={() => { if (closeNoAnswerConfirm) { updateRFI(closeNoAnswerConfirm, { status: "closed" }); toast.success("RFI closed"); } setCloseNoAnswerConfirm(null); }}
        onCancel={() => setCloseNoAnswerConfirm(null)}
      />
    </>
  );
}






