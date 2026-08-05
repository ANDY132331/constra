"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Send, Paperclip, MessagesSquare, X, Download, Trash2, Mic,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { useStore } from "@/lib/store";
import { MicButton } from "@/components/mic-button";

function formatTime(date: Date) {
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday " + format(date, "h:mm a");
  return format(date, "MMM d, h:mm a");
}

function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `0:${String(sec).padStart(2, "0")}`;
}

export default function MessagesPage() {
  const { projects, messages, addMessage, deleteMessage, currentUser } = useStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id ?? "");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);

  useEffect(() => {
    if (!selectedProjectId && projects[0]?.id) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const [text, setText] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{ name: string; data: string } | null>(null);
  const [lightboxData, setLightboxData] = useState<{ name: string; data: string } | null>(null);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const projectMessages = useMemo(
    () => messages
      .filter((m) => m.projectId === selectedProjectId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages, selectedProjectId],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [projectMessages.length, selectedProjectId]);

  // ── Visual-viewport / keyboard avoidance (iOS PWA) ───────────────────────
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !containerRef.current) return;
    const update = () => {
      if (!containerRef.current) return;
      // The layout header is 56 px; mobile-nav bottom offset is applied via padding-bottom on <main>
      const available = vv.height;
      containerRef.current.style.height = `${available}px`;
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);

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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function downloadAttachment(name: string, data: string) {
    const a = document.createElement("a");
    a.href = data;
    a.download = name;
    a.click();
  }

  const isImage = (data: string) => data.startsWith("data:image");
  const isAudio = (name: string, data: string) =>
    data.startsWith("data:audio") || name.startsWith("voice-");

  const project = projects.find((p) => p.id === selectedProjectId);

  return (
    <div
      ref={containerRef}
      className="flex overflow-hidden rounded-xl border border-white/[0.06] bg-[#111]"
      style={{ height: "calc(100dvh - 168px)" }}
    >
      {/* ── Sidebar: project list ─────────────────────────────────────────── */}
      <div className={`flex-shrink-0 border-e border-white/[0.06] flex flex-col
        ${mobileSidebarOpen ? "flex" : "hidden"} sm:flex
        w-full sm:w-[220px]`}>
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-[13px] font-bold text-white">Crew Chat</h2>
          <p className="text-[10px] text-white/30 mt-0.5">Per-project messaging</p>
          <p className="text-[9px] text-green-400/60 mt-1 leading-tight">Live · synced across all devices</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {projects.length === 0 ? (
            <p className="text-[11px] text-white/25 px-4 py-3">No projects yet</p>
          ) : (
            projects.map((p) => {
              const last = messages
                .filter((m) => m.projectId === p.id)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
              const active = p.id === selectedProjectId;
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProjectId(p.id); setMobileSidebarOpen(false); }}
                  className={`w-full text-start px-4 py-3 transition-colors ${active ? "bg-amber-500/10" : "hover:bg-white/[0.03]"}`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className={`text-[12px] font-semibold truncate ${active ? "text-amber-300" : "text-white/75"}`}>{p.name}</span>
                  </div>
                  {last ? (
                    <p className="text-[10px] text-white/30 truncate ps-4">
                      {last.senderName.split(" ")[0]}: {last.attachmentName?.startsWith("voice-") ? "🎙 Voice message" : last.text || "📎 Attachment"}
                    </p>
                  ) : (
                    <p className="text-[10px] text-white/20 italic ps-4">No messages yet</p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat area ─────────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileSidebarOpen ? "hidden sm:flex" : "flex"}`}>
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="sm:hidden flex items-center justify-center w-7 h-7 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          {project ? (
            <>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
              <div>
                <p className="text-[13px] font-bold text-white">{project.name}</p>
                <p className="text-[10px] text-white/30">{projectMessages.length} message{projectMessages.length !== 1 ? "s" : ""}</p>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-white/30">Select a project</p>
          )}
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {projectMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <MessagesSquare size={32} className="text-white/15" />
              <p className="text-[13px] text-white/25">No messages yet</p>
              <p className="text-[11px] text-white/15">Send a message or voice note to start</p>
            </div>
          )}
          {projectMessages.map((msg, i) => {
            const isMe = msg.senderId === currentUser.id;
            const showAvatar = i === 0 || projectMessages[i - 1].senderId !== msg.senderId;
            const hasAudio = msg.attachmentName && msg.attachmentData && isAudio(msg.attachmentName, msg.attachmentData);
            const durMatch = msg.attachmentName?.match(/voice-(\d+)s/);
            const audioDur = durMatch ? parseInt(durMatch[1]) : 0;
            return (
              <div key={msg.id} className={`flex gap-2.5 group/msg ${isMe ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-opacity ${showAvatar ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                  style={{ backgroundColor: msg.senderColor + "33", color: msg.senderColor }}
                >
                  {msg.senderInitials}
                </div>

                <div className={`flex flex-col gap-1 max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                  {showAvatar && (
                    <span className="text-[10px] text-white/30 px-1">
                      {isMe ? "You" : msg.senderName} · {formatTime(new Date(msg.timestamp))}
                    </span>
                  )}

                  {/* Text bubble */}
                  {msg.text && (
                    <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words ${isMe
                      ? "bg-amber-500 text-black rounded-tr-sm"
                      : "bg-white/[0.07] text-white/85 rounded-tl-sm"}`}>
                      {msg.text}
                    </div>
                  )}

                  {/* Audio voice message */}
                  {hasAudio && (
                    <div className={`rounded-2xl overflow-hidden border px-3 py-2.5 flex items-center gap-2.5 min-w-[180px]
                      ${isMe ? "bg-amber-500/15 border-amber-500/30 rounded-tr-sm" : "bg-white/[0.06] border-white/[0.08] rounded-tl-sm"}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? "bg-amber-500/30" : "bg-white/10"}`}>
                        <Mic size={13} className={isMe ? "text-amber-300" : "text-white/60"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <audio
                          controls
                          src={msg.attachmentData!}
                          className="w-full h-7 max-w-[160px]"
                          style={{ colorScheme: "dark" }}
                          preload="metadata"
                        />
                      </div>
                      {audioDur > 0 && (
                        <span className={`text-[10px] flex-shrink-0 font-mono ${isMe ? "text-amber-300/70" : "text-white/35"}`}>
                          {fmtDur(audioDur)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Image / file attachment */}
                  {msg.attachmentName && msg.attachmentData && !hasAudio && (
                    <div className={`rounded-xl overflow-hidden border ${isMe ? "border-amber-500/30" : "border-white/[0.08]"} max-w-[240px]`}>
                      {isImage(msg.attachmentData) ? (
                        <img
                          src={msg.attachmentData}
                          alt={msg.attachmentName}
                          className="block max-w-full cursor-pointer"
                          onClick={() => setLightboxData({ name: msg.attachmentName!, data: msg.attachmentData! })}
                        />
                      ) : (
                        <button
                          onClick={() => downloadAttachment(msg.attachmentName!, msg.attachmentData!)}
                          className="flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.05] hover:bg-white/[0.09] transition-colors w-full text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <Download size={13} className="text-amber-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-white/80 truncate">{msg.attachmentName}</p>
                            <p className="text-[10px] text-white/30">Tap to download</p>
                          </div>
                        </button>
                      )}
                    </div>
                  )}

                  {isMe && (
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="opacity-0 group-hover/msg:opacity-100 self-end p-1 rounded text-white/20 hover:text-red-400 transition-all"
                      aria-label="Delete message"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Pending attachment preview */}
        {pendingAttachment && (
          <div className="px-4 pb-2 flex-shrink-0">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              {isImage(pendingAttachment.data) ? (
                <img src={pendingAttachment.data} alt="" className="w-10 h-10 rounded object-cover" />
              ) : (
                <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center">
                  <Paperclip size={12} className="text-amber-400" />
                </div>
              )}
              <span className="text-[12px] text-amber-300 max-w-[200px] truncate">{pendingAttachment.name}</span>
              <button onClick={() => setPendingAttachment(null)} className="text-white/30 hover:text-white/70 ms-1">
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="flex-shrink-0 border-t border-white/[0.06] px-3 py-2.5 flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors flex-shrink-0 mb-0.5"
            title="Attach file"
          >
            <Paperclip size={16} />
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            inputMode="text"
            enterKeyHint="send"
            className="flex-1 bg-[#1a1a1a] border border-white/[0.07] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-white/25 outline-none focus:border-amber-500/30 resize-none max-h-24 leading-relaxed"
            style={{ overflowY: "auto" }}
          />

          <MicButton onAudio={handleAudio} className="mb-0.5" />

          <button
            onClick={sendMessage}
            disabled={!text.trim() && !pendingAttachment}
            className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-black transition-colors flex-shrink-0 mb-0.5"
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* Image lightbox */}
      {lightboxData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85" onClick={() => setLightboxData(null)} />
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxData.data} alt={lightboxData.name} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            <div className="absolute top-2 right-2 flex gap-2">
              <button onClick={() => downloadAttachment(lightboxData.name, lightboxData.data)}
                className="p-2 rounded-lg bg-black/60 text-white/70 hover:text-white transition-colors">
                <Download size={15} />
              </button>
              <button onClick={() => setLightboxData(null)}
                className="p-2 rounded-lg bg-black/60 text-white/70 hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>
            <p className="absolute bottom-2 left-2 text-[11px] text-white/50 bg-black/50 px-2 py-1 rounded">{lightboxData.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
