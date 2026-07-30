"use client";

import { useState } from "react";
import { MessageSquare, Plus, Search, Clock, CheckCircle2, XCircle, ChevronDown, ChevronRight, X, Trash2, Pencil } from "lucide-react";
import { useStore } from "@/lib/store";
import { ConfirmModal } from "@/components/confirm-modal";

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
  };

  const handleAnswer = (rfiId: string) => {
    if (!answerText.trim()) return;
    updateRFI(rfiId, { status: "answered", answer: answerText.trim() });
    setAnswerRfiId(null);
    setAnswerText("");
  };

  return (
    <div className="space-y-5 max-w-[900px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">RFIs</h2>
          <p className="text-white/35 text-sm mt-0.5">Request For Information — formal clarification and design queries</p>
        </div>
        <button onClick={() => { setEditId(null); setForm(blank); setShowModal(true); }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors">
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
        {rfis.length === 0 && (
          <div className="text-center py-16 text-white/25 space-y-2">
            <MessageSquare size={36} className="mx-auto opacity-30" />
            <p className="text-[14px]">No RFIs yet</p>
            <button onClick={() => setShowModal(true)} className="text-amber-400 text-[12px] hover:text-amber-300 transition-colors">
              + Submit your first RFI
            </button>
          </div>
        )}
        {rfis.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12 text-white/25 space-y-1">
            <MessageSquare size={28} className="mx-auto opacity-20" />
            <p className="text-[13px]">No RFIs match the current filter</p>
          </div>
        )}
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
            <div key={rfi.id} className={`bg-[#111111] border rounded-xl overflow-hidden transition-all ${isOverdue ? "border-red-500/20" : "border-white/[0.06] hover:border-white/10"}`}>
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
                              className="text-[12px] font-semibold bg-green-500/10 text-green-400 hover:bg-green-500/15 px-3 py-1.5 rounded-lg transition-colors">
                              Submit Answer
                            </button>
                            <button onClick={() => setAnswerRfiId(null)}
                              className="text-[12px] font-semibold bg-white/5 text-white/40 hover:bg-white/8 px-3 py-1.5 rounded-lg transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => { setAnswerRfiId(rfi.id); setAnswerText(""); }}
                            className="text-[12px] font-semibold bg-green-500/10 text-green-400 hover:bg-green-500/15 px-3 py-1.5 rounded-lg transition-colors">
                            Submit Answer
                          </button>
                          <button onClick={() => {
                            if (!rfi.answer) { setCloseNoAnswerConfirm(rfi.id); return; }
                            updateRFI(rfi.id, { status: "closed" });
                          }}
                            className="text-[12px] font-semibold bg-white/5 text-white/40 hover:bg-white/8 px-3 py-1.5 rounded-lg transition-colors">
                            Close RFI
                          </button>
                        </div>
                      )
                    )}
                    {rfi.status === "answered" && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => updateRFI(rfi.id, { status: "closed" })}
                          className="text-[12px] font-semibold bg-white/5 text-white/40 hover:bg-white/8 px-3 py-1.5 rounded-lg transition-colors">
                          Close RFI
                        </button>
                        <button onClick={() => updateRFI(rfi.id, { status: "open", answer: undefined })}
                          className="text-[12px] font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/15 px-3 py-1.5 rounded-lg transition-colors">
                          Reopen
                        </button>
                      </div>
                    )}
                    {rfi.status === "closed" && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => updateRFI(rfi.id, { status: "open" })}
                          className="text-[12px] font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/15 px-3 py-1.5 rounded-lg transition-colors">
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-bold text-white">
                {editId ? "Edit RFI" : <>New RFI <span className="text-white/30 font-normal text-[13px]">{nextNumber}</span></>}
              </h3>
              <button onClick={() => { setShowModal(false); setEditId(null); }} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={lbl}>Subject *</label>
                <input className={inp} placeholder="e.g. Footing depth variance at grid C-4"
                  value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Question</label>
                <textarea className={inp + " resize-none"} rows={3} placeholder="Describe the issue or question..."
                  value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {!editId && (
                  <div>
                    <label className={lbl}>Project</label>
                    <select className={inp} value={form.projectId}
                      onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}>
                      <option value="">Select project</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                <div className={editId ? "col-span-2" : ""}>
                  <label className={lbl}>Priority</label>
                  <select className={inp} value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as RFIForm["priority"] }))}>
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {!editId && (
                  <div>
                    <label className={lbl}>Submitted By</label>
                    <select className={inp} value={form.submittedById}
                      onChange={(e) => setForm((f) => ({ ...f, submittedById: e.target.value }))}>
                      <option value="">Select worker</option>
                      {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className={lbl}>Assigned To</label>
                  <select className={inp} value={form.assignedToId}
                    onChange={(e) => setForm((f) => ({ ...f, assignedToId: e.target.value }))}>
                    <option value="">Select worker</option>
                    {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Due Date</label>
                <input className={inp} type="date" value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setShowModal(false); setEditId(null); }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={!form.subject.trim()}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
        onConfirm={() => { if (closeNoAnswerConfirm) updateRFI(closeNoAnswerConfirm, { status: "closed" }); setCloseNoAnswerConfirm(null); }}
        onCancel={() => setCloseNoAnswerConfirm(null)}
      />
    </div>
  );
}
