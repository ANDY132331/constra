"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Send, Paperclip, X, Download, Trash2, MessagesSquare,
  Search, ChevronLeft, Mic, ArrowLeft, Play, Pause, ChevronDown,
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

function AudioPlayer({ src, durationSecs, isMe }: { src: string; durationSecs: number; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => { setPlaying(false); setProgress(0); setElapsed(0); };
    const onTime = () => {
      const d = audio.duration;
      setElapsed(audio.currentTime);
      if (d && isFinite(d)) setProgress(audio.currentTime / d);
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    return () => { audio.removeEventListener("ended", onEnded); audio.removeEventListener("timeupdate", onTime); };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().catch(() => toast.error("Could not play audio")); setPlaying(true); }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !isFinite(audio.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  }

  const barFg  = isMe ? "rgba(255,255,255,0.85)" : "#60a5fa";
  const barBg  = isMe ? "rgba(255,255,255,0.18)" : "rgba(96,165,250,0.18)";
  const textClr = isMe ? "rgba(255,255,255,0.65)" : C.secondaryText;
  const btnBg  = isMe ? "rgba(255,255,255,0.18)" : "rgba(59,130,246,0.15)";
  const iconClr = isMe ? "#fff" : "#60a5fa";

  return (
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button type="button" onClick={toggle}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90"
        style={{ background: btnBg }}>
        {playing
          ? <Pause size={12} style={{ color: iconClr }} />
          : <Play  size={12} style={{ color: iconClr, marginLeft: 1 }} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1 rounded-full mb-1.5 cursor-pointer" style={{ background: barBg }} onClick={seek}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(progress * 100, 100)}%`, background: barFg, transition: "width 0.1s linear" }} />
        </div>
        <span className="text-[10px] font-mono tabular-nums" style={{ color: textClr }}>
          {playing ? fmtDur(Math.floor(elapsed)) : fmtDur(durationSecs)}
        </span>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const { projects, messages, workers, addMessage, deleteMessage, currentUser } = useStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id ?? "");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [lastRead, setLastRead] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("constra_msg_lastread") ?? "{}"); } catch { return {}; }
  });

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
  const [atBottom, setAtBottom] = useState(true);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const recSecsRef   = useRef(0);
  const mediaRecRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const recTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const fileRef      = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);

  // Keyboard-aware height on mobile
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

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (mediaRecRef.current?.state === "recording") mediaRecRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const projectMessages = useMemo(
    () => messages
      .filter((m) => m.projectId === selectedProjectId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages, selectedProjectId],
  );

  // Mark as read
  useEffect(() => {
    if (selectedProjectId) markRead(selectedProjectId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, projectMessages.length]);

  // Auto-scroll when near bottom; always scroll on project switch
  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [projectMessages.length, atBottom]);

  useEffect(() => {
    setAtBottom(true);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 0);
  }, [selectedProjectId]);

  function handleScrollArea() {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  }

  // Worker avatars for project header (up to 5 team members)
  const teamAvatars = useMemo(() => workers.slice(0, 5), [workers]);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) { toast.error("Microphone not supported"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
        .find(t => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) ?? "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      mediaRecRef.current = mr;
      recSecsRef.current = 0;
      setRecSecs(0);
      setRecording(true);
      recTimerRef.current = setInterval(() => {
        recSecsRef.current += 1;
        setRecSecs(recSecsRef.current);
        if (recSecsRef.current >= 120) stopRecording(true);
      }, 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  }

  function stopRecording(send: boolean) {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    const mr = mediaRecRef.current;
    if (!mr) { setRecording(false); return; }
    const dur = recSecsRef.current;

    if (send && dur > 0) {
      mr.addEventListener("stop", () => {
        const mt  = mr.mimeType || "audio/webm";
        const ext = mt.includes("mp4") || mt.includes("m4a") ? "m4a" : mt.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunksRef.current, { type: mt });
        const reader = new FileReader();
        reader.onload = () => {
          if (!reader.result) return;
          addMessage({
            projectId: selectedProjectId,
            senderId: currentUser.id, senderName: currentUser.name,
            senderInitials: currentUser.initials, senderColor: currentUser.color,
            timestamp: new Date(), text: "",
            attachmentName: `voice-${dur}s.${ext}`,
            attachmentData: reader.result as string,
          });
        };
        reader.readAsDataURL(blob);
      }, { once: true });
    } else {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    mr.stop();
    mediaRecRef.current = null;
    setRecording(false);
    setRecSecs(0);
    recSecsRef.current = 0;
  }

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

  const isImage    = (data: string) => data.startsWith("data:image");
  const isAudioName = (name: string) => name.startsWith("voice-") || /\.(mp3|m4a|ogg|webm|wav|aac)$/i.test(name);
  const isAudioData = (data: string) => data.startsWith("data:audio");

  const project = projects.find((p) => p.id === selectedProjectId);

  const filteredProjects = useMemo(() => {
    const q = sidebarSearch.toLowerCase();
    return projects.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [projects, sidebarSearch]);

  const canSend = !recording && (!!text.trim() || !!pendingAttachment);
  const showMic = !recording && !text.trim() && !pendingAttachment;

  return (
    <>
      <div ref={containerRef} className="flex overflow-hidden" style={{ height: "100%", background: C.chatBg }}>

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

                const lastPreview = last
                  ? (last.attachmentName && isAudioName(last.attachmentName)
                      ? "🎙 Voice message"
                      : last.attachmentName && !last.text
                        ? "📎 Attachment"
                        : last.text || "📎 Attachment")
                  : "No messages yet";
                const lastPrefix = last
                  ? (last.senderId === currentUser.id ? "You: " : last.senderName.split(" ")[0] + ": ")
                  : "";

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
                        {last ? <><span style={{ opacity: 0.7 }}>{lastPrefix}</span>{lastPreview}</> : lastPreview}
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
          className={`flex-1 flex flex-col min-w-0 min-h-0 relative ${mobileSidebarOpen ? "hidden sm:flex" : "flex"}`}
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
                    {workers.length} member{workers.length !== 1 ? "s" : ""}
                  </p>
                </div>
                {/* Team avatars */}
                {teamAvatars.length > 0 && (
                  <div className="flex items-center flex-shrink-0">
                    {teamAvatars.map((w, i) => (
                      <div
                        key={w.id}
                        title={w.name}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold border-2 flex-shrink-0"
                        style={{
                          background: w.color + "40",
                          color: w.color,
                          borderColor: C.headerBg,
                          marginLeft: i === 0 ? 0 : -8,
                          zIndex: teamAvatars.length - i,
                        }}
                      >
                        {w.initials}
                      </div>
                    ))}
                    {workers.length > 5 && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold border-2 flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.06)", color: C.secondaryText, borderColor: C.headerBg, marginLeft: -8 }}
                      >
                        +{workers.length - 5}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-[13px]" style={{ color: C.secondaryText }}>Select a project to start chatting</p>
            )}
          </div>

          {/* Messages scroll area */}
          <div
            ref={scrollRef}
            onScroll={handleScrollArea}
            className="flex-1 overflow-y-auto px-3 py-2 relative"
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
                  const isMe   = msg.senderId === currentUser.id;
                  const ts     = new Date(msg.timestamp);
                  const prevMsg = i > 0 ? projectMessages[i - 1] : null;
                  const prevTs  = prevMsg ? new Date(prevMsg.timestamp) : null;
                  const showDate   = !prevTs || !isSameDay(ts, prevTs);
                  const showSender = showDate || !prevMsg || prevMsg.senderId !== msg.senderId;
                  const isGroupEnd = !projectMessages[i + 1] || projectMessages[i + 1].senderId !== msg.senderId;

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
                            <div className="px-3.5 py-3 flex items-center gap-3" style={{ ...bubbleStyle, minWidth: 220 }}>
                              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: isMe ? "rgba(255,255,255,0.18)" : "rgba(59,130,246,0.12)" }}>
                                <Mic size={15} style={{ color: isMe ? "#fff" : "#3b82f6" }} />
                              </div>
                              {attData ? (
                                <AudioPlayer src={attData} durationSecs={audioDur} isMe={isMe} />
                              ) : (
                                <div className="flex-1">
                                  <p className="text-[12px]" style={{ color: isMe ? "rgba(255,255,255,0.6)" : C.secondaryText }}>
                                    Voice message{audioDur > 0 ? ` · ${fmtDur(audioDur)}` : ""}
                                  </p>
                                </div>
                              )}
                              <div className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-1">
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

                          {/* Delete — hover on desktop, always on touch */}
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

          {/* Scroll-to-bottom button */}
          {!atBottom && (
            <button
              type="button"
              onClick={() => { setAtBottom(true); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}
              className="absolute bottom-[80px] right-4 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 z-10"
              style={{ background: C.activeBorder, color: "#fff" }}
            >
              <ChevronDown size={18} />
            </button>
          )}

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
            {recording ? (
              /* ── Recording mode ── */
              <>
                <button
                  type="button"
                  onClick={() => stopRecording(false)}
                  className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <X size={18} style={{ color: C.secondaryText }} />
                </button>

                <div className="flex-1 flex items-center gap-3 rounded-[22px] px-4 py-3"
                  style={{ background: C.inputBg, border: `1.5px solid rgba(239,68,68,0.35)` }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: "#ef4444" }} />
                  <span className="text-[13px] font-semibold tabular-nums" style={{ color: "#ef4444" }}>
                    {fmtDur(recSecs)}
                  </span>
                  <span className="text-[12px]" style={{ color: C.secondaryText }}>Recording…</span>
                </div>

                <button
                  type="button"
                  onClick={() => stopRecording(true)}
                  className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90"
                  style={{ background: C.sentGrad }}
                >
                  <Send size={18} className="text-white" style={{ marginLeft: 2 }} />
                </button>
              </>
            ) : (
              /* ── Normal mode ── */
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90"
                  style={{ background: C.activeBorder }}
                >
                  <Paperclip size={18} className="text-white" />
                </button>
                <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFile} />

                <div className="flex-1 flex items-end rounded-[22px] px-4 py-2.5"
                  style={{ background: C.inputBg, border: `1.5px solid ${C.inputBorder}` }}>
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

                {showMic ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90"
                    style={{ background: "rgba(59,130,246,0.15)" }}
                  >
                    <Mic size={20} style={{ color: C.activeBorder }} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!canSend}
                    className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-35"
                    style={{ background: C.sentGrad }}
                  >
                    <Send size={18} className="text-white" style={{ marginLeft: 2 }} />
                  </button>
                )}
              </>
            )}
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
