"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Send, Paperclip, X, Download, Trash2, MessagesSquare,
  Search, ChevronLeft, Mic, ArrowLeft, Phone, Video,
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/confirm-modal";

const C = {
  sidebarBg:     "#0d1117",
  activeRow:     "rgba(59,130,246,0.12)",
  activeBorder:  "#3b82f6",
  chatBg:        "#070c18",
  sentGrad:      "linear-gradient(135deg,#2563eb,#1e40af)",
  sentText:      "#ffffff",
  recvBg:        "#131c2e",
  recvText:      "#e2e8f0",
  headerBg:      "#0d1117",
  inputBg:       "#131c2e",
  barBg:         "#0d1117",
  secondaryText: "#4b6a9b",
  border:        "rgba(96,165,250,0.07)",
  datePill:      "rgba(96,165,250,0.10)",
  titleColor:    "#e2e8f0",
  activeTitle:   "#60a5fa",
  inputBorder:   "rgba(96,165,250,0.18)",
};

function fmtTime(d: Date) { return format(d, "h:mm a"); }
function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, "0")}` : `0:${String(s % 60).padStart(2, "0")}`;
}

function DateSep({ date }: { date: Date }) {
  const label = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMMM d, yyyy");
  return (
    <div className="flex items-center justify-center my-5">
      <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: C.datePill, color: C.secondaryText }}>
        {label}
      </span>
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const { projects, messages, addMessage, deleteMessage, currentUser } = useStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id ?? "");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [lastRead, setLastRead] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("constra_msg_lastread") ?? "{}"); } catch { return {}; }
  });

  // Use functional update so markRead never has a stale lastRead closure
  const markRead = useCallback((projectId: string) => {
    const ts = Date.now();
    setLastRead(prev => {
      const updated = { ...prev, [projectId]: ts };
      try { localStorage.setItem("constra_msg_lastread", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!selectedProjectId && projects[0]?.id) setSelectedProjectId(projects[0].id);
  }, [projects, selectedProjectId]);

  const [text, setText] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{ name: string; data: string } | null>(null);
  const [lightboxData, setLightboxData] = useState<{ name: string; data: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const fileRef      = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the container sized to the visual viewport so the input bar
  // stays above the keyboard on iOS/Android. The messages page has NO
  // bottom nav bar (it gets its own full-screen shell), so we do NOT
  // subtract any nav height here.
  useEffect(() => {
    const el = containerRef.current;
    const vv = window.visualViewport;
    if (!el || !vv) return;
    const update = () => {
      if (window.innerWidth >= 1024) { el.style.height = ""; return; }
      el.style.height = `${Math.max(vv.height, 200)}px`;
    };
    update();
    vv.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => { vv.removeEventListener("resize", update); window.removeEventListener("resize", update); };
  }, []);

  const projectMessages = useMemo(
    () => messages
      .filter((m) => m.projectId === selectedProjectId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages, selectedProjectId],
  );

  // Mark as read when project opens or new messages arrive
  useEffect(() => {
    if (selectedProjectId) markRead(selectedProjectId);
  // markRead is stable (empty dep array), selectedProjectId & length are the real triggers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, projectMessages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [projectMessages.length, selectedProjectId]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const readFile = (file: File) => new Promise<string | null>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = () => { toast.error(`Could not read ${file.name}`); res(null); };
      reader.readAsDataURL(file);
    });
    if (files.length === 1) {
      const data = await readFile(files[0]);
      if (data) setPendingAttachment({ name: files[0].name, data });
    } else {
      for (const file of files) {
        const data = await readFile(file);
        if (!data) continue;
        addMessage({
          projectId: selectedProjectId,
          senderId: currentUser.id, senderName: currentUser.name,
          senderInitials: currentUser.initials, senderColor: currentUser.color,
          timestamp: new Date(), text: "",
          attachmentName: file.name, attachmentData: data,
        });
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  const sendMessage = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !pendingAttachment) return;
    if (!selectedProjectId) { toast.error("Select a project first"); return; }
    addMessage({
      projectId: selectedProjectId,
      senderId: currentUser.id, senderName: currentUser.name,
      senderInitials: currentUser.initials, senderColor: currentUser.color,
      text: trimmed, timestamp: new Date(),
      attachmentName: pendingAttachment?.name,
      attachmentData: pendingAttachment?.data,
    });
    setText("");
    setPendingAttachment(null);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.focus(); }
  }, [text, pendingAttachment, selectedProjectId, addMessage, currentUser]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function downloadAttachment(name: string, data: string) {
    const a = document.createElement("a");
    a.href = data; a.download = name; a.click();
  }

  const isImage = (data: string) => data.startsWith("data:image");
  // Detect audio by file name OR mime type — name-only check lets us still show
  // a placeholder even when attachmentData was stripped from localStorage.
  const isAudioName = (name: string) => name.startsWith("voice-") || /\.(mp3|m4a|ogg|webm|wav|aac)$/i.test(name);
  const isAudioData = (data: string) => data.startsWith("data:audio");

  const project = projects.find((p) => p.id === selectedProjectId);

  const filteredProjects = useMemo(() => {
    const q = sidebarSearch.toLowerCase();
    return projects.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [projects, sidebarSearch]);

  return (
    <>
      <div
        ref={containerRef}
        className="flex overflow-hidden"
        style={{ height: "100%", background: C.chatBg }}
      >
        {/* ══════════════════════════ SIDEBAR ════════════════════════════ */}
        <div
          className={`flex-shrink-0 flex flex-col ${mobileSidebarOpen ? "flex" : "hidden"} sm:flex w-full sm:w-[300px]`}
          style={{ background: C.sidebarBg, borderRight: `1px solid ${C.border}` }}
        >
          {/* Header */}
          <div className="px-5 pb-3 border-b flex-shrink-0" style={{ borderColor: C.border, paddingTop: "max(20px, env(safe-area-inset-top))" }}>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 mb-3 -ml-1 px-2 py-1 rounded-full transition-colors active:scale-95"
              style={{ color: C.activeTitle }}
            >
              <ArrowLeft size={16} />
              <span className="text-[13px] font-semibold">Dashboard</span>
            </button>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[22px] font-bold" style={{ color: C.titleColor }}>Messages</h2>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold"
                style={{ background: currentUser.color + "30", color: currentUser.color }}>
                {currentUser.initials}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full px-3 py-2.5" style={{ background: "#0a0f1a" }}>
              <Search size={14} style={{ color: C.secondaryText }} />
              <input
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Search projects…"
                className="flex-1 bg-transparent text-[13px] outline-none"
                style={{ color: C.titleColor }}
                maxLength={100}
              />
              {sidebarSearch && (
                <button type="button" onClick={() => setSidebarSearch("")} style={{ color: C.secondaryText }}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Project list */}
          <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
            {filteredProjects.length === 0 ? (
              <p className="text-[12px] px-4 py-8 text-center" style={{ color: C.secondaryText }}>
                {sidebarSearch ? "No matching projects" : "No projects yet"}
              </p>
            ) : (
              filteredProjects.map((p) => {
                const pMsgs = messages
                  .filter((m) => m.projectId === p.id)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                const last = pMsgs[0];
                const active = p.id === selectedProjectId;
                const lr = lastRead[p.id] ?? 0;
                const unread = active ? 0 : pMsgs.filter(
                  (m) => m.senderId !== currentUser.id && new Date(m.timestamp).getTime() > lr
                ).length;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setSelectedProjectId(p.id); setMobileSidebarOpen(false); }}
                    className="w-full text-start flex items-center gap-3 px-4 py-3.5 transition-all relative active:scale-[0.98]"
                    style={{
                      background: active ? C.activeRow : "transparent",
                      borderLeft: `3px solid ${active ? C.activeBorder : "transparent"}`,
                    }}
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-[12px] font-black"
                      style={{ background: `linear-gradient(135deg,${p.color}cc,${p.color}77)`, color: "#fff" }}>
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[13.5px] font-bold truncate" style={{ color: active ? C.activeTitle : C.titleColor }}>
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {unread > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-black"
                              style={{ background: C.activeBorder, color: "#fff" }}>
                              {unread > 99 ? "99+" : unread}
                            </span>
                          )}
                          {last && (
                            <span className="text-[10px] font-medium" style={{ color: C.secondaryText }}>
                              {isToday(new Date(last.timestamp))
                                ? format(new Date(last.timestamp), "h:mm a")
                                : format(new Date(last.timestamp), "MM/dd")}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[12px] truncate"
                        style={{ color: C.secondaryText, fontWeight: unread > 0 ? 600 : 400 }}>
                        {last
                          ? (last.attachmentName && isAudioName(last.attachmentName)
                              ? "🎙 Voice message"
                              : last.attachmentName && !last.text
                                ? "📎 Attachment"
                                : last.text || "📎 Attachment")
                          : "No messages yet"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ══════════════════════════ CHAT PANEL ════════════════════════════ */}
        <div
          className={`flex-1 flex flex-col min-w-0 min-h-0 ${mobileSidebarOpen ? "hidden sm:flex" : "flex"}`}
          style={{ background: C.chatBg }}
        >
          {/* Chat header */}
          <div
            className="flex items-center gap-3 px-3 py-3 flex-shrink-0 border-b"
            style={{ background: C.headerBg, borderColor: C.border, paddingTop: "max(12px, env(safe-area-inset-top))" }}
          >
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="sm:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full"
              style={{ background: "rgba(59,130,246,0.08)" }}
            >
              <ChevronLeft size={20} style={{ color: C.activeBorder }} />
            </button>

            {project ? (
              <>
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-[12px] font-black"
                  style={{ background: `linear-gradient(135deg,${project.color}cc,${project.color}77)`, color: "#fff" }}>
                  {project.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-black leading-tight truncate" style={{ color: C.titleColor }}>{project.name}</p>
                  <p className="text-[11px]" style={{ color: C.secondaryText }}>
                    {projectMessages.length} message{projectMessages.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button type="button" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-all" title="Call">
                    <Phone size={15} style={{ color: C.secondaryText }} />
                  </button>
                  <button type="button" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-all" title="Video">
                    <Video size={15} style={{ color: C.secondaryText }} />
                  </button>
                </div>
              </>
            ) : (
              <p className="text-[13px]" style={{ color: C.secondaryText }}>Select a project to start chatting</p>
            )}
          </div>

          {/* Messages scroll area */}
          <div
            className="flex-1 overflow-y-auto px-3 py-2"
            style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            {projectMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.08)" }}>
                  <MessagesSquare size={32} style={{ color: "#3b82f6" }} />
                </div>
                <div>
                  <p className="text-[15px] font-bold" style={{ color: C.titleColor }}>
                    {project ? "No messages yet" : "Pick a project"}
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: C.secondaryText }}>
                    {project ? "Send the first message to kick things off" : "Choose a project from the sidebar to start chatting"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5 pb-1">
                {projectMessages.map((msg, i) => {
                  const isMe = msg.senderId === currentUser.id;
                  const ts = new Date(msg.timestamp);
                  const prevMsg = i > 0 ? projectMessages[i - 1] : null;
                  const prevTs  = prevMsg ? new Date(prevMsg.timestamp) : null;
                  const showDate   = !prevTs || !isSameDay(ts, prevTs);
                  const showSender = showDate || !prevMsg || prevMsg.senderId !== msg.senderId;
                  const isGroupEnd = !projectMessages[i + 1] || projectMessages[i + 1].senderId !== msg.senderId;

                  // Detect attachment type — name-only check so placeholders show even when data is stripped
                  const attName = msg.attachmentName ?? "";
                  const attData = msg.attachmentData ?? "";
                  const hasAudio = !!(attName && (isAudioName(attName) || (attData && isAudioData(attData))));
                  const hasImage = !!(attData && isImage(attData));
                  const hasFile  = !!(attName && !hasAudio && !hasImage);
                  const durMatch = attName.match(/voice-(\d+)s/);
                  const audioDur = durMatch ? parseInt(durMatch[1]) : 0;

                  const bubbleRadius = isMe
                    ? `18px 18px ${isGroupEnd ? "5px" : "18px"} 18px`
                    : `18px 18px 18px ${isGroupEnd ? "5px" : "18px"}`;
                  const bubbleStyle = {
                    background: isMe ? C.sentGrad : C.recvBg,
                    color: isMe ? C.sentText : C.recvText,
                    borderRadius: bubbleRadius,
                    boxShadow: isMe ? "0 2px 12px rgba(59,130,246,0.25)" : "0 1px 3px rgba(0,0,0,0.12)",
                  };

                  return (
                    <div key={msg.id}>
                      {showDate && <DateSep date={ts} />}

                      <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""} ${showSender && !showDate ? "mt-3" : "mt-[3px]"}`}>
                        {/* Avatar */}
                        <div className={`w-7 flex-shrink-0 ${isMe ? "hidden" : "flex items-end"}`}>
                          {isGroupEnd ? (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                              style={{ background: msg.senderColor + "30", color: msg.senderColor }}>
                              {msg.senderInitials}
                            </div>
                          ) : (
                            <div className="w-7 h-7" />
                          )}
                        </div>

                        {/* Bubble group */}
                        <div className={`group/bubble relative max-w-[78%] sm:max-w-[62%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                          {showSender && !isMe && (
                            <p className="text-[11px] font-bold px-1" style={{ color: msg.senderColor }}>
                              {msg.senderName}
                            </p>
                          )}

                          {/* TEXT */}
                          {msg.text && (
                            <div className="px-3.5 pt-2.5 pb-2" style={bubbleStyle}>
                              <p className="text-[14px] leading-[1.45] break-words whitespace-pre-wrap">{msg.text}</p>
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[10px]" style={{ color: isMe ? "rgba(255,255,255,0.55)" : C.secondaryText }}>
                                  {fmtTime(ts)}
                                </span>
                                {isMe && (
                                  <svg width="9" height="8" viewBox="0 0 9 8" fill="none">
                                    <path d="M1 4L3.5 6.5L8 1" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                            </div>
                          )}

                          {/* AUDIO */}
                          {hasAudio && (
                            <div className="px-3.5 py-3 flex items-center gap-3" style={{ ...bubbleStyle, minWidth: 200 }}>
                              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: isMe ? "rgba(255,255,255,0.18)" : "rgba(59,130,246,0.12)" }}>
                                <Mic size={15} style={{ color: isMe ? "#fff" : "#3b82f6" }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                {attData ? (
                                  <audio controls src={attData} className="w-full h-7" preload="metadata" />
                                ) : (
                                  <p className="text-[12px]" style={{ color: isMe ? "rgba(255,255,255,0.6)" : C.secondaryText }}>
                                    Voice message
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                {audioDur > 0 && (
                                  <span className="text-[10px] font-mono font-semibold" style={{ color: isMe ? "rgba(255,255,255,0.7)" : C.secondaryText }}>
                                    {fmtDur(audioDur)}
                                  </span>
                                )}
                                <span className="text-[10px]" style={{ color: isMe ? "rgba(255,255,255,0.55)" : C.secondaryText }}>
                                  {fmtTime(ts)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* IMAGE */}
                          {hasImage && (
                            <div className="relative" style={{ maxWidth: 260 }}>
                              <img
                                src={attData}
                                alt={attName}
                                className="block w-full cursor-pointer"
                                style={{ borderRadius: bubbleRadius, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
                                onClick={() => setLightboxData({ name: attName, data: attData })}
                              />
                              <span className="absolute bottom-2 right-2.5 text-[10px] text-white drop-shadow font-medium">
                                {fmtTime(ts)}
                              </span>
                            </div>
                          )}

                          {/* FILE */}
                          {hasFile && (
                            <button
                              type="button"
                              onClick={() => attData && downloadAttachment(attName, attData)}
                              disabled={!attData}
                              className="flex items-center gap-3 px-3.5 py-3 text-left disabled:opacity-60"
                              style={{ ...bubbleStyle, minWidth: 200, maxWidth: 260 }}
                            >
                              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: isMe ? "rgba(255,255,255,0.18)" : "rgba(59,130,246,0.12)" }}>
                                <Download size={14} style={{ color: isMe ? "#fff" : "#3b82f6" }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-semibold truncate" style={{ color: isMe ? "#fff" : C.titleColor }}>{attName}</p>
                                <p className="text-[10px]" style={{ color: isMe ? "rgba(255,255,255,0.6)" : C.secondaryText }}>
                                  {attData ? `Tap to download · ${fmtTime(ts)}` : `Syncing… · ${fmtTime(ts)}`}
                                </p>
                              </div>
                            </button>
                          )}

                          {/* Delete button — hover on desktop, always visible on touch */}
                          {isMe && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(msg.id)}
                              className="lg:opacity-0 lg:group-hover/bubble:opacity-100 self-end p-1.5 rounded-full transition-all active:scale-90"
                              style={{ color: C.secondaryText }}
                              aria-label="Delete message"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Pending attachment preview */}
          {pendingAttachment && (
            <div className="px-3 py-2 flex-shrink-0 border-t" style={{ borderColor: C.border, background: C.barBg }}>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: C.inputBg }}>
                {isImage(pendingAttachment.data) ? (
                  <img src={pendingAttachment.data} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.10)" }}>
                    <Paperclip size={13} style={{ color: "#3b82f6" }} />
                  </div>
                )}
                <span className="text-[12px] max-w-[200px] truncate" style={{ color: C.titleColor }}>{pendingAttachment.name}</span>
                <button type="button" onClick={() => setPendingAttachment(null)} style={{ color: C.secondaryText }} className="hover:opacity-70 ml-1">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Input bar */}
          <div
            className="flex-shrink-0 flex items-end gap-2 px-3 pt-2 border-t"
            style={{ background: C.barBg, borderColor: C.border, paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90"
              style={{ background: C.activeBorder }}
            >
              <Paperclip size={18} className="text-white" />
            </button>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFile} />

            <div
              className="flex-1 flex items-end rounded-[22px] px-4 py-2.5"
              style={{ background: C.inputBg, border: `1.5px solid ${C.inputBorder}` }}
            >
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  const el = e.target;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder="Message…"
                maxLength={2000}
                rows={1}
                inputMode="text"
                enterKeyHint="send"
                className="flex-1 bg-transparent text-[14px] outline-none resize-none leading-relaxed w-full"
                style={{ color: C.titleColor, caretColor: C.activeBorder, maxHeight: 120, minHeight: 22 }}
              />
            </div>

            <button
              type="button"
              onClick={sendMessage}
              disabled={!text.trim() && !pendingAttachment}
              className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-35"
              style={{ background: C.sentGrad }}
            >
              <Send size={18} className="text-white" style={{ marginLeft: 2 }} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteConfirmId}
        title="Delete message"
        body="This message will be permanently deleted."
        confirmLabel="Delete"
        danger
        onConfirm={() => { deleteMessage(deleteConfirmId!); toast.success("Message deleted"); setDeleteConfirmId(null); }}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {lightboxData && (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/92"
          onClick={() => setLightboxData(null)}
        >
          <div className="relative max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxData.data}
              alt={lightboxData.name}
              className="max-w-full max-h-[85dvh] object-contain rounded-2xl"
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                type="button"
                onClick={() => downloadAttachment(lightboxData.name, lightboxData.data)}
                className="p-2.5 rounded-full bg-black/55 text-white/75 hover:text-white hover:bg-black/75 transition-all"
              >
                <Download size={16} />
              </button>
              <button
                type="button"
                onClick={() => setLightboxData(null)}
                className="p-2.5 rounded-full bg-black/55 text-white/75 hover:text-white hover:bg-black/75 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
