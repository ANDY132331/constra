"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import {
  FolderOpen, Upload, Trash2, FileText, FileImage, File,
  Download, Search, ChevronDown, History, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import type { ProjectDocument, DocumentVersion } from "@/lib/mock-data";
import { ConfirmModal } from "@/components/confirm-modal";
import { SUPABASE_ENABLED } from "@/lib/supabase/client";
import { uploadDocument } from "@/lib/supabase/storage";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";

type Category = ProjectDocument["category"];

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: "blueprint",   label: "Blueprints",          color: "#60a5fa" },
  { value: "permit",      label: "Permits",             color: "#34d399" },
  { value: "contract",    label: "Contracts",           color: "#F5C400" },
  { value: "inspection",  label: "Inspection Reports",  color: "#a78bfa" },
  { value: "safety",      label: "Safety Docs",         color: "#F5C400" },
  { value: "other",       label: "Other",               color: "#64748b" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg","jpeg","png","gif","webp","heic"].includes(ext)) return FileImage;
  if (["pdf","doc","docx","xls","xlsx","txt","csv"].includes(ext)) return FileText;
  return File;
}

export default function DocumentsPage() {
  const { projects, documents, addDocument, deleteDocument, addDocumentVersion, currentUser, companyId } = useStore();

  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id ?? "");
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");

  // Auto-select first project if none is selected
  useEffect(() => {
    if (!selectedProject && projects[0]?.id) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [downloadErrorMsg, setDownloadErrorMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<Category>("blueprint");
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [uploadingVersion, setUploadingVersion] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const versionInputRef = useRef<HTMLInputElement>(null);
  const pdfBlobRef = useRef<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

  // Convert data:application/pdf → blob URL (Chrome blocks data: URIs in iframes)
  useEffect(() => {
    if (pdfBlobRef.current) { URL.revokeObjectURL(pdfBlobRef.current); pdfBlobRef.current = null; }
    setPdfBlobUrl(null);
    const dataUrl = previewDoc?.dataUrl;
    if (!dataUrl?.startsWith("data:application/pdf")) return;
    fetch(dataUrl).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      pdfBlobRef.current = url;
      setPdfBlobUrl(url);
    }).catch(() => {});
    return () => { if (pdfBlobRef.current) { URL.revokeObjectURL(pdfBlobRef.current); pdfBlobRef.current = null; } };
  }, [previewDoc?.dataUrl]);

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (selectedProject && d.projectId !== selectedProject) return false;
      if (selectedCategory !== "all" && d.category !== selectedCategory) return false;
      if (searchQuery && !d.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    }).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }, [documents, selectedProject, selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const docs = selectedProject ? documents.filter((d) => d.projectId === selectedProject) : documents;
    const counts: Record<string, number> = {};
    for (const d of docs) counts[d.category] = (counts[d.category] ?? 0) + 1;
    return counts;
  }, [documents, selectedProject]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !selectedProject) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Try Supabase Storage first; fall back to base64 in localStorage
      if (SUPABASE_ENABLED && companyId) {
        const url = await uploadDocument(dataUrl, companyId, file.name);
        addDocument({
          projectId: selectedProject,
          name: file.name,
          category: uploadCategory,
          uploadedAt: new Date(),
          uploadedById: currentUser.id,
          sizeBytes: file.size,
          dataUrl: url ?? dataUrl,
        });
      } else {
        addDocument({
          projectId: selectedProject,
          name: file.name,
          category: uploadCategory,
          uploadedAt: new Date(),
          uploadedById: currentUser.id,
          sizeBytes: file.size,
          dataUrl,
        });
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function downloadDoc(doc: ProjectDocument) {
    if (!doc.dataUrl) {
      setDownloadErrorMsg(`"${doc.name}" has no stored file. Upload a real file to enable downloads.`);
      setTimeout(() => setDownloadErrorMsg(""), 4000);
      return;
    }
    const a = document.createElement("a");
    a.href = doc.dataUrl;
    a.download = doc.name;
    a.click();
  }

  async function handleVersionUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !previewDoc) return;
    setUploadingVersion(true);
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    addDocumentVersion(previewDoc.id, dataUrl, file.size, currentUser.id);
    setPreviewDoc((prev) => prev ? { ...prev, dataUrl, sizeBytes: file.size, uploadedAt: new Date(), versions: [{ versionedAt: prev.uploadedAt, uploadedById: prev.uploadedById, sizeBytes: prev.sizeBytes, dataUrl: prev.dataUrl }, ...(prev.versions ?? [])] } : null);
    setUploadingVersion(false);
    if (versionInputRef.current) versionInputRef.current.value = "";
  }

  const catInfo = (cat: Category) => CATEGORIES.find((c) => c.value === cat)!;

  return (
    <>
      {/* MOBILE */}
      <div className="lg:hidden -mx-4 -mt-4 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h1 className="text-[22px] font-black text-white">Documents</h1>
          <label className={`flex items-center gap-1.5 ${uploading ? "bg-amber-500/40" : "bg-amber-500 hover:bg-amber-400"} text-black font-bold text-[12px] px-3 py-2 rounded-lg transition-colors cursor-pointer`}>
            <Upload size={13} />
            {uploading ? "Uploading…" : "Upload"}
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        {downloadErrorMsg && (
          <div className="mx-4 mb-3 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[12px] text-red-300">
            {downloadErrorMsg}
          </div>
        )}

        {/* Project + category selectors */}
        <div className="px-4 mb-3 flex gap-2">
          <CustomSelect
            value={selectedProject}
            onChange={(v) => setSelectedProject(v)}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            className="flex-1 bg-white/[0.05] border border-white/[0.07] rounded-xl px-3 py-2 text-[12px] text-white/70 outline-none"
          />
          <CustomSelect
            value={uploadCategory}
            onChange={(v) => setUploadCategory(v as Category)}
            options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            className="flex-1 bg-white/[0.05] border border-white/[0.07] rounded-xl px-3 py-2 text-[12px] text-white/70 outline-none"
          />
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white/[0.05] mx-4 mb-3 px-3 py-2.5 rounded-xl">
          <Search size={13} className="text-white/30" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files…"
            className="bg-transparent text-[13px] text-white/70 placeholder:text-white/25 outline-none flex-1"
          />
        </div>

        {/* Category filter pills */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${selectedCategory === "all" ? "bg-white/15 text-white" : "bg-white/[0.05] text-white/40"}`}
          >
            All ({documents.filter((d) => !selectedProject || d.projectId === selectedProject).length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.value] ?? 0;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${selectedCategory === cat.value ? "text-black" : "bg-white/[0.05] text-white/40"}`}
                style={selectedCategory === cat.value ? { backgroundColor: cat.color } : undefined}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Document list */}
        {filteredDocs.length === 0 ? (
          <div className="mx-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl py-14 text-center">
            <FolderOpen size={28} className="text-white/15 mx-auto mb-2" />
            <p className="text-[12px] text-white/25">No files here yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {filteredDocs.map((doc) => {
              const cat = catInfo(doc.category);
              const Icon = fileIcon(doc.name);
              return (
                <button
                  key={doc.id}
                  onClick={() => setPreviewDoc(doc)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/[0.03] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cat.color + "18" }}>
                    <Icon size={18} style={{ color: cat.color + "cc" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white/80 truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-[9px]"
                        style={{ backgroundColor: cat.color + "22", color: cat.color }}>{cat.label}</span>
                      <span className="text-[10px] text-white/30">{formatBytes(doc.sizeBytes)}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-white/25 flex-shrink-0">
                    {format(new Date(doc.uploadedAt), "MMM d")}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:block">
        <div className="space-y-5 max-w-[1100px]">
          {downloadErrorMsg && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[12px] text-red-300">
              {downloadErrorMsg}
            </div>
          )}
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Document Vault</h2>
              <p className="text-[12px] text-white/35 mt-0.5">Blueprints, permits, contracts, and job-site files</p>
            </div>
            <label className={`flex items-center gap-2 ${uploading ? "bg-amber-500/40" : "bg-amber-500 hover:bg-amber-400"} text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors cursor-pointer`}>
              <Upload size={15} />
              {uploading ? "Uploading…" : "Upload File"}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

      {/* Upload settings */}
      <div className="flex flex-wrap items-center gap-3">
        <CustomSelect
          value={selectedProject}
          onChange={(v) => setSelectedProject(v)}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          className="bg-[#111] border border-white/[0.07] rounded-lg px-3 py-2 text-[13px] text-white/70 outline-none"
        />

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/30 font-semibold uppercase tracking-wider">Upload as:</span>
          <CustomSelect
            value={uploadCategory}
            onChange={(v) => setUploadCategory(v as Category)}
            options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            className="bg-[#111] border border-white/[0.07] rounded-lg px-3 py-2 text-[13px] text-white/70 outline-none"
          />
        </div>

        <div className="relative ms-auto">
          <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files…"
            className="bg-[#111] border border-white/[0.07] rounded-lg ps-8 pe-3 py-2 text-[13px] text-white placeholder-white/25 outline-none focus:border-amber-500/40 w-48"
          />
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${selectedCategory === "all" ? "bg-white/10 text-white" : "bg-white/[0.04] text-white/40 hover:text-white/70"}`}
        >
          All ({documents.filter((d) => !selectedProject || d.projectId === selectedProject).length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = categoryCounts[cat.value] ?? 0;
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${selectedCategory === cat.value ? "text-black" : "bg-white/[0.04] text-white/40 hover:text-white/70"}`}
              style={selectedCategory === cat.value ? { backgroundColor: cat.color } : undefined}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* File grid */}
      {filteredDocs.length === 0 ? (
        <div className="bg-[#111] border border-white/[0.06] rounded-xl py-20 text-center">
          <FolderOpen size={32} className="text-white/15 mx-auto mb-3" />
          <p className="text-[13px] text-white/25">No files here yet</p>
          <p className="text-[11px] text-white/15 mt-1">Upload blueprints, permits, contracts, and more</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredDocs.map((doc) => {
            const cat = catInfo(doc.category);
            const Icon = fileIcon(doc.name);
            const isImage = doc.dataUrl?.startsWith("data:image");
            return (
              <div
                key={doc.id}
                className="group bg-[#111] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.14] transition-colors cursor-pointer"
                onClick={() => setPreviewDoc(doc)}
              >
                {/* Preview area */}
                <div className="aspect-[4/3] bg-[#0d0d0d] flex items-center justify-center overflow-hidden relative">
                  {isImage ? (
                    <img src={doc.dataUrl} alt={doc.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Icon size={32} style={{ color: cat.color + "90" }} />
                      <span className="text-[10px] text-white/20 uppercase font-bold tracking-wider">
                        {doc.name.split(".").pop()?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  {/* Category badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: cat.color + "22", color: cat.color }}>
                    {cat.label}
                  </div>
                </div>
                {/* Info row */}
                <div className="px-3 py-2.5">
                  <p className="text-[12px] font-semibold text-white/80 truncate">{doc.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-white/30">{formatBytes(doc.sizeBytes)}</span>
                    <span className="text-[10px] text-white/25">{format(new Date(doc.uploadedAt), "MMM d")}</span>
                  </div>
                </div>
                {/* Hover actions */}
                <div className="opacity-0 group-hover:opacity-100 flex border-t border-white/[0.06] transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadDoc(doc); }}
                    title={!doc.dataUrl ? "No stored file — upload to enable download" : undefined}
                    className={`flex-1 py-2 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${doc.dataUrl ? "text-white/40 hover:text-white hover:bg-white/[0.04]" : "text-white/20 cursor-not-allowed"}`}
                  >
                    <Download size={11} /> {doc.dataUrl ? "Download" : "No File"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(doc.id); }}
                    className="flex-1 py-2 text-[11px] font-semibold text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-colors flex items-center justify-center gap-1.5 border-l border-white/[0.06]"
                  >
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

        </div>
      </div>

      {/* Preview lightbox */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewDoc(null)} />
          <div className="relative bg-[#141414] border border-white/[0.1] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <div>
                <p className="text-[14px] font-bold text-white">{previewDoc.name}</p>
                <p className="text-[11px] text-white/35">
                  {catInfo(previewDoc.category).label} · {formatBytes(previewDoc.sizeBytes)} · {format(new Date(previewDoc.uploadedAt), "MMMM d, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(previewDoc.versions?.length ?? 0) > 0 && (
                  <button onClick={() => setShowVersions((v) => !v)} title="Version history"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${showVersions ? "bg-white/10 text-white" : "bg-white/[0.05] text-white/50 hover:text-white/80"}`}>
                    <History size={12} /> {previewDoc.versions!.length}
                  </button>
                )}
                <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${uploadingVersion ? "bg-white/5 text-white/30" : "bg-white/[0.05] text-white/50 hover:text-white/80"}`}
                  title="Upload new version">
                  <RefreshCw size={12} /> {uploadingVersion ? "…" : "New Version"}
                  <input ref={versionInputRef} type="file" className="hidden" onChange={handleVersionUpload} disabled={uploadingVersion} />
                </label>
                <button onClick={() => downloadDoc(previewDoc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[12px] font-bold transition-colors">
                  <Download size={12} /> Download
                </button>
                <button onClick={() => { setPreviewDoc(null); setShowVersions(false); }}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5">
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-5 flex items-center justify-center bg-[#0d0d0d]">
              {previewDoc.dataUrl?.startsWith("data:image") || (previewDoc.dataUrl?.startsWith("https://") && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(previewDoc.dataUrl)) ? (
                <img src={previewDoc.dataUrl} alt={previewDoc.name} className="max-w-full max-h-full object-contain rounded-lg" />
              ) : previewDoc.dataUrl?.startsWith("data:application/pdf") ? (
                isIOS ? (
                  <div className="text-center">
                    <File size={48} className="text-white/20 mx-auto mb-3" />
                    <p className="text-[13px] text-white/50 mb-4">PDF preview not supported on iOS Safari</p>
                    {pdfBlobUrl && (
                      <a href={pdfBlobUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] rounded-xl transition-colors">
                        <Download size={14} /> Open PDF
                      </a>
                    )}
                  </div>
                ) : pdfBlobUrl ? (
                  <iframe src={pdfBlobUrl} className="w-full h-[60vh] rounded-lg border-0" title={previewDoc.name} />
                ) : (
                  <div className="text-white/30 text-[13px]">Loading PDF…</div>
                )
              ) : previewDoc.dataUrl?.startsWith("https://") && /\.pdf(\?|$)/i.test(previewDoc.dataUrl) ? (
                isIOS ? (
                  <a href={previewDoc.dataUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] rounded-xl transition-colors">
                    <Download size={14} /> Open PDF
                  </a>
                ) : (
                  <iframe src={previewDoc.dataUrl} className="w-full h-[60vh] rounded-lg border-0" title={previewDoc.name} />
                )
              ) : (
                <div className="text-center">
                  <File size={48} className="text-white/20 mx-auto mb-3" />
                  <p className="text-[13px] text-white/40">Preview not available</p>
                  <button onClick={() => downloadDoc(previewDoc)} className="mt-3 text-amber-400 text-[13px] underline">
                    Download to view
                  </button>
                </div>
              )}
            </div>
            {showVersions && previewDoc.versions && previewDoc.versions.length > 0 && (
              <div className="border-t border-white/[0.07] px-5 py-4 max-h-52 overflow-y-auto">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Version History</p>
                <div className="space-y-2">
                  {previewDoc.versions.map((v, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors group">
                      <History size={12} className="text-white/25 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-white/55">
                          v{previewDoc.versions!.length - i} · {format(new Date(v.versionedAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                        <p className="text-[10px] text-white/25">{formatBytes(v.sizeBytes)}{v.note ? ` · ${v.note}` : ""}</p>
                      </div>
                      {v.dataUrl && (
                        <button onClick={() => { const a = document.createElement("a"); a.href = v.dataUrl!; a.download = previewDoc.name; a.click(); }}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-amber-400 hover:text-amber-300 transition-all flex items-center gap-1">
                          <Download size={10} /> Download
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Document"
        body="Delete this document and all its versions? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirm) deleteDocument(deleteConfirm); setDeleteConfirm(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
}
