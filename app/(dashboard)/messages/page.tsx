"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Send, Paperclip, X, Download, Trash2, MessagesSquare,
  Search, Phone, Info, ChevronLeft, Mic, Video, PhoneCall, PhoneOff,
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { useStore } from "@/lib/store";
import { MicButton } from "@/components/mic-button";

// ── Design tokens ────────────────────────────────────────────────────────────
function useThemeTokens() {
  const isDark = useStore().theme === "dark";
  return {
    sidebarBg:     isDark ? "#111111"                    : "#ffffff",
    sidebarBorder: isDark ? "rgba(255,255,255,0.06)"    : "rgba(0,0,0,0.07)",
    activeRow:     isDark ? "rgba(59,130,246,0.08)"     : "#f0f5ff",
    activeBorder:  "#3b82f6",
    chatBg:        isDark ? "#0d0d0d"                   : "#f0f4fb",
    sentGrad:      "linear-gradient(135deg,#4f8ef7,#1d4ed8)",
    sentText:      "#ffffff",
    recvBg:        isDark ? "#1e1e1e"                   : "#ffffff",
    recvText:      isDark ? "#e5e7eb"                   : "#1a1a2e",
    headerBg:      isDark ? "#111111"                   : "#ffffff",
    inputBg:       isDark ? "#1c1c1c"                   : "#ffffff",
    barBg:         isDark ? "#111111"                   : "#f0f4fb",
    secondaryText: isDark ? "#6b7280"                   : "#8b9ab2",
    border:        isDark ? "rgba(255,255,255,0.06)"    : "rgba(0,0,0,0.07)",
    datePill:      isDark ? "rgba(255,255,255,0.07)"    : "rgba(100,116,139,0.15)",
    titleColor:    isDark ? "#f3f4f6"                   : "#1a1a2e",
    activeTitle:   isDark ? "#60a5fa"                   : "#1d4ed8",
    inputBorder:   isDark ? "rgba(255,255,255,0.08)"    : "rgba(0,0,0,0.09)",
  };
}

function fmtTime(d: Date) { return format(d, "h:mm a"); }
function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, "0")}` : `0:${String(s % 60).padStart(2, "0")}`;
}

function DateSep({ date, datePill, secondaryText }: { date: Date; datePill: string; secondaryText: string }) {
  const label = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMMM d, yyyy");
  return (
    <div className="flex items-center justify-center my-4">
      <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: datePill, color: secondaryText }}>
        {label}
      </span>
    </div>
  );
}

export default function MessagesPage() {
  const C = useThemeTokens();
  const { projects, messages, addMessage, deleteMessage, currentUser, workers } = useStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id ?? "");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [showCallSheet, setShowCallSheet] = useState(false);
  const [activeCallUrl, setActiveCallUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId && projects[0]?.id) setSelectedProjectId(projects[0].id);
  }, [projects, selectedProjectId]);

  const [text, setText] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{ name: string; data: string } | null>(null);
  const [lightboxData, setLightboxData] = useState<{ name: string; data: string } | null>(null);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const fileRef      = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mobile: pin the container between the header (56 px) and mobile nav (4.5 rem)
  // using JS so we avoid SSR/hydration issues with <style> hoisting in React 19.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      const mobile = window.innerWidth < 1024;
      if (mobile) {
        const navH = 4.5 * parseFloat(getComputedStyle(document.documentElement).fontSize);
        const sai  = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sat") || "0") || 0;
        el.style.position     = "fixed";
        el.style.top          = "56px";
        el.style.left         = "0";
        el.style.right        = "0";
        el.style.bottom       = `${navH}px`;
        el.style.height       = "auto";
        el.style.marginTop    = "0";
        el.style.marginLeft   = "0";
        el.style.marginRight  = "0";
        el.style.borderRadius = "0";
        el.style.borderLeft   = "none";
        el.style.borderRight  = "none";
        void sai; // suppress unused warning
      } else {
        el.style.position     = "";
        el.style.top          = "";
        el.style.left         = "";
        el.style.right        = "";
        el.style.bottom       = "";
        el.style.height       = "calc(100dvh - 168px)";
        el.style.marginTop    = "";
        el.style.marginLeft   = "";
        el.style.marginRight  = "";
        el.style.borderRadius = "";
        el.style.borderLeft   = "";
        el.style.borderRight  = "";
      }
    };
    apply();
    window.addEventListener("resize", apply);
    // Also adjust when the virtual keyboard pushes the viewport
    const vv = window.visualViewport;
    if (vv) {
      const onVV = () => {
        if (window.innerWidth < 1024 && containerRef.current) {
          containerRef.current.style.bottom = `${window.innerHeight - vv.height + 4.5 * parseFloat(getComputedStyle(document.documentElement).fontSize)}px`;
        }
      };
      vv.addEventListener("resize", onVV);
      return () => { window.removeEventListener("resize", apply); vv.removeEventListener("resize", onVV); };
    }
    return () => window.removeEventListener("resize", apply);
  }, []);

  const projectMessages = useMemo(
    () => messages
      .filter((m) => m.projectId === selectedProjectId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages, selectedProjectId],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [projectMessages.length, selectedProjectId]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    setPendingAttachment({ name: file.name, data });
    if (fileRef.current) fileRef.current.value = "";
  }

  const sendMessage = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !pendingAttachment) return;
    if (!selectedProjectId) return;
    addMessage({
      projectId: selectedProjectId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderInitials: currentUser.initials,
      senderColor: currentUser.color,
      text: trimmed,
      timestamp: new Date(),
      attachmentName: pendingAttachment?.name,
      attachmentData: pendingAttachment?.data,
    });
    setText("");
    setPendingAttachment(null);
    textareaRef.current?.focus();
  }, [text, pendingAttachment, selectedProjectId, addMessage, currentUser]);

  const handleAudio = useCallback((dataUrl: string, durationSeconds: number) => {
    if (!selectedProjectId) return;
    addMessage({
      projectId: selectedProjectId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderInitials: currentUser.initials,
      senderColor: currentUser.color,
      text: "",
      timestamp: new Date(),
      attachmentName: `voice-${durationSeconds}s.webm`,
      attachmentData: dataUrl,
    });
  }, [selectedProjectId, addMessage, currentUser]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function downloadAttachment(name: string, data: string) {
    const a = document.createElement("a");
    a.href = data; a.download = name; a.click();
  }

  const isImage = (data: string) => data.startsWith("data:image");
  const isAudio = (name: string, data: string) => data.startsWith("data:audio") || name.startsWith("voice-");

  const project = projects.find((p) => p.id === selectedProjectId);

  // Call helpers
  const jitsiRoom = project ? `constra-${project.id.replace(/-/g, "").slice(0, 12)}` : "";
  const projectWorkers = useMemo(
    () => workers.filter((w) => project?.workerIds.includes(w.id)),
    [workers, project],
  );
  const isApple = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);

  // Filtered sidebar projects
  const filteredProjects = useMemo(() => {
    const q = sidebarSearch.toLowerCase();
    return projects.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [projects, sidebarSearch]);

  function startCall(type: "audio" | "video") {
    const url = type === "audio"
      ? `https://meet.jit.si/${jitsiRoom}?config.startWithVideoMuted=true&config.startAudioOnly=true&config.prejoinPageEnabled=false`
      : `https://meet.jit.si/${jitsiRoom}?config.startWithVideoMuted=false&config.prejoinPageEnabled=false`;
    setShowCallSheet(false);
    setActiveCallUrl(url);
  }

  return (
    <>
      <div
        ref={containerRef}
        className="flex overflow-hidden rounded-2xl shadow-xl"
        style={{ height: "calc(100dvh - 168px)", border: `1px solid ${C.border}` }}
      >
        {/* ══════════════════════════════ SIDEBAR ════════════════════════════ */}
        <div
          className={`flex-shrink-0 flex flex-col ${mobileSidebarOpen ? "flex" : "hidden"} sm:flex w-full sm:w-[280px]`}
          style={{ background: C.sidebarBg, borderRight: `1px solid ${C.border}` }}
        >
          {/* Sidebar header */}
          <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: C.border }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-black" style={{ color: C.titleColor }}>Messages</h2>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold"
                style={{ background: currentUser.color + "25", color: currentUser.color }}>
                {currentUser.initials}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: C.barBg }}>
              <Search size={14} style={{ color: C.secondaryText }} />
              <input
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Search projects…"
                className="flex-1 bg-transparent text-[13px] outline-none"
                style={{ color: C.titleColor }}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <p className="text-[12px] px-4 py-8 text-center" style={{ color: C.secondaryText }}>No projects yet</p>
            ) : (
              filteredProjects.map((p) => {
                const projectMsgs = messages
                  .filter((m) => m.projectId === p.id)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                const last = projectMsgs[0];
                const active = p.id === selectedProjectId;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProjectId(p.id); setMobileSidebarOpen(false); }}
                    className="w-full text-start flex items-center gap-3 px-4 py-3.5 transition-all relative"
                    style={{
                      background: active ? C.activeRow : "transparent",
                      borderLeft: `3px solid ${active ? C.activeBorder : "transparent"}`,
                    }}
                  >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-[13px] font-black shadow-sm"
                      style={{ background: `linear-gradient(135deg,${p.color}cc,${p.color}88)`, color: "#fff" }}>
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[13.5px] font-bold truncate" style={{ color: active ? C.activeTitle : C.titleColor }}>{p.name}</span>
                        {last && (
                          <span className="text-[10px] flex-shrink-0 font-medium" style={{ color: C.secondaryText }}>
                            {isToday(new Date(last.timestamp))
                              ? format(new Date(last.timestamp), "h:mm a")
                              : format(new Date(last.timestamp), "MM/dd")}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] truncate" style={{ color: C.secondaryText }}>
                        {last
                          ? (last.attachmentName?.startsWith("voice-")
                            ? "🎙 Voice message"
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

        {/* ══════════════════════════════ CHAT PANEL ══════════════════════════ */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${mobileSidebarOpen ? "hidden sm:flex" : "flex"}`}
          style={{ background: C.chatBg }}
        >
          {/* Chat header */}
          <div
            className="flex items-center gap-3 px-3 py-2.5 flex-shrink-0 border-b"
            style={{ background: C.headerBg, borderColor: C.border }}
          >
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="sm:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all"
              style={{ background: "rgba(59,130,246,0.08)" }}
            >
              <ChevronLeft size={20} style={{ color: C.activeBorder }} />
            </button>

            {project ? (
              <>
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-[13px] font-black"
                  style={{ background: `linear-gradient(135deg,${project.color}cc,${project.color}88)`, color: "#fff" }}>
                  {project.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-black leading-tight" style={{ color: C.titleColor }}>{project.name}</p>
                  <p className="text-[11px]" style={{ color: C.secondaryText }}>
                    {projectMessages.length} message{projectMessages.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowCallSheet(true)}
                    className="w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90"
                    style={{ background: "rgba(34,197,94,0.12)" }}
                    title="Voice call"
                  >
                    <Phone size={16} style={{ color: "#22c55e" }} />
                  </button>
                  <button
                    onClick={() => setShowCallSheet(true)}
                    className="w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90"
                    style={{ background: "rgba(59,130,246,0.12)" }}
                    title="Video call"
                  >
                    <Video size={16} style={{ color: "#3b82f6" }} />
                  </button>
                  <button
                    className="w-9 h-9 flex items-center justify-center rounded-full transition-all hover:bg-white/5"
                    title="Project info"
                  >
                    <Info size={16} style={{ color: C.secondaryText }} />
                  </button>
                </div>
              </>
            ) : (
              <p className="text-[13px]" style={{ color: C.secondaryText }}>Select a project to start chatting</p>
            )}
          </div>

          {/* ── Messages ──────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {projectMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.08)" }}>
                  <MessagesSquare size={32} style={{ color: "#3b82f6" }} />
                </div>
                <div>
                  <p className="text-[15px] font-bold" style={{ color: C.titleColor }}>No messages yet</p>
                  <p className="text-[12px] mt-1" style={{ color: C.secondaryText }}>Send a message or voice note to kick things off</p>
                </div>
              </div>
            )}

            <div className="space-y-0.5">
              {projectMessages.map((msg, i) => {
                const isMe = msg.senderId === currentUser.id;
                const ts = new Date(msg.timestamp);
                const prevMsg = i > 0 ? projectMessages[i - 1] : null;
                const prevTs  = prevMsg ? new Date(prevMsg.timestamp) : null;
                const showDate   = !prevTs || !isSameDay(ts, prevTs);
                const showSender = showDate || !prevMsg || prevMsg.senderId !== msg.senderId;
                const isGroupEnd = !projectMessages[i + 1] || projectMessages[i + 1].senderId !== msg.senderId;
                const hasAudio   = !!(msg.attachmentName && msg.attachmentData && isAudio(msg.attachmentName, msg.attachmentData));
                const durMatch   = msg.attachmentName?.match(/voice-(\d+)s/);
                const audioDur   = durMatch ? parseInt(durMatch[1]) : 0;

                return (
                  <div key={msg.id}>
                    {showDate && <DateSep date={ts} datePill={C.datePill} secondaryText={C.secondaryText} />}

                    <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""} ${showSender && !showDate ? "mt-3" : "mt-0.5"}`}>
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

                      {/* Bubble */}
                      <div className={`group/bubble relative max-w-[78%] sm:max-w-[62%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        {showSender && !isMe && (
                          <p className="text-[11px] font-bold mb-1 px-1" style={{ color: msg.senderColor }}>
                            {msg.senderName}
                          </p>
                        )}

                        {/* TEXT bubble */}
                        {msg.text && (
                          <div
                            className="px-3.5 pt-2.5 pb-2"
                            style={{
                              background: isMe ? C.sentGrad : C.recvBg,
                              color: isMe ? C.sentText : C.recvText,
                              borderRadius: isMe
                                ? `18px 18px ${isGroupEnd ? "5px" : "18px"} 18px`
                                : `18px 18px 18px ${isGroupEnd ? "5px" : "18px"}`,
                              boxShadow: isMe ? "0 2px 12px rgba(59,130,246,0.28)" : "0 1px 3px rgba(0,0,0,0.07)",
                            }}
                          >
                            <p className="text-[14px] leading-[1.45] break-words">{msg.text}</p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px]" style={{ color: isMe ? "rgba(255,255,255,0.6)" : C.secondaryText }}>
                                {fmtTime(ts)}
                              </span>
                              {isMe && (
                                <svg width="13" height="8" viewBox="0 0 13 8" fill="none">
                                  <path d="M1 4L4 7L7 1" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M6 4L9 7L12 1" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                          </div>
                        )}

                        {/* AUDIO bubble */}
                        {hasAudio && (
                          <div
                            className="px-3.5 py-3 flex items-center gap-3"
                            style={{
                              background: isMe ? C.sentGrad : C.recvBg,
                              borderRadius: isMe
                                ? `18px 18px ${isGroupEnd ? "5px" : "18px"} 18px`
                                : `18px 18px 18px ${isGroupEnd ? "5px" : "18px"}`,
                              boxShadow: isMe ? "0 2px 12px rgba(59,130,246,0.28)" : "0 1px 3px rgba(0,0,0,0.07)",
                              minWidth: 200,
                            }}
                          >
                            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: isMe ? "rgba(255,255,255,0.18)" : "rgba(59,130,246,0.10)" }}>
                              <Mic size={15} style={{ color: isMe ? "#fff" : "#3b82f6" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <audio controls src={msg.attachmentData!} className="w-full h-6" preload="metadata" />
                            </div>
                            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                              {audioDur > 0 && (
                                <span className="text-[10px] font-mono font-semibold" style={{ color: isMe ? "rgba(255,255,255,0.7)" : C.secondaryText }}>
                                  {fmtDur(audioDur)}
                                </span>
                              )}
                              <span className="text-[10px]" style={{ color: isMe ? "rgba(255,255,255,0.6)" : C.secondaryText }}>
                                {fmtTime(ts)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* IMAGE / FILE */}
                        {msg.attachmentName && msg.attachmentData && !hasAudio && (
                          <div style={{ maxWidth: 260 }}>
                            {isImage(msg.attachmentData) ? (
                              <div className="relative">
                                <img
                                  src={msg.attachmentData}
                                  alt={msg.attachmentName}
                                  className="block max-w-full cursor-pointer"
                                  style={{ borderRadius: isMe ? "18px 18px 5px 18px" : "18px 18px 18px 5px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                                  onClick={() => setLightboxData({ name: msg.attachmentName!, data: msg.attachmentData! })}
                                />
                                <span className="absolute bottom-2 right-2.5">
                                  <span className="text-[10px] text-white drop-shadow-md font-medium">{fmtTime(ts)}</span>
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => downloadAttachment(msg.attachmentName!, msg.attachmentData!)}
                                className="flex items-center gap-3 px-3.5 py-3 w-full text-left"
                                style={{
                                  background: isMe ? C.sentGrad : C.recvBg,
                                  borderRadius: isMe ? "18px 18px 5px 18px" : "18px 18px 18px 5px",
                                  boxShadow: isMe ? "0 2px 12px rgba(59,130,246,0.28)" : "0 1px 3px rgba(0,0,0,0.07)",
                                }}
                              >
                                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ background: isMe ? "rgba(255,255,255,0.18)" : "rgba(59,130,246,0.10)" }}>
                                  <Download size={14} style={{ color: isMe ? "#fff" : "#3b82f6" }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[12px] font-semibold truncate" style={{ color: isMe ? "#fff" : C.titleColor }}>{msg.attachmentName}</p>
                                  <p className="text-[10px]" style={{ color: isMe ? "rgba(255,255,255,0.65)" : C.secondaryText }}>Tap to download · {fmtTime(ts)}</p>
                                </div>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Delete on hover */}
                        {isMe && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="opacity-0 group-hover/bubble:opacity-100 mt-0.5 self-end p-1 rounded-full transition-all"
                            style={{ color: C.secondaryText }}
                            aria-label="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={bottomRef} />
          </div>

          {/* ── Pending attachment ──────────────────────────────────────────── */}
          {pendingAttachment && (
            <div className="px-3 py-2 flex-shrink-0 border-t" style={{ borderColor: C.border, background: C.barBg }}>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl shadow-sm" style={{ background: C.inputBg }}>
                {isImage(pendingAttachment.data) ? (
                  <img src={pendingAttachment.data} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.10)" }}>
                    <Paperclip size={13} style={{ color: "#3b82f6" }} />
                  </div>
                )}
                <span className="text-[12px] max-w-[200px] truncate" style={{ color: C.titleColor }}>{pendingAttachment.name}</span>
                <button onClick={() => setPendingAttachment(null)} style={{ color: C.secondaryText }} className="hover:opacity-70 ml-1">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Input bar ───────────────────────────────────────────────────── */}
          <div
            className="flex-shrink-0 flex items-end gap-2 px-3 pt-2 pb-3 border-t"
            style={{ background: C.barBg, borderColor: C.border }}
          >
            {/* Attach */}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90"
              style={{ background: C.activeBorder }}
            >
              <Paperclip size={18} className="text-white" />
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />

            {/* Text */}
            <div
              className="flex-1 flex items-end rounded-[22px] px-4 py-2.5"
              style={{ background: C.inputBg, border: `1.5px solid ${C.inputBorder}` }}
            >
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message…"
                rows={1}
                inputMode="text"
                enterKeyHint="send"
                className="flex-1 bg-transparent text-[14px] outline-none resize-none max-h-32 leading-relaxed"
                style={{ color: C.titleColor, caretColor: C.activeBorder }}
              />
            </div>

            {/* Send / mic */}
            {text.trim() || pendingAttachment ? (
              <button
                onClick={sendMessage}
                className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90"
                style={{ background: C.sentGrad }}
              >
                <Send size={18} className="text-white" style={{ marginLeft: 2 }} />
              </button>
            ) : (
              <div className="flex-shrink-0">
                <MicButton onAudio={handleAudio} variant="light" size="md" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── In-app call overlay ─────────────────────────────────────────────── */}
      {activeCallUrl && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black">
          {/* Call header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
            <div>
              <p className="text-white font-black text-[15px]">{project?.name}</p>
              <p className="text-white/50 text-[12px]">Live call · Jitsi Meet</p>
            </div>
            <button
              onClick={() => setActiveCallUrl(null)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-[13px] text-white transition-all active:scale-95"
              style={{ background: "#ef4444" }}
            >
              <PhoneOff size={15} />
              End
            </button>
          </div>
          {/* Jitsi iframe */}
          <iframe
            src={activeCallUrl}
            allow="camera; microphone; display-capture; fullscreen; autoplay; clipboard-write"
            className="flex-1 w-full"
            style={{ border: "none" }}
          />
        </div>
      )}

      {/* ── Call sheet ──────────────────────────────────────────────────────── */}
      {showCallSheet && project && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center" onClick={() => setShowCallSheet(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full sm:w-[400px] rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl"
            style={{ background: C.headerBg, border: `1px solid ${C.border}`, paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4 sm:hidden" style={{ background: C.border }} />
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[16px] font-black" style={{ color: C.titleColor }}>{project.name}</p>
                <p className="text-[12px]" style={{ color: C.secondaryText }}>Start a call with your team</p>
              </div>
              <button onClick={() => setShowCallSheet(false)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: C.barBg }}>
                <X size={15} style={{ color: C.secondaryText }} />
              </button>
            </div>

            {/* Main call buttons */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => startCall("audio")}
                className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all active:scale-95"
                style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.2)" }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
                  <PhoneCall size={22} style={{ color: "#22c55e" }} />
                </div>
                <span className="text-[13px] font-bold" style={{ color: "#22c55e" }}>Voice Call</span>
                <span className="text-[10px]" style={{ color: C.secondaryText }}>In-app</span>
              </button>

              <button
                onClick={() => startCall("video")}
                className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all active:scale-95"
                style={{ background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.2)" }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
                  <Video size={22} style={{ color: "#3b82f6" }} />
                </div>
                <span className="text-[13px] font-bold" style={{ color: "#3b82f6" }}>Video Call</span>
                <span className="text-[10px]" style={{ color: C.secondaryText }}>In-app</span>
              </button>
            </div>

            {/* Per-worker direct contact */}
            {projectWorkers.length > 0 && (
              <>
                <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: C.secondaryText }}>Direct Contact</p>
                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                  {projectWorkers.map((w) => (
                    <div key={w.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl" style={{ background: C.barBg }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-black"
                        style={{ background: w.color + "25", color: w.color }}>
                        {w.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: C.titleColor }}>{w.name}</p>
                        <p className="text-[11px] truncate" style={{ color: C.secondaryText }}>{w.customRole || w.role}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {w.phone && (
                          <a href={`tel:${w.phone}`} onClick={() => setShowCallSheet(false)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                            style={{ background: "rgba(34,197,94,0.12)" }}>
                            <Phone size={13} style={{ color: "#22c55e" }} />
                          </a>
                        )}
                        {isApple && (w.phone || w.email) && (
                          <a
                            href={`facetime://${w.phone || w.email}`}
                            onClick={() => setShowCallSheet(false)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                            style={{ background: "rgba(0,200,83,0.12)" }}
                          >
                            <Video size={13} style={{ color: "#00c853" }} />
                          </a>
                        )}
                        {w.email && (
                          <a href={`mailto:${w.email}`} onClick={() => setShowCallSheet(false)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                            style={{ background: "rgba(59,130,246,0.12)" }}>
                            <PhoneOff size={11} style={{ color: "#3b82f6" }} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <p className="text-[10px] text-center mt-4" style={{ color: C.secondaryText }}>
              Calls use Jitsi Meet — free, secure, no account needed
            </p>
          </div>
        </div>
      )}

      {/* ── Image lightbox ──────────────────────────────────────────────────── */}
      {lightboxData && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/90" onClick={() => setLightboxData(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxData.data} alt={lightboxData.name} className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
            <div className="absolute top-3 right-3 flex gap-2">
              <button onClick={() => downloadAttachment(lightboxData.name, lightboxData.data)}
                className="p-2.5 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all">
                <Download size={16} />
              </button>
              <button onClick={() => setLightboxData(null)}
                className="p-2.5 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

