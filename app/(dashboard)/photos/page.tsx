"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Search, Grid3X3, List, FolderOpen, X, MapPin, ChevronLeft, ChevronRight, Layers, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { ConfirmModal } from "@/components/confirm-modal";
import { getClient, SUPABASE_ENABLED } from "@/lib/supabase/client";

type View = "grid" | "list" | "album";

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

type PhotoForm = { caption: string; projectId: string; uploadedById: string; tags: string; };

export default function PhotosPage() {
  const { photos, projects, workers, addPhoto, deletePhoto, getWorkerById, getProjectById } = useStore();
  const [view, setView] = useState<View>("grid");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState<PhotoForm>({ caption: "", projectId: "", uploadedById: "", tags: "" });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isImageFile, setIsImageFile] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = photos.filter((p) => {
    const matchSearch = !search || p.caption.toLowerCase().includes(search.toLowerCase()) || p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchTag = !tagFilter || p.tags.includes(tagFilter);
    const matchProject = projectFilter === "all" || p.projectId === projectFilter;
    return matchSearch && matchTag && matchProject;
  });

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight") setLightboxIdx((i) => i !== null && i < filtered.length - 1 ? i + 1 : i);
      if (e.key === "ArrowLeft") setLightboxIdx((i) => i !== null && i > 0 ? i - 1 : i);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, filtered.length]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    setIsImageFile(isImage);
    setFileName(file.name);
    setUploadError(null);

    if (SUPABASE_ENABLED) {
      setUploading(true);
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await getClient().storage.from("photos").upload(path, file, { upsert: false });
      setUploading(false);
      if (error) {
        setUploadError("Upload failed — check that the 'photos' storage bucket exists in Supabase.");
        return;
      }
      const { data: { publicUrl } } = getClient().storage.from("photos").getPublicUrl(data.path);
      setPhotoUrl(publicUrl);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSave = () => {
    if (!form.caption.trim() || !photoUrl) return;
    addPhoto({
      projectId: form.projectId || (projects[0]?.id ?? ""),
      caption: form.caption.trim(),
      uploadedById: form.uploadedById,
      uploadedAt: new Date(),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      gradient: `linear-gradient(135deg, #${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}40, #${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}40)`,
      url: photoUrl ?? undefined,
    });
    setForm({ caption: "", projectId: "", uploadedById: "", tags: "" });
    setPhotoUrl(null);
    setFileName(null);
    setIsImageFile(true);
    if (fileRef.current) fileRef.current.value = "";
    setShowModal(false);
  };

  const tagCounts = photos.flatMap((p) => p.tags).reduce((acc, tag) => ({ ...acc, [tag]: (acc[tag] ?? 0) + 1 }), {} as Record<string, number>);
  const topTags = Object.entries(tagCounts).sort(([, a], [, b]) => b - a).slice(0, 8);

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Photos & Files</h2>
          <p className="text-white/35 text-sm mt-0.5">
            {photos.length} photos across {projects.filter((p) => p.status === "active").length} active projects
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors">
          <Upload size={15} />
          Upload Photos
        </button>
      </div>

      {/* Mobile: horizontal project + tag filter strip */}
      <div className="sm:hidden space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
          <button onClick={() => setProjectFilter("all")}
            className={`flex-shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors ${projectFilter === "all" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/[0.06] text-white/45 border border-white/[0.06]"}`}>
            All <span className="opacity-50">{photos.length}</span>
          </button>
          {projects.filter((p) => p.status !== "upcoming").map((project) => {
            const count = photos.filter((ph) => ph.projectId === project.id).length;
            return (
              <button key={project.id} onClick={() => setProjectFilter(project.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors ${projectFilter === project.id ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/[0.06] text-white/45 border border-white/[0.06]"}`}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                {project.name}
                <span className="opacity-50">{count}</span>
              </button>
            );
          })}
        </div>
        {topTags.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
            {topTags.map(([tag, count]) => (
              <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
                className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${tagFilter === tag ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/[0.04] text-white/35 border border-white/[0.05]"}`}>
                {tag} <span className="opacity-60">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-5">
        {/* Sidebar — desktop only */}
        <div className="hidden sm:block w-48 flex-shrink-0 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">Projects</p>
            <div className="space-y-0.5">
              <button onClick={() => setProjectFilter("all")}
                className={`w-full text-left px-3 py-2 rounded-lg text-[12px] transition-colors ${projectFilter === "all" ? "bg-amber-500/15 text-amber-400 font-semibold" : "text-white/45 hover:bg-white/5 hover:text-white/70"}`}>
                All Projects
                <span className="ml-1.5 text-[10px] text-white/25">{photos.length}</span>
              </button>
              {projects.filter((p) => p.status !== "upcoming").map((project) => {
                const count = photos.filter((ph) => ph.projectId === project.id).length;
                return (
                  <button key={project.id} onClick={() => setProjectFilter(project.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[12px] transition-colors flex items-center gap-2 ${projectFilter === project.id ? "bg-amber-500/15 text-amber-400 font-semibold" : "text-white/45 hover:bg-white/5 hover:text-white/70"}`}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                    <span className="truncate flex-1">{project.name}</span>
                    <span className="text-[10px] text-white/25">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {topTags.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {topTags.map(([tag, count]) => (
                  <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${tagFilter === tag ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-white/35 hover:bg-white/10 hover:text-white/60"}`}>
                    {tag}<span className="ml-1 opacity-60">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-lg px-3 py-2 flex-1 sm:max-w-64">
              <Search size={13} className="text-white/30" />
              <input className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none flex-1"
                placeholder="Search photos, tags…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center bg-[#111111] border border-white/[0.06] rounded-lg p-0.5 gap-0.5 ml-auto">
              <button onClick={() => setView("grid")} title="Grid" className={`p-2 rounded-md transition-colors ${view === "grid" ? "bg-amber-500 text-black" : "text-white/40 hover:text-white/70"}`}>
                <Grid3X3 size={13} />
              </button>
              <button onClick={() => setView("album")} title="Albums" className={`p-2 rounded-md transition-colors ${view === "album" ? "bg-amber-500 text-black" : "text-white/40 hover:text-white/70"}`}>
                <Layers size={13} />
              </button>
              <button onClick={() => setView("list")} title="List" className={`p-2 rounded-md transition-colors ${view === "list" ? "bg-amber-500 text-black" : "text-white/40 hover:text-white/70"}`}>
                <List size={13} />
              </button>
            </div>
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-20 text-white/25 space-y-2">
              <FolderOpen size={40} className="mx-auto opacity-30" />
              <p className="text-[14px] font-semibold">No photos yet</p>
              <button onClick={() => setShowModal(true)} className="text-amber-400 text-[12px] hover:text-amber-300 transition-colors">
                + Upload your first photo
              </button>
            </div>
          ) : view === "grid" && filtered.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map((photo, idx) => {
                const uploader = getWorkerById(photo.uploadedById);
                const project = getProjectById(photo.projectId);
                return (
                  <div key={photo.id} onClick={() => setLightboxIdx(idx)} className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/12 transition-all group cursor-pointer">
                    <div className="w-full h-44 relative overflow-hidden" style={!photo.url ? { background: photo.gradient } : {}}>
                      {photo.url
                        ? <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                        : <div className="absolute inset-0 flex items-center justify-center opacity-30"><FolderOpen size={40} className="text-white" /></div>
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3">
                        <p className="text-[12px] font-semibold text-white drop-shadow-lg truncate">{photo.caption}</p>
                        {photo.gps && (
                          <div className="flex items-center gap-1 mt-0.5" title={`${photo.gps.lat.toFixed(5)}, ${photo.gps.lng.toFixed(5)} ±${photo.gps.accuracy}m`}>
                            <MapPin size={9} className="text-green-400 flex-shrink-0" />
                            <span className="text-[9px] text-green-400/80 truncate">
                              {photo.gps.lat.toFixed(4)}, {photo.gps.lng.toFixed(4)}
                            </span>
                          </div>
                        )}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(photo.id); }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center">
                        <X size={11} className="text-white" />
                      </button>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: project?.color }} />
                        <span className="text-[11px] text-white/40 truncate">{project?.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {uploader && (
                            <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-bold"
                              style={{ backgroundColor: uploader.color + "30", color: uploader.color }}>
                              {uploader.photo ? <img src={uploader.photo} alt={uploader.name} className="w-full h-full object-cover" /> : uploader.initials}
                            </div>
                          )}
                          <span className="text-[10px] text-white/30">{uploader?.name?.split(" ")[0]}</span>
                        </div>
                        <span className="text-[10px] text-white/25">
                          {photo.uploadedAt.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      {photo.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {photo.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[9px] bg-white/[0.06] text-white/35 px-1.5 py-0.5 rounded font-medium">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <button onClick={() => setShowModal(true)}
                className="bg-[#111111] border-2 border-dashed border-white/[0.08] rounded-xl h-[240px] flex flex-col items-center justify-center gap-3 hover:border-amber-500/30 hover:bg-amber-500/[0.02] transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-amber-500/10 flex items-center justify-center transition-colors">
                  <Upload size={18} className="text-white/25 group-hover:text-amber-400 transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-[12px] font-semibold text-white/30 group-hover:text-white/50 transition-colors">Upload Photos</p>
                  <p className="text-[10px] text-white/20 mt-0.5">Click to browse</p>
                </div>
              </button>
            </div>
          ) : view === "album" ? (
            (() => {
              const byProject = projects
                .filter((p) => p.status !== "upcoming")
                .map((p) => ({
                  project: p,
                  photos: filtered
                    .filter((ph) => ph.projectId === p.id)
                    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()),
                }))
                .filter((g) => g.photos.length > 0);

              if (byProject.length === 0) return (
                <div className="text-center py-16 text-white/25">
                  <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-[14px] font-semibold">No photos found</p>
                </div>
              );

              return (
                <div className="space-y-8">
                  {byProject.map(({ project, photos: pPhotos }) => {
                    const byDate: Record<string, typeof pPhotos> = {};
                    pPhotos.forEach((ph) => {
                      const key = ph.uploadedAt.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
                      (byDate[key] = byDate[key] ?? []).push(ph);
                    });
                    return (
                      <div key={project.id}>
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                          <h3 className="text-[14px] font-bold text-white">{project.name}</h3>
                          <span className="text-[11px] text-white/30">{pPhotos.length} photo{pPhotos.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="space-y-4 pl-5 border-l-2 border-white/[0.05]">
                          {Object.entries(byDate).map(([dateLabel, dayPhotos]) => (
                            <div key={dateLabel}>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">{dateLabel}</p>
                              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                {dayPhotos.map((photo, idx) => {
                                  const globalIdx = filtered.indexOf(photo);
                                  return (
                                    <div key={photo.id} onClick={() => setLightboxIdx(globalIdx)} className="aspect-square rounded-lg overflow-hidden cursor-pointer group relative"
                                      style={!photo.url ? { background: photo.gradient } : {}}>
                                      {photo.url
                                        ? <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        : <div className="w-full h-full flex items-center justify-center opacity-30"><FolderOpen size={24} className="text-white" /></div>
                                      }
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                                      <div className="absolute bottom-0 left-0 right-0 p-1.5 translate-y-full group-hover:translate-y-0 transition-transform bg-gradient-to-t from-black/70 to-transparent">
                                        <p className="text-[10px] text-white truncate">{photo.caption}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : filtered.length > 0 ? (
            <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="grid text-[10px] font-bold uppercase tracking-widest text-white/25 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]"
                style={{ gridTemplateColumns: "60px 2fr 1fr 120px 100px 80px" }}>
                <span>Photo</span><span>Caption</span><span>Project</span><span>Tags</span><span>Uploaded By</span><span>Date</span>
              </div>
              {filtered.map((photo) => {
                const uploader = getWorkerById(photo.uploadedById);
                const project = getProjectById(photo.projectId);
                return (
                  <div key={photo.id} className="grid items-center px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
                    style={{ gridTemplateColumns: "60px 2fr 1fr 120px 100px 80px" }}>
                    <div className="w-12 h-9 rounded-lg overflow-hidden flex-shrink-0" style={!photo.url ? { background: photo.gradient } : {}}>
                      {photo.url && <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="min-w-0 flex-1 pr-3">
                        <span className="text-[12px] text-white/70 truncate block">{photo.caption}</span>
                        {photo.gps && (
                          <div className="flex items-center gap-1 mt-0.5" title={`${photo.gps.lat.toFixed(5)}, ${photo.gps.lng.toFixed(5)} ±${photo.gps.accuracy}m`}>
                            <MapPin size={8} className="text-green-400 flex-shrink-0" />
                            <span className="text-[9px] text-green-400/70">GPS verified</span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => setDeleteConfirm(photo.id)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all flex-shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project?.color }} />
                      <span className="text-[11px] text-white/40 truncate">{project?.name}</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {photo.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-[9px] bg-white/[0.06] text-white/35 px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                    {uploader && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-bold"
                          style={{ backgroundColor: uploader.color + "30", color: uploader.color }}>
                          {uploader.photo ? <img src={uploader.photo} alt={uploader.name} className="w-full h-full object-cover" /> : uploader.initials}
                        </div>
                        <span className="text-[11px] text-white/40">{uploader.name.split(" ")[0]}</span>
                      </div>
                    )}
                    <span className="text-[11px] text-white/30">
                      {photo.uploadedAt.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {photos.length > 0 && filtered.length === 0 && (
            <div className="text-center py-16 text-white/25">
              <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-[14px] font-semibold">No photos found</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-bold text-white">Upload Photo</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={lbl}>Photo</label>
                <input ref={fileRef} type="file" onChange={handleFile} className="hidden" />
                {photoUrl ? (
                  <div className="relative">
                    {isImageFile
                      ? <img src={photoUrl} alt="preview" className="w-full h-40 object-cover rounded-xl border border-white/[0.08]" />
                      : (
                        <div className="w-full h-40 rounded-xl border border-white/[0.08] bg-white/[0.03] flex flex-col items-center justify-center gap-2">
                          <Upload size={24} className="text-amber-400/60" />
                          <p className="text-[12px] text-white/50 font-medium truncate max-w-[200px]">{fileName}</p>
                        </div>
                      )
                    }
                    <button onClick={() => { setPhotoUrl(null); setFileName(null); setIsImageFile(true); if (fileRef.current) fileRef.current.value = ""; }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center">
                      <X size={11} className="text-white" />
                    </button>
                  </div>
                ) : uploading ? (
                  <div className="w-full h-32 border-2 border-dashed border-amber-500/30 rounded-xl flex flex-col items-center justify-center gap-2 bg-amber-500/[0.02]">
                    <Loader2 size={20} className="text-amber-400 animate-spin" />
                    <p className="text-[12px] text-amber-400/70">Uploading…</p>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-white/[0.08] rounded-xl flex flex-col items-center justify-center gap-2 hover:border-amber-500/30 hover:bg-amber-500/[0.02] transition-all">
                    <Upload size={20} className="text-white/25" />
                    <p className="text-[12px] text-white/30">Click to upload photo or file</p>
                  </button>
                )}
                {uploadError && (
                  <p className="text-[11px] text-red-400 mt-1.5">{uploadError}</p>
                )}
              </div>
              <div>
                <label className={lbl}>Caption *</label>
                <input className={inp} placeholder="e.g. Foundation pour complete"
                  value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Project</label>
                  <select className={inp} value={form.projectId}
                    onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}>
                    <option value="">Select project</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Uploaded By</label>
                  <select className={inp} value={form.uploadedById}
                    onChange={(e) => setForm((f) => ({ ...f, uploadedById: e.target.value }))}>
                    <option value="">Select worker</option>
                    {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Tags (comma separated)</label>
                <input className={inp} placeholder="progress, concrete, structural"
                  value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={!form.caption.trim() || !photoUrl || uploading}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && filtered[lightboxIdx] && (() => {
        const p = filtered[lightboxIdx];
        const uploader = getWorkerById(p.uploadedById);
        const project = getProjectById(p.projectId);
        return (
          <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4"
            onClick={() => setLightboxIdx(null)}>
            <button className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all z-10"
              onClick={() => setLightboxIdx(null)}>
              <X size={18} />
            </button>
            {lightboxIdx > 0 && (
              <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all z-10"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i ?? 1) - 1); }}>
                <ChevronLeft size={20} />
              </button>
            )}
            {lightboxIdx < filtered.length - 1 && (
              <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all z-10"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i ?? 0) + 1); }}>
                <ChevronRight size={20} />
              </button>
            )}
            <div className="max-w-4xl w-full flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
              <div className="w-full max-h-[70vh] rounded-xl overflow-hidden flex items-center justify-center">
                {p.url
                  ? <img src={p.url} alt={p.caption} className="max-w-full max-h-[70vh] object-contain rounded-xl" />
                  : <div className="w-[500px] h-[360px] rounded-xl flex items-center justify-center" style={{ background: p.gradient }}>
                      <FolderOpen size={60} className="text-white/30" />
                    </div>
                }
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-white font-semibold text-[15px]">{p.caption}</p>
                <div className="flex items-center justify-center gap-3 text-[12px] text-white/40">
                  {project && <span style={{ color: project.color }}>{project.name}</span>}
                  {uploader && <span>{uploader.name}</span>}
                  <span>{p.uploadedAt.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                {p.tags.length > 0 && (
                  <div className="flex gap-1.5 justify-center flex-wrap">
                    {p.tags.map((tag) => (
                      <span key={tag} className="text-[11px] bg-white/10 text-white/55 px-2.5 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-white/20 mt-1">{lightboxIdx + 1} / {filtered.length}</p>
              </div>
            </div>
          </div>
        );
      })()}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Photo"
        body="Delete this photo? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirm) deletePhoto(deleteConfirm); setDeleteConfirm(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
