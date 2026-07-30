"use client";

import { useState, useRef } from "react";
import { Layers, Upload, AlertTriangle, Check, X, FileImage, FilePlus } from "lucide-react";
import { useStore } from "@/lib/store";
import { getClient } from "@/lib/supabase/client";
import { BlueprintViewer } from "@/components/blueprint-viewer";
import { ConfirmModal } from "@/components/confirm-modal";

const PIN_TYPE_LABELS = { issue: "Issues", safety: "Safety", rfi: "RFIs", info: "Info" } as const;

export default function BlueprintsPage() {
  const {
    projects, documents, companyId,
    addDocument, blueprintPins, addBlueprintPin, updateBlueprintPin, deleteBlueprintPin,
  } = useStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id ?? "");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "issue" | "safety" | "rfi" | "info">("all");
  const [filterResolved, setFilterResolved] = useState<"all" | "open" | "resolved">("open");
  const [deletePinConfirm, setDeletePinConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const project = projects.find((p) => p.id === selectedProjectId);

  const projectBlueprints = documents.filter(
    (d) => d.projectId === selectedProjectId && d.category === "blueprint"
  );

  const selectedDoc = projectBlueprints.find((d) => d.id === selectedDocId) ?? projectBlueprints[0] ?? null;

  const docPins = blueprintPins.filter((p) => {
    if (p.documentId !== selectedDoc?.id) return false;
    if (filterType !== "all" && p.type !== filterType) return false;
    if (filterResolved === "open" && p.resolved) return false;
    if (filterResolved === "resolved" && !p.resolved) return false;
    return true;
  });

  const openCount = blueprintPins.filter((p) => p.documentId === selectedDoc?.id && !p.resolved).length;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    setUploading(true);
    setUploadError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const path = `${companyId}/blueprints/${Date.now()}.${ext}`;
      const supabase = getClient();
      const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);

      addDocument({
        projectId: selectedProjectId,
        name: file.name.replace(/\.[^.]+$/, ""),
        category: "blueprint",
        publicUrl,
        uploadedById: "",
        uploadedAt: new Date(),
        sizeBytes: file.size,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fileType = (url: string | undefined): "pdf" | "image" =>
    url?.toLowerCase().includes(".pdf") ? "pdf" : "image";

  return (
    <div className="flex flex-col h-full gap-0 -m-4 md:-m-6">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06] bg-[#0a0a0a] flex-shrink-0">
        <Layers size={18} className="text-amber-400" />
        <h1 className="text-[18px] font-black">Blueprints</h1>

        {/* Project selector */}
        <select
          value={selectedProjectId}
          onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedDocId(null); }}
          className="ml-4 bg-[#111] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-white/70 outline-none focus:border-amber-500/40"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {selectedDoc && (
          <>
            <div className="w-px h-4 bg-white/10" />
            {/* Filter: type */}
            <div className="flex items-center gap-1">
              {(["all", "issue", "safety", "rfi", "info"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`text-[10px] px-2 py-1 rounded-lg font-semibold capitalize transition-colors ${filterType === t ? "bg-amber-500/20 text-amber-400" : "text-white/30 hover:text-white/60"}`}
                >
                  {t === "all" ? "All types" : PIN_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-white/10" />
            {/* Filter: resolved */}
            <div className="flex items-center gap-1">
              {(["all", "open", "resolved"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setFilterResolved(v)}
                  className={`text-[10px] px-2 py-1 rounded-lg font-semibold capitalize transition-colors ${filterResolved === v ? "bg-amber-500/20 text-amber-400" : "text-white/30 hover:text-white/60"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {openCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-500/15 text-red-400">
              {openCount} open {openCount === 1 ? "pin" : "pins"}
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => { setUploadError(null); fileInputRef.current?.click(); }}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold transition-colors disabled:opacity-50"
          >
            <Upload size={12} /> {uploading ? "Uploading…" : "Upload Blueprint"}
          </button>
        </div>
      </div>
      {uploadError && (
        <div className="px-6 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
          <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-[12px] text-red-300">{uploadError}</p>
          <button onClick={() => setUploadError(null)} className="ml-auto text-red-400/50 hover:text-red-400 transition-colors"><X size={12} /></button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar — blueprint list */}
        <div className="w-56 flex-shrink-0 border-r border-white/[0.06] bg-[#0d0d0d] overflow-y-auto">
          {projectBlueprints.length === 0 ? (
            <div className="p-4 text-center">
              <FileImage size={28} className="text-white/15 mx-auto mb-2" />
              <p className="text-[11px] text-white/25">No blueprints yet</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 flex items-center gap-1 mx-auto text-[10px] text-amber-400 hover:text-amber-300"
              >
                <FilePlus size={11} /> Upload one
              </button>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {projectBlueprints.map((doc) => {
                const pins = blueprintPins.filter((p) => p.documentId === doc.id);
                const openPins = pins.filter((p) => !p.resolved).length;
                const isActive = (selectedDocId ?? projectBlueprints[0]?.id) === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${isActive ? "bg-amber-500/10 border border-amber-500/20" : "hover:bg-white/[0.04]"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[12px] font-semibold truncate ${isActive ? "text-amber-400" : "text-white/60"}`}>
                        {doc.name}
                      </span>
                      {openPins > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 ml-1 flex-shrink-0">
                          {openPins}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/25 mt-0.5">
                      {pins.length} pin{pins.length !== 1 ? "s" : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Main viewer area */}
        <div className="flex-1 flex min-h-0">
          {!selectedDoc ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Layers size={40} className="text-white/10" />
              <p className="text-[14px] text-white/25">Select or upload a blueprint to get started</p>
              {project && <p className="text-[11px] text-white/15">Project: {project.name}</p>}
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 gap-0">
              {/* Viewer */}
              <div className="flex-1 p-4 min-h-0">
                <BlueprintViewer
                  key={selectedDoc.id}
                  fileUrl={selectedDoc.publicUrl ?? selectedDoc.dataUrl ?? ""}
                  fileType={fileType(selectedDoc.publicUrl ?? selectedDoc.dataUrl)}
                  documentId={selectedDoc.id}
                  pins={docPins}
                  onAddPin={addBlueprintPin}
                  onUpdatePin={updateBlueprintPin}
                  onDeletePin={deleteBlueprintPin}
                />
              </div>

              {/* Pin list sidebar */}
              <div className="w-60 flex-shrink-0 border-l border-white/[0.06] bg-[#0d0d0d] overflow-y-auto">
                <div className="p-3 border-b border-white/[0.06]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                    Pins · {docPins.length}
                  </p>
                </div>
                {docPins.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-[11px] text-white/20">No pins match the filter.</p>
                    <p className="text-[10px] text-white/15 mt-1">Use "Add Pin" to mark issues on the drawing.</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {docPins.map((pin) => {
                      const COLOR = { issue: "#ef4444", safety: "#f59e0b", rfi: "#8b5cf6", info: "#60a5fa" }[pin.type];
                      return (
                        <div
                          key={pin.id}
                          className={`p-2.5 rounded-lg border transition-colors ${pin.resolved ? "border-white/[0.04] bg-white/[0.02] opacity-50" : "border-white/[0.06] bg-white/[0.03]"}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold capitalize" style={{ color: COLOR }}>{pin.type}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => updateBlueprintPin(pin.id, { resolved: !pin.resolved })}
                                className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${pin.resolved ? "bg-white/[0.05] text-white/30" : "bg-green-500/15 text-green-400 hover:bg-green-500/25"}`}
                              >
                                <Check size={9} />
                              </button>
                              <button
                                onClick={() => setDeletePinConfirm(pin.id)}
                                className="w-5 h-5 rounded bg-white/[0.05] text-white/30 hover:bg-red-500/15 hover:text-red-400 flex items-center justify-center transition-colors"
                              >
                                <X size={9} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-white/60 leading-snug">{pin.note || <span className="italic text-white/25">No note</span>}</p>
                          <p className="text-[9px] text-white/20 mt-1">p.{pin.page}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deletePinConfirm}
        title="Delete Pin"
        body="Remove this pin from the blueprint? This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => { if (deletePinConfirm) { deleteBlueprintPin(deletePinConfirm); setDeletePinConfirm(null); } }}
        onCancel={() => setDeletePinConfirm(null)}
      />
    </div>
  );
}
